#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { DeveloperPlatformStage } from "../lib/developer-platform-stage";
import { Environment, getCallerRoleName, Region } from "../lib/shared";

const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION ?? Region.US_EAST_1;

const app = new cdk.App();

(async () => {
  const callerRoleName = await getCallerRoleName();

  new DeveloperPlatformStage(app, "Dev", {
    account,
    region,
    callerRoleName,
  });

  new DeveloperPlatformStage(app, "Prod", {
    account,
    region,
    environment: Environment.PROD,
    callerRoleName,
  });
})();
