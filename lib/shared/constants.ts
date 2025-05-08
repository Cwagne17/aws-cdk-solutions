import { Globals } from "./globals";

/**
 * Supported environments types
 */
export enum Environment {
  DEV = "dev",
  TEST = "test",
  STAGING = "staging",
  PROD = "prod",
}

/**
 * Common AWS region that the CDK solutions will be deployed to.
 */
export enum Region {
  US_EAST_1 = "us-east-1",
  US_EAST_2 = "us-east-2",
}

/**
 * SSM Constants
 */
// TODO: We should add Globals.environment to the prefix to distinguish different
// environments. This will fail with current implementaiton because Globals.environment
// loads on run and won't allow initialization, this will need to move to a function
// that constructs the path
const params_prefix = `/developer-environment-platform`;
export const SSM_PARAM = {
  VPC: {
    VPC_ID: `${params_prefix}/vpc_id`,
    VPC_CIDR: `${params_prefix}/vpc_cidr`,
    INGRESS_SUBNET_IDS: `${params_prefix}/ingress_subnet_ids`,
  },
  DIRECTORY_SERVICE: {
    DIRECTORY_ID: `${params_prefix}/ds/directory_id`,
    SUBNET_IDS: `${params_prefix}/ds/subnet_ids`,
  },
  EKS: {
    NODE_GROUP_SUBNET_IDS: `${params_prefix}/eks/node_group_subnet_ids`,
  },
  WORKSPACES: {
    SUBNET_IDS: `${params_prefix}/workspaces/workspace_subnet_ids`,
  },
  SSM: {
    INVENTORY: {
      BUCKET_NAME: `${params_prefix}/ssm/inventory/bucket_name`,
      BUCKET_REGION: `${params_prefix}/ssm/inventory/bucket_region`,
      BUCKET_ARN: `${params_prefix}/ssm/inventory/bucket_arn`,
      BUCKET_KMS_KEY_ID: `${params_prefix}/ssm/inventory/bucket_kms_key_id`,
      RESOURCE_DATA_SYNC: `${params_prefix}/ssm/inventory/resource_data_sync`,
    },
    ACTIVATION_ENDPOINT: `${params_prefix}/ssm/activation_endpoint`,
  },
};
