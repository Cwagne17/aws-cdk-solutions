import * as cdk from "aws-cdk-lib";

type Mapping = {
  [k1: string]: {
    [k2: string]: any;
  };
};

export const Bundles: Mapping = {
  Value: {
    RHEL8: "tbd",
    Windows10: "tbd",
  },
  Standard: {
    RHEL8: "wsb-8wthbqzhx",
    Windows10: "tbd",
  },
  Performance: {
    RHEL8: "tbd",
    Windows10: "tbd",
  },
};

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
