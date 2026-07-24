import fs from "fs";
import path from "path";

const root = process.cwd();
const outDir = path.join(root, "_site");

/*
 * Cloudflare Pages deploys the content of the build output directory.
 * This script prepares a clean static output in _site.
 *
 * Important:
 * This deployment is fully static. Online play connects directly to Firebase.
 */
const excludedPaths = [
  ".git",
  ".github",
  "_site",
  "node_modules",
  "scripts",
  "assets/models/human"
];

const excludedFileNames = [
  ".DS_Store",
  "README.txt",
  "LICENSE.txt",
  ".firebaserc",
  "firebase.json",
  "database.rules.json",
  "package.json",
  "DEPLOYMENT_DHAMET2.md",
  "CHANGES.md",
  "FINAL_REVIEW.md",
  "REPLACEMENT_MANIFEST.md",
  "DELETE_THESE_FILES.txt"
];

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function isEnvironmentFile(baseName) {
  return baseName === ".env" || baseName.startsWith(".env.");
}

function isExcluded(relativePath) {
  const normalized = normalizePath(relativePath);
  const baseName = path.basename(normalized);

  if (excludedFileNames.includes(baseName)) return true;
  if (isEnvironmentFile(baseName)) return true;

  return excludedPaths.some((excluded) => {
    return normalized === excluded || normalized.startsWith(excluded + "/");
  });
}

function copyProjectFile(srcPath) {
  const relativePath = path.relative(root, srcPath);

  if (isExcluded(relativePath)) return;

  const destPath = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
}

function walk(currentPath) {
  const entries = fs.readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    const relativePath = path.relative(root, fullPath);

    if (isExcluded(relativePath)) continue;

    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile()) {
      copyProjectFile(fullPath);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

walk(root);

console.log("Cloudflare Pages output prepared in _site");
console.log("Excluded from static deployment output:");

for (const excludedPath of excludedPaths) {
  console.log("- " + excludedPath);
}

for (const excludedFileName of excludedFileNames) {
  console.log("- " + excludedFileName);
}

console.log("- .env");
console.log("- .env.*");
