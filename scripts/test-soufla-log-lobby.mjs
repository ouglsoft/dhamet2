import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const ui = read('js/ui.js');
const page = read('pages/game.html');
const game = read('js/game.js');
const online = read('js/online.js');
const backupSoufla = read('js/ui/soufla-view.js');
const primaryRoot = String(process.env.DHAMET_PRIMARY_ROOT || '').trim();
const primaryGamePath = primaryRoot ? path.join(primaryRoot, 'dhamet/site/js/modes/game-runtime.js') : '';
const primarySouflaPath = primaryRoot ? path.join(primaryRoot, 'dhamet/site/js/ui/soufla-view.js') : '';
const primaryAvailable = primaryGamePath && primarySouflaPath && fs.existsSync(primaryGamePath) && fs.existsSync(primarySouflaPath);
const primaryGame = primaryAvailable ? fs.readFileSync(primaryGamePath, 'utf8') : '';
const primarySoufla = primaryAvailable ? fs.readFileSync(primarySouflaPath, 'utf8') : '';

assert.match(ui, /window\.Visual\s*=\s*Visual/, 'soufla preview renderer must be exported like the primary app');
assert.match(ui, /globalThis\.Visual\s*=\s*Visual/, 'renderer must also be available through globalThis');
assert.ok(page.indexOf('../js/ui/dom-utils.js') < page.indexOf('../js/game.js'), 'DOM utilities must load before game runtime');
assert.ok(page.indexOf('../js/ui/game-log-view.js') < page.indexOf('../js/game.js'), 'game-log view must load before game runtime');
if (primaryAvailable) {
  assert.equal(backupSoufla, primarySoufla, 'soufla modal implementation must match the primary app');
} else {
  assert.match(backupSoufla, /DhametSouflaView/, 'local soufla view contract must be present');
  assert.match(backupSoufla, /render|open|show/i, 'local soufla view must expose rendering behavior');
}

const startMarker = 'const LogMgr = __IN_WORKER';
const endMarker = 'window.DhametGameLogView.attach(LogMgr);';
function logSegment(source) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end >= 0, 'log manager segment markers must exist');
  return source.slice(start, end + endMarker.length);
}
if (primaryAvailable) {
  assert.equal(logSegment(game), logSegment(primaryGame), 'log messages and scrolling logic must match primary app exactly');
} else {
  const localLog = logSegment(game);
  assert.match(localLog, /DhametGameLogView\.syncElement/, 'local log segment must use the shared native-scroll reconciler');
  assert.match(localLog, /attach\(LogMgr\)/, 'local log segment must attach the shared log view');
}

assert.match(online, /event\.persisted/, 'BFCache-restored mobile lobby must rebind listeners');
assert.match(online, /visibilitychange/, 'stale visible mobile lobby must recover listeners');
assert.match(online, /db\.goOffline\(\)/, 'lobby recovery must reset a frozen RTDB connection');
assert.match(online, /db\.goOnline\(\)/, 'lobby recovery must bring RTDB back online');
assert.match(online, /resetAnonymous\(\)/, 'lobby recovery must repair damaged normal-browser auth state');
assert.match(online, /_lobbyInitGeneration/, 'old lobby callbacks must be invalidated during recovery');

console.log('soufla, log, and mobile lobby recovery tests passed');
