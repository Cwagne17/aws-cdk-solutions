#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeveloperPlatformStage } from "../lib/core/developer-platform-stage";
import { Environment, Region } from "../lib/shared";

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION ?? Region.US_EAST_1;

const app = new cdk.App();

new DeveloperPlatformStage(app, "Dev", {
  account,
  region,
});

new DeveloperPlatformStage(app, "Prod", {
  account,
  region,
  environment: Environment.PROD,
});
