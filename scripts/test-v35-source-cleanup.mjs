import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const i18nPath = path.join(root, "js/i18n.js");

function translations() {
  const source = fs.readFileSync(i18nPath, "utf8");
  const start = source.indexOf("const translations = ");
  const end = source.indexOf("\n  window.translations = translations;", start);
  assert.ok(start >= 0 && end > start);
  const expression = source.slice(start + "const translations = ".length, end).trim().replace(/;$/, "");
  return vm.runInNewContext(`(${expression})`);
}

function flatten(value, prefix = "", output = {}) {
  for (const [key, item] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object" && !Array.isArray(item)) flatten(item, full, output);
    else output[full] = String(item);
  }
  return output;
}

function placeholders(value) {
  return [...String(value).matchAll(/\$\{([^}]+)\}|\{([^}]+)\}/g)].map((match) => match[1] || match[2]).sort();
}

function filesUnder(directory) {
  const output = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...filesUnder(target));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

const data = translations();
const maps = Object.fromEntries(["ar", "en", "fr"].map((lang) => [lang, flatten(data[lang])]));
assert.equal(Object.keys(maps.ar).length, 256);
for (const lang of ["en", "fr"]) {
  assert.deepEqual(Object.keys(maps[lang]).sort(), Object.keys(maps.ar).sort());
  for (const key of Object.keys(maps.ar)) assert.deepEqual(placeholders(maps[lang][key]), placeholders(maps.ar[key]), `${lang}:${key}`);
}
const appFiles = filesUnder(root).filter((file) => /\.(?:js|html)$/.test(file) && file !== i18nPath && !file.includes(`${path.sep}scripts${path.sep}`) && !file.includes(`${path.sep}deploy${path.sep}`));
const source = appFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const dynamicPrefixes = ["langs.", "soufla.spectator.", "soufla.summary."];
const unused = Object.keys(maps.ar).filter((key) => !source.includes(key) && !dynamicPrefixes.some((prefix) => key.startsWith(prefix)));
assert.deepEqual(unused, []);
const files = filesUnder(root);
assert.deepEqual(files.filter((file) => file.endsWith(".ast")), []);
const runtimeSource = files.filter((file) => /\.(?:js|mjs|cjs)$/.test(file) && !file.includes(`${path.sep}scripts${path.sep}`) && !file.includes(`${path.sep}deploy${path.sep}`)).map((file) => fs.readFileSync(file, "utf8")).join("\n");
for (const symbol of ["applyForcedOpeningInfo", "consumeTurnClearForMove", "otherReadTs", "moverName", "AUTH_CARD_RAF", "normalizeMobileControlIcons"]) assert.ok(!runtimeSource.includes(symbol), symbol);
console.log("V35 translation and dead-source cleanup tests passed");
