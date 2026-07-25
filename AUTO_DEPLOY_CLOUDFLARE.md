# Dhamet2 automatic Cloudflare Pages deployment

Build version: `20260725-autodeploy1`

The workflow `.github/workflows/deploy-cloudflare-pages.yml` runs after every push to `main`, and can also be started manually from GitHub Actions.

It performs these operations in order:

1. Validates the required GitHub secrets and variable.
2. Runs the complete test suite.
3. Builds the static site into `_site`.
4. Verifies the lobby, game page, and `version.json` exist.
5. Deploys `_site` to the existing Cloudflare Pages project through Wrangler.

Required GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Required GitHub Actions repository variable:

- `CLOUDFLARE_PAGES_PROJECT_NAME`

The Pages project must use `main` as its production branch. If the repository uses a different production branch, update both `on.push.branches` and `--branch=main` in the workflow.

## Automatic cache versioning

Every GitHub deployment creates a unique deployed build identifier using the release name and the first 12 characters of the Git commit SHA. The build script rewrites the static asset query strings and the deployed `version.json`, so each push receives a fresh browser and CDN cache identity without manual editing.
