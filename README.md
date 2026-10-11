# Test and Analyze with Triggers and SonarCloud (Moved)

> [!IMPORTANT]
> **This action has moved to [`bcgov/actions/test-and-analyse`](https://github.com/bcgov/actions/tree/main/test-and-analyse).** This repository is retiring and will be archived. Update workflows to the new path, pinned to a [release](https://github.com/bcgov/actions/releases) (not `@main`):
>
> ```yaml
> - uses: bcgov/actions/test-and-analyse@vX.Y.Z
>   with:
>     commands: |
>       npm ci
>       npm run test:cov
>     dir: frontend
>     sonar_token: ${{ secrets.SONAR_TOKEN }}
>     triggers: |
>       frontend/
> ```
>
> | Old input | New input |
> | --- | --- |
> | `diff_branch` | `ref` |
> | `skip_checkout` | Removed. Checkout is skipped automatically when `checkout_path` already holds a checkout. |
>
> Other inputs keep their names. See [Migrating from the standalone actions](https://github.com/bcgov/actions/tree/main/test-and-analyse#migrating-from-the-standalone-actions).
