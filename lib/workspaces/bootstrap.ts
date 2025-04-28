import { Construct } from "constructs";

export interface BootstrapWorkspacesProps {}

export class BootstrapWorkspaces extends Construct {
  constructor(scope: Construct, id: string, props: BootstrapWorkspacesProps) {
    super(scope, id);
  }
}
