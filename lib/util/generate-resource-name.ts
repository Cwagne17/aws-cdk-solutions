import { Environment, RegionCode } from "./constants";
import * as cdk from "aws-cdk-lib";

/**
 * Interface for resource naming parameters
 */
export interface ResourceNamingProps {
  /**
   * Fixed prefix for the resource name
   */
  prefix?: string;

  /**
   * Usage of the resource
   */
  usage: string;

  /**
   * Environment (e.g. prod, dev, test, staging)
   * @default Environment.DEV
   * @see {@link Environment}
   */
  env?: Environment;

  /**
   * Short resource name for the type of resource (e.g. policy, sg)
   */
  resource: string;

  /**
   * Resource region code (e.g. use1, usw1)
   * Will be automatically determined from Stack's region if not provided
   * @see {@link RegionCode}
   */
  region?: RegionCode;

  /**
   * Random suffix
   */
  suffix?: string;

  /**
   * Optional Stack to determine region from, if region is not provided
   */
  stack?: cdk.Stack;
}

/**
 * Validates input string against allowed pattern
 */
function validateComponent(
  value: string,
  pattern: RegExp,
  componentName: string
): void {
  if (!pattern.test(value)) {
    throw new Error(
      `Invalid ${componentName}: ${value}. Does not match required pattern ${pattern}.`
    );
  }
}

/**
 * Maps an AWS region to the corresponding RegionCode
 */
function getRegionCode(region: string): RegionCode {
  switch (region) {
    case "us-east-1":
      return RegionCode.US_EAST_1;
    case "us-west-1":
      return RegionCode.US_WEST_1;
    default:
      throw new Error(`Unsupported region: ${region}`);
  }
}

/**
 * Generates a standardized AWS resource name following the pattern:
 * [prefix-]<usage>-<env>-<resource>[-location][-suffix]
 *
 * If env is not provided, defaults to Environment.DEV
 * If location is not provided, attempts to determine it from the stack's region
 */
export function generateResourceName(props: ResourceNamingProps): string {
  if (props.prefix) {
    validateComponent(props.prefix, /^[a-z0-9]{6}$/, "prefix");
  }

  validateComponent(props.usage, /^[a-z0-9-]{1,20}$/, "usage");

  const env = props.env ?? Environment.DEV;

  // Sets the
  let region = props.region;
  if (!region && props.stack) {
    region = getRegionCode(props.stack.region);
  }

  if (region) {
    validateComponent(region, /^[a-z0-9]{1,6}$/, "region");
  }

  if (props.suffix) {
    validateComponent(props.suffix, /^[a-z0-9]{12}$/, "suffix");
  }

  // Remove undefined/null values
  const components = [
    props.prefix,
    props.usage,
    env,
    props.resource,
    region,
    props.suffix,
  ].filter(Boolean);

  // Compose the resource name
  return components.join("-");
}
