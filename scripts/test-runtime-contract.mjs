import fs from "node:fs";

const ui = fs.readFileSync(new URL("../js/ui.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../pages/game.html", import.meta.url), "utf8");
const passive = fs.readFileSync(new URL("../js/online.passive.js", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../js/emergency-shell.js", import.meta.url), "utf8");
const headers = fs.readFileSync(new URL("../_headers", import.meta.url), "utf8");
const mobileCss = fs.readFileSync(new URL("../css/mobile.css", import.meta.url), "utf8");
const rulesParity = fs.readFileSync(new URL("../js/rules-parity-runtime.js", import.meta.url), "utf8");

if (!shell.includes("waitForInitialAuthState")) throw new Error("auth persistence restoration is not awaited");
if (!shell.includes("Auth.Persistence.LOCAL")) throw new Error("anonymous auth must be shared across tabs");
if (!shell.includes("BROWSER_SESSION_COOKIE") || !shell.includes("AUTH_BROWSER_KEY")) throw new Error("browser-session identity boundary is missing");
if (!shell.includes("ensureBrowserSessionId")) throw new Error("browser-session cookie restoration is missing");
if (!shell.includes("resetAnonymous")) throw new Error("anonymous-session recovery is missing");
if (!passive.includes("_resolveActivePlayerMatch")) throw new Error("authoritative active-game recovery is missing");
if (!passive.includes("_publishRoomListEntry(gid, game)")) throw new Error("active room-list repair is missing");
if (!passive.includes("localPersistKey(PERSIST_GAME_ID_KEY, uid)")) throw new Error("cross-tab active-game persistence is missing");
if (!passive.includes("_teardownPageRuntime") || !passive.includes("Never start network writes, waits, or authentication work")) throw new Error("unload freeze prevention is missing");
const pagehideStart = passive.indexOf("    _teardownPageRuntime: function () {");
const pagehideEnd = passive.indexOf("\n\n    _bindLifecycleCleanup: function () {", pagehideStart);
const pagehideBlock = pagehideStart >= 0 && pagehideEnd > pagehideStart ? passive.slice(pagehideStart, pagehideEnd) : "";
if (!pagehideBlock || /_teardownOnlineSubscriptions|\.off\s*\(|\.remove\s*\(/.test(pagehideBlock)) throw new Error("normal pagehide must stop timers without synchronously detaching Firebase");
if (!pagehideBlock.includes("_stopPresenceHeartbeat") || !pagehideBlock.includes("_stopGamePresenceHeartbeat")) throw new Error("normal pagehide must stop local heartbeat timers");
if (!/if \(event && event\.persisted\) return;/.test(passive)) throw new Error("BFCache pagehide must preserve Firebase listeners");
if (!/pageshow[\s\S]*event && event\.persisted[\s\S]*firebase\.database\(\)\.goOnline/.test(passive)) throw new Error("BFCache resume must reconnect Firebase safely");
if (/addEventListener\("beforeunload", cleanup/.test(passive)) throw new Error("Firebase cleanup must not run from beforeunload");

if (!game.includes('data-build-version="__DHAMET_BUILD__"')) throw new Error("stable build token is missing");
if (!game.includes('<div class="timer-row">')) throw new Error("primary timer row structure is missing");
if (!game.includes('class="btn ok keep-text"') || !game.includes('id="btnEndKill"')) throw new Error("primary end-capture button structure is missing");
if (!game.includes('id="pvpControlsBox"') || !game.includes('id="controlsPool"')) throw new Error("online controls pool structure is missing");
if (game.includes('id="board3d"')) throw new Error("obsolete parallel 3D renderer mount must not exist");
if (/three(?:\.min)?\.js/i.test(game)) throw new Error("obsolete Three.js dependency must not be loaded");

if (!ui.includes('if (!pool || !pvpBox || !row1 || !row2 || !row3 || !specBar) return;')) {
  throw new Error("online-only desktop controls mount is incomplete");
}
if (/pvcControlsBox|btnNew|btnSave|btnResume|btnEndLocalMatch/.test(game)) {
  throw new Error("unreachable local/PvC controls remain in the backup game page");
}
if (!ui.includes('killTimerTile.addEventListener("click"') || !ui.includes("endKillPressed()")) throw new Error("shared timer tile activation is missing");
if (!ui.includes("releaseResolvedOnlineUiHold")) throw new Error("active game hold recovery missing");
if (!mobileCss.includes('.timer-row #btnEndKill')) throw new Error("primary mobile timer styling is missing");
if (/Dhamet2 controlsfix|timer-row#btnEndKill/.test(mobileCss)) throw new Error("old backup-only control overrides remain");
if (!headers.includes("connect-src 'self' https://www.gstatic.com")) throw new Error("gstatic CSP connect allowance missing");
if (!headers.includes("script-src 'self' https://www.gstatic.com https://*.firebaseio.com https://*.firebasedatabase.app")) throw new Error("RTDB BrowserPoll script CSP allowance missing");
if (!headers.includes("frame-src 'self' https://*.firebaseio.com https://*.firebasedatabase.app")) throw new Error("RTDB BrowserPoll frame CSP allowance missing");
if (headers.includes('cdn.jsdelivr.net')) throw new Error('obsolete Three.js CDN CSP allowance must not remain');


if (!ui.includes("const openingOptions = getForcedOpeningOptions()")) throw new Error("fourth/sixth forced-opening choice is missing");
if (!ui.includes("Visual.setForcedOpeningArrows")) throw new Error("multiple forced-opening arrows are missing");
if (!ui.includes("Input.selected = toIdx")) throw new Error("capture-chain piece selection is not preserved");
if (!ui.includes("restoreCaptureContinuationVisualState")) throw new Error("capture-chain visual restoration is missing");
if (!ui.includes("savedSouflaApplying") || !ui.includes("Game._souflaApplying = false")) throw new Error("Soufla preview render guard is missing");
if (!ui.includes("Intentionally empty: mobile controls use the same SVG files")) throw new Error("backup-only mobile icon styling remains");
if (!ui.includes("emitSignal: false")) throw new Error("manual sync must remain local");
if (!passive.includes("No shared recoverySignal is written")) throw new Error("reconnect refresh must remain local");
const online = fs.readFileSync(new URL("../js/online.js", import.meta.url), "utf8");
if (!online.includes("byUid !== String(this.myUid")) throw new Error("peer recovery signals are not isolated");
if (!online.includes("restoreCaptureContinuationVisualState")) throw new Error("online capture continuation restore is missing");

if (!/if \(localOnly\)[\s\S]*_presenceTicker[\s\S]*clearInterval/.test(online)) {
  throw new Error("local page teardown must not restart the presence UI ticker");
}
if (!/_lobbyLoadTimer[\s\S]*clearTimeout/.test(passive)) {
  throw new Error("page teardown must clear the lobby loading watchdog");
}
if (!/function hasUnresolvedSoufla\(\)/.test(rulesParity) || /hasUnresolvedSoufla\s*=\s*function/.test(rulesParity)) {
  throw new Error("hasUnresolvedSoufla must be a strict-mode-safe declaration");
}
if (/readLobbyRest|firebaseRestRequest|_firebaseTransportDegraded|_startInviteRestPolling/.test(online + passive)) {
  throw new Error("parallel RTDB REST transport must not exist");
}

console.log("runtime contract tests passed");
