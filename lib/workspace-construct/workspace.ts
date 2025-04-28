import { Construct } from "constructs";
import {
  aws_workspaces as workspaces,
  aws_kms as kms,
  RemovalPolicy,
} from "aws-cdk-lib";
import { Bundles, ComputeTypeName, RunningMode } from "./types";

export interface WorkspaceProps {
  directoryId: string;

  workspaceBundle: Bundles;

  rootVolumeSizeGib?: number;
}

export class WorkspaceConstruct extends Construct {
  constructor(scope: Construct, id: string, props: WorkspaceProps) {
    super(scope, id);

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
      directoryId: props.directoryId,
      userName: "chris",

      // Encryption Configuraiton
      // rootVolumeEncryptionEnabled: true,
      // userVolumeEncryptionEnabled: true,
      // volumeEncryptionKey: symmetricKey.keyId,

      // VDI Configurations
      bundleId: props.workspaceBundle,
      workspaceProperties: {
        computeTypeName: ComputeTypeName.STANDARD,
        rootVolumeSizeGib: 80,
        runningMode: RunningMode.AUTO_STOP,
        runningModeAutoStopTimeoutInMinutes: 60,
        userVolumeSizeGib: 100,
      },
    });
  }
}
