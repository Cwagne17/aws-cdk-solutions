#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { WorkspacesPortfolioStack } from "../lib/workspaces";
import { VpcStack } from "../lib/vpc";
import { ActiveDirectoryStack } from "../lib/directory";
import { WorkspacesSSMActivationStack } from "../lib/ssm";

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

const portfolio = new WorkspacesPortfolioStack(
  app,
  `${projectName}WorkspaceProduct`,
  props
);

const workspaceSsmActiviation = new WorkspacesSSMActivationStack(
  app,
  `${projectName}WorkspaceSSMActivation`
);

directory.addDependency(
  vpc,
  "The directory depends on the Vpc SSM params to exist."
);

portfolio.addDependency(
  directory,
  "The portfolio depends on the Directory Id SSM param to exist."
);
