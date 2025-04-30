type Mapping = {
  [k1: string]: {
    [k2: string]: any;
  };
};

export enum ComputeType {
  Value = "Value",
  Standard = "Standard",
  Performance = "Performance",
  Power = "Power",
}

export enum OperatingSystem {
  WINDOWS_10 = "Windows10",
  RHEL_8 = "RHEL8",
}

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

export enum RunningMode {
  AUTO_STOP = "AUTO_STOP",
  ALWAYS_ON = "ALWAYS_ON",
  MANUAL = "MANUAL",
}
