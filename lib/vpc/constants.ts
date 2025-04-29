const ssm_param_prefix = "/developer-environment-bootstrap";

export const SUBNET_NAMES = {
  ACTIVE_DIRECTORY: "active-directory",
  WORKSPACE: "workspace",
  EKS_NODE_GROUP: "eks-node-group",
  INGRESS: "ingress",
};

export const SSM_PARAM = {
  VPC_ID: `${ssm_param_prefix}/vpc_id`,
  WORKSPACE_SUBNET_IDS: `${ssm_param_prefix}/workspace_subnet_ids`,
  DIRECTORY_SUBNET_IDS: `${ssm_param_prefix}/directory_subnet_ids`,
  EKS_NODE_GROUP_SUBNET_IDS: `${ssm_param_prefix}/eks_node_group_subnet_ids`,
  INGRESS_SUBNET_IDS: `${ssm_param_prefix}/ingress_subnet_ids`,
};
