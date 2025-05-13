import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { generateResourceName, SSM_PARAM } from "../shared";

export interface InventoryConstructProps {
  /**
   * The region where the S3 bucket will be created.
   */
  readonly region: string;

  /**
   * Whether to enable encryption for the S3 bucket.
   * @default false
   */
  readonly enableEncryption?: boolean;

  /**
   * Determines what happens to the bucket when the stack is deleted.
   * If set to `cdk.RemovalPolicy.DESTROY`, the bucket and all of its contents
   * will be deleted when the stack is deleted. If set to `cdk.RemovalPolicy.RETAIN`,
   * the bucket will be retained and not deleted when the stack is deleted.
   *
   * @default cdk.RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: cdk.RemovalPolicy.DESTROY | cdk.RemovalPolicy.RETAIN;
}

/**
 * Creates an S3 bucket for SSM Inventory and sets up a resource data sync
 * to the bucket. The bucket can be encrypted with KMS if specified.
 *
 * The bucket is configured with lifecycle rules by default to transition
 * objects for cost savings.
 */
export class InventoryConstruct extends Construct {
  readonly bucket: s3.Bucket;
  readonly encryptionKey?: kms.Key;

  constructor(scope: Construct, id: string, props: InventoryConstructProps) {
    super(scope, id);

    // Expand the props and set default values
    const region = props.region;
    const enableEncryption = props.enableEncryption ?? false;
    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.DESTROY;

    if (enableEncryption) {
      this.encryptionKey = new kms.Key(this, "rSSMInventoryBucketKey", {
        description: "KMS key for SSM Inventory bucket encryption",
        enableKeyRotation: true,
        rotationPeriod: cdk.Duration.days(90),
        removalPolicy: removalPolicy,
        // policy: new iam.PolicyDocument() // TODO: Need to implement a least privilege policy for the S3 bucket to use

        // Schedules the key to be deleted 7 days after
        // the stack is deleted.
        pendingWindow: cdk.Duration.days(7),
      });
    }

    // S3 Bucket for SSM Inventory
    this.bucket = new s3.Bucket(this, "rSSMInventoryBucket", {
      bucketName: generateResourceName("ssm-inventory"),

      // If the encryption key is defined, then SSE-KMS will be
      // used. Otherwise, the bucket will be created with SSE-S3.
      encryptionKey: this.encryptionKey ?? undefined,
      bucketKeyEnabled: enableEncryption,
      enforceSSL: true,

      // Allows the bucket to be destroyed even if it contains objects. This is
      // useful for development and testing, but should be used with caution in
      // production as it can lead to data loss.
      autoDeleteObjects: removalPolicy === cdk.RemovalPolicy.DESTROY,
      removalPolicy: removalPolicy,

      // Setup lifecycle rules for cost savings
      // https://aws.amazon.com/s3/pricing/
      // TODO: Revisit the lifecycle rules to ensure they meet
      // compliance and security requirements.
      lifecycleRules: [
        // Transition to S3 Standard-IA after 30 days
        {
          id: "TransitionToIA",
          transitions: [
            {
              transitionAfter: cdk.Duration.days(30),
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
            },
          ],
        },
        // Transition to S3 Glacier after 90 days
        {
          id: "TransitionToGlacier",
          transitions: [
            {
              transitionAfter: cdk.Duration.days(90),
              storageClass: s3.StorageClass.GLACIER,
            },
          ],
        },
        // Rule for deleting objects
        {
          id: "ExpireObjects",
          expiration: cdk.Duration.days(365),
          noncurrentVersionExpiration: cdk.Duration.days(365),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
    });

    // Add bucket policy for SSM Inventory
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("ssm.amazonaws.com")],
        actions: ["s3:GetBucketAcl", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
      })
    );

    // Sync the SSM Inventory data to the S3 bucket
    const inventorySync = new ssm.CfnResourceDataSync(
      this,
      "rResourceDataSync",
      {
        syncName: generateResourceName("workspaces-ssm-datasync"),
        s3Destination: {
          bucketName: this.bucket.bucketName,
          bucketRegion: props.region,
          syncFormat: "JsonSerDe",
        },
      }
    );

    // Make sure the resource data sync is created after the bucket
    inventorySync.node.addDependency(this.bucket);

    // Create SSM Parameters with construct information
    new ssm.StringParameter(this, "rSSMInventoryBucketName", {
      description: "SSM Inventory bucket name",
      parameterName: SSM_PARAM.SSM.INVENTORY.BUCKET_NAME,
      stringValue: this.bucket.bucketName,
    });

    new ssm.StringParameter(this, "rSSMInventoryBucketRegion", {
      description: "SSM Inventory bucket region",
      parameterName: SSM_PARAM.SSM.INVENTORY.BUCKET_REGION,
      stringValue: props.region,
    });

    new ssm.StringParameter(this, "rSSMInventoryBucketArn", {
      description: "SSM Inventory bucket ARN",
      parameterName: SSM_PARAM.SSM.INVENTORY.BUCKET_ARN,
      stringValue: this.bucket.bucketArn,
    });

    if (this.encryptionKey) {
      new ssm.StringParameter(this, "rSSMInventoryBucketKmsKeyId", {
        description: "SSM Inventory S3 bucket SSE-KMS key ID",
        parameterName: SSM_PARAM.SSM.INVENTORY.BUCKET_KMS_KEY_ID,
        stringValue: this.encryptionKey.keyId,
      });
    }

    new ssm.StringParameter(this, "rSSMInventoryResourceDataSync", {
      description: "SSM Inventory resource data sync",
      parameterName: SSM_PARAM.SSM.INVENTORY.RESOURCE_DATA_SYNC,
      stringValue: inventorySync.ref,
    });
  }
}
