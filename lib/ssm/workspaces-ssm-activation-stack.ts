import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { generateResourceName } from "../util";
import * as path from "path";

interface WorkspacesSSMActivationStackProps extends cdk.StackProps {
  apiGatewayEndpoint: ec2.InterfaceVpcEndpoint;
  s3Endpoint: ec2.GatewayVpcEndpoint;
}

export class WorkspacesSSMActivationStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: WorkspacesSSMActivationStackProps
  ) {
    super(scope, id, props);
    const apiGatewayEndpoint = props.apiGatewayEndpoint;
    const s3Endpoint = props.s3Endpoint;

    // S3 Bucket for SSM Inventory
    const inventoryBucket = new s3.Bucket(this, "rSSMInventoryBucket", {
      bucketName: generateResourceName({
        stack: this,
        usage: "ssm-inventory",
        resource: "bucket",
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add bucket policy for SSM Inventory
    inventoryBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal("ssm.amazonaws.com")],
        actions: ["s3:GetBucketAcl", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [
          inventoryBucket.bucketArn,
          `${inventoryBucket.bucketArn}/*`,
        ],
      })
    );

    // IAM Roles
    new iam.Role(this, "rSSMMaintenanceRole", {
      assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonSSMMaintenanceWindowRole"
        ),
      ],
      roleName: generateResourceName({
        usage: "ssm-maintenance",
        resource: "role",
      }),
    });

    // Create SSM Instance Role if not provided
    const ssmInstanceRole = new iam.Role(this, "rSSMInstanceRole", {
      assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
      ],
      roleName: generateResourceName({
        usage: "ssm-manageinstances",
        resource: "role",
      }),
    });

    // Add S3 permissions to SSM Instance Role
    ssmInstanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [
          inventoryBucket.bucketArn,
          `${inventoryBucket.bucketArn}/*`,
        ],
      })
    );

    new iam.InstanceProfile(this, "rSSMInstanceProfile", {
      instanceProfileName: generateResourceName({
        usage: "ssm-manageinstances",
        resource: "instanceprofile",
      }),
      role: ssmInstanceRole,
    });

    // SSM Resource Data Sync
    const inventorySync = new ssm.CfnResourceDataSync(
      this,
      "rResourceDataSync",
      {
        syncName: generateResourceName({
          usage: "workspaces-ssm",
          resource: "datasync",
        }),
        s3Destination: {
          bucketName: inventoryBucket.bucketName,
          bucketRegion: this.region,
          syncFormat: "JsonSerDe",
        },
      }
    );

    // Make sure the resource data sync is created after the bucket
    inventorySync.node.addDependency(inventoryBucket);

    // SSM Patch Baselines
    new ssm.CfnPatchBaseline(this, "rWindowsPatchBaseline", {
      operatingSystem: "WINDOWS",
      name: generateResourceName({
        usage: "workspaces-windows",
        resource: "patchbaseline",
      }),
      patchGroups: ["WinWorkSpacesGroup1", "WinWorkSpacesGroup2"],
      approvalRules: {
        patchRules: [
          {
            approveAfterDays: 5,
            patchFilterGroup: {
              patchFilters: [
                { key: "PRODUCT", values: ["*"] },
                {
                  key: "CLASSIFICATION",
                  values: ["CriticalUpdates", "SecurityUpdates"],
                },
                { key: "MSRC_SEVERITY", values: ["Critical", "Important"] },
              ],
            },
          },
        ],
      },
    });

    new ssm.CfnPatchBaseline(this, "rAmazonLinuxPatchBaseline", {
      operatingSystem: "AMAZON_LINUX_2",
      name: generateResourceName({
        usage: "workspaces-amazonlinux",
        resource: "patchbaseline",
      }),
      patchGroups: ["AMZLINWorkSpacesGroup1", "AMZLINWorkSpacesGroup2"],
      approvalRules: {
        patchRules: [
          {
            approveAfterDays: 5,
            patchFilterGroup: {
              patchFilters: [
                { key: "PRODUCT", values: ["*"] },
                { key: "CLASSIFICATION", values: ["Security"] },
                { key: "SEVERITY", values: ["Critical", "Important"] },
              ],
            },
          },
        ],
      },
    });

    // SSM Maintenance Windows
    const maintenanceWindowA = new ssm.CfnMaintenanceWindow(
      this,
      "rMaintenanceWindowA",
      {
        name: generateResourceName({
          usage: "workspaces-ssm",
          resource: "maintenancewindow",
        }),
        schedule: "cron(0 0 ? * SUN *)",
        duration: 4,
        cutoff: 1,
        allowUnassociatedTargets: false,
      }
    );

    const maintenanceWindowB = new ssm.CfnMaintenanceWindow(
      this,
      "rMaintenanceWindowB",
      {
        name: generateResourceName({
          usage: "workspaces-ssm",
          resource: "maintenancewindow-b",
        }),
        schedule: "cron(0 0 ? * MON *)",
        duration: 4,
        cutoff: 1,
        allowUnassociatedTargets: false,
      }
    );

    new ssm.CfnMaintenanceWindowTarget(this, "rMaintenanceWindowTargetA", {
      windowId: maintenanceWindowA.ref,
      resourceType: "INSTANCE",
      targets: [
        {
          key: "tag:MaintenanceWindow",
          values: [maintenanceWindowA.name],
        },
      ],
      name: generateResourceName({
        usage: "workspaces-ssm",
        resource: "maintenance-target-a",
      }),
      description: "Maintenance Window Target for Group A",
      ownerInformation: "Amazon WorkSpaces Maintenance Window Target A",
    });

    new ssm.CfnMaintenanceWindowTarget(this, "rMaintenanceWindowTargetB", {
      windowId: maintenanceWindowB.ref,
      resourceType: "INSTANCE",
      targets: [
        {
          key: "tag:MaintenanceWindow",
          values: [maintenanceWindowB.name],
        },
      ],
      name: generateResourceName({
        usage: "workspaces-ssm",
        resource: "maintenance-target-b",
      }),
      description: "Maintenance Window Target for Group B",
      ownerInformation: "Amazon WorkSpaces Maintenance Window Target B",
    });

    // Lambda Function for SSM Activation
    const activationFunction = new lambda.Function(
      this,
      "rSSMActivationFunction",
      {
        functionName: generateResourceName({
          usage: "workspaces",
          resource: "getactivations",
        }),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "ssm-activation-lambda.lambda_handler",
        code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
        environment: {
          region: this.region,
          iamrole: ssmInstanceRole.roleName,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Add SSM and IAM permissions to Lambda role
    activationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "ssm:DescribeActivations",
          "ssm:CreateActivation",
          "ssm:DeleteActivation",
        ],
        resources: ["*"],
      })
    );

    activationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [ssmInstanceRole.roleArn],
      })
    );

    // Lambda Version and Alias
    const version = new lambda.Version(this, "rActivationFunctionVersion", {
      lambda: activationFunction,
      description: "$LATEST",
    });

    const alias = new lambda.Alias(this, "rActivationFunctionAlias", {
      aliasName: "live",
      version,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "rWorkSpacesSSMActivator", {
      restApiName: generateResourceName({
        usage: "workspaces-ssm",
        resource: "activator",
      }),
      description: "WorkSpaces SSM Activation Enabler",
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [apiGatewayEndpoint],
      },
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
            conditions: {
              StringNotEquals: {
                "aws:SourceVpce": apiGatewayEndpoint.vpcEndpointId,
              },
            },
          }),
        ],
      }),
    });

    // API Gateway Integration
    api.root.addMethod(
      "GET",
      new apigateway.LambdaIntegration(alias, {
        proxy: true,
      })
    );

    // CloudWatch Role for API Gateway
    const apiGatewayCWRole = new iam.Role(this, "rAPIGatewayCWRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
      roleName: generateResourceName({
        usage: "workspaces",
        resource: "cwlogging-role",
      }),
    });

    apiGatewayCWRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
        ],
        resources: ["*"],
      })
    );

    new logs.LogGroup(this, "rAPIGatewayLogGroup", {
      logGroupName: generateResourceName({
        usage: "workspaces-ssm",
        resource: "api-logs",
      }),
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Export values
    new cdk.CfnOutput(this, "oAPIEndpoint", {
      value: `https://${api.restApiId}.execute-api.${this.region}.amazonaws.com/prod`,
      description: "Private API endpoint for SSM activation",
      exportName: "SSMActivationAPIEndPoint",
    });

    new cdk.CfnOutput(this, "oS3EndpointId", {
      value: s3Endpoint.vpcEndpointId,
      description: "S3 VPC Endpoint ID",
      exportName: "EUCVPCS3EndpointId",
    });

    new cdk.CfnOutput(this, "oAPIEndpointId", {
      value: apiGatewayEndpoint.vpcEndpointId,
      description: "API Gateway VPC Endpoint ID",
      exportName: "EUCVPCEndpointAPI",
    });
  }
}
