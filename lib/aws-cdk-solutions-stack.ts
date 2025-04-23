import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  aws_directoryservice as directoryservice,
  aws_ec2 as ec2,
} from "aws-cdk-lib";

export class AwsCdkSolutionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "rVpc", {
      cidr: "10.0.0.0/16",
      maxAzs: 3,
      natGateways: 1,
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
    });

    // const microsoftAD = new directoryservice.CfnMicrosoftAD(
    //   this,
    //   "rMicrosoftAD",
    //   {
    //     edition: "Standard",
    //     enableSso: true,
    //     name: "workspace.example.com",
    //     // Mock password for the Admin user
    //     password: "mockPassword123",
    //     shortName: "WORKSPACE",
    //     vpcSettings: {
    //       subnetIds: vpc.publicSubnets
    //         .map((subnet) => subnet.subnetId)
    //         .slice(0, 2),
    //       vpcId: vpc.vpcId,
    //     },
    //   }
    // );
  }
}
