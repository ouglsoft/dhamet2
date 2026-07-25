import fs from "node:fs";
import crypto from "node:crypto";

const manifest = JSON.parse(fs.readFileSync("scripts/ui-reference-manifest.json", "utf8"));
const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

for (const [file, expected] of Object.entries({ ...manifest.css, ...manifest.icons })) {
  if (!fs.existsSync(file)) throw new Error(`Primary UI asset is missing: ${file}`);
  const actual = sha256(file);
  if (actual !== expected) throw new Error(`Primary UI asset differs: ${file}\nexpected ${expected}\nactual   ${actual}`);
}

console.log("primary UI CSS and icon assets match the main application");
