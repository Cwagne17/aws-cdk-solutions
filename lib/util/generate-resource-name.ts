import { Environment, RegionCode } from "./constants";

/**
 * Interface for resource naming parameters
 */
export interface ResourceNamingProps {
  /**
   * Fixed prefix for the resource name (<= 6 lowercase alphanumeric characters)
   */
  prefix?: string;

  /**
   * Project name (4-10 lowercase alphanumeric characters)
   */
  project: string;

  /**
   * Environment (e.g. prod, dev, test, staging)
   * @default dev
   * @see {@link Environment}
   */
  env: Environment;

  /**
   * Short resource name for the type of resource (e.g. policy, sg)
   */
  resource: string;

  /**
   * Resource location (e.g. use1, usw1)
   * @default use1
   * @see {@link RegionCode}
   */
  location?: RegionCode;

  /**
   * Random suffix (4 lowercase alphanumeric characters)
   */
  suffix?: string;
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
 * Generates a standardized AWS resource name
 */
export function generateResourceName(props: ResourceNamingProps): string {
  if (props.prefix) {
    validateComponent(props.prefix, /^[a-z0-9]{6}$/, "prefix");
  }

  validateComponent(props.project, /^[a-z0-9]{4,10}$/, "project");

  validateComponent(props.env, /^[a-z0-9]{1,12}$/, "resource");

  if (props.location) {
    validateComponent(props.location, /^[a-z0-9]{1,6}$/, "location");
  }

  if (props.suffix) {
    validateComponent(props.suffix, /^[a-z0-9]{4}$/, "suffix");
  }

  // Remove undefined/null values
  const components = [
    props.prefix,
    props.project,
    props.env,
    props.resource,
    props.location,
    props.suffix,
  ].filter(Boolean);

  // Compose the resource name
  return components.join("-");
}
