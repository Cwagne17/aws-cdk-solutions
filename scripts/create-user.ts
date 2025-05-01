const arg = require("arg");
import {
  DirectoryServiceDataClient,
  CreateUserCommand,
} from "@aws-sdk/client-directory-service-data";
import { SSM_PARAM as DIRECTORY_SSM_PARAM } from "../lib/directory/constants";
import { getParameter } from "./shared";
const region = process.env.AWS_REGION ?? "us-east-1"; // Default to us-east-1 if not set

interface User {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

async function createUser(user: User): Promise<void> {
  const directoryId = await getParameter(
    DIRECTORY_SSM_PARAM.DIRECTORY_ID,
    region
  );
  if (!directoryId) {
    throw new Error(
      `ERROR: Directory Id does not exist: ${DIRECTORY_SSM_PARAM.DIRECTORY_ID}`
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
