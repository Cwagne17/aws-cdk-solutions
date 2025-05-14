import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

// Create a VPC Builder that creates the resources needed for the VPC

export interface SubnetProps {
  name: string;
  cidr: string;
}

export class VpcBuilder {
  private vpc: any;
  private subnets: any[] = [];
  private securityGroups: any[] = [];
  private routeTables: any[] = [];

  constructor() {}

  public fromVpcId(vpcId: string): this {
    this.vpc = Vpc.fromLookup(this, "Vpc", {
      vpcId: vpcId,
    });
    return this;
  }

  public addSubnet(subnet: any) {
    this.subnets.push(subnet);
    return this;
  }

  build() {
    // Make sure the VPC exists
    // Create flow logs for the VPC
    // Create IPAM pool or allocation or manual CIDR block to the VPC
    // Add NACL isolation CIDR blocks to the VPC (default NACL for this builder)
    // Create Endpoints for the subnet (enable<ServiceName>Endpoint)
    // Create the different subnet types for that VPC
    // For each subnet type, create one route table with proper routes
    console.log(
      `Building ${SubnetType.PRIVATE_WITH_EGRESS} subnets that egress with TGW.`
    );
    console.log(`Building ${SubnetType.PRIVATE_ISOLATED} subnets.`);
  }
}
