import * as cdk from "aws-cdk-lib";
import * as directoryservice from "aws-cdk-lib/aws-directoryservice";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { SSM_PARAM } from "../shared";

export interface MicrosoftActiveDirectoryStackProps extends cdk.StackProps {
  /**
   * The VPC in which to create the Microsoft Active Directory.
   * @default - No VPC is specified.
   */
  vpc: ec2.IVpc;

  /**
   * The subnets in which to create the Microsoft Active Directory.
   * This property must contain exactly 2 subnets.
   * @default - No subnets are specified.
   */
  subnets: ec2.ISubnet[];
}

/**
 * This stack creates a Microsoft Active Directory in the specified VPC and subnets.
 *
 * @param {cdk.StackProps} props - The stack properties.
 * @param {string} id - The stack ID.
 * @param {Construct} scope - The scope in which this stack is defined.
 */
export class MicrosoftActiveDirectoryStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: MicrosoftActiveDirectoryStackProps
  ) {
    super(scope, id, props);

    // Validate that the length of the subnets is 2
    if (props.subnets.length !== 2) {
      throw new cdk.ValidationError(
        "The activeDirectorySubnets property must contain exactly 2 subnets.",
        this
      );
    }

    const directory = new directoryservice.CfnMicrosoftAD(
      this,
      "rMicrosoftAD",
      {
        edition: "Standard",
        name: "workspace.amazon.com",
        password: "Password123!", // TODO: Currently mock password, should come from SecretsManager
        vpcSettings: {
          subnetIds: props.subnets.map((subnet) => subnet.subnetId),
          vpcId: props.vpc.vpcId,
        },
      }
    );

    new ssm.StringParameter(this, "rWorkspaceSubnetIdsParam", {
      parameterName: SSM_PARAM.DIRECTORY_SERVICE.DIRECTORY_ID,
      stringValue: directory.ref,
    });

    new cdk.CfnOutput(this, "oDirectoryId", {
      description: "The active directory ID",
      key: "DirectoryId",
      value: directory.ref,
    });
  }
}
