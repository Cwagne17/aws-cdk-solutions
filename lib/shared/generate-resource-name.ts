import { Globals } from "../core";
import { Region } from "./constants";

/**
 * Retrieves the short name for the given AWS region.
 *
 * @param region The AWS region to get the short name for.
 * @returns The short name of the region.
 */
function getRegionShortName(region: string): string {
  switch (region) {
    case Region.US_EAST_1:
      return "use1";
    case Region.US_EAST_2:
      return "use2";
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
 * Generates a standardized resource name
 *
 * @param description what the resource is used for (alphanumeric and hyphens)
 * @returns the resource name
 */
export function generateResourceName(description: string): string {
  if (Globals.prefix) {
    validateComponent(Globals.prefix, /^[a-z0-9]{6}$/, "prefix");
  }

  validateComponent(description, /^[a-z0-9-]$/, "usage");

  // Transforms the region to the short name if provided
  const region = getRegionShortName(Globals.region);

  // Remove undefined/null values
  const components = [
    Globals.prefix,
    Globals.environment,
    description,
    region,
  ].filter(Boolean);

  // Compose the resource name
  return components.join("-");
}
