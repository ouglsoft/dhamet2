import fs from "node:fs";

const workflowPath = ".github/workflows/deploy-cloudflare-pages.yml";
if (!fs.existsSync(workflowPath)) {
  throw new Error("Cloudflare Pages deployment workflow is missing");
}

const workflow = fs.readFileSync(workflowPath, "utf8");
const required = [
  "push:",
  "workflow_dispatch:",
  "branches:",
  "- main",
  "npm ci --no-audit --no-fund",
  "DHAMET_BUILD_VERSION=20260725-messageparity1-$SHORT_SHA",
  "npm run build",
  "cloudflare/wrangler-action@v3",
  "pages deploy _site",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_PAGES_PROJECT_NAME",
  "--branch=main",
  "--commit-hash=${{ github.sha }}",
];

for (const token of required) {
  if (!workflow.includes(token)) {
    throw new Error(`Deployment workflow is missing required token: ${token}`);
  }
}

const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
if (version.version !== "20260725-messageparity1") {
  throw new Error("version.json does not identify the rules parity build");
}

console.log("Cloudflare Pages deployment workflow contract passed");

const buildScript = fs.readFileSync("scripts/build-cloudflare-pages.mjs", "utf8");
for (const token of ["DHAMET_BUILD_VERSION", "applyDeploymentVersion", "release", "DHAMET_COMMIT_SHA"]) {
  if (!buildScript.includes(token)) {
    throw new Error(`Build script is missing automatic version token: ${token}`);
  }
}
