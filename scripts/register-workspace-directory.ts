import {
  WorkSpacesClient,
  RegisterWorkspaceDirectoryCommand,
  UserIdentityType,
  WorkspaceType,
} from "@aws-sdk/client-workspaces";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { SSM_PARAM as DIRECTORY_SSM_PARAM } from "../lib/directory/constants";
import { SSM_PARAM as VPC_SSM_PARAM } from "../lib/vpc";

const region = process.env.AWS_REGION ?? "us-east-1"; // Default to us-east-1 if not set

function getParameter(parameterName: string): Promise<string | void> {
  return new SSMClient({ region })
    .send(
      new GetParameterCommand({
        Name: parameterName,
      })
    )
    .then(
      (data) => {
        return data.Parameter?.Value;
      },
      (error) => {
        console.error(`Error getting param ${parameterName}:`, error);
      }
    );
}

async function registerWorkspaceDirectory() {
  const directoryId = await getParameter(DIRECTORY_SSM_PARAM.DIRECTORY_ID);
  if (!directoryId) {
    throw new Error(
      `Directory Id does not exist: ${DIRECTORY_SSM_PARAM.DIRECTORY_ID}`
    );
  }

  const workspaceSubnetIds = await getParameter(
    VPC_SSM_PARAM.WORKSPACE_SUBNET_IDS
  );
  if (!workspaceSubnetIds) {
    throw new Error(
      `Workspace Subnet Ids do not exist: ${VPC_SSM_PARAM.WORKSPACE_SUBNET_IDS}`
    );
  }

  try {
    await new WorkSpacesClient({ region }).send(
      new RegisterWorkspaceDirectoryCommand({
        DirectoryId: directoryId,
        SubnetIds: workspaceSubnetIds.split(",").slice(0, 2),
        EnableSelfService: true,
        UserIdentityType: UserIdentityType.AWS_DIRECTORY_SERVICE,
        WorkspaceType: WorkspaceType.PERSONAL,
      })
    );
    console.log("Succesfully registered the workspace directory!");
  } catch (error) {
    throw new Error(`Error registering the workspace directory: ${error}`);
  }
}

registerWorkspaceDirectory();
