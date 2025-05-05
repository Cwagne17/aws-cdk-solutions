/**
 * Supported AWS environments
 */
export enum Environment {
  DEV = "dev",
  TEST = "test",
  STAGING = "staging",
  PROD = "prod",
}

/**
 * Common AWS regions with their abbreviations
 */
export enum RegionCode {
  US_EAST_1 = "use1",
  US_WEST_1 = "usw1",
}

/**
 * SSM Constants
 */
const ssm_param_prefix = "/developer-environment-bootstrap";
export const SSM_PARAM = {
  VPC_ID: `${ssm_param_prefix}/vpc_id`,
  VPC_CIDR: `${ssm_param_prefix}/vpc_cidr`,
  WORKSPACE_SUBNET_IDS: `${ssm_param_prefix}/workspace_subnet_ids`,
  DIRECTORY_SUBNET_IDS: `${ssm_param_prefix}/directory_subnet_ids`,
  EKS_NODE_GROUP_SUBNET_IDS: `${ssm_param_prefix}/eks_node_group_subnet_ids`,
  INGRESS_SUBNET_IDS: `${ssm_param_prefix}/ingress_subnet_ids`,
  DIRECTORY_ID: `${ssm_param_prefix}/directory_id`,
};
