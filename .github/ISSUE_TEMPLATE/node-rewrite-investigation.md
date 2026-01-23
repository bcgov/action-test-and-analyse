# Investigate Node.js Rewrite for Composite Action

## Summary

This action currently uses a composite action (YAML + bash) with extensive inline Node.js commands for JSON parsing and manipulation. This issue investigates the feasibility and benefits of converting to a JavaScript/TypeScript action.

## Current State Analysis

### Architecture
- **Type**: Composite action (`using: composite`)
- **Primary Language**: Bash shell scripts with YAML
- **Node.js Usage**: 20+ inline `node -e` and `node -p` commands
- **Dependencies**: Already requires Node.js (knip, @aikidosec/safe-chain)

### Node.js Command Usage

The action contains **11+ inline Node.js commands** for:

1. **Version extraction** (2 commands):
   - `node -p` to read `@aikidosec/safe-chain` version from package-lock.json
   - `node -p` to read `knip` version from package-lock.json

2. **JSON parsing and validation** (1 command):
   - `node -e` to validate and parse `knip-output.json` with comprehensive error handling

3. **Issue counting** (4 commands):
   - Count unused files
   - Count unused dependencies
   - Count unused devDependencies
   - Count unused exports

4. **Annotation generation** (4+ commands):
   - Generate GitHub Actions annotations for unused files
   - Generate annotations for unused dependencies
   - Generate annotations for unused devDependencies
   - Generate annotations for unused exports

### Current Challenges

1. **Complex Error Handling**:
   - Requires `set +e` / `set -e` patterns to handle expected failures
   - Command substitutions in `set -e` mode require special patterns (e.g., `if ! PARSE_ERROR=$(node ...); then`)
   - Recent fix (#112) addressed premature exit issues with `set -e`

2. **Code Duplication**:
   - Similar error handling patterns repeated across multiple `node -e` commands
   - JSON parsing logic duplicated in each command

3. **Maintainability**:
   - Inline JavaScript in YAML strings is difficult to read and maintain
   - No syntax highlighting or IDE support for inline code
   - Difficult to test individual parsing functions

4. **Error Messages**:
   - Error handling scattered across bash conditionals and Node.js try/catch blocks
   - Inconsistent error reporting patterns

## Benefits of Node.js Rewrite

### Code Quality
- ✅ Replace 20+ inline `node -e` commands with a single, well-structured script
- ✅ Better error handling with try/catch instead of `set -e`/`set +e` patterns
- ✅ Eliminate bash/Node.js integration complexity
- ✅ Type safety with TypeScript support
- ✅ Better IDE support (autocomplete, type checking, refactoring)

### Maintainability
- ✅ Easier to read and understand
- ✅ Unit testable code
- ✅ Better tooling (ESLint, Prettier, TypeScript compiler)
- ✅ Easier to add new features or modify existing logic

### Developer Experience
- ✅ Syntax highlighting and proper code formatting
- ✅ Better debugging capabilities
- ✅ Reusable functions instead of duplicated inline code
- ✅ Clear separation of concerns

## Drawbacks of Node.js Rewrite

### Migration Complexity
- ❌ Significant refactoring effort required
- ❌ Need to restructure from composite to JavaScript action
- ❌ Requires build/distribution setup (or use `node16`/`node20` runtime)
- ❌ Different action type may require documentation updates

### Distribution
- ❌ JavaScript actions require compilation/bundling (unless using runtime directly)
- ❌ Need to decide on distribution method (compiled vs. source)
- ❌ May need to set up build pipeline

### Current Approach Works
- ✅ Current composite action is functional
- ✅ No critical bugs or performance issues
- ✅ Users are familiar with composite actions

## Alternative: Hybrid Approach

Before a full rewrite, consider extracting Node.js logic into separate scripts:

1. **Create `scripts/parse-knip.js`**:
   - Consolidate all Knip JSON parsing logic
   - Handle validation, counting, and annotation generation
   - Keep composite action structure

2. **Benefits**:
   - Reduces inline Node.js code significantly
   - Improves maintainability without full migration
   - Lower risk than complete rewrite
   - Can be incremental (migrate one function at a time)

3. **Implementation**:
   ```bash
   # Instead of:
   UNUSED_FILES=$(node -e "try { const data = require('./knip-output.json'); ... }")
   
   # Use:
   node scripts/parse-knip.js --count files
   ```

## Investigation Tasks

- [ ] Research JavaScript action structure and requirements
- [ ] Evaluate build/distribution options (compiled vs. runtime)
- [ ] Assess impact on existing users and workflows
- [ ] Estimate migration effort and timeline
- [ ] Compare hybrid approach vs. full rewrite
- [ ] Review similar actions for best practices
- [ ] Consider TypeScript vs. JavaScript
- [ ] Evaluate testing strategy for JavaScript action
- [ ] Assess backward compatibility requirements

## Related Issues/PRs

- PR #112: Fixed `set -e` premature exit issues with command substitutions
- Issue #111: Improved error handling for Knip JSON parsing

## References

- [GitHub Actions: Creating a JavaScript action](https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action)
- [GitHub Actions: Creating a composite action](https://docs.github.com/en/actions/creating-actions/creating-a-composite-action)
- Current action structure: `action.yml` (452 lines)
- Node.js dependencies: `package.json`

## Decision Criteria

Before proceeding with a rewrite, we should:
1. Identify specific pain points that justify the effort
2. Ensure the rewrite addresses real problems, not just "cleaner code"
3. Consider user impact and migration path
4. Evaluate if hybrid approach meets needs first

---

**Labels**: `enhancement`, `investigation`, `technical-debt`
**Priority**: Medium (not blocking, but could improve maintainability)
