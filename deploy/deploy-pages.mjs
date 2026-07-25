#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const branch = String(process.env.GITHUB_REF_NAME || process.env.CLOUDFLARE_PAGES_BRANCH || "main").trim();

function fail(message) {
  console.error(`deploy-pages: ${message}`);
  process.exit(1);
}

function readProjectName() {
  const fromEnvironment = String(
    process.env.CLOUDFLARE_PAGES_PROJECT_NAME || process.env.CF_PAGES_PROJECT_NAME || "",
  ).trim();
  if (fromEnvironment) return fromEnvironment;
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    return String(packageJson?.cloudflare?.pagesProjectName || "").trim();
  } catch (error) {
    fail(`Cannot read Cloudflare Pages project name: ${error.message}`);
  }
}

function run(command, args) {
  if (dryRun) {
    console.log([command, ...args].join(" "));
    return;
  }
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const prepared = spawnSync("node", ["deploy/prepare-pages.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (prepared.status !== 0) process.exit(prepared.status || 1);

const project = readProjectName();
if (!project) fail("Set the GitHub variable CLOUDFLARE_PAGES_PROJECT_NAME.");
if (!process.env.CLOUDFLARE_API_TOKEN) fail("Missing CLOUDFLARE_API_TOKEN.");
if (!process.env.CLOUDFLARE_ACCOUNT_ID) fail("Missing CLOUDFLARE_ACCOUNT_ID.");

const args = [
  "--yes",
  "wrangler@4.110.0",
  "pages",
  "deploy",
  "_site",
  "--project-name",
  project,
  "--branch",
  branch,
];
const sha = String(process.env.GITHUB_SHA || "").trim();
if (sha) args.push("--commit-hash", sha);
run("npx", args);
