import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts/message-reference-manifest.json"), "utf8"));
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const hash = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");

for (const [file, expected] of Object.entries(manifest.primaryModuleHashes)) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing primary modal module: ${file}`);
  const actual = hash(file);
  if (actual !== expected) throw new Error(`Primary modal module differs: ${file}\nexpected ${expected}\nactual   ${actual}`);
}

function parseTranslations(source) {
  const marker = "const translations";
  const markerAt = source.indexOf(marker);
  if (markerAt < 0) throw new Error("translations object marker missing");
  const start = source.indexOf("{", markerAt);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, i + 1));
    }
  }
  throw new Error("translations object is not closed");
}

function flatten(value, prefix = "", output = {}) {
  for (const [key, child] of Object.entries(value || {})) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flatten(child, full, output);
    else output[full] = child;
  }
  return output;
}

const i18nSource = read("js/i18n.js");
const translations = parseTranslations(i18nSource);
for (const lang of manifest.languages) {
  const flat = flatten(translations[lang]);
  if (Object.keys(flat).length !== manifest.onlineOnlyLeafCount) {
    throw new Error(`${lang} online-only translation leaf count differs: ${Object.keys(flat).length}`);
  }
  for (const key of manifest.allowedExtraKeys) {
    if (!Object.prototype.hasOwnProperty.call(flat, key)) throw new Error(`${lang} required backup-only message missing: ${key}`);
  }
  for (const key of manifest.necessaryChangedKeys) {
    if (!Object.prototype.hasOwnProperty.call(flat, key)) throw new Error(`${lang} necessary Firebase wording missing: ${key}`);
  }
  for (const key of manifest.bannedLegacyKeys) {
    if (Object.prototype.hasOwnProperty.call(flat, key)) throw new Error(`${lang} legacy backup-only message remains: ${key}`);
  }
}

const sourceFiles = [
  "js/online.js",
  "js/online.passive.js",
  "js/ui.js",
  "js/game.js",
  "js/message-parity-runtime.js",
  "pages/game.html",
  "pages/loby.html",
];
const combined = sourceFiles.map(read).join("\n");
for (const key of manifest.bannedLegacyKeys) {
  if (combined.includes(`\"${key}\"`) || combined.includes(`'${key}'`)) {
    throw new Error(`Legacy backup-only message key is still referenced: ${key}`);
  }
}

const game = read("pages/game.html");
for (const file of ["ui/dropdown-view.js", "ui/soufla-view.js", "ui.js", "message-parity-runtime.js"]) {
  if (!game.includes(`../js/${file}?v=__DHAMET_BUILD__`)) throw new Error(`Game page does not load ${file} with the stable build token`);
}
if (!game.includes('data-build-version="__DHAMET_BUILD__"')) throw new Error("message parity build token missing");

const online = read("js/online.js");
const passive = read("js/online.passive.js");
const ui = read("js/ui.js");
const runtime = read("js/message-parity-runtime.js");

for (const token of [
  "_buildOnlineEndPresentation",
  "online.endPresentation.winner",
  "online.resultNotCounted.early",
  "UI.showOnlineGameOverModal(presentation)",
  "_confirmLeaveActiveMatchBeforeInvite",
  "online.invites.leaveActivePrompt",
  "online.invites.leaveAndSend",
  "pvp.voice.failure.permission",
  "pvp.voice.failure.noDevice",
  "pvp.voice.failure.service",
]) {
  if (!online.includes(token)) throw new Error(`Primary message behavior missing: ${token}`);
}
if (!online.includes('name: `<span class="z-player-name">${escapeHtml(name)}</span>`')) throw new Error("Undo requester name is not escaped like the primary app");
if (!passive.includes('const safeName = `<span class="z-player-name">${escapeHtml(name)}</span>`')) throw new Error("Invite sender name is not escaped like the primary app");
if (!passive.includes('roomName: escapeHtml(roomName)')) throw new Error("Invite room name is not escaped like the primary app");
if (!passive.includes('translateArgs("online.inviteRejected")')) throw new Error("Outgoing invite rejection must notify the sender");
if (!online.includes('type !== "invite_sent"') || !online.includes('type !== "invite_accepted"') || !online.includes('type !== "invite_rejected"')) {
  throw new Error("Invite lifecycle records are not hidden from the visible game log");
}
if (!ui.includes('return SouflaViewModule.showSouflaModal')) throw new Error("Primary soufla modal module is not used");
for (const token of ["setTheme", "setBoardStyle", "setCoords", "saveSessionSettings"]) {
  if (!ui.includes(token)) throw new Error(`Visual-only settings behavior missing: ${token}`);
}
for (const token of ["aiLevel", "thinkTime", "evalNoise", "moveMistake", "showSouflaAgainstHuman", "SessionGame"]) {
  if (ui.includes(token)) throw new Error(`Non-online settings/runtime symbol remains: ${token}`);
}
for (const lang of manifest.languages) {
  const rejected = translations[lang].undo;
  if (/الأصفر|yellow|jaune/i.test(rejected.requesterRejected) || /الأصفر|yellow|jaune/i.test(rejected.spectatorRejected)) {
    throw new Error(`${lang} undo rejection incorrectly mentions the reversed arrow`);
  }
  if (!/الأصفر|yellow|jaune/i.test(rejected.requesterAccepted) || !/الأصفر|yellow|jaune/i.test(rejected.spectatorAccepted)) {
    throw new Error(`${lang} undo acceptance must still mention the reversed arrow`);
  }
}
for (const token of ["z-postmatch-confirm-only", "allowEsc: false", "blocking: true", "forceReplace: true"]) {
  if (!runtime.includes(token)) throw new Error(`Primary online end modal contract missing: ${token}`);
}

console.log("online-only messages and modal contract tests passed");
