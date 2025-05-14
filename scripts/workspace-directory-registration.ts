const arg = require("arg");
import {
  WorkSpacesClient,
  RegisterWorkspaceDirectoryCommand,
  DeregisterWorkspaceDirectoryCommand,
} from "@aws-sdk/client-workspaces";
import {
  DirectoryServiceClient,
  EnableDirectoryDataAccessCommand,
} from "@aws-sdk/client-directory-service";
import { getParameter } from "./shared";
import { SSM_PARAM } from "../lib/shared";

const region = process.env.AWS_REGION ?? "us-east-1"; // Default to us-east-1 if not set

async function registerWorkspaceDirectory() {
  const directoryId = await getParameter(
    SSM_PARAM.DIRECTORY_SERVICE.DIRECTORY_ID,
    region
  );
  if (!directoryId) {
    throw new Error(
      `ERROR: Directory Id does not exist: ${SSM_PARAM.DIRECTORY_SERVICE.DIRECTORY_ID}`
    );
  }

  const workspaceSubnetIds = await getParameter(
    SSM_PARAM.WORKSPACES.SUBNET_IDS,
    region
  );
  if (!workspaceSubnetIds) {
    throw new Error(
      `ERROR: Workspace Subnet Ids do not exist: ${SSM_PARAM.WORKSPACES.SUBNET_IDS}`
    );
  }

  try {
    await new DirectoryServiceClient({ region }).send(
      new EnableDirectoryDataAccessCommand({
        DirectoryId: directoryId,
      })
    );
    console.log(
      "INFO: Enabled Directory data access to enable creating users via API."
    );
  } catch (error) {
    throw new Error(`ERROR: Could not enable directory data access: ${error}`);
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
  const directoryId = await getParameter(
    SSM_PARAM.DIRECTORY_SERVICE.DIRECTORY_ID,
    region
  );
  if (!directoryId) {
    throw new Error(
      `ERROR: Directory Id does not exist: ${SSM_PARAM.DIRECTORY_SERVICE.DIRECTORY_ID}`
    );
  }

  try {
    await new WorkSpacesClient({ region }).send(
      new DeregisterWorkspaceDirectoryCommand({
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
