import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

export function getParameter(
  parameterName: string,
  region: string
): Promise<string | void> {
  console.debug(`DEBUG: Attempting to get SSM parameter: ${parameterName}`);
  return new SSMClient({ region })
    .send(
      new GetParameterCommand({
        Name: parameterName,
      })
    )
    .then(
      (data) => {
        console.log(
          `INFO: SSM parameter ${parameterName} found: ${data.Parameter?.Value}`
        );
        return data.Parameter?.Value;
      },
      (error) => {
        console.error(
          `ERROR: Could not get SSM parameter ${parameterName}:`,
          error
        );
      }
    );
}
