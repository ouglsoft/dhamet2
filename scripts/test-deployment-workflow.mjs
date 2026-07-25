import fs from "node:fs";

const workflowPath = ".github/workflows/deploy-cloudflare-pages.yml";
if (!fs.existsSync(workflowPath)) throw new Error("Cloudflare Pages deployment workflow is missing");

const workflow = fs.readFileSync(workflowPath, "utf8");
for (const token of [
  "push:",
  "workflow_dispatch:",
  "branches:",
  "- main",
  "npm ci --no-audit --no-fund",
  "npm run deploy:pages",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_PAGES_PROJECT_NAME",
]) {
  if (!workflow.includes(token)) throw new Error(`Deployment workflow is missing required token: ${token}`);
}

if (/2026\d{4}-[a-z0-9-]+/i.test(workflow)) {
  throw new Error("Deployment workflow must not contain a release-specific version");
}
if (/\bpaths\s*:/.test(workflow)) {
  throw new Error("Deployment workflow must run for every push to main, without path filtering");
}

const version = JSON.parse(fs.readFileSync("version.json", "utf8"));
if (!/^20\d{6}-[a-z0-9][a-z0-9-]*$/i.test(String(version.version || ""))) {
  throw new Error("version.json must contain a release identifier such as YYYYMMDD-name");
}
if (version.release !== version.version) throw new Error("version.json release must match version in source");

const prepare = fs.readFileSync("deploy/prepare-pages.mjs", "utf8");
for (const token of ["__DHAMET_BUILD__", "GITHUB_SHA", "version.json", "assertVersionedRuntimeAssets"]) {
  if (!prepare.includes(token)) throw new Error(`Prepare script is missing stable deployment token: ${token}`);
}

const deploy = fs.readFileSync("deploy/deploy-pages.mjs", "utf8");
for (const token of ["wrangler@4.110.0", "pages", "deploy", "CLOUDFLARE_PAGES_PROJECT_NAME", "--commit-hash"]) {
  if (!deploy.includes(token)) throw new Error(`Deploy script is missing required token: ${token}`);
}

for (const file of ["pages/game.html", "pages/loby.html", "js/emergency-shell.js", "js/message-parity-runtime.js"]) {
  const source = fs.readFileSync(file, "utf8");
  if (!source.includes("__DHAMET_BUILD__")) throw new Error(`${file} does not use the stable build token`);
  if (source.includes(version.version)) throw new Error(`${file} embeds the release literal and would require large future replacements`);
}

console.log("stable incremental Cloudflare Pages deployment contract passed");
