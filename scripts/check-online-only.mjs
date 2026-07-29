import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const bannedPaths = [
  "index.html",
  "pages/mode.html",
  "pages/dashboard.html",
  "js/dashboard.js",
  "js/leaderboard.js",
  "js/ai.worker.js",
  "training",
  "functions",
];
for (const rel of bannedPaths) {
  if (fs.existsSync(path.join(root, rel))) throw new Error(`Forbidden path remains: ${rel}`);
}

const required = [
  "pages/loby.html",
  "pages/game.html",
  "js/online.js",
  "js/online.passive.js",
  "shared/dhamet-rules.js",
  "shared/dhamet-state.js",
  "shared/dhamet-turn-resolution.js",
  "shared/dhamet-move.js",
  "shared/dhamet-soufla.js",
  "shared/dhamet-control.js",
  "shared/dhamet-result.js",
  "shared/dhamet-match-end.js",
  "js/rules-parity-runtime.js",
  "database.rules.json",
];
for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing online path: ${rel}`);
}

const runtimeRoots = ["js", "pages", "css", "shared", "deploy"];
const runtimeFiles = ["database.rules.json", "firebase.json", "_headers", "_redirects"];
const textExtensions = new Set([".js", ".mjs", ".html", ".css", ".json", ".txt", ".webmanifest"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (textExtensions.has(path.extname(entry.name).toLowerCase()) || !path.extname(entry.name)) out.push(full);
  }
  return out;
}

const deployable = [
  ...runtimeRoots.flatMap((rel) => walk(path.join(root, rel))),
  ...runtimeFiles.map((rel) => path.join(root, rel)).filter(fs.existsSync),
];

// These are feature-specific symbols, not the shared TOP/BOT board-side constants.
// TOP and BOT must remain because the online rules engine uses them for the two sides.
const forbiddenRuntimePatterns = [
  ["training recorder", /\bTrainRecorder\b/i],
  ["training database root", /trainGamesV3|Human-model/i],
  ["AI runtime", /\bDhametAI\b|\bAI_LEVEL\w*\b|\baiLevel\w*\b/i],
  ["computer Soufla path", /showSouflaAgainstHuman|soufla\.cpu|players\.computer/i],
  ["computer mode path", /vsComputer|computeruser|normalizeAdvancedSettings/i],
  ["AI search settings", /thinkTime|evalNoise|moveMistake|minimax|self[-_ ]?play/i],
  ["local/PvC controls", /controls-pvc|mode-pvc|pvcControlsBox|btnEndLocalMatch|btnNew|btnSave|btnResume/i],
  ["local game session", /\bSessionGame\b/i],
  ["human-vs-computer naming", /availableSouflaForHuman|isHumanTurn|btnExportHuman|btnHint/i],
];

for (const file of deployable) {
  const source = fs.readFileSync(file, "utf8");
  for (const [label, pattern] of forbiddenRuntimePatterns) {
    const match = source.match(pattern);
    if (match) {
      const rel = path.relative(root, file).replaceAll(path.sep, "/");
      throw new Error(`Forbidden ${label} remains in ${rel}: ${match[0]}`);
    }
  }
}

console.log(`online-only check passed (${deployable.length} deployable text files scanned)`);
