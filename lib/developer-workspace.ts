import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bundles, WorkspaceConstruct } from "./workspace-construct";

export interface DeveloperWorkspaceStackProps extends cdk.StackProps {
  directoryId: string;
}

export class DeveloperWorkspaceStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: DeveloperWorkspaceStackProps
  ) {
    super(scope, id, props);

    new WorkspaceConstruct(this, "rWorkspace", {
      directoryId: props?.directoryId,
      workspaceBundle: Bundles.RHEL8_STANDARD,
    });
  }
}
