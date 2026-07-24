import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));

for (const required of [
  "css/style.css",
  "css/pages.css",
  "css/mobile.css",
  "css/theme.css",
  "js/theme-colors.js",
  "js/visual-shell.js",
  "js/mobile.js",
  "js/modal.js",
  "js/i18n.js"
]) assert.ok(exists(required), `Missing synchronized UI file: ${required}`);

const lobby = read("pages/loby.html");
assert.match(lobby, /الغرف النشطة واللاعبون المتصلون/);
assert.match(lobby, /شاهد المباريات الجارية أو اختر لاعبًا متصلًا وادعه إلى مباراة مباشرة/);
assert.match(lobby, /id="lobbyInviteControls"/);
assert.match(lobby, /id="btnLobbyManualRefresh"/);
assert.match(lobby, /theme\.css/);
assert.match(lobby, /visual-shell\.js/);
assert.doesNotMatch(lobby, /نظام اللعب الاحتياطي|جلسات مجهولة|مباريات غير مصنفة|z-emergency-banner/);

const game = read("pages/game.html");
for (const id of [
  "board", "statusText", "onlinePresence", "btnEndKill", "btnSoufla",
  "pvpControlsBox", "btnUndo", "btnSettings", "btnEndOnline", "btnSync",
  "btnChat", "btnSpk", "btnMic", "btnLeaveRoom", "log"
]) assert.match(game, new RegExp(`id=["']${id}["']`), `Missing main-interface game element: ${id}`);
assert.match(game, /theme\.css/);
assert.match(game, /visual-shell\.js/);
assert.doesNotMatch(game, /نظام احتياطي|المباراة غير مصنفة|z-emergency-banner/);
assert.doesNotMatch(game, /id="btnNew"|id="btnSave"|id="btnResume"|id="btnEndLocalMatch"|id="pvcControlsBox"/);

const mobile = read("js/mobile.js");
assert.match(mobile, /z-mobile-portrait/);
assert.match(mobile, /z-mobile-landscape/);
assert.match(mobile, /screen\.orientation/);
assert.match(mobile, /https:\/\/ouglsoft\.com\/dhamet\/pages\/mode\.html/);

const visualShell = read("js/visual-shell.js");
assert.match(visualShell, /z-topbar/);
assert.match(visualShell, /z-lang-select/);
assert.match(visualShell, /btnLobbyManualRefresh/);

const i18n = read("js/i18n.js");
assert.match(i18n, /"title": "الغرف النشطة واللاعبون المتصلون"/);
assert.match(i18n, /"syncIssueNotice": "لم تظهر آخر تغييرات المباراة/);
assert.match(i18n, /"confirm": "هل تريد إنهاء المباراة الحالية؟"/);

// Validate every local src/href reference in the two deployable pages.
for (const pagePath of ["pages/loby.html", "pages/game.html"]) {
  const html = read(pagePath);
  const base = path.dirname(path.join(root, pagePath));
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]);
  for (const raw of refs) {
    if (/^(?:https?:|data:|#)/i.test(raw)) continue;
    const clean = raw.split(/[?#]/, 1)[0];
    if (!clean) continue;
    assert.ok(fs.existsSync(path.resolve(base, clean)), `${pagePath} references missing local file: ${raw}`);
  }
}

// Validate local asset URLs used by the synchronized stylesheets.
for (const cssPath of ["css/style.css", "css/pages.css", "css/mobile.css", "css/theme.css"]) {
  const css = read(cssPath);
  const base = path.dirname(path.join(root, cssPath));
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    const raw = match[1];
    if (/^(?:https?:|data:|#)/i.test(raw)) continue;
    const clean = raw.split(/[?#]/, 1)[0];
    if (!clean) continue;
    assert.ok(fs.existsSync(path.resolve(base, clean)), `${cssPath} references missing local file: ${raw}`);
  }
}

console.log("main-interface parity tests passed");
