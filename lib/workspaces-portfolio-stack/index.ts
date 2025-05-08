const version = require("../../package.json").version;
import * as cdk from "aws-cdk-lib";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { WorkspacesProductStack } from "../workspaces-product-stack";
import { generateResourceName } from "../shared";

export class WorkspacesPortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const portfolio = new servicecatalog.Portfolio(
      this,
      "rDeveloperEnvironmentPortfolio",
      {
        displayName: generateResourceName("developer-portfolio"),
        providerName: "Christopher Wagner",
        description: "TBD",
      }
    );

    // Give the SSO Admin Permission to the portfolio
    const adminSSORole = iam.Role.fromRoleName(
      this,
      "rImportedRole",
      "AWSReservedSSO_AdministratorAccess_c3b8f24c5741a01a"
    );
    portfolio.giveAccessToRole(adminSSORole);

    const productStackHistory = new servicecatalog.ProductStackHistory(
      this,
      "rWorkspaceProductStackHistory",
      {
        productStack: new WorkspacesProductStack(this, "rWorkspaceProduct"),
        currentVersionName: `v${version}`,
        currentVersionLocked: false,
      }
    );

    const product = new servicecatalog.CloudFormationProduct(
      this,
      "rDeveloperWorkspaceProduct",
      {
        productName: generateResourceName("developer-workspace-product"),
        owner: "Christopher Wagner",
        productVersions: [productStackHistory.currentVersion()],
      }
    );

    // Register the product with the portfolio
    portfolio.addProduct(product);
  }
}
