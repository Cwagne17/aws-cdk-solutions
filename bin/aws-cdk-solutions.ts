#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeveloperWorkspaceProductStack } from "../lib/workspaces/developer-workspace-product-stack";
import { VpcStack } from "../lib/vpc";
import { ActiveDirectoryStack } from "../lib/directory/directory-stack";

const app = new cdk.App();

const projectName = "DeveloperEnvironmentPlatform";
const props = {
  env: { region: process.env.CDK_DEFAULT_REGION ?? "us-east-1" },
};

const vpc = new VpcStack(app, `${projectName}Vpc`, props);

const directory = new ActiveDirectoryStack(
  app,
  `${projectName}Directory`,
  props
);

new DeveloperWorkspaceProductStack(
  app,
  `${projectName}WorkspaceProduct`,
  props
);

directory.addDependency(
  vpc,
  "The Active Directory instance references the SSM params from Vpc to deploy into."
);

console.log("Do something next");
