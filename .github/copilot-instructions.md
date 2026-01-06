# Copilot Instructions

This file contains instructions for GitHub Copilot when working on this repository.

## Project Overview

This is a GitHub Actions composite action for running tests and code analysis with SonarCloud integration. It supports Node.js projects and includes optional supply chain attack detection.

## Technology Stack

- **Platform**: GitHub Actions (composite action)
- **Language**: YAML, Shell (bash)
- **Node.js**: Supports versions 18, 20, 22
- **Package Managers**: npm, yarn, pnpm
- **Integration Tools**:
  - SonarCloud for code quality analysis
  - @aikidosec/safe-chain for supply chain scanning (opt-in)
  - bcgov/action-diff-triggers for conditional execution

## Build and Test Commands

This is a GitHub Actions composite action, so testing is done through workflow execution:

```bash
# There are no local build commands for this action
# Testing requires:
# 1. Making changes to action.yml
# 2. Creating a test workflow that uses the action
# 3. Running the workflow in GitHub Actions
```

## Key Files

- `action.yml` - Main composite action definition
- `README.md` - User documentation with usage examples
- `.github/workflows/tests.yml` - Test workflow

## Development Guidelines

### Action Development
- Follow GitHub Actions composite action best practices
- All inputs must have proper validation patterns where applicable
- Breaking changes must be documented in README.md with migration guidance
- Use shell parameter expansion safely: `${{ inputs.parameter }}`

### Input Validation
- Use regex patterns in `action.yml` for input validation
- Required inputs: `commands`, `dir`, `node_version`
- Optional inputs must have sensible defaults
- Use pattern validation for security-sensitive inputs (tokens, paths)

### Shell Scripts in Actions
- Always use `set -e` for error handling
- Use `shell: bash` for all run steps
- Avoid complex inline scripts; prefer multi-line with proper formatting
- Use conditional execution with `if:` statements based on step outputs

### SonarCloud Integration
- Token is optional (allows pre-setup workflows)
- Only runs when `sonar_token` is provided
- Requires full git clone (`fetch-depth: 0`)
- Uses `SonarSource/sonarqube-scan-action`

### Supply Chain Scanning
- Feature is opt-in only (default: `false`)
- Uses `@aikidosec/safe-chain@1.1.10` for scanning
- Must run before package installation commands
- Should fail workflow if threats detected

### Triggers and Conditional Execution
- Uses `bcgov/action-diff-triggers` for path-based triggering
- Only runs tests if triggered paths match or no triggers provided
- Provides `triggered` output for downstream steps
- Only applies to pull requests (always runs on push to main)

### Breaking Changes
- Document breaking changes prominently at top of README.md
- Provide migration guidance with before/after examples
- Add runtime warnings in `action.yml` for deprecated inputs
- Use clear error messages with actionable steps

## Code Style

- **YAML indentation**: 2 spaces
- **Shell scripts**: Follow bash best practices, use `set -e`
- **Comments**: Use descriptive comments for complex logic
- **Line length**: Keep lines under 120 characters when possible

## Documentation

- README.md contains comprehensive usage examples
- Include examples for common use cases (single dir, matrix, no triggers)
- Document all inputs and outputs clearly
- Keep examples up to date with latest action version
- Use GitHub releases for version history (no CHANGELOG.md)

## Security Considerations

- Never commit tokens or secrets
- Use input validation patterns to prevent injection
- Supply chain scanning is opt-in to avoid unexpected behavior
- Token validation patterns: `^[a-zA-Z0-9]{20,}$`
- Path validation to prevent directory traversal

## Testing

- Manual testing through GitHub Actions workflows required
- Test matrix scenarios: single directory, multiple directories
- Test with and without SonarCloud integration
- Test trigger behavior on pull requests vs. push to main
- Verify supply chain scanning when enabled

## Dependencies

- `actions/checkout@v6` - For repository cloning
- `actions/setup-node@v6` - For Node.js setup and caching
- `bcgov/action-diff-triggers` - For conditional execution
- `SonarSource/sonarqube-scan-action@v6.0.0` - For SonarCloud integration
- `@aikidosec/safe-chain@1.1.10` - For supply chain scanning (opt-in)

## Renovate Configuration

- Renovate is configured via `renovate.json`
- Automatically updates GitHub Actions dependencies
- Pin dependencies using SHA for security
