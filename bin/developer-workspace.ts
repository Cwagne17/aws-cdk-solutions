#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeveloperWorkspaceProductStack } from "../lib/developer-workspace";

const region = process.env.CDK_DEFAULT_REGION ?? "us-east-1";

const app = new cdk.App();
new DeveloperWorkspaceProductStack(app, "DeveloperWorkspaceStack", {
  env: { region },
});
