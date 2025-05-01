import * as cdk from "aws-cdk-lib";
import * as customresources from "aws-cdk-lib/custom-resources";
import * as directoryservice from "aws-cdk-lib/aws-directoryservice";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { SSM_PARAM as DIRECTORY_SSM_PARAM } from "./constants";
import { SSM_PARAM as VPC_SSM_PARAM } from "../vpc";

export class ActiveDirectoryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpcId = ssm.StringParameter.valueForTypedStringParameterV2(
      this,
      VPC_SSM_PARAM.VPC_ID
    );

    const directorySubnetIds =
      ssm.StringListParameter.valueForTypedListParameter(
        this,
        VPC_SSM_PARAM.DIRECTORY_SUBNET_IDS
      );

    const workspaceSubnetIds =
      ssm.StringListParameter.valueForTypedListParameter(
        this,
        VPC_SSM_PARAM.WORKSPACE_SUBNET_IDS
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

    const workspaceRegistrationPolicy = iam.PolicyStatement.fromJson({
      Effect: "Allow",
      Action: "*",
      Resource: "*",
    });
    const registerWorkspaceDirectory = {
      service: "workspaces",
      action: "RegisterWorkspaceDirectory",
      physicalResourceId: customresources.PhysicalResourceId.of(
        Date.now().toString()
      ),
      parameters: {
        DirectoryId: directory.ref,
        SubnetIds: workspaceSubnetIds,
      },
    };
    const deregisterWorkspaceDirectory = {
      ...registerWorkspaceDirectory,
      action: "DeregisterWorkspaceDirectory",
    };
    new customresources.AwsCustomResource(this, "RegisterWorkspacesDirectory", {
      onCreate: registerWorkspaceDirectory,
      policy: customresources.AwsCustomResourcePolicy.fromStatements([
        workspaceRegistrationPolicy,
      ]),
    });

    new ssm.StringParameter(this, "rWorkspaceSubnetIdsParam", {
      parameterName: DIRECTORY_SSM_PARAM.DIRECTORY_ID,
      stringValue: directory.ref,
    });

    new cdk.CfnOutput(this, "oDirectoryId", {
      description: "The active directory ID",
      key: "DirectoryId",
      value: directory.ref,
    });
  }
}
