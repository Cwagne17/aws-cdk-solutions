import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_directoryservice as directoryservice,
  aws_ec2 as ec2,
} from "aws-cdk-lib";

export class BootstrapDeveloperEnvironmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "rVpc", {
      cidr: "10.0.0.0/16",
      natGateways: 1,
      // Workspaces only supports specific availability zones: use1-az2, use1-az4, use1-az6
      // https://docs.aws.amazon.com/workspaces/latest/adminguide/azs-workspaces.html
      availabilityZones: [
        "us-east-1c", // use1-az2
        "us-east-1d", // use1-az4
        "us-east-1a", // use1-az6
      ],
      subnetConfiguration: [
        {
          cidrMask: 28,
          name: "microsoftAD",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          cidrMask: 24,
          name: "vdiWorkspace",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "eksNodegroup",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: "ingress",
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      vpcName: "AwsCdkSolutionsVpc",
      flowLogs: {
        awsCdkSolutionsFlowLogs: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(),
        },
      },
    });

    // Directory MUST use only 2 subnets
    const activeDirectorySubnets = vpc
      .selectSubnets({
        subnetGroupName: "microsoftAD",
      })
      .subnetIds.slice(0, 2);
    const microsoftAD = new directoryservice.CfnMicrosoftAD(
      this,
      "rMicrosoftAD",
      {
        edition: "Standard",
        name: "workspace.example.com",
        // Mock password for the Admin user
        password: "mockPassword123",
        shortName: "WORKSPACE",
        vpcSettings: {
          subnetIds: activeDirectorySubnets,
          vpcId: vpc.vpcId,
        },
      }
    );

    // Create outputs for the VPC
    new cdk.CfnOutput(this, "oVpcId", {
      description: "The VPC ID.",
      key: "VpcId",
      value: vpc.vpcId,
    });

    new cdk.CfnOutput(this, "oDirectoryId", {
      description: "The active directory ID",
      key: "DirectoryId",
      value: microsoftAD.ref,
    });

    new cdk.CfnOutput(this, "oDirectorySubnetIds", {
      description: "The Active directory subnet IDs.",
      key: "DirectorySubnetIds",
      value: activeDirectorySubnets.toString(),
    });
  }
}
