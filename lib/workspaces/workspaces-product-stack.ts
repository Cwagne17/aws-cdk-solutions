import * as cdk from "aws-cdk-lib";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as workspaces from "aws-cdk-lib/aws-workspaces";
import { Construct } from "constructs";
import { Bundles, ComputeType, OperatingSystem, RunningMode } from "./types";
import { SSM_PARAM } from "../directory/constants";
import { Parameter } from "aws-cdk-lib/aws-appconfig";

export class WorkspacesProductStack extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const pUsername = new cdk.CfnParameter(this, "pUsername", {
      description:
        "The username of an existant user in the AD to provision the workspace for.",
      type: "String",
    });

    const pWorkspaceBundle = new cdk.CfnParameter(this, "pOperatingSystem", {
      description:
        "The workspace operating system that you want to provision as a developer environment.",
      allowedValues: [OperatingSystem.RHEL_8, OperatingSystem.WINDOWS_10],
    });

    const pHardware = new cdk.CfnParameter(this, "pHadware", {
      description:
        "The hardware size to provision for your workspace. (vCPU, GB of memory)",
      allowedValues: [
        ComputeType.Value,
        ComputeType.Standard,
        ComputeType.Performance,
        ComputeType.Power,
      ],
      default: ComputeType.Performance,
    });

    const directoryId = ssm.StringParameter.valueForTypedStringParameterV2(
      this,
      SSM_PARAM.DIRECTORY_ID
    );

    this.templateOptions.metadata = {
      "AWS::CloudFormation::Interface": {
        ParameterGroups: [
          {
            Label: { default: "Workspace Options" },
            Parameters: [
              pUsername.logicalId,
              pWorkspaceBundle.logicalId,
              pHardware.logicalId,
            ],
          },
        ],
      },
    };

    const mWorkspaceBundlesMapping = new cdk.CfnMapping(
      this,
      "mWorkspaceBundlesMapping",
      {
        mapping: Bundles,
      }
    );

    const bundle = mWorkspaceBundlesMapping.findInMap(
      pHardware.valueAsString,
      pWorkspaceBundle.valueAsString
    );

    /**
     * Networking requirements: https://docs.aws.amazon.com/workspaces/latest/adminguide/workspaces-port-requirements.html
     *
     */

    // Create a unique KMS key for the volume encryption of the workspace
    // const symmetricKey = new kms.Key(this, "rVolumeEncryptionKey", {
    //   description: "Volume encryption symmetric key for the AWS Workspace",
    //   enableKeyRotation: true,
    //   //   policy: "" // TODO: Add policy for workspace access
    //   removalPolicy: RemovalPolicy.DESTROY,
    // });

    // Create a workspace to deploy VDIs into
    const workspace = new workspaces.CfnWorkspace(this, "rWorkspace", {
      // Workspace ownership
      directoryId: directoryId,
      userName: pUsername.valueAsString,

      // Encryption Configuraiton
      // rootVolumeEncryptionEnabled: true,
      // userVolumeEncryptionEnabled: true,
      // volumeEncryptionKey: symmetricKey.keyId,

      // VDI Configurations
      bundleId: bundle,
      workspaceProperties: {
        runningMode: RunningMode.AUTO_STOP,
      },
    });

    new cdk.CfnOutput(this, "oBundleId", {
      key: "BundleId",
      value: workspace.bundleId,
    });

    new cdk.CfnOutput(this, "oWorkspaceId", {
      key: "WorkspaceId",
      value: workspace.ref,
    });
  }
}
