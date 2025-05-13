import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as logs from "aws-cdk-lib/aws-logs";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { StateMachineBuilder } from "./state-machine";
import { generateResourceName, Globals } from "../shared";
import path = require("path");

export class WorkspacesCustomImageWorkflowStack extends cdk.Stack {
  readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define all of the steps for the workflow (no .next() chaining yet)

    // Create workspace builder step
    const lambdaFunctionName = generateResourceName("create-builder-workspace");
    const createBuilderTask = new tasks.LambdaInvoke(
      this,
      "Create Builder WorkSpace",
      {
        lambdaFunction: new lambda.Function(this, "CreateBuilder", {
          functionName: lambdaFunctionName,
          description:
            "Creates the builder WorkSpace for the custom image workflow.",
          runtime: lambda.Runtime.PYTHON_3_9,
          handler: "index.lambda_handler",
          code: lambda.Code.fromAsset(
            path.join(__dirname, "../../lambda/workspaces-create-builder")
          ),
          environment: {
            Default_DirectoryId: "",
            Default_WorkSpaceUser: "",
            Default_BundleId: "",
            Default_ComputeType: "",
            Default_Protocol: "",
            Default_RootVolumeSize: "100",
            Default_UserVolumeSize: "50",
            Default_SecurityGroup: "",
            Default_ImagePrefix: "",
            Default_APIId: "",
            Default_NotificationARN: "",
            Default_BundlePrefix: "",
            Default_S3Bucket: "",
          },
          logGroup: new logs.LogGroup(this, "rWorkspacesBuilderLogGroup", {
            logGroupName: `/aws/lambda/${lambdaFunctionName}`,
            retention: logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // TODO: This should change based on environment
          }),
        }),
        outputPath: "$",
      }
    );

    // Create a wait state
    const waitCreate = new sfn.Wait(
      this,
      "If Not Available, Wait 3 Min (Create)",
      {
        time: sfn.WaitTime.duration(cdk.Duration.minutes(3)),
      }
    );

    // Check workspace builder Status
    const checkBuilderStatus = new tasks.CallAwsService(
      this,
      "Check Builder Status (Create)",
      {
        service: "workspaces",
        action: "describeWorkspaces",
        parameters: {
          WorkspaceIds: sfn.JsonPath.array(
            sfn.JsonPath.stringAt(
              "$.AutomationParameters.ImageBuilderWorkSpaceId"
            )
          ),
        },
        iamResources: ["*"],
        resultPath: "$.ImageBuilderStatus",
      }
    );

    // Start the workspace builder if not already
    const startBuilder = new tasks.CallAwsService(
      this,
      "Start Builder WorkSpace (Create)",
      {
        service: "workspaces",
        action: "startWorkspaces",
        parameters: {
          StartWorkspaceRequests: sfn.JsonPath.array(
            sfn.JsonPath.stringAt("$.AutomationParameters.ImageBuilderIdArray")
          ),
        },
        iamResources: ["*"],
      }
    );

    // Wait before Image
    const waitBeforeImage = new sfn.Wait(this, "Wait before Image Creation", {
      time: sfn.WaitTime.duration(cdk.Duration.minutes(2)),
    });

    // Create Image
    const createImage = new tasks.CallAwsService(this, "Create Custom Image", {
      service: "workspaces",
      action: "createWorkspaceImage",
      parameters: {
        Name: sfn.JsonPath.stringAt("$.AutomationParameters.ImageName"),
        Description: sfn.JsonPath.stringAt(
          "$.AutomationParameters.ImageDescription"
        ),
        WorkspaceId: sfn.JsonPath.stringAt(
          "$.AutomationParameters.ImageBuilderWorkSpaceId"
        ),
      },
      iamResources: ["*"],
      resultPath: "$.Image",
    });

    const waitImage = new sfn.Wait(
      this,
      "If Not Available, Wait 3 Min (Image)",
      {
        time: sfn.WaitTime.duration(cdk.Duration.minutes(3)),
      }
    );

    const checkImage = new tasks.CallAwsService(this, "Check Image Status", {
      service: "workspaces",
      action: "describeWorkspaceImages",
      parameters: {
        ImageIds: sfn.JsonPath.array(
          sfn.JsonPath.stringAt("$.Image.WorkspaceImage.ImageId")
        ),
      },
      iamResources: ["*"],
      resultPath: "$.ImageStatus",
    });

    const createBundle = new tasks.CallAwsService(this, "Create Bundle", {
      service: "workspaces",
      action: "createWorkspaceBundle",
      parameters: {
        BundleName: sfn.JsonPath.stringAt("$.AutomationParameters.BundleName"),
        ImageId: sfn.JsonPath.stringAt("$.Image.WorkspaceImage.ImageId"),
        ComputeType: {
          Name: sfn.JsonPath.stringAt(
            "$.AutomationParameters.BundleComputeType"
          ),
        },
        RootStorage: {
          Capacity: sfn.JsonPath.stringAt(
            "$.AutomationParameters.BundleRootVolume"
          ),
        },
        UserStorage: {
          Capacity: sfn.JsonPath.stringAt(
            "$.AutomationParameters.BundleUserVolume"
          ),
        },
      },
      iamResources: ["*"],
      resultPath: "$.Bundle",
    });

    // Chain the steps together

    // Construct the choices
    const builderAvailableChoice = new sfn.Choice(
      this,
      "Is Builder Available? (Create)"
    )
      .when(
        sfn.Condition.stringEquals(
          "$.ImageBuilderStatus.Workspaces[0].State",
          "AVAILABLE"
        ),
        new sfn.Pass(this, "Builder Available")
      )
      .when(
        sfn.Condition.stringEquals(
          "$.ImageBuilderStatus.Workspaces[0].State",
          "STOPPED"
        ),
        startBuilder.next(waitCreate).next(checkBuilderStatus)
      );

    // Start by creating the builder Workspace
    createBuilderTask.next(checkBuilderStatus);
    checkBuilderStatus.next(builderAvailableChoice);

    const imageAvailableChoice = new sfn.Choice(
      this,
      "Is Image Available?"
    ).when(
      sfn.Condition.stringEquals("$.ImageStatus.Images[0].State", "AVAILABLE"),
      new sfn.Pass(this, "Image Available")
    );

    this.stateMachine = new StateMachineBuilder()
      .name("WorkspacesCustomImageWorkflow")
      .addStates(
        createBuilderTask,
        checkBuilderStatus,
        builderAvailableChoice,
        waitBeforeImage,
        createImage,
        checkImage,
        imageAvailableChoice,
        createBundle
      )
      .build(this, "rWorkspacesCustomImageStateMachine");
  }
}
