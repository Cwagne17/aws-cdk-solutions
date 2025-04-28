import * as cdk from "aws-cdk-lib";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import { Construct } from "constructs";
import { WorkspacesProduct } from "./workspaces";

export class DeveloperWorkspaceProductStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const portfolio = new servicecatalog.Portfolio(
      this,
      "rDeveloperEnvironmentPortfolio",
      {
        displayName: "Developer Environment Portfolio",
        providerName: "Christopher Wagner",
        description: "TBD",
      }
    );

    // TODO: Setup portfolio access control

    const productStackHistory = new servicecatalog.ProductStackHistory(
      this,
      "rWorkspaceProductStackHistory",
      {
        productStack: new WorkspacesProduct(this, "rWorkspaceProduct"),
        currentVersionName: "v1.0.0-alpha",
        currentVersionLocked: true,
      }
    );

    const product = new servicecatalog.CloudFormationProduct(
      this,
      "rDeveloperWorkspaceProduct",
      {
        productName: "Private Developer Workspace",
        owner: "Christopher Wagner",
        productVersions: [
          productStackHistory.currentVersion(),
          // TODO: Add previous versions as they change
          // productStackHistory.versionFromSnapshot("v0.0.1")
        ],
      }
    );
    portfolio.addProduct(product);

    // TODO: Setup product access control
  }
}
