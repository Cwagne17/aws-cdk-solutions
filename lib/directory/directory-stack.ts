import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as directoryservice from "aws-cdk-lib/aws-directoryservice";
import { Construct } from "constructs";
import { SSM_PARAM } from "../vpc";

export class ActiveDirectoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.fromStringParameterName(
      this,
      "pVpcId",
      SSM_PARAM.VPC_ID
    );

    const directorySubnetIds =
      ssm.StringListParameter.fromStringListParameterName(
        this,
        "pDirectorySubnetIds",
        SSM_PARAM.DIRECTORY_SUBNET_IDS
      );

    const directory = new directoryservice.CfnMicrosoftAD(
      this,
      "rMicrosoftAD",
      {
        edition: "Standard",
        name: "workspace.example.com",
        password: "mockPassword123",
        vpcSettings: {
          subnetIds: directorySubnetIds.stringListValue,
          vpcId: vpcId.stringValue,
        },
      }
    );

    new cdk.CfnOutput(this, "oDirectoryId", {
      description: "The active directory ID",
      key: "DirectoryId",
      value: directory.ref,
    });
  }
}
