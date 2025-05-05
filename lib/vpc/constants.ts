import { generateResourceName } from "../util";

export const SUBNET_NAMES = {
  ACTIVE_DIRECTORY: generateResourceName({
    usage: "active-directory",
    resource: "subnet",
  }),
  WORKSPACE: generateResourceName({
    usage: "workspace",
    resource: "subnet",
  }),
  EKS_NODE_GROUP: generateResourceName({
    usage: "eks-node-group",
    resource: "subnet",
  }),
  INGRESS: generateResourceName({
    usage: "ingress",
    resource: "subnet",
  }),
};
