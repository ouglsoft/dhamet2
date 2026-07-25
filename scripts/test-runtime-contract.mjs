import fs from "node:fs";

const ui = fs.readFileSync(new URL("../js/ui.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../pages/game.html", import.meta.url), "utf8");
const passive = fs.readFileSync(new URL("../js/online.passive.js", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../js/emergency-shell.js", import.meta.url), "utf8");
const headers = fs.readFileSync(new URL("../_headers", import.meta.url), "utf8");
const mobileCss = fs.readFileSync(new URL("../css/mobile.css", import.meta.url), "utf8");
const runtimeCss = fs.readFileSync(new URL("../css/backup-runtime.css", import.meta.url), "utf8");

if (!shell.includes("waitForInitialAuthState")) throw new Error("auth persistence restoration is not awaited");
if (!shell.includes("Auth.Persistence.SESSION")) throw new Error("anonymous auth must be tab/session scoped");
if (!shell.includes("AUTH_TAB_KEY")) throw new Error("tab auth marker is missing");
if (!shell.includes("resetAnonymous")) throw new Error("anonymous-session recovery is missing");
if (!passive.includes("Never mark the new session busy")) throw new Error("stale active-game recovery is missing");
if (!passive.includes("Starting Firebase writes from beforeunload/pagehide")) throw new Error("unload freeze prevention is missing");
if (/addEventListener\("beforeunload", cleanup/.test(passive)) throw new Error("Firebase cleanup must not run from beforeunload");

if (!game.includes('data-build-version="__DHAMET_BUILD__"')) throw new Error("stable build token is missing");
if (!game.includes('<div class="timer-row">')) throw new Error("primary timer row structure is missing");
if (!game.includes('class="btn ok keep-text"') || !game.includes('id="btnEndKill"')) throw new Error("primary end-capture button structure is missing");
if (!game.includes('id="pvcControlsBox"') || !game.includes('id="controlsPool"')) throw new Error("primary controls pool structure is missing");
if (!game.includes('id="board3d"')) throw new Error("legacy 3D renderer mount is missing");

if (!ui.includes('if (!pool || !pvcBox || !pvpBox || !row1 || !row2 || !row3 || !specBar) return;')) {
  throw new Error("desktop controls mount is not synchronized with the primary app");
}
if (!ui.includes('killTimerTile.addEventListener("click"')) throw new Error("primary mobile timer tile activation is missing");
if (!ui.includes("releaseResolvedOnlineUiHold")) throw new Error("active game hold recovery missing");
if (!mobileCss.includes('.timer-row #btnEndKill')) throw new Error("primary mobile timer styling is missing");
if (/Dhamet2 controlsfix|timer-row#btnEndKill/.test(mobileCss)) throw new Error("old backup-only control overrides remain");
if (/\.btn|timer-row|controlsWrap/.test(runtimeCss)) throw new Error("runtime compatibility CSS changes visible controls");
if (!headers.includes("connect-src 'self' https://www.gstatic.com")) throw new Error("gstatic CSP connect allowance missing");

console.log("runtime contract tests passed");
