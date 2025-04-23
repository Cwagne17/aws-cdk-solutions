import { Construct } from "constructs";
import {
  aws_workspaces as workspaces,
  aws_kms as kms,
  RemovalPolicy,
} from "aws-cdk-lib";

export enum Bundles {
  RHEL8_STANDARD = "wsb-8wthbqzhx",
}

export enum ComputeTypeName {
  VALUE = "VALUE",
  STANDARD = "STANDARD",
  PERFORMANCE = "PERFORMANCE",
  POWER = "POWER",
  GRAPHICS = "GRAPHICS",
  POWERPRO = "POWERPRO",
  GENERALPURPOSE_4XLARGE = "GENERALPURPOSE_4XLARGE",
  GENERALPURPOSE_8XLARGE = "GENERALPURPOSE_8XLARGE",
  GRAPHICSPRO = "GRAPHICSPRO",
  GRAPHICS_G4DN = "GRAPHICS_G4DN",
  GRAPHICSPRO_G4DN = "GRAPHICSPRO_G4DN",
}

export enum RunningMode {
  AUTO_STOP = "AUTO_STOP",
  ALWAYS_ON = "ALWAYS_ON",
  MANUAL = "MANUAL",
}

export interface WorkspaceProps {
  rootVolumeSizeGib: number;
}

export class WorkspaceConstruct extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create a unique KMS key for the volume encryption of the workspace
    const symmetricKey = new kms.Key(this, "rVolumeEncryptionKey", {
      description: "Volume encryption symmetric key for the AWS Workspace",
      enableKeyRotation: true,
      //   policy: "" // TODO: Add policy for workspace access
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create a workspace to deploy VDIs into
    const cfnWorkspace = new workspaces.CfnWorkspace(this, "rWorkspace", {
      bundleId: Bundles.RHEL8_STANDARD,
      directoryId: "",
      rootVolumeEncryptionEnabled: true,
      userName: "chris",
      userVolumeEncryptionEnabled: true,
      volumeEncryptionKey: symmetricKey.keyId,
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
