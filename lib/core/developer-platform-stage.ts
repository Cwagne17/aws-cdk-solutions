import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcStack } from "../vpc";
import { ActiveDirectoryStack } from "../directory";
import { WorkspacesPortfolioStack } from "../workspaces";
import { WorkspacesActivationStack } from "../ssm";

export class DeveloperPlatformStage extends cdk.Stage {
  readonly vpcStack: VpcStack;

  constructor(scope: Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);

    const vpc = new VpcStack(this, `Vpc`, props);

    const directory = new ActiveDirectoryStack(this, `Directory`, {
      vpc: vpc.vpc,
      subnets: vpc.activeDirectorySubnets,
    });
    directory.addDependency(
      vpc,
      "The directory depends on the Vpc SSM params to exist."
    );

    const portfolio = new WorkspacesPortfolioStack(this, `WorkspaceProduct`);
    portfolio.addDependency(
      directory,
      "The portfolio depends on the Directory Id SSM param to exist."
    );

    const workspaceActiviation = new WorkspacesActivationStack(
      this,
      `WorkspaceSSMActivation`,
      {
        apiGatewayEndpoint: vpc.apiGatewayEndpoint,
      }
    );
    workspaceActiviation.addDependency(
      vpc,
      "The workspace activation stack depends on the VPC API endpoint to exist."
    );
  }
}
