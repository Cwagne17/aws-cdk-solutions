import { Fact, RegionInfo } from "aws-cdk-lib/region-info";
import { Environment } from "../shared";

export interface GlobalConfig {
  /**
   * The 12 digit AWS account id
   */
  readonly account: string;

  /**
   * The region where the resource is deployed.
   */
  readonly region: string;

  /**
   * Environment (e.g. prod, dev, test, staging)
   * @default Environment.DEV
   * @see {@link Environment}
   */
  readonly environment: Environment;

  /**
   * Short prerfix for all resources
   */
  readonly prefix?: string;
}

export class Globals {
  static config: GlobalConfig;

  static initialize(config: GlobalConfig) {
    if (!/^\d{12}$/.test(config.account)) {
      throw new Error(`Invalid AWS Account ID: ${config.account}`);
    }

    // Checks that the region exists
    if (Fact.regions.includes(config.region)) {
      throw new Error(`Invalid AWS region: ${config.region} does not exist`);
    }

    // Checks that the region is opted-in
    if (!RegionInfo.get(config.region).isOptInRegion) {
      throw new Error(`Invalid AWS region: ${config.region} is not opted in`);
    }

    this.config = config;
  }

  static get account(): string {
    return this.config.account;
  }

  static get region(): string {
    return this.config.region;
  }

  static get environment(): string {
    return this.config.environment;
  }

  static get prefix(): string | undefined {
    return this.config.prefix;
  }
}
