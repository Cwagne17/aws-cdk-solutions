# AWS CDK Solutions

[![Open in Dev Containers](https://img.shields.io/static/v1?label=Dev%20Containers&message=Open&color=blue)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/Cwagne17/aws-cdk-solutions)

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template

## Setup

The following solution sets up developer environment infrastructure to provide developers
with a self-service VDI environment with all the tooling they'll need.

To provision the environment run the following commands:

```bash
# Install dependencies using the package-lock.json
npm ci

# Setup AWS authentication session (other SDK authentication methods can be used)
aws sso login --profile <profile>

# Provision the aws-cdk-solution (MS Active Directory takes ~20 minutes)
AWS_PROFILE=<profile> cdk deploy --all

# Register the MS Active Directory with Amazon Workspaces
AWS_PROFILE=<profile> npm run workspace-directory -- --action register
```

## Teardown

When you are done running the environment you can destroy the environment with the following commands:

```bash
# If your credentials expired since you setup. Then refresh your AWS session
# (other SDK authentication methods can be used)
aws sso login --profile <profile>

# Deregister the MS Active Directory with Amazon Workspaces
AWS_PROFILE=<profile> npm run workspace-directory -- --action deregister

# Provision the aws-cdk-solution (MS Active Directory takes ~20 minutes)
AWS_PROFILE=<profile> cdk destroy --all
```
