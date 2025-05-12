const version = require("../../package.json").version;
import * as cdk from "aws-cdk-lib";
import * as servicecatalog from "aws-cdk-lib/aws-servicecatalog";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { WorkspacesProductStack } from "../workspaces-product-stack";
import { generateResourceName, Globals } from "../shared";

export class WorkspacesPortfolioStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the workspaces_DefaultRole if it doesn't exist
    // https://docs.aws.amazon.com/workspaces/latest/adminguide/workspaces-access-control.html#create-default-role
    const defaultRole = iam.Role.fromRoleName(
      this,
      "rWorkspacesDefaultRole",
      "workspaces_DefaultRole"
    );
    if (!defaultRole) {
      new iam.Role(this, "rWorkspacesDefaultRole", {
        assumedBy: new iam.ServicePrincipal("workspaces.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonWorkSpacesServiceAccess"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonWorkSpacesSelfServiceAccess"
          ),
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonWorkSpacesPoolServiceAccess"
          ),
        ],
      });
    }

    const portfolio = new servicecatalog.Portfolio(
      this,
      "rDeveloperEnvironmentPortfolio",
      {
        displayName: generateResourceName("developer-portfolio"),
        providerName: "Christopher Wagner",
        description: "TBD",
      }
    );

    // Adds the current caller identity to the portfolio
    // This assumes that the CDK stack is being deployed
    // using an assumed role rather thant an IAM user
    const callerIdentityRole = iam.Role.fromRoleName(
      this,
      "rImportedRole",
      Globals.callerRoleName
    );
    portfolio.giveAccessToRole(callerIdentityRole);

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
