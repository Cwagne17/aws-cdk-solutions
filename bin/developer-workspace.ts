#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeveloperWorkspaceStack } from "../lib/developer-workspace";

const region = process.env.CDK_DEFAULT_REGION ?? "us-east-1";

const app = new cdk.App();
new DeveloperWorkspaceStack(app, "DeveloperWorkspaceStack", {
  directoryId: "",
});
