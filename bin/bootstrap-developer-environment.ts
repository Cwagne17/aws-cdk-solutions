#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { BootstrapDeveloperEnvironmentStack } from "../lib/bootstrap-developer-environment";

const region = process.env.CDK_DEFAULT_REGION ?? "us-east-1";

const app = new cdk.App();
new BootstrapDeveloperEnvironmentStack(
  app,
  "BootstrapDeveloperEnvironmentStack",
  {
    env: { region },
  }
);

// Register the directory with Amazon Workspaces using the following command
// aws workspaces register-workspace-directory --directory-id <directoryId> --subnet-ids <subnet1> <subnet2>
