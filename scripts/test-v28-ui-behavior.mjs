import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read = (p) => fs.readFileSync(p, "utf8");
const mobileCss = read("css/mobile.css");
const style = read("css/style.css");
const mobile = read("js/mobile.js");
const game = read("js/game.js");
const online = read("js/online.js");
const passive = read("js/online.passive.js");
const lobby = read("pages/loby.html");
const visual = read("js/visual-shell.js");
const i18n = read("js/i18n.js");
assert.match(style, /\.directional-exit-icon\s*\{\s*transform: scaleX\(-1\);/);
assert.match(style, /html\[dir="ltr"\] \.directional-exit-icon\s*\{\s*transform: none/);
assert.match(mobile, /bar\.appendChild\(backBtn\);\s*bar\.appendChild\(langBtn\);/);
assert.doesNotMatch(mobile, /syncGameDirectionalExitIcons|scheduleGameDirectionalExitIcons|syncGameShellPins|DhametSyncGameExitIcons/);
assert.doesNotMatch(mobileCss, /\.z-mobile-game-shell-inner\s*\{[^}]*direction:\s*ltr|body\.z-mobile-on\[data-mobile-page="game"\] \.directional-exit-icon|\.z-mobile-shell-btn\.is-back\s+img\s*\{[^}]*transform:\s*rotate/);
assert.doesNotMatch(style, /z-points-outward|body\.z-game-page \.directional-exit-icon|body\.z-mobile-on\[data-mobile-page="game"\][^{]*directional-exit-icon/);
assert.match(mobile, /function markGameLayoutMutation\(/);
assert.match(mobile, /function rememberGameHome\(/);
assert.match(mobile, /function ensureGameSideLane\(/);
assert.match(mobile, /z-presence-online/);
assert.match(mobile, /z-presence-offline/);
assert.match(read("js/ui.js"), /getGameHeaderModel\(\)/);
assert.match(online, /Mobile\.syncGameHeadNow/);
const logView = read("js/ui/game-log-view.js");
assert.match(game, /LOG_BOTTOM_THRESHOLD = 48/);
assert.match(game, /const newestFirst = events\.map\([\s\S]*?\.reverse\(\);[\s\S]*?DhametGameLogView\.syncElement\(\s*log,\s*newestFirst/);
assert.match(online, /DhametGameLogView\.syncElement\(/);
assert.match(logView, /function syncElement\(/);
assert.match(logView, /distanceFromBottom\(element\) <= threshold/);
assert.doesNotMatch(game + online, /LOG_SCROLL_IDLE_MS|manualScrollActive|pendingRender|beginManualScroll/);
assert.match(style, /\.log-item \{\s*flex: 0 0 auto;/);
assert.match(online, /if \(suppressLocalNotice\) return true;[\s\S]*showOnlineGameOverModal/);
assert.match(style, /\.modal-body \{[\s\S]*text-align: center;[\s\S]*direction: inherit;/);
assert.doesNotMatch(lobby, /btnShowLeaderboardLobby|z-dash-leaderboard-btn/);
assert.doesNotMatch(visual, /btnShowLeaderboardLobby/);
assert.match(i18n, /"title": "اللوبي"/);
assert.match(i18n, /لديك حق السوفلة\. اختر القطعة التي تجاهلت الأسر\./);
assert.match(i18n, /تهانينا لـ\{player\}، لقد فاز بالمباراة!/);
assert.match(i18n, /Congratulations to \{player\}, who won the match!/);
assert.match(i18n, /Félicitations à \{player\}, qui remporte la partie !/);

function extractFunction(source, name) {
  const at = source.indexOf(`function ${name}(`);
  assert.ok(at >= 0, `${name} missing`);
  const brace = source.indexOf("{", at);
  let depth = 0, quote = "", escaped = false;
  for (let i = brace; i < source.length; i++) {
    const ch = source[i];
    if (quote) { if (escaped) escaped=false; else if (ch === "\\") escaped=true; else if (ch === quote) quote=""; continue; }
    if (ch === '"' || ch === "'" || ch === '`') quote=ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return source.slice(at, i+1);
  }
  throw new Error(`${name} not closed`);
}
const funcs = `${extractFunction(passive,"playerAcceptsInvites")}\n${extractFunction(passive,"resolvePublicPresenceState")}\n({playerAcceptsInvites,resolvePublicPresenceState})`;
const { playerAcceptsInvites, resolvePublicPresenceState } = vm.runInNewContext(funcs);
assert.equal(playerAcceptsInvites({ acceptsInvites:false }), false);
assert.equal(playerAcceptsInvites({ invitesDisabled:true }), false);
assert.equal(playerAcceptsInvites({ noInvites:true }), false);
assert.equal(resolvePublicPresenceState({acceptsInvites:false,status:"available"},{},"u").state,"invitesDisabled");
assert.equal(resolvePublicPresenceState({acceptsInvites:false,status:"inPvP",role:"player",roomId:"g"},{u:"g"},"u").state,"invitesDisabled");
assert.equal(resolvePublicPresenceState({acceptsInvites:true,status:"inPvP",role:"player",roomId:"g"},{u:"g"},"u").state,"inPvP");
assert.equal(resolvePublicPresenceState({acceptsInvites:true,status:"available"},{},"u").state,"available");
assert.match(online, /const statusInfo = lobbyStatusInfo\(p, this\._lobbyActivePlayerRooms \|\| \{\}, uid\)/);
console.log("V28 UI, scrolling, local-end and lobby-status tests passed");
