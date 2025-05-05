# AWS Resource Naming Standards

This document outlines the naming conventions for AWS resources in our infrastructure. These standards are designed to maintain consistency and clarity across our AWS environment.

## General Format

The general naming format follows this pattern:

```console
[prefix-]<project>-<env>-<resource>[-location][-suffix]
```

### Components

| Component | Description                     | Required |
| --------- | ------------------------------- | -------- |
| prefix    | Fixed prefix                    | No       |
| project   | Project name                    | Yes      |
| env       | Environment                     | Yes      |
| resource  | Resource type                   | Yes      |
| location  | Resource location (region + AZ) | No       |
| suffix    | Random suffix                   | No       |
