const arg = require("arg");
import {
  DirectoryServiceDataClient,
  CreateUserCommand,
} from "@aws-sdk/client-directory-service-data";
import {
  DirectoryServiceClient,
  ResetUserPasswordCommand,
} from "@aws-sdk/client-directory-service";
import {
  DescribeWorkspaceDirectoriesCommand,
  WorkSpacesClient,
} from "@aws-sdk/client-workspaces";
import { SSM_PARAM } from "../lib/util";
import { getParameter } from "./shared";
import generator from "generate-password-ts";
const region = process.env.AWS_REGION ?? "us-east-1"; // Default to us-east-1 if not set

interface User {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

async function createUser(user: User): Promise<void> {
  const directoryId = await getParameter(SSM_PARAM.DIRECTORY_ID, region);
  if (!directoryId) {
    throw new Error(
      `ERROR: Directory Id does not exist: ${SSM_PARAM.DIRECTORY_ID}`
    );
  }

  try {
    await new DirectoryServiceDataClient({ region }).send(
      new CreateUserCommand({
        DirectoryId: directoryId,
        SAMAccountName: user.username,
        EmailAddress: user.email,
        GivenName: user.firstName,
        Surname: user.lastName,
      })
    );
  } catch (error) {
    throw new Error(`ERROR: Could not create user ${user.username}: ${error}`);
  }

  try {
    const workspaceDirectories = await new WorkSpacesClient({ region }).send(
      new DescribeWorkspaceDirectoriesCommand({
        DirectoryIds: [directoryId],
      })
    );

    if (workspaceDirectories.Directories?.length != 1) {
      throw new Error("No workspace directories found!");
    }

    const registrationCode =
      workspaceDirectories.Directories[0].RegistrationCode;
    console.log(
      `INFO: Use the registration code ${registrationCode} to login to the workspaces client.`
    );
  } catch (error) {
    throw new Error(
      `ERROR: Could not describe workspace directories: ${error}`
    );
  }

  const temporaryPassword = generator.generate({
    length: 14,
    numbers: true,
    symbols: true,
    uppercase: true,
  });
  try {
    await new DirectoryServiceClient({ region }).send(
      new ResetUserPasswordCommand({
        DirectoryId: directoryId,
        UserName: user.username,
        NewPassword: temporaryPassword,
      })
    );
    console.log(
      `INFO: User ${user.username} was ENABLED and the temporary password ${temporaryPassword} was created.`
    );
  } catch (error) {
    throw new Error(
      `ERROR: ${user.username} could not be enabled. Please reach out to an admin: ${error}`
    );
  }
}

const args = arg({
  "--email": String,
  "-e": "--email",

  "--username": String,
  "-u": "--username",

  "--firstname": String,
  "-f": "--firstname",

  "--lastname": String,
  "-l": "--lastname",
});

createUser({
  email: args["--email"],
  username: args["--username"],
  firstName: args["--firstname"],
  lastName: args["--lastname"],
});
