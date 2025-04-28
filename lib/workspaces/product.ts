import * as cdk from "aws-cdk-lib";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import * as workspaces from "aws-cdk-lib/aws-workspaces";
import { Construct } from "constructs";
import { Bundles, RunningMode } from "./types";

export class WorkspacesProduct extends servicecatalog.ProductStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const pEDIPI = new cdk.CfnParameter(this, "pEDIPI", {
      description:
        "The Electronic Data Interchange Personal Identifier, a unique 10-digit number found on the back of your CAC.",
    });

    const pDirectoryId = new cdk.CfnParameter(this, "pDirectoryId", {
      description:
        "The microsoft active directory registered with Amazon Workspaces.",
    });

    const pHardware = new cdk.CfnParameter(this, "pHadware", {
      description: "The hardware size to provision for your workspace.",
      allowedValues: ["Value", "Standard", "Performance"],
    });

    const pWorkspaceBundle = new cdk.CfnParameter(this, "pOperatingSystem", {
      description:
        "The workspace operating system that you want to provision as a developer environment.",
      allowedValues: ["RHEL8", "Windows10"],
    });

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
    const cfnWorkspace = new workspaces.CfnWorkspace(this, "rWorkspace", {
      // Workspace ownership
      directoryId: pDirectoryId.toString(),
      userName: pEDIPI.toString(),

      // Encryption Configuraiton
      // rootVolumeEncryptionEnabled: true,
      // userVolumeEncryptionEnabled: true,
      // volumeEncryptionKey: symmetricKey.keyId,

      // VDI Configurations
      bundleId: bundle,
      workspaceProperties: {
        rootVolumeSizeGib: 80,
        runningMode: RunningMode.AUTO_STOP,
        runningModeAutoStopTimeoutInMinutes: 20,
        userVolumeSizeGib: 100,
      },
    });
  }
}
