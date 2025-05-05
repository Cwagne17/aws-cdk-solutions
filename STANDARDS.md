# AWS Resource Naming Standards

This document outlines the naming conventions for AWS resources in our infrastructure. These standards are designed to maintain consistency and clarity across our AWS environment.

## General Format

The general naming format follows this pattern:

```console
[prefix-]<usage>-<env>-<resource>[-region][-suffix]
```

### Components

| Component | Description          | Required |
| --------- | -------------------- | -------- |
| prefix    | Fixed prefix         | No       |
| usage     | Usage name           | Yes      |
| env       | Environment          | Yes      |
| resource  | Resource type        | Yes      |
| region    | Resource region code | No       |
| suffix    | Random suffix        | No       |
