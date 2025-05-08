#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeveloperPlatformStage } from "../lib/core/developer-platform-stage";
import { Globals } from "../lib/core";
import { Environment } from "../lib/shared";

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION! ?? "us-east-1";

Globals.initialize({
  account,
  region,
  environment: Environment.DEV,
});

const app = new cdk.App({ context: { account, region } });

new DeveloperPlatformStage(app, "Dev");
