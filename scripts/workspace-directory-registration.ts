const arg = require("arg");
import {
  WorkSpacesClient,
  RegisterWorkspaceDirectoryCommand,
} from "@aws-sdk/client-workspaces";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { SSM_PARAM as DIRECTORY_SSM_PARAM } from "../lib/directory/constants";
import { SSM_PARAM as VPC_SSM_PARAM } from "../lib/vpc";

const region = process.env.AWS_REGION ?? "us-east-1"; // Default to us-east-1 if not set

function getParameter(parameterName: string): Promise<string | void> {
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

async function registerWorkspaceDirectory() {
  const directoryId = await getParameter(DIRECTORY_SSM_PARAM.DIRECTORY_ID);
  if (!directoryId) {
    throw new Error(
      `ERROR: Directory Id does not exist: ${DIRECTORY_SSM_PARAM.DIRECTORY_ID}`
    );
  }

  const workspaceSubnetIds = await getParameter(
    VPC_SSM_PARAM.WORKSPACE_SUBNET_IDS
  );
  if (!workspaceSubnetIds) {
    throw new Error(
      `ERROR: Workspace Subnet Ids do not exist: ${VPC_SSM_PARAM.WORKSPACE_SUBNET_IDS}`
    );
  }

  try {
    await new WorkSpacesClient({ region }).send(
      new RegisterWorkspaceDirectoryCommand({
        DirectoryId: directoryId,
        SubnetIds: workspaceSubnetIds.split(",").slice(0, 2),
      })
    );
    console.log("INFO: Succesfully registered the workspace directory!");
  } catch (error) {
    throw new Error(
      `ERROR: could not register the workspace directory: ${error}`
    );
  }
}

async function deregisterWorkspaceDirectory() {
  const directoryId = await getParameter(DIRECTORY_SSM_PARAM.DIRECTORY_ID);
  if (!directoryId) {
    throw new Error(
      `ERROR: Directory Id does not exist: ${DIRECTORY_SSM_PARAM.DIRECTORY_ID}`
    );
  }

  try {
    await new WorkSpacesClient({ region }).send(
      new RegisterWorkspaceDirectoryCommand({
        DirectoryId: directoryId,
      })
    );
    console.log("INFO: Succesfully deregistered the workspace directory!");
  } catch (error) {
    throw new Error(
      `ERROR: could not deregister the workspace directory: ${error}`
    );
  }
}

const REGISTER = "register";
const DEREGISTER = "deregister";

function help() {
  console.log(`
Workspace Directory Registration Script

This script will register an existing Active Directory instance
with Amazon Workspaces so that Personal Workspaces can be provisioned
for users with accounts within the registered directory.

Usage:
  ts-node workspace-directory-registration.ts --action <action>

  or

  npm run workspace-directory -- --action <action>

Actions:
  ${REGISTER}    Register the workspace directory with Amazon WorkSpaces.
  ${DEREGISTER}  Deregister the workspace directory from Amazon Work
  `);
}

const args = arg({
  "--action": String,
  "-a": "--action",
});
const action = args["--action"] ?? REGISTER;

switch (action) {
  case REGISTER:
    console.debug("DEBUG: Registering the directory from Workspaces.");
    registerWorkspaceDirectory();
    break;
  case DEREGISTER:
    console.debug("DEBUG: Deregistering the directory from Workspaces.");
    deregisterWorkspaceDirectory();
    break;
  default:
    help();
}
