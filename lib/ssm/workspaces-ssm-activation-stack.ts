import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

interface WorkspacesSSMActivationStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  vpcCidr: string;
  subnets: ec2.ISubnet[];
  existingManagedInstanceProfile?: string;
}

export class WorkspacesSSMActivationStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: WorkspacesSSMActivationStackProps
  ) {
    super(scope, id, props);

    // VPC Endpoints Security Groups
    const apiGatewaySecurityGroup = new ec2.SecurityGroup(
      this,
      "rAPIGatewayVPCEndpointSG",
      {
        vpc: props.vpc,
        description: "Security group for API Gateway VPC Endpoint",
        allowAllOutbound: true,
        securityGroupName: "sgroup-euc-apig-vpcendpoint",
      }
    );
    apiGatewaySecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpcCidr),
      ec2.Port.tcp(443)
    );

    const ssmSecurityGroup = new ec2.SecurityGroup(this, "rSSMVPCEndpointSG", {
      vpc: props.vpc,
      description: "Security group for SSM VPC Endpoints",
      allowAllOutbound: true,
      securityGroupName: "sgroup-euc-ssm-vpcendpoint",
    });
    ssmSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpcCidr),
      ec2.Port.tcp(443)
    );

    const s3SecurityGroup = new ec2.SecurityGroup(this, "rS3VPCEndpointSG", {
      vpc: props.vpc,
      description: "Security group for S3 VPC Endpoint",
      allowAllOutbound: true,
      securityGroupName: "sgroup-euc-s3-vpcendpoint",
    });
    s3SecurityGroup.addIngressRule(
      ec2.Peer.ipv4(props.vpcCidr),
      ec2.Port.tcp(443)
    );

    // VPC Endpoints
    const apiGatewayEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      "rAPIGatewayEndpoint",
      {
        vpc: props.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
        subnets: { subnets: props.subnets },
        privateDnsEnabled: true,
        securityGroups: [apiGatewaySecurityGroup],
      }
    );

    new ec2.InterfaceVpcEndpoint(this, "rSSMEndpoint", {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: { subnets: props.subnets },
      privateDnsEnabled: true,
      securityGroups: [ssmSecurityGroup],
    });

    new ec2.InterfaceVpcEndpoint(this, "rSSMMessagesEndpoint", {
      vpc: props.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      subnets: { subnets: props.subnets },
      privateDnsEnabled: true,
      securityGroups: [ssmSecurityGroup],
    });

    const s3Endpoint = new ec2.GatewayVpcEndpoint(this, "rS3Endpoint", {
      vpc: props.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // S3 Bucket for SSM Inventory
    const inventoryBucket = new s3.Bucket(this, "rSSMInventoryBucket", {
      bucketName: `s3-${this.account}-ssm-inventory-bucket`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // IAM Roles
    new iam.Role(this, "rSSMMaintenanceRole", {
      assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonSSMMaintenanceWindowRole"
        ),
      ],
      roleName: `${this.region}-roles_ssm_maintenance`,
    });

    // Create SSM Instance Role if not provided
    let ssmInstanceRole: iam.Role;
    if (!props.existingManagedInstanceProfile) {
      ssmInstanceRole = new iam.Role(this, "rSSMInstanceRole", {
        assumedBy: new iam.ServicePrincipal("ssm.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "CloudWatchAgentServerPolicy"
          ),
        ],
        roleName: `${this.region}-role_ssm_manageinstances`,
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
        instanceProfileName: `${this.region}-instanceprofile_ssm`,
        role: ssmInstanceRole,
      });
    } else {
      ssmInstanceRole = iam.Role.fromRoleName(
        this,
        "rExistingSSMInstanceRole",
        props.existingManagedInstanceProfile
      ) as iam.Role;
    }

    // SSM Resource Data Sync
    new ssm.CfnResourceDataSync(this, "rResourceDataSync", {
      syncName: "WorkSpaces-SSM-DataSync",
      s3Destination: {
        bucketName: inventoryBucket.bucketName,
        bucketRegion: this.region,
        syncFormat: "JsonSerDe",
      },
    });

    // SSM Patch Baselines
    new ssm.CfnPatchBaseline(this, "rWindowsPatchBaseline", {
      operatingSystem: "WINDOWS",
      name: "WorkSpaces-Windows-All-Baseline",
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
      name: "WorkSpaces-AmazonLinux-All-Baseline",
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
    new ssm.CfnMaintenanceWindow(this, "rMaintenanceWindowA", {
      name: "WorkSpacesMaintenanceWindowA",
      schedule: "cron(0 0 ? * SUN *)",
      duration: 4,
      cutoff: 1,
      allowUnassociatedTargets: false,
    });

    new ssm.CfnMaintenanceWindow(this, "rMaintenanceWindowB", {
      name: "WorkSpacesMaintenanceWindowB",
      schedule: "cron(0 0 ? * MON *)",
      duration: 4,
      cutoff: 1,
      allowUnassociatedTargets: false,
    });

    // Lambda Function for SSM Activation
    const activationFunction = new lambda.Function(
      this,
      "rSSMActivationFunction",
      {
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: "index.lambda_handler",
        code: lambda.Code.fromInline(`
import boto3
import os
from datetime import datetime,timedelta

ssmclient = boto3.client('ssm', os.environ['region'])
ssmrole = os.getenv('iamrole')

delta = timedelta(hours=1)
expiry = datetime.now() + delta

def lambda_handler(event,context):
    suppliedname = (event['queryStringParameters']['name'])

    ssmactivresponse = ssmclient.describe_activations(
        Filters=[
            {
                'FilterKey': 'DefaultInstanceName',
                'FilterValues': [
                    suppliedname,
                ]
            },
        ],
        MaxResults=1,
    )

    if (ssmactivresponse['ResponseMetadata']['HTTPStatusCode']) == 200 and (ssmactivresponse['ActivationList']) != []:
        print ('Activation Exists Already - Removing and Creating a new Activation')
        activid = ssmactivresponse['ActivationList'][0]['ActivationId']
        remresponse = ssmclient.delete_activation(
        ActivationId=activid
        )
        apiresponse = create_activation(suppliedname)
    else:
        print ('Activation Doesnt Exist - Creating a new Activation')
        apiresponse = create_activation(suppliedname)

    return {
        "statusCode": apiresponse['ResponseMetadata']['HTTPStatusCode'],
        "headers": {"Content-Type": "application/json"},
        "body": "{\\"ActivationCode\\": \\""+str(apiresponse['ActivationCode'])+"\\"\\n\\"ActivationId\\": \\""+str(apiresponse['ActivationId'])+"\\"}"
    }

def create_activation(wkspcname):
    return ssmclient.create_activation(
        Description='WorkspaceActivation-'+wkspcname,
        DefaultInstanceName=wkspcname,
        IamRole=ssmrole,
        RegistrationLimit=1,
        ExpirationDate=expiry,
    )
      `),
        environment: {
          region: this.region,
          iamrole: ssmInstanceRole.roleName,
        },
        timeout: cdk.Duration.seconds(10),
      }
    );

    // Lambda Version and Alias
    const version = new lambda.Version(this, "rActivationFunctionVersion", {
      lambda: activationFunction,
      description: "v1",
    });

    const alias = new lambda.Alias(this, "rActivationFunctionAlias", {
      aliasName: "live",
      version,
    });

    // API Gateway
    const api = new apigateway.RestApi(this, "rWorkSpacesSSMActivator", {
      restApiName: "workspacesSSMActivator",
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
      roleName: `${this.region}-roles_workspaces_cwlogging`,
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
