import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const read = (file) => fs.readFileSync(file, 'utf8');
const hash = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const i18n = read('js/i18n.js');
const online = read('js/online.js');
const passive = read('js/online.passive.js');
const ui = read('js/ui.js');
const soufla = read('js/ui/soufla-view.js');
const shell = read('js/emergency-shell.js');
const gamePage = read('pages/game.html');
const theme = read('css/theme.css');

function parseTranslations(source) {
  const at = source.indexOf('const translations');
  const start = source.indexOf('{', at);
  let depth = 0, quote = '', escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return JSON.parse(source.slice(start, i + 1));
  }
  throw new Error('translations object not closed');
}
const tr = parseTranslations(i18n);

assert.equal(tr.ar.soufla.pick.toastNotOffender, 'هذه القطعة ليست مسوفلة/مخالفة، اختر القطعة التي تجاهلت الأسر.');
assert.equal(tr.ar.status.moveSendFail, 'فشل إرسال النقلة، يرجى الضغط على زر التحديث ثم إعادة النقلة.');
assert.equal(tr.ar.online.endPresentation.selfEndedBy, 'أنهيت المباراة.');
assert.ok(tr.ar.soufla.spectator.remove && tr.ar.soufla.spectator.force);
assert.doesNotMatch(tr.ar.undo.applied, /movePart|\$\{/);
assert.match(tr.ar.undo.spectatorAccepted, /\{responder\}/);
assert.match(tr.ar.undo.spectatorAccepted, /\{requester\}/);
assert.match(tr.ar.undo.spectatorRejected, /\{responder\}/);
assert.match(tr.ar.undo.spectatorRejected, /\{requester\}/);
assert.equal(tr.ar.soufla.summary.remove, 'اختار {actor} عقوبة السوفلة ضدك، وأزال قطعتك الموجودة في الموضع المحدد بعلامة X الحمراء.');
assert.equal(tr.ar.soufla.summary.force, 'اختار {actor} عقوبة السوفلة ضدك، وأجبرك على تنفيذ المسار المحدد على الرقعة باللون الأخضر.');
assert.doesNotMatch(i18n, /(?:اللاعب|Player |Le joueur |du joueur )\s*\{(?:actor|victim|player|requester|responder|opponent)\}/);
assert.match(tr.ar.undo.requesterAccepted, /\{responder\}.*السهم الأصفر المعكوس/);
assert.match(tr.ar.undo.requesterRejected, /\{responder\}.*السهم الأصفر المعكوس/);


assert.match(soufla, /mySide === by\) return false/);
assert.match(soufla, /decision\.kind === "remove" \? "remove" : "force"/);
assert.doesNotMatch(online, /translateArgs\("undo\.applied"\)/);

const rulesParityRuntime = read('js/rules-parity-runtime.js');
assert.match(rulesParityRuntime, /function normalizeDeferredPromotionQueue\(\)/);
assert.doesNotMatch(rulesParityRuntime, /normalizeDeferredPromotionQueue\s*=\s*function/);
assert.match(rulesParityRuntime, /function hasUnresolvedSoufla\(\)/);
assert.doesNotMatch(rulesParityRuntime, /hasUnresolvedSoufla\s*=\s*function/);

assert.match(ui, /drawGrid\(ctx, W, H\);[\s\S]*drawPieces\(ctx\);/);
assert.match(ui, /classList\.toggle\("board-depth", requested === "3d"\)/);
assert.doesNotMatch(ui, /\bBoard3D\b|ensure3DInputBridge|#board3d/);
assert.match(theme, /body\.board-depth canvas#board[\s\S]*opacity:\s*1 !important[\s\S]*visibility:\s*visible !important/);

assert.match(online, /let initialUiHold = false/);
assert.match(online, /contains\("ui-hold"\) && !root\.classList\.contains\("ui-ready"\)/);
assert.match(online, /if \(initialUiHold\) this\._applyUiHold\(true\)/);

const mobile = read('js/mobile.js');
assert.match(mobile, /screen\.orientation\.lock\(target\)/);
assert.doesNotMatch(mobile, /target \+ ['"]-primary['"]|landscape-primary/);
assert.match(mobile, /orientationchange/);
assert.doesNotMatch(mobile, /location\.reload|location\.replace/);
assert.match(theme, /Unified capture timer colors/);
assert.match(theme, /timer-row[\s\S]*color:\s*rgb\(var\(--rgb-white\)\)/);
assert.match(theme, /gradient-game-control/);
assert.match(theme, /btnEndKill[\s\S]*gradient-game-control-danger/);

assert.match(soufla, /Rules\.resolveOffenderCurrentCell\(pending, offenderIdx\)/);
assert.doesNotMatch(soufla, /if \(offenderSet\.has\(clickedIdx\)\) return/);
const require = createRequire(import.meta.url);
require('../shared/dhamet-utils.js');
require('../shared/dhamet-rules.js');
require('../shared/dhamet-result.js');
require('../shared/dhamet-match-end.js');
const R = globalThis.DhametRules;
assert.equal(R.resolveOffenderCurrentCell({ startedFrom: 8, lastPieceIdx: 26 }, 8), 26);
assert.equal(R.resolveOffenderCurrentCell({ lastMoveFrom: 15, lastPieceIdx: 33 }, 15), 33);
assert.equal(R.resolveOffenderCurrentCell({ startedFrom: 8, lastPieceIdx: 26 }, 9), 9);

assert.doesNotMatch(online, /undo\.spectatorRequested/);
assert.match(online, /undo\.spectatorAccepted/);
assert.match(online, /undo\.spectatorRejected/);
assert.match(online, /const silentSpectatorLeave = !!this\._spectatorLeaving/);
assert.match(passive, /!cfg\.allowSpectator[\s\S]*contains\("z-spectator"\)[\s\S]*return/);
assert.match(passive, /Array\.isArray\(cfg\.playerNames\)/);
assert.match(passive, /z-player-name/);
assert.match(soufla, /decoratePlayerNames\(message, \[actorName, victimName\]\)/);
assert.match(online, /async function readLobbyRest\(path, query, timeoutMs\)/);
assert.match(online, /lobby_rest_fallback_applied/);
assert.match(online, /_lobbyRestPollTimer/);
assert.doesNotMatch(online, /status\.moveSendFail"\),\s*\{\s*allowSpectator:\s*true/);
assert.match(online, /spectatorLabel[^\n]*spectatorCount/s);
assert.match(online, /z-player-status/);
assert.match(online, /z-room-row/);
assert.match(online, /actorEl\.className = "actor-word"/);

assert.equal(hash('js/ui/board-geometry.js'), 'd33d4973dbb4c5411db34b6351ffc0687a945f503c3fed9c29c324814fd6358c');
assert.equal(hash('js/ui/board-view.js'), '5672ea9bcefb34fa1f9eda10a24284e8bbb9e87b4e10a31d95b9966c8d4fb90f');
assert.ok(gamePage.indexOf('../js/ui/board-geometry.js') < gamePage.indexOf('../js/ui.js'));
assert.ok(gamePage.indexOf('../js/ui/board-view.js') < gamePage.indexOf('../js/ui.js'));
assert.match(ui, /_clearTurnFx\(false\)/);
assert.match(ui, /themeColor\("--mark-move"\)/);
assert.match(ui, /themeColor\("--mark-undo"\)/);
assert.match(ui, /function setUndoMove\(fr, to, noDraw\)/);
assert.match(ui, /setCapturedOrder\(list, noDraw\)/);
assert.match(theme, /--piece-black-edge:\s*rgb\(154 52 18\)/);

assert.doesNotMatch(shell, /FIREBASE_MIGRATION_VERSION|prepareOneTimeFirebaseMigration|deleteIndexedDb|markFirebaseMigrationComplete/);
assert.match(shell, /markerMatches/);
assert.match(shell, /getIdToken\(true\)/);
assert.match(shell, /auth\.signInAnonymously\(\)/);
assert.match(shell, /Auth\.Persistence\.SESSION/);
assert.match(shell, /firebase\.database\(\)\.goOnline\(\)/);
assert.doesNotMatch(shell, /localStorage\.clear\(|sessionStorage\.clear\(/);
assert.doesNotMatch(read('js/game.js'), /localStorage\.getItem\("zamat\.session\.user\.persist\.v1"\)/);
assert.match(passive, /async function firebaseRestRequest\(path, options\)/);
assert.match(passive, /writeFirebaseRest\(`players\/\$\{encodeURIComponent\(this\.myUid\)\}`/);
assert.match(passive, /presence_rest_fallback_applied/);
assert.match(online, /readFirebaseRest/);
assert.match(online, /runRestFallback\("initial"\)/);
assert.match(online, /}, 60\);/);
assert.match(online, /window\.addEventListener\("online"/);

for (const file of ['mic-on.svg', 'mic-off.svg', 'volume-on.svg', 'volume-off.svg']) {
  assert.match(read(`assets/icons/${file}`), /<svg/);
}
assert.match(read('assets/icons/mic-off.svg'), /#b42318/);
assert.match(read('assets/icons/volume-off.svg'), /#b42318/);

assert.doesNotMatch(passive, /stale_room_sweep_failed[\s\S]{0,500}roomList[\s\S]{0,100}remove\(/, "transient stale-room read failures must not delete the room");
assert.doesNotMatch(online, /_armRoomPurgeOnDisconnect|_cancelRoomPurgeOnDisconnect|_emitRecoverySignal|_isNaturalOnlineEndReason/);
console.log('requested gameplay and audit-clean regressions passed');

assert.match(passive, /function displayPlayerName\(uid, nickname\)/);
assert.match(online, /displayPlayerName,/);
assert.match(online, /lobby\.players\.callback/);
assert.match(online, /lobby\.rooms\.callback/);
assert.match(online, /playersLoaded = false;[\s\S]{0,180}showLobbyFailure\(\)/);
assert.match(online, /roomsLoaded = false;[\s\S]{0,180}showLobbyFailure\(\)/);
assert.doesNotMatch(shell, /normal-browser-lobby-reset|prepareOneTimeFirebaseMigration|deleteIndexedDb/);
assert.match(passive, /_teardownPageRuntime/);
assert.match(passive, /_teardownOnlineSubscriptions\(\{ localOnly: true \}\)/);
assert.doesNotMatch(passive, /addEventListener\("beforeunload", cleanup/);
assert.match(online, /_voiceLeave: function \(options\)/);
assert.match(online, /if \(!localOnly\)[\s\S]{0,180}_voiceParticipantsRef/);
assert.match(online, /undo\.requesterAccepted/);
assert.match(online, /undo\.requesterRejected/);
assert.match(tr.ar.undo.spectatorAccepted, /السهم الأصفر المعكوس/);
assert.match(tr.ar.undo.spectatorRejected, /السهم الأصفر المعكوس/);
assert.match(ui, /killTimerTile\.addEventListener\("click"[\s\S]*endKillPressed\(\)/);
assert.match(theme, /timer-row\.is-live[\s\S]*gradient-game-control-danger/);
assert.ok(fs.statSync('assets/icons/icon.webp').size <= 50 * 1024, 'game icon must stay under 50 KB');
assert.match(passive, /function askNickname\(\)[\s\S]*value: resolveFallbackNick\(\)/);
assert.match(passive, /getCloseValue: \(\) => resolveFallbackNick\(\)/);
assert.match(passive, /hideCancel: true/);
assert.match(read('js/modal.js'), /cfg\.hideCancel === true \? \[\] :/);
assert.match(online, /policyProfile: "strict-low-material"/);
assert.doesNotMatch(online, /policyOverrides/);
assert.doesNotMatch(online, /g\.lastMove\s*=\s*Object\.assign\(\{\}, g\.lastMove/);
assert.doesNotMatch(online, /g\.winner = this\.mySide/);
assert.match(online, /countsAsResult: policy\.countsAsResult === true/);
assert.match(online, /html: lines\.map\(decorateLine\)/);

const MatchEnd = globalThis.DhametMatchEnd;
const advancedBoard = Array.from({ length: R.BOARD_N }, () => Array(R.BOARD_N).fill(0));
const cells = Array.from({ length: R.N_CELLS }, (_, i) => i);
for (const idx of cells.slice(0, 6)) R.setCell(advancedBoard, idx, R.piece(R.BOT, R.MAN));
R.setCell(advancedBoard, cells[20], R.piece(R.TOP, R.MAN));
const lateGame = { ply: 60, moveIndex: 60, state: { snapshot: { board: advancedBoard } }, states: { 0: { snapshot: { board: advancedBoard } } } };
const countedAbsence = MatchEnd.policyForEnd('opponent-absent', R.BOT, { policyProfile: 'strict-low-material' }, lateGame);
assert.equal(countedAbsence.countsAsResult, true, 'clear late absence may be adjudicated');
const earlyGame = { ...lateGame, ply: 10 };
const neutralAbsence = MatchEnd.policyForEnd('opponent-absent', R.BOT, { policyProfile: 'strict-low-material' }, earlyGame);
assert.equal(neutralAbsence.countsAsResult, false, 'early absence must remain neutral');
const crowdedBoard = Array.from({ length: R.BOARD_N }, () => Array(R.BOARD_N).fill(0));
for (const idx of cells.slice(0, 11)) R.setCell(crowdedBoard, idx, R.piece(R.BOT, R.MAN));
for (const idx of cells.slice(20, 23)) R.setCell(crowdedBoard, idx, R.piece(R.TOP, R.MAN));
const crowdedGame = { ply: 60, moveIndex: 60, state: { snapshot: { board: crowdedBoard } }, states: { 0: { snapshot: { board: crowdedBoard } } } };
const crowdedAbsence = MatchEnd.policyForEnd('opponent-absent', R.BOT, { policyProfile: 'strict-low-material' }, crowdedGame);
assert.equal(crowdedAbsence.countsAsResult, false, 'absence above ten total pieces must remain neutral');
