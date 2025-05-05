import * as cdk from "aws-cdk-lib";
import * as directoryservice from "aws-cdk-lib/aws-directoryservice";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { SSM_PARAM } from "../util";

export class ActiveDirectoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueForTypedStringParameterV2(
      this,
      SSM_PARAM.VPC_ID
    );

    const directorySubnetIds =
      ssm.StringListParameter.valueForTypedListParameter(
        this,
        SSM_PARAM.DIRECTORY_SUBNET_IDS
      );

    const directory = new directoryservice.CfnMicrosoftAD(
      this,
      "rMicrosoftAD",
      {
        edition: "Standard",
        name: "workspace.amazon.com",
        password: "Password123!", // TODO: Currently mock password, should come from SecretsManager
        vpcSettings: {
          subnetIds: directorySubnetIds,
          vpcId: vpcId,
        },
      }
    );

    new ssm.StringParameter(this, "rWorkspaceSubnetIdsParam", {
      parameterName: SSM_PARAM.DIRECTORY_ID,
      stringValue: directory.ref,
    });

    new cdk.CfnOutput(this, "oDirectoryId", {
      description: "The active directory ID",
      key: "DirectoryId",
      value: directory.ref,
    });
  }
}
