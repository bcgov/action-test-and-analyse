
**BREAKING CHANGES in v1.0:**
* **node_version is now required (previously defaulted to 16)**
* **sonar_comment_token has been removed (ignored by SonarCloud)**
* **sonar_project_token has been renamed sonar_token**

<!-- Badges -->
[![Issues](https://img.shields.io/github/issues/bcgov/action-test-and-analyse)](/../../issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/bcgov/action-test-and-analyse)](/../../pulls)
[![MIT License](https://img.shields.io/github/license/bcgov/action-test-and-analyse.svg)](/LICENSE)
[![Lifecycle](https://img.shields.io/badge/Lifecycle-Experimental-339999)](https://github.com/bcgov/repomountie/blob/master/doc/lifecycle-badges.md)

<!-- Reference-Style link -->
[SonarCloud]: https://sonarcloud.io
[Issues]: https://docs.github.com/en/issues/tracking-your-work-with-issues/creating-an-issue
[Pull Requests]: https://docs.github.com/en/desktop/contributing-and-collaborating-using-github-desktop/working-with-your-remote-repository-on-github-or-github-enterprise/creating-an-issue-or-pull-request

# Test and Analyze with Triggers, SonarCloud, Supply Chain Scanning and Dependency/Export Analysis

This action runs tests, dependent on triggers, optionally sending results and coverage to [SonarCloud](https://sonarcloud.io).  Test and SonarCloud can be configured to comment on pull requests or stop failing workflows.  Optional supply chain attack detection can be enabled to scan packages before installation.  Optional Knip analysis can be enabled to detect unused dependencies and exports in JavaScript/TypeScript projects.

Conditional triggers are used to determine whether tests need to be run.  If triggers are matched, then the appropriate code has changed and should be tested.  Tests always run if no triggers are provided.  Untriggered runs do little other than report a success.

Only nodejs (JavaScript, TypeScript) is supported by this action.  Please see our [Java action](https://github.com/bcgov/action-test-and-analyse-java) or upcoming Python action as required.

# Usage

```yaml
- uses: bcgov/action-test-and-analyse@x.y.z
  with:
    ### Required

    # Commands to run tests
    # Please configure your app to generate coverage (coverage/lcov.info)
    commands: |
      npm ci
      npm run test:cov

    # Project/app directory
    dir: frontend

    # Node.js version
    # BREAKING CHANGE: previously defaulted to 16 (LTS)
    node_version: "20"

    ### Typical / recommended

    # Sonar arguments
    # https://docs.sonarcloud.io/advanced-setup/analysis-parameters/
    sonar_args: |
        -Dsonar.exclusions=**/coverage/**,**/node_modules/**
        -Dsonar.organization=bcgov-sonarcloud
        -Dsonar.projectKey=bcgov_${{ github.repository }}

    # Sonar token
    # Available from sonarcloud.io or your organization administrator
    # BCGov uses https://github.com/BCDevOps/devops-requests/issues/new/choose
    # Provide an unpopulated token for pre-setup, section will be skipped
    sonar_token: ${{ secrets.SONAR_TOKEN }}

    # Bash array to diff for build triggering
    # Optional, defaults to nothing, which forces a build
    triggers: ('frontend/')

    # Enable supply chain attack detection using @aikidosec/safe-chain
    # Optional, defaults to true (enabled by default for security)
    # Detects and blocks malicious packages during npm ci
    # Set to false to disable
    supply_scan: true

    # Enable dependency and export analysis using Knip
    # Optional, defaults to warn (runs but doesn't fail)
    # Options: off (skip), warn (run but don't fail), error (run and fail on issues)
    # Analyzes JS/TS projects for unused dependencies and exports
    dep_scan: warn

    ### Usually a bad idea / not recommended

    # Overrides the default branch to diff against
    # Defaults to the default branch, usually `main`
    diff_branch: ${{ github.event.repository.default_branch }}

    # Repository to clone and process
    # Useful for consuming other repos, like in testing
    # Defaults to the current one
    repository: ${{ github.repository }}

    # Branch to clone and process
    # Useful for consuming non-default branches, like in testing
    # Defants to empty, cloning the default branch
    branch: ""
```

# Example, Single Directory with SonarCloud Analysis, Supply Chain Scanning, and Dependency/Export Analysis

Run tests and provide results to SonarCloud.  This is a full workflow that runs on pull requests, merge to main and workflow_dispatch.  Use a GitHub Action secret to provide ${{ secrets.SONAR_TOKEN }}.

The specified triggers will be used to decide whether this job runs tests and analysis or just exits successfully.

This example demonstrates the default behavior with supply chain scanning enabled (scans packages before installation) and Knip analysis set to error mode (detects unused dependencies and exports).

Create or modify a GitHub workflow, like below.  E.g. `./github/workflows/tests.yml`

Note: Provide an unpopulated SONAR_TOKEN until one is provisioned.  SonarCloud will only run once populated, allowing for pre-setup.

```yaml
name: Test and Analyze

on:
  pull_request:
  push:
    branches:
      - main
    paths-ignore:
      - ".github/**"
      - "**.md"
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  tests:
    name: Test and Analyze
    runs-on: ubuntu-24.04
    steps:
      - uses: bcgov/action-test-and-analyse@x.y.z
        with:
          commands: |
            npm ci
            npm run test:cov
          dir: frontend
          node_version: "20"
          sonar_args: |
            -Dsonar.exclusions=**/coverage/**,**/node_modules/**
            -Dsonar.organization=bcgov-nr
            -Dsonar.projectKey=bcgov-nr_action-test-and-analyse_frontend
          sonar_token: ${{ secrets.SONAR_TOKEN }}
          dep_scan: error
          # supply_scan defaults to true, so no need to specify
          triggers: ('frontend/' 'charts/frontend')
```

# Example, Only Running Tests (No SonarCloud, Supply Chain Scanning Disabled, No Dependency/Export Analysis), No Triggers

No triggers are provided so tests will always run.  SonarCloud is skipped, supply chain scanning is disabled, and dependency/export analysis is skipped.

```yaml
jobs:
  tests:
    name: Test and Analyze
    runs-on: ubuntu-24.04
    steps:
      - uses: bcgov/action-test-and-analyse@x.y.z
        with:
          commands: |
            npm ci
            npm run test:cov
          dir: frontend
          node_version: "20"
          supply_scan: false  # Disable supply chain scanning
          dep_scan: off  # Disable dependency analysis
```

# Example, Matrix / Multiple Directories with Sonar Cloud and Triggers

Test and analyze projects in multiple directories in parallel.  This time `repository` and `branch` are provided.  Please note how secrets must be passed in to composite Actions using the secrets[matrix.variable] syntax.

```yaml
jobs:
  tests:
    name: Test and Analyze
    runs-on: ubuntu-24.04
    strategy:
      matrix:
        dir: [backend, frontend]
        include:
          - dir: backend
            token: SONAR_TOKEN_BACKEND
            triggers: ('frontend/' 'charts/frontend')
          - dir: frontend
            token: SONAR_TOKEN_FRONTEND
            triggers: ('backend/' 'charts/backend')
    steps:
      - uses: actions/checkout@v5
      - uses: bcgov/action-test-and-analyse@x.y.z
        with:
          commands: |
            npm ci
            npm run test:cov
          dir: ${{ matrix.dir }}
          node_version: "20"
          sonar_args: |
            -Dsonar.exclusions=**/coverage/**,**/node_modules/**
            -Dsonar.organization=bcgov-nr
            -Dsonar.projectKey=bcgov-nr_action-test-and-analyse_${{ matrix.dir }}
          sonar_token: ${{ secrets[matrix.token] }}
          triggers: ${{ matrix.triggers }}
          repository: bcgov/quickstart-openshift
          branch: main
```

# Outputs

| Output    | Description                                |
| --------- | ------------------------------------------ |
| triggered | Whether the action was triggered based on path changes (true/false) |

Has the action been triggered by path changes? \[true|false\]

```yaml
- id: test
  uses: bcgov/action-test-and-analyse@x.y.z
  with:
    commands: |
      npm ci
      npm run test:cov
    dir: frontend
    node_version: "20"
    triggers: ('frontend/')

- if: steps.test.outputs.triggered == 'true'
  run: echo "✅ Tests were triggered by path changes"

- if: steps.test.outputs.triggered == 'false'
  run: echo "ℹ️ Tests were not triggered (no matching path changes)"
```

# Sonar Project Token

SonarCloud project tokens are free, available from [SonarCloud] or your organization's aministrators.

For BC Government projects, please create an [issue for our platform team](https://github.com/BCDevOps/devops-requests/issues/new/choose).

After sign up, a token should be available from your project on the [SonarCloud] site.  Multirepo projects (e.g. backend, frontend) will have multiple projects.  Click `Administration > Analysis Method > GitHub Actions (tutorial)` to find yours.

E.g. https://sonarcloud.io/project/configuration?id={<PROJECT>}&analysisMode=GitHubActions

# Supply Chain Scanning

This action supports supply chain attack detection using [@aikidosec/safe-chain](https://www.npmjs.com/package/@aikidosec/safe-chain). Supply chain scanning is **enabled by default** (default: `true`) because catching supply chain problems is critical security. When enabled, safe-chain wraps npm commands to scan packages before installation, protecting against malicious code, typosquats, and suspicious scripts.

## Default Behavior

Supply chain scanning is enabled by default. No configuration is required - it will automatically scan packages during `npm ci` and other package manager commands.

## How to Disable

If you need to disable supply chain scanning, set `supply_scan: false` in your workflow:

```yaml
- uses: bcgov/action-test-and-analyse@x.y.z
  with:
    commands: |
      npm ci
      npm run test:cov
    dir: frontend
    node_version: "20"
    supply_scan: false  # Disable supply chain scanning
```

When enabled, safe-chain will:
- Scan packages against Aikido's threat intelligence database
- Block known malicious packages and supply chain attacks (installation will fail if threats are detected)
- Protect against typosquatting and suspicious install scripts

No additional configuration or API tokens are required. The scanning happens automatically during `npm ci` and other package manager commands.

# Knip - Dependency and Export Analysis

This action supports dependency and export analysis using [Knip](https://knip.dev/). When enabled, Knip scans JavaScript/TypeScript projects to identify unused dependencies, devDependencies, and exports, helping keep your codebase clean and maintainable.

**Default behavior**: Runs in `warn` mode (shows issues without failing) to encourage adoption without blocking builds. You can disable with `dep_scan: off` or enforce with `dep_scan: error`.

## How to Use

The `dep_scan` parameter supports three modes:

- **`off`** - Skip Knip analysis entirely
- **`warn`** - Run Knip and show issues, but don't fail the workflow (default)
- **`error`** - Run Knip and fail the workflow if issues are found

### Example: Warn Mode (Default)

```yaml
- uses: bcgov/action-test-and-analyse@x.y.z
  with:
    commands: |
      npm ci
      npm run test:cov
    dir: frontend
    node_version: "20"
    dep_scan: warn
```

### Example: Error Mode (Enforce Cleanup)

```yaml
- uses: bcgov/action-test-and-analyse@x.y.z
  with:
    commands: |
      npm ci
      npm run test:cov
    dir: frontend
    node_version: "20"
    dep_scan: error
```

When enabled, Knip will:
- Analyze your project for unused dependencies and devDependencies
- Detect unused exports that can be removed
- In `error` mode: Fail the workflow if unused dependencies or exports are found, encouraging cleanup
- In `warn` mode: Show issues without failing, allowing teams to see problems without blocking builds

This helps maintain a lean dependency footprint and reduces security surface area by removing unnecessary packages.

## Default Configuration

The action provides a default `.knip.json` configuration with common exceptions to reduce false positives. When no `knip_config` is provided, this default configuration is written to `.knip.json` in the project directory and will overwrite any existing `.knip.json`.

### Why These Packages Are Excluded

The default configuration excludes the following packages that are commonly flagged as unused but are actually needed:

- **`swagger-ui-express`** - Peer dependency for NestJS's `SwaggerModule.setup()`. NestJS dynamically requires this package at runtime, so Knip doesn't detect it as used. This is a common pattern with peer dependencies that are loaded dynamically.

- **`rimraf`** - Build tool commonly used in npm scripts (e.g., `"clean": "rimraf dist"`). Knip may flag it as unused because it's referenced in `package.json` scripts rather than imported in code. It's also listed in `ignoreBinaries` since it's used as a command-line tool.

- **`@types/node`** - TypeScript type definitions for Node.js. These are used by the TypeScript compiler for type checking but aren't directly imported in source code, so Knip may flag them as unused.

- **`@types/react`** and **`@types/react-dom`** - TypeScript type definitions for React. Similar to `@types/node`, these are used by the TypeScript compiler but may not appear as direct imports in your codebase.

## Custom Configuration

When `knip_config` is not provided, the action uses its default configuration. If you need a custom configuration, specify it using the `knip_config` parameter:

```yaml
- uses: bcgov/action-test-and-analyse@x.y.z
  with:
    dep_scan: error
    knip_config: "configs/custom.knip.json"  # Path is relative to the GitHub workspace root, not to the `dir` input
```

**Note:** The `knip_config` path is resolved relative to the GitHub workspace root (`github.workspace`), not relative to the `dir` input parameter. If you do not provide `knip_config`, the action will use its default configuration.

Even better, tell us when you encounter false positives!  Your contributions are greatly appreciated, so please send suggestions by writing an issue or sending a PR.

### Common Exclusion Options

Knip provides several ways to exclude packages and files from analysis:

- **`ignoreDependencies`** - Exclude specific packages from dependency analysis (supports regular expressions)
  ```json
  {
    "ignoreDependencies": ["hidden-package", "@org/.+"]
  }
  ```

- **`ignoreBinaries`** - Exclude binaries that aren't provided by dependencies
  ```json
  {
    "ignoreBinaries": ["zip", "docker-compose"]
  }
  ```

- **`ignore`** - Suppress all issue types for matching files/patterns
  ```json
  {
    "ignore": ["**/*.d.ts", "**/fixtures"]
  }
  ```

- **`ignoreWorkspaces`** - Exclude workspaces in monorepos
  ```json
  {
    "ignoreWorkspaces": ["packages/go-server"]
  }
  ```

- **`ignoreExports`** - Ignore specific exports from analysis

For complete configuration options, see the [Knip documentation](https://knip.dev/reference/configuration).

## Requirements

- JavaScript or TypeScript projects only
- Project must have a `package.json` file
- Works best with projects that have clear entry points defined in configuration

Knip supports many JavaScript/TypeScript tools and frameworks out of the box. For advanced configuration beyond exclusions, you can also use `knip.json` or `knip.ts` configuration files. See [Knip documentation](https://knip.dev/) for all available options.

# Feedback

Please contribute your ideas!  [Issues] and [pull requests] are appreciated.

<!-- # Acknowledgements

This Action is provided courtesty of the Forestry Suite of Applications, part of the Government of British Columbia. -->
