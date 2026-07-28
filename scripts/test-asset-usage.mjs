import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetRoot = path.join(root, "assets");
const imageExt = new Set([".svg", ".png", ".webp", ".jpg", ".jpeg", ".gif", ".ico", ".avif"]);
const textExt = new Set([".html", ".css", ".js", ".mjs", ".json", ".webmanifest", ".yml", ".yaml"]);
const ignoredText = new Set([
  "scripts/ui-reference-manifest.json",
  "scripts/test-asset-usage.mjs",
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const runtimeTextFiles = walk(root).filter((file) => {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (rel.startsWith("assets/") || rel.startsWith(".git/") || rel.startsWith("node_modules/") || rel.startsWith(".deploy/")) return false;
  if (ignoredText.has(rel) || /^scripts\/test-/.test(rel)) return false;
  return textExt.has(path.extname(file).toLowerCase());
});
const corpus = runtimeTextFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const shell = fs.readFileSync(path.join(root, "js/emergency-shell.js"), "utf8");

const assets = walk(assetRoot).filter((file) => imageExt.has(path.extname(file).toLowerCase()));
const unused = [];
for (const file of assets) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const base = path.basename(file);
  const isAvatar = rel.startsWith("assets/icons/users/");
  const used = corpus.includes(rel) || corpus.includes(base) || (isAvatar && shell.includes(rel));
  if (!used) unused.push(rel);
}
assert.deepEqual(unused, [], `Unused image assets remain:\n${unused.join("\n")}`);

for (const removed of [
  "assets/icons/new-game.svg",
  "assets/icons/resume.svg",
  "assets/icons/save.svg",
  "assets/icons/pvc.svg",
  "assets/icons/pvp.svg",
  "assets/icons/users/computeruser.png",
  "assets/icons/users/user10.png",
]) assert.equal(fs.existsSync(path.join(root, removed)), false, `Obsolete backup asset remains: ${removed}`);

const byHash = new Map();
for (const file of assets) {
  const hash = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  const group = byHash.get(hash) || [];
  group.push(rel);
  byHash.set(hash, group);
}
const duplicates = [...byHash.values()].filter((group) => group.length > 1);
assert.deepEqual(duplicates, [], `Duplicate image assets remain: ${JSON.stringify(duplicates)}`);
console.log(`asset usage audit passed (${assets.length} used image assets)`);
