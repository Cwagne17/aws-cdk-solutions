import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { generateResourceName, SSM_PARAM } from "../shared";
import * as path from "path";
import { Inventory } from "./inventory";
import { Globals } from "../core";

interface WorkspacesActivationStackProps extends cdk.StackProps {
  apiGatewayEndpoint: ec2.InterfaceVpcEndpoint;
}

export class WorkspacesActivationStack extends cdk.Stack {
  readonly inventory: Inventory;

  constructor(
    scope: Construct,
    id: string,
    props: WorkspacesActivationStackProps
  ) {
    super(scope, id, props);
    const apiGatewayEndpoint = props.apiGatewayEndpoint;

    // Create the SSM Inventory bucket
    this.inventory = new Inventory(this, "rSSMInventory", {
      region: Globals.region,

      // Optional properties should be dependent on the environment
      // encryption and data retention should be enabled for persistent
      // environments like prod
      enableEncryption: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const workspacesInstanceRole = new iam.Role(
      this,
      "rWorkspacesSSMInstanceRole",
      {
        roleName: generateResourceName("ssm-workspaces-instance"),
        assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchAgentServerPolicy"
          ),
        ],
      }
    );

    // Add S3 permissions to SSM Instance Role
    workspacesInstanceRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject", "s3:PutObjectAcl"],
        resources: [
          this.inventory.bucket.bucketArn,
          `${this.inventory.bucket.bucketArn}/*`,
        ],
      })
    );

    const lambdaFunctionName = generateResourceName("ssm-create-activation");

    // Create a log group for the lambda function
    const activationLogGroup = new logs.LogGroup(
      this,
      "rWorkspacesSSMActivationLogGroup",
      {
        logGroupName: `/aws/lambda/${lambdaFunctionName}`,
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: This should change based on environment
      }
    );

    // Lambda Function for SSM Activation
    const activationFunction = new lambda.Function(
      this,
      "rWorkspacesSSMActivationFunction",
      {
        functionName: lambdaFunctionName,
        description:
          "Creates the SSM activation to register the workspace instance with SSM Fleet Manager",
        timeout: cdk.Duration.seconds(10),
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "index.lambda_handler",
        code: lambda.Code.fromAsset(
          path.join(__dirname, "../lambda/ssm-create-activation")
        ),
        environment: {
          region: Globals.region,
          iamrole: workspacesInstanceRole.roleName,
        },
        logGroup: activationLogGroup,
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
        resources: [`arn:aws:ssm:${Globals.region}:${this.account}:*`],
      })
    );

    // Allow the lambda function to pass the
    activationFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [workspacesInstanceRole.roleArn],
      })
    );

    // Lambda Version and Alias
    const version = new lambda.Version(
      this,
      "rWorkspacesSSMActivationFunctionVersion",
      {
        lambda: activationFunction,
        description: "$LATEST",
      }
    );
    const alias = new lambda.Alias(
      this,
      "rWorkspacesSSMActivationFunctionAlias",
      {
        aliasName: "live",
        version,
      }
    );

    // API Gateway
    const api = new apigateway.RestApi(this, "rWorkspacesSSMActivationApi", {
      restApiName: generateResourceName("workspaces-ssm-activation"),
      description: "Workspaces SSM hybrid activation enabler",
      failOnWarnings: true,

      // Logging configuration
      cloudWatchRole: true,
      cloudWatchRoleRemovalPolicy: cdk.RemovalPolicy.DESTROY,

      // Configure the API to be private via the VPCe
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [apiGatewayEndpoint],
      },

      // Restricts access to the private API only from
      // the specific VPC endpoint
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ["execute-api:Invoke"],
            resources: ["execute-api:/*"],
            conditions: {
              StringEquals: {
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

    new ssm.StringParameter(this, "rWorkspacesSSMActivationEndpoint", {
      description: "Private API endpoint for SSM activation",
      parameterName: SSM_PARAM.SSM.ACTIVATION_ENDPOINT,
      stringValue: `https://${api.restApiId}.execute-api.${Globals.region}.amazonaws.com/prod`,
    });
  }
}
