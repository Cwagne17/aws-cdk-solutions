import { RegionInfo } from "aws-cdk-lib/region-info";
import { Environment } from "./constants";

export interface GlobalConfig {
  /**
   * The 12 digit AWS account id
   */
  account: string;

  /**
   * The AWS region to deploy resources in
   */
  region: string;

  /**
   * The name of the assumed role the current
   * caller identity has assumed to deploy the
   * CDK stack
   */
  callerRoleName: string;

  /**
   * Environment (e.g. prod, dev, test, staging)
   * @default Environment.DEV
   * @see {@link Environment}
   */
  environment?: Environment;

  /**
   * Short prerfix for all resources
   */
  prefix?: string;
}

export class Globals {
  static config: GlobalConfig;

  static initialize(config: GlobalConfig) {
    if (!/^\d{12}$/.test(config.account)) {
      throw new Error(`Invalid AWS Account ID: ${config.account}`);
    }

    // Checks that the region exists
    const region = RegionInfo.get(config.region);
    if (!region) {
      throw new Error(`Invalid AWS region: ${config.region} does not exist`);
    }

    // Set the default value for the environment to Dev
    config.environment = config.environment ?? Environment.DEV;

    this.config = config;
  }

  static get account(): string {
    return this.config.account;
  }

  static get region(): string {
    return this.config.region;
  }

  static get callerRoleName(): string {
    return this.config.callerRoleName;
  }

  static get environment(): string {
    return this.config.environment!;
  }

  static get prefix(): string | undefined {
    return this.config.prefix;
  }
}
