import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { SSM_PARAM, SUBNET_NAMES } from "./constants";

export class VpcStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const availabilityZones = this.getAvailabilityZones(this.region);

    this.logGroup = new logs.LogGroup(this, "rVpcFlowlogsGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
      logGroupClass: logs.LogGroupClass.INFREQUENT_ACCESS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.vpc = new ec2.Vpc(this, "rVpc", {
      natGateways: 1,
      availabilityZones: availabilityZones,
      subnetConfiguration: [
        {
          name: SUBNET_NAMES.ACTIVE_DIRECTORY,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        {
          name: SUBNET_NAMES.WORKSPACE,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: SUBNET_NAMES.EKS_NODE_GROUP,
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          name: SUBNET_NAMES.INGRESS,
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
      flowLogs: {
        cloudwatchFlowLogs: {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(this.logGroup),
        },
      },
    });

    // Create SSM Parameters
    new ssm.StringParameter(this, "rVpcIdParam", {
      parameterName: SSM_PARAM.VPC_ID,
      stringValue: this.vpc.vpcId,
    });

    new ssm.StringListParameter(this, "rDirectorySubnetIdsParam", {
      parameterName: SSM_PARAM.DIRECTORY_SUBNET_IDS,
      stringListValue: this.vpc
        .selectSubnets({
          subnetGroupName: SUBNET_NAMES.ACTIVE_DIRECTORY,
        })
        .subnetIds.slice(0, 2),
    });

    new ssm.StringListParameter(this, "rEksNodeGroupSubnetIdsParam", {
      parameterName: SSM_PARAM.EKS_NODE_GROUP_SUBNET_IDS,
      stringListValue: this.vpc.selectSubnets({
        subnetGroupName: SUBNET_NAMES.EKS_NODE_GROUP,
      }).subnetIds,
    });

    new ssm.StringListParameter(this, "rWorkspaceSubnetIdsParam", {
      parameterName: SSM_PARAM.WORKSPACE_SUBNET_IDS,
      stringListValue: this.vpc.selectSubnets({
        subnetGroupName: SUBNET_NAMES.WORKSPACE,
      }).subnetIds,
    });
  }

  /**
   * Amazon Workspaces is only available in certain regions. This will return the
   * availability zones that are supported for the region.
   * https://docs.aws.amazon.com/workspaces/latest/adminguide/azs-workspaces.html
   *
   * @param region the AWS region that the solution is being provisioned in
   */
  getAvailabilityZones(region: string) {
    switch (region) {
      case "us-east-1":
        return ["us-east-1a", "us-east-1c", "us-east-1d"];
      case "us-west-2":
        return ["us-east-2a", "us-east-2b", "us-east-2c"];
      default:
        throw new cdk.ValidationError(
          `${region} unsupported by VpcStack...`,
          this
        );
    }
  }
}
