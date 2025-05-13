// lib/getCallerRoleName.ts
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

/**
 * Extracts the assumed IAM or SSO role name from the current identity ARN.
 */
export async function getCallerRoleName(): Promise<string> {
  const sts = new STSClient({});
  const identity = await sts.send(new GetCallerIdentityCommand({}));

  const arn = identity.Arn;
  if (!arn) throw new Error("ARN not found in STS response.");

  // Match: arn:aws:sts::123456789012:assumed-role/AWSReservedSSO_AdminAccess_xyz/user@example.com
  const match = arn.match(/assumed-role\/([^/]+)\//);
  if (!match) throw new Error(`Unable to parse role from ARN: ${arn}`);

  return match[1];
}
