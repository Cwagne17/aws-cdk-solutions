import { Environment, Region } from "./constants";

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
   * The region where the resource is deployed.
   * @default undefined
   * @see {@link Region}
   */
  region?: string;

  /**
   * Random suffix
   */
  suffix?: string;
}

/**
 * Retrieves the short name for the given AWS region.
 *
 * @param region The AWS region to get the short name for.
 * @returns The short name of the region.
 */
export function getRegionShortName(region: string): string {
  switch (region) {
    case Region.US_EAST_1:
      return "use1";
    case Region.US_WEST_1:
      return "usw1";
    default:
      throw new Error(`Unsupported region: ${region}`);
  }
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
 * Generates a standardized AWS resource name following the pattern:
 * [prefix-]<usage>-<env>-<resource>[-region][-suffix]
 *
 * If env is not provided, defaults to Environment.DEV
 */
export function generateResourceName(props: ResourceNamingProps): string {
  if (props.prefix) {
    validateComponent(props.prefix, /^[a-z0-9]{6}$/, "prefix");
  }

  validateComponent(props.usage, /^[a-z0-9-]{1,30}$/, "usage");

  const env = props.env ?? Environment.DEV;

  // Transforms the region to the short name if provided
  const region = props.region ? getRegionShortName(props.region) : undefined;

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
