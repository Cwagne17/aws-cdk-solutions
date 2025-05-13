import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { VpcStack } from "../vpc-stack";
import { MicrosoftActiveDirectoryStack } from "../microsoft-active-directory-stack";
import { WorkspacesPortfolioStack } from "../workspaces-portfolio-stack";
import { WorkspaceHybridActivationStack } from "../workspaces-hybrid-activation-stack";
import { GlobalConfig, Globals } from "../shared/globals";

export interface DeveloperPlatformStageProps
  extends GlobalConfig,
    cdk.StageProps {}

export class DeveloperPlatformStage extends cdk.Stage {
  readonly vpcStack: VpcStack;

  constructor(
    scope: Construct,
    id: string,
    props: DeveloperPlatformStageProps
  ) {
    super(scope, id, props);

    Globals.initialize({
      account: props.account,
      region: props.region,
      environment: props.environment,
      callerRoleName: props.callerRoleName,
    });

    const stackProps = { env: { region: Globals.region } };

    const vpc = new VpcStack(this, `Vpc`, stackProps);

    const directory = new MicrosoftActiveDirectoryStack(this, `Directory`, {
      ...stackProps,
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

    const workspaceActiviation = new WorkspaceHybridActivationStack(
      this,
      `WorkspaceHybridActivation`,
      {
        ...stackProps,
        apiGatewayEndpoint: vpc.apiGatewayEndpoint,
      }
    );
    workspaceActiviation.addDependency(
      vpc,
      "The workspace activation stack depends on the VPC API endpoint to exist."
    );
  }
}
