import * as cdk from "aws-cdk-lib";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import { StateMachineBuilder } from "./state-machine";

export class WorkspacesCustomImageWorkflowStack extends cdk.Stack {
  readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Builder
    const createBuilderTask = new tasks.LambdaInvoke(
      this,
      "Create Builder WorkSpace",
      {
        lambdaFunction: lambdaFns.createBuilder,
        outputPath: "$",
      }
    );

    // Wait
    const waitCreate = new sfn.Wait(
      this,
      "If Not Available, Wait 3 Min (Create)",
      {
        time: sfn.WaitTime.duration(cdk.Duration.minutes(3)),
      }
    );

    // Check Builder Status
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
        startBuilder
          .next(waitCreate)
          .next(checkBuilderStatus)
          .next(builderAvailableChoice)
      )
      .otherwise(
        waitCreate.next(checkBuilderStatus).next(builderAvailableChoice)
      );

    // Attach Security Group
    const attachSG = new tasks.LambdaInvoke(
      this,
      "Attach Builder WorkSpace Security Group & Generate Temp Credentials",
      {
        lambdaFunction: lambdaFns.attachSecurityGroup,
        outputPath: "$",
      }
    );

    // Configuration Routine (Ansible replacement)
    const configRoutine = new tasks.LambdaInvoke(
      this,
      "Run Configuration Routine",
      {
        lambdaFunction: lambdaFns.configurationRoutine,
        outputPath: "$",
      }
    );

    // Windows Updates
    const windowsUpdates = new tasks.LambdaInvoke(this, "Run Windows Updates", {
      lambdaFunction: lambdaFns.runWindowsUpdates,
      outputPath: "$",
    });

    // Cleanup
    const cleanup = new tasks.LambdaInvoke(
      this,
      "Cleanup Builder WorkSpace Temp Credentials & API Gateway",
      {
        lambdaFunction: lambdaFns.cleanup,
        outputPath: "$",
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

    const imageAvailableChoice = new sfn.Choice(this, "Is Image Available?")
      .when(
        sfn.Condition.stringEquals(
          "$.ImageStatus.Images[0].State",
          "AVAILABLE"
        ),
        new sfn.Pass(this, "Image Available")
      )
      .otherwise(waitImage.next(checkImage).next(imageAvailableChoice));

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

    const notify = new tasks.LambdaInvoke(
      this,
      "Send Completion Notification",
      {
        lambdaFunction: lambdaFns.notify,
        outputPath: "$",
      }
    );

    this.stateMachine = new StateMachineBuilder()
      .name("WorkspacesCustomImageWorkflow")
      .addStates(
        createBuilderTask,
        checkBuilderStatus,
        builderAvailableChoice,
        attachSG,
        configRoutine,
        windowsUpdates,
        cleanup,
        waitBeforeImage,
        createImage,
        checkImage,
        imageAvailableChoice,
        createBundle,
        notify
      )
      .build(this, "rWorkspacesCustomImageStateMachine");
  }
}
