import fs from "node:fs";

const ui = fs.readFileSync(new URL("../js/ui.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../pages/game.html", import.meta.url), "utf8");
const passive = fs.readFileSync(new URL("../js/online.passive.js", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../js/emergency-shell.js", import.meta.url), "utf8");
const headers = fs.readFileSync(new URL("../_headers", import.meta.url), "utf8");
const mobileCss = fs.readFileSync(new URL("../css/mobile.css", import.meta.url), "utf8");

for (const id of ["btnNew", "btnSave", "btnResume"]) {
  if (game.includes(`id="${id}"`)) continue;
  const unsafe = new RegExp(`qs\(\"#${id}\"\)\.addEventListener`);
  if (unsafe.test(ui)) throw new Error(`${id} is absent from online game HTML but still bound unsafely`);
}
if (!shell.includes("waitForInitialAuthState")) throw new Error("auth persistence restoration is not awaited");
if (!shell.includes("Auth.Persistence.SESSION")) throw new Error("anonymous auth must be tab/session scoped");
if (!shell.includes("AUTH_TAB_KEY")) throw new Error("tab auth marker is missing");
if (!shell.includes("resetAnonymous")) throw new Error("anonymous-session recovery is missing");
if (!passive.includes("Never mark the new session busy")) throw new Error("stale active-game recovery is missing");
if (!passive.includes("Starting Firebase writes from beforeunload/pagehide")) throw new Error("unload freeze prevention is missing");
if (/addEventListener\("beforeunload", cleanup/.test(passive)) throw new Error("Firebase cleanup must not run from beforeunload");
if (!ui.includes("The online-only backup intentionally has no PvC controls box")) throw new Error("desktop PvP controls guard is missing");
if (/!pool \|\| !pvcBox \|\| !pvpBox/.test(ui)) throw new Error("desktop PvP controls still require the absent PvC box");
if (!game.includes('class="timer-row btn ok keep-text"') || !game.includes('id="btnEndKill"')) throw new Error("capture timer is not a real button tile");
if (!headers.includes("connect-src 'self' https://www.gstatic.com")) throw new Error("gstatic CSP connect allowance missing");

if (!game.includes('data-build-version="20260725-controlsfix2"')) throw new Error("new build version is missing");
if (!game.includes('<div class="pvp-row" id="pvpRow1">\n<button class="btn end" id="btnEndOnline"')) throw new Error("desktop controls are not pre-mounted");
if (!ui.includes("activateEndKillFromEvent")) throw new Error("delegated timer activation is missing");
if (!ui.includes("releaseResolvedOnlineUiHold")) throw new Error("active game hold recovery missing");
if (!mobileCss.includes(".timer-row#btnEndKill")) throw new Error("mobile timer button override missing");
console.log("runtime contract tests passed");
