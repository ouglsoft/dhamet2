#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "_site");
const buildToken = "__DHAMET_BUILD__";

function fail(message) {
  console.error(`prepare-pages: ${message}`);
  process.exit(1);
}

function readRelease() {
  const file = path.join(root, "version.json");
  if (!fs.existsSync(file)) fail("version.json is missing");
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    const release = String(value.version || "").trim();
    if (!release) fail("version.json version is missing");
    return { value, release };
  } catch (error) {
    fail(`Cannot read version.json: ${error.message}`);
  }
}

function resolveBuildVersion(release) {
  const explicit = String(process.env.DHAMET_BUILD_VERSION || "").trim();
  if (explicit) return explicit;
  const sha = String(process.env.GITHUB_SHA || process.env.DHAMET_COMMIT_SHA || "").trim();
  return sha ? `${release}-${sha.slice(0, 12)}` : release;
}

const excludedPaths = new Set([
  ".git",
  ".github",
  "_site",
  "node_modules",
  "scripts",
  "deploy",
]);

const excludedFileNames = new Set([
  ".DS_Store",
  "README.txt",
  "LICENSE.txt",
  ".firebaserc",
  "firebase.json",
  "database.rules.json",
  "package.json",
  "package-lock.json",
  "DEPLOYMENT_DHAMET2.md",
  "CHANGES.md",
  "FINAL_REVIEW.md",
  "AUTO_DEPLOY_CLOUDFLARE.md",
  "BUILD_SYNC_REPORT.md",
  "RULES_PARITY_REPORT.md",
  "MESSAGE_PARITY_REPORT.md",
  "DEPLOYMENT_PARITY_REPORT.md",
  "REPLACEMENT_MANIFEST.md",
  "DELETE_THESE_FILES.txt",
]);

const textExtensions = new Set([".html", ".js", ".css", ".json", ".xml", ".txt", ".svg"]);

function normalize(value) {
  return value.split(path.sep).join("/");
}

function isEnvironmentFile(name) {
  return name === ".env" || name.startsWith(".env.");
}

function isExcluded(relativePath) {
  const normalized = normalize(relativePath);
  const baseName = path.basename(normalized);
  if (excludedFileNames.has(baseName) || isEnvironmentFile(baseName)) return true;
  for (const excluded of excludedPaths) {
    if (normalized === excluded || normalized.startsWith(`${excluded}/`)) return true;
  }
  return false;
}

function copyTree(currentPath) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const source = path.join(currentPath, entry.name);
    const relative = path.relative(root, source);
    if (isExcluded(relative)) continue;
    if (entry.isDirectory()) {
      copyTree(source);
      continue;
    }
    if (!entry.isFile()) continue;
    const destination = path.join(outDir, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
}

function injectBuildVersion(currentPath, buildVersion) {
  for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
    const file = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      injectBuildVersion(file, buildVersion);
      continue;
    }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const text = fs.readFileSync(file, "utf8");
    if (text.includes(buildToken)) fs.writeFileSync(file, text.replaceAll(buildToken, buildVersion));
  }
}

function assertNoBuildTokens(currentPath) {
  const unresolved = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
        if (fs.readFileSync(file, "utf8").includes(buildToken)) unresolved.push(normalize(path.relative(outDir, file)));
      }
    }
  }
  visit(currentPath);
  if (unresolved.length) fail(`Unresolved build tokens:\n${unresolved.join("\n")}`);
}

function assertVersionedRuntimeAssets(buildVersion) {
  const expected = `v=${encodeURIComponent(buildVersion)}`;
  const problems = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && entry.name.endsWith(".html")) {
        const text = fs.readFileSync(file, "utf8");
        const tags = text.match(/<(?:script|link)\b[^>]*>/gi) || [];
        for (const tag of tags) {
          const isScript = /^<script\b/i.test(tag);
          const isStylesheet = /^<link\b/i.test(tag) && /\brel\s*=\s*(["'])[^"']*stylesheet[^"']*\1/i.test(tag);
          if (!isScript && !isStylesheet) continue;
          const attribute = isScript ? "src" : "href";
          const match = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*(["'])([^"']+)\\1`, "i"));
          if (!match) continue;
          const url = match[2].trim();
          if (/^(?:(?:https?:)?\/\/|data:|blob:|#)/i.test(url)) continue;
          if (!new RegExp(`(?:[?&])${expected}(?:[&#]|$)`).test(url)) {
            problems.push(`${normalize(path.relative(outDir, file))}: ${url}`);
          }
        }
      }
    }
  }
  visit(outDir);
  if (problems.length) fail(`Unversioned runtime assets:\n${problems.join("\n")}`);
}

const { value: sourceVersion, release } = readRelease();
const buildVersion = resolveBuildVersion(release);
const commit = String(process.env.GITHUB_SHA || process.env.DHAMET_COMMIT_SHA || "").trim();

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
copyTree(root);
injectBuildVersion(outDir, buildVersion);

const deployedVersion = {
  ...sourceVersion,
  version: buildVersion,
  release,
  source: "stable-incremental-cloudflare-pages-deployment",
};
if (commit) deployedVersion.commit = commit;
fs.writeFileSync(path.join(outDir, "version.json"), JSON.stringify(deployedVersion, null, 2) + "\n");

assertNoBuildTokens(outDir);
assertVersionedRuntimeAssets(buildVersion);

for (const required of ["pages/loby.html", "pages/game.html", "version.json", "_headers"]) {
  if (!fs.existsSync(path.join(outDir, required))) fail(`Required output is missing: ${required}`);
}

console.log(`Prepared Cloudflare Pages output: _site (${buildVersion})`);
