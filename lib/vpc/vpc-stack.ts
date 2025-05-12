import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { generateResourceName, SSM_PARAM } from "../util";
import { SUBNET_NAMES } from "./constants";

export class VpcStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly activeDirectorySubnets: ec2.ISubnet[];
  readonly workspaceSubnets: ec2.ISubnet[];
  readonly eksNodeGroupSubnets: ec2.ISubnet[];
  readonly ingressSubnets: ec2.ISubnet[];
  readonly logGroup: logs.LogGroup;
  readonly apiGatewayEndpoint: ec2.InterfaceVpcEndpoint;
  readonly ssmEndpoint: ec2.InterfaceVpcEndpoint;
  readonly ssmMessagesEndpoint: ec2.InterfaceVpcEndpoint;
  readonly s3Endpoint: ec2.GatewayVpcEndpoint;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const availabilityZones = this.getWorkspacesAvailabilityZones(this.region);

    this.logGroup = new logs.LogGroup(this, "rVpcFlowlogsGroup", {
      logGroupName: generateResourceName({
        usage: "vpc",
        resource: "flowlogs",
      }),
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
      parameterName: SSM_PARAM.VPC.VPC_ID,
      stringValue: this.vpc.vpcId,
    });

    new ssm.StringParameter(this, "rVpcCidrParam", {
      parameterName: SSM_PARAM.VPC.VPC_CIDR,
      stringValue: this.vpc.vpcCidrBlock,
    });

    // Set up subnets
    this.activeDirectorySubnets = this.vpc.selectSubnets({
      subnetGroupName: SUBNET_NAMES.ACTIVE_DIRECTORY,
    }).subnets;
    new ssm.StringListParameter(this, "rDirectorySubnetIdsParam", {
      parameterName: SSM_PARAM.DIRECTORY_SERVICE.SUBNET_IDS,
      stringListValue: this.activeDirectorySubnets.map(
        (subnet) => subnet.subnetId
      ),
    });

    this.workspaceSubnets = this.vpc.selectSubnets({
      subnetGroupName: SUBNET_NAMES.WORKSPACE,
    }).subnets;
    new ssm.StringListParameter(this, "rWorkspaceSubnetIdsParam", {
      parameterName: SSM_PARAM.WORKSPACES.SUBNET_IDS,
      stringListValue: this.workspaceSubnets.map((subnet) => subnet.subnetId),
    });

    this.eksNodeGroupSubnets = this.vpc.selectSubnets({
      subnetGroupName: SUBNET_NAMES.EKS_NODE_GROUP,
    }).subnets;
    new ssm.StringListParameter(this, "rEksNodeGroupSubnetIdsParam", {
      parameterName: SSM_PARAM.EKS.NODE_GROUP_SUBNET_IDS,
      stringListValue: this.eksNodeGroupSubnets.map(
        (subnet) => subnet.subnetId
      ),
    });

    this.ingressSubnets = this.vpc.selectSubnets({
      subnetGroupName: SUBNET_NAMES.INGRESS,
    }).subnets;
    new ssm.StringListParameter(this, "rIngressSubnetIdsParam", {
      parameterName: SSM_PARAM.VPC.INGRESS_SUBNET_IDS,
      stringListValue: this.ingressSubnets.map((subnet) => subnet.subnetId),
    });

    // Create VPC endpoints security group
    const vpcEndpointsSecurityGroup = new ec2.SecurityGroup(
      this,
      "rVpcEndpointsSecurityGroup",
      {
        vpc: this.vpc,
        description: "Security group for VPC Endpoints",
        allowAllOutbound: true,
        securityGroupName: generateResourceName({
          usage: "vpcendpoints",
          resource: "sg",
        }),
      }
    );
    vpcEndpointsSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(443),
      "Allow HTTPS traffic from VPC CIDR"
    );

    // Create VPC Endpoints with private DNS enabled
    this.apiGatewayEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      "rAPIGatewayEndpoint",
      {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
        subnets: { subnets: this.workspaceSubnets },
        privateDnsEnabled: true,
        securityGroups: [vpcEndpointsSecurityGroup],
      }
    );

    this.ssmEndpoint = new ec2.InterfaceVpcEndpoint(this, "rSSMEndpoint", {
      vpc: this.vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SSM,
      subnets: { subnets: this.workspaceSubnets },
      privateDnsEnabled: true,
      securityGroups: [vpcEndpointsSecurityGroup],
    });

    this.ssmMessagesEndpoint = new ec2.InterfaceVpcEndpoint(
      this,
      "rSSMMessagesEndpoint",
      {
        vpc: this.vpc,
        service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        subnets: { subnets: this.workspaceSubnets },
        privateDnsEnabled: true,
        securityGroups: [vpcEndpointsSecurityGroup],
      }
    );

    this.s3Endpoint = new ec2.GatewayVpcEndpoint(this, "rS3Endpoint", {
      vpc: this.vpc,
      service: ec2.GatewayVpcEndpointAwsService.S3,
    });

    // Add dependencies to ensure sequential creation
    this.ssmEndpoint.node.addDependency(this.apiGatewayEndpoint);
    this.ssmMessagesEndpoint.node.addDependency(this.ssmEndpoint);
    this.s3Endpoint.node.addDependency(this.ssmMessagesEndpoint);
  }

  /**
   * Amazon Workspaces is only available in certain regions. This will return two
   * of the availability zones that are supported for the region. Only two are
   * returned because Microsoft AD and Workspaces require two subnets in
   * different availability zones.
   * https://docs.aws.amazon.com/workspaces/latest/adminguide/azs-workspaces.html
   *
   * @param region the AWS region that the solution is being provisioned in
   */
  getWorkspacesAvailabilityZones(region: string) {
    switch (region) {
      case "us-east-1":
        return ["us-east-1a", "us-east-1c"];
      case "us-west-2":
        return ["us-east-2a", "us-east-2b"];
      default:
        throw new cdk.ValidationError(
          `${region} unsupported by VpcStack...`,
          this
        );
    }
  }
}
