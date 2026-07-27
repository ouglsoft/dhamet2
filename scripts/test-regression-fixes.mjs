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


assert.match(soufla, /mySide === by\) return false/);
assert.match(soufla, /decision\.kind === "remove" \? "remove" : "force"/);
assert.doesNotMatch(online, /translateArgs\("undo\.applied"\)/);

const rulesParityRuntime = read('js/rules-parity-runtime.js');
assert.match(rulesParityRuntime, /function normalizeDeferredPromotionQueue\(\)/);
assert.doesNotMatch(rulesParityRuntime, /normalizeDeferredPromotionQueue\s*=\s*function/);

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
const R = globalThis.DhametRules;
assert.equal(R.resolveOffenderCurrentCell({ startedFrom: 8, lastPieceIdx: 26 }, 8), 26);
assert.equal(R.resolveOffenderCurrentCell({ lastMoveFrom: 15, lastPieceIdx: 33 }, 15), 33);
assert.equal(R.resolveOffenderCurrentCell({ startedFrom: 8, lastPieceIdx: 26 }, 9), 9);

assert.doesNotMatch(online, /undo\.spectatorRequested/);
assert.match(online, /undo\.spectatorAccepted/);
assert.match(online, /undo\.spectatorRejected/);
assert.match(online, /const silentSpectatorLeave = !!this\._spectatorLeaving/);
assert.match(passive, /!cfg\.allowSpectator[\s\S]*contains\("z-spectator"\)[\s\S]*return/);
assert.doesNotMatch(online, /status\.moveSendFail"\),\s*\{\s*allowSpectator:\s*true/);
assert.match(online, /spectatorLabel[^\n]*spectatorCount/s);
assert.match(online, /z-player-status/);
assert.match(online, /z-room-row/);

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

assert.match(shell, /FIREBASE_MIGRATION_VERSION/);
assert.match(shell, /prepareOneTimeFirebaseMigration/);
assert.match(shell, /deleteIndexedDatabase\("firebaseLocalStorageDb", 1400\)/);
assert.match(shell, /auth\.signOut\(\)/);
assert.match(shell, /auth\.signInAnonymously\(\)/);
assert.ok(shell.indexOf('markFirebaseMigrationComplete();') > shell.indexOf('writeSession(user);'));
assert.match(shell, /firebase\.database\(\)\.goOnline\(\)/);
assert.doesNotMatch(shell, /localStorage\.clear\(|sessionStorage\.clear\(/);

for (const file of ['mic-on.svg', 'mic-off.svg', 'volume-on.svg', 'volume-off.svg']) {
  assert.match(read(`assets/icons/${file}`), /<svg/);
}
assert.match(read('assets/icons/mic-off.svg'), /#b42318/);
assert.match(read('assets/icons/volume-off.svg'), /#b42318/);

assert.doesNotMatch(passive, /stale_room_sweep_failed[\s\S]{0,500}roomList[\s\S]{0,100}remove\(/, "transient stale-room read failures must not delete the room");
assert.doesNotMatch(online, /_armRoomPurgeOnDisconnect|_cancelRoomPurgeOnDisconnect|_emitRecoverySignal|_isNaturalOnlineEndReason/);
console.log('requested gameplay and audit-clean regressions passed');
