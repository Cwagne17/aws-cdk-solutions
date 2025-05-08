import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";

export class StateMachineBuilder {
  props: Partial<sfn.StateMachineProps> = {};
  states: sfn.IChainable[] = [];

  constructor() {
    this.props = {};
  }

  public name(name: string): this {
    this.props = { ...this.props, ...{ name } };
    return this;
  }

  public description(description: string): this {
    this.props = { ...this.props, ...{ comment: description } };
    return this;
  }

  public role(role: iam.IRole): this {
    this.props = { ...this.props, ...{ role } };
    return this;
  }

  /**
   * Configures customer managed encryption instead of using AWS
   * default managed encryption.
   *
   * @param key customer managed key to encrypt machine states
   */
  public customerManagedEncryption(key: kms.IKey): this {
    this.props = {
      ...this.props,
      ...{
        encryptionConfiguration: new sfn.CustomerManagedEncryptionConfiguration(
          key,
          cdk.Duration.seconds(60)
        ),
      },
    };
    return this;
  }

  public logs(destination: logs.ILogGroup): this {
    this.props = {
      ...this.props,
      ...{
        logs: {
          destination,
          includeExecutionData: true,
          level: sfn.LogLevel.ALL,
        },
      },
    };
    return this;
  }

  addStates(...states: sfn.IChainable[]): this {
    if (states.length == 0) {
      throw new Error("State machine must have at least one state");
    }

    this.props = {
      ...this.props,
      ...{
        definitionBody: sfn.DefinitionBody.fromChainable(
          sfn.Chain.start(states[0])
        ),
      },
    };
    return this;
  }

  build(scope: Construct, id: string): sfn.StateMachine {
    return new sfn.StateMachine(scope, id, this.props);
  }
}
