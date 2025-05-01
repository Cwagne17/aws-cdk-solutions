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
    RHEL8: "wsb-hflmxmbbz",
    Windows10: "wsb-fb2xfp6r8",
  },
  Standard: {
    RHEL8: "wsb-8wthbqzhx",
    Windows10: "wsb-93xk71ss4",
  },
  Performance: {
    RHEL8: "wsb-5s0yn651c",
    Windows10: "wsb-gqbt42cw7",
  },
  Power: {
    RHEL8: "wsb-w8yg9jx6t",
    Windows10: "wsb-g72p36ch9",
  },
};

export enum RunningMode {
  AUTO_STOP = "AUTO_STOP",
  ALWAYS_ON = "ALWAYS_ON",
  MANUAL = "MANUAL",
}
