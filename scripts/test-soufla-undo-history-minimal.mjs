import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
for (const file of [
  '../shared/dhamet-utils.js',
  '../shared/dhamet-rules.js',
  '../shared/dhamet-state.js',
  '../shared/dhamet-control.js',
]) require(file);

const Rules = globalThis.DhametRules;
const State = globalThis.DhametState;
const Control = globalThis.DhametControl;
const { TOP, BOT } = Rules;
const source = fs.readFileSync('js/online.js', 'utf8');

function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const bodyStart = text.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = bodyStart; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue; }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`${name} body is not closed`);
}

function extractObjectMethod(text, methodName) {
  const start = text.indexOf(`${methodName}: function`);
  assert.ok(start >= 0, `${methodName} must exist`);
  const bodyStart = text.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = bodyStart; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === quote) quote = ''; continue; }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`${methodName} body is not closed`);
}

const helperSource = extractFunction(source, 'officialSouflaFromHistoricalState');
const sendMoveMethod = extractObjectMethod(source, 'sendMoveToFirebase');
const undoMethod = extractObjectMethod(source, '_performUndoTransaction');

assert.match(sendMoveMethod, /statePayload\.snapshot\.soufla = officialSoufla \? officialSoufla\.pending : null/);
assert.doesNotMatch(sendMoveMethod, /g\.states\[currentPly\]/, 'the fix must not rewrite the previous state during move sending');
assert.match(undoMethod, /g\.soufla = officialSouflaFromHistoricalState\(previous\.state\)/);

function pendingFor(side, reason) {
  return {
    reason,
    penalizer: side,
    offenders: [30],
    options: [{ kind: 'remove', offenderIdx: 30, path: [], jumps: [], captures: 0 }],
    longestGlobal: 1,
    longestByPiece: [],
    turnStartSnapshot: {
      board: Rules.createInitialBoard(), player: -side, inChain: false, chainPos: null,
      forcedEnabled: false, forcedPly: 10, openingPly: 10,
    },
    lastPieceIdx: 30,
    startedFrom: 30,
    lastMoveFrom: 30,
    lastMovePath: [40],
  };
}

function snapshot(player, moveNo) {
  return {
    board: Rules.createInitialBoard(), player, inChain: false, chainPos: null,
    forcedEnabled: false, forcedPly: 10, openingPly: 10,
    opening: { starter: TOP }, openingStarter: TOP,
    moveCount: moveNo,
    lastMoveFrom: moveNo ? 20 + moveNo : null,
    lastMovePath: moveNo ? [30 + moveNo] : null,
    lastMovedFrom: moveNo ? 20 + moveNo : null,
    lastMovedTo: moveNo ? 30 + moveNo : null,
  };
}

const context = {
  console, Number, Object, Array, JSON, Math, String,
  Game: { deferredPromotions: [], deferredPromotion: null },
  Visual: { getCapturedOrder() { return []; } },
  guardOnlineWrite() { return true; },
  requireAuthUid() { return true; },
  nextSnapshot: null,
  snapshotState() { return JSON.parse(JSON.stringify(context.nextSnapshot)); },
  stateRecordWithPromotionQueue(snap) { return State.createStatePayload({ snapshot: snap, capturedOrder: [] }); },
  stripUndefined(value) { return value == null ? null : JSON.parse(JSON.stringify(value)); },
  normalizeLogArrayForWrite() {},
  encodeSharedLogText(value) { return JSON.stringify(value); },
  nowTs() { return 1000; },
  handleDbError(error) { if (error) throw error; },
  showOnlineNotice() {},
  isPermissionDenied() { return false; },
};
context.window = { DhametControl: Control, I18N: { translateArgs(key) { return key; } } };
context.globalThis = context;
vm.createContext(context);
const methods = vm.runInContext(`${helperSource}; ({${sendMoveMethod},${undoMethod}})`, context, {
  filename: 'online-soufla-minimal-methods.js',
});

const topRight = pendingFor(TOP, 'right_at_ply_0');
const state0 = State.createStatePayload({ snapshot: { ...snapshot(TOP, 0), soufla: topRight } });
let storedGame = {
  status: 'active', turn: TOP, ply: 0, moveIndex: 0,
  state: state0, states: { 0: state0 },
  soufla: { availableFor: TOP, pending: topRight },
  undoRequest: null,
  players: {
    white: { uid: 'bottom-player', nickname: 'Bottom' },
    black: { uid: 'top-player', nickname: 'Top' },
  },
  log: [],
};

function transaction(updater, done) {
  const input = JSON.parse(JSON.stringify(storedGame));
  const next = updater(input);
  if (next === undefined) {
    done?.(null, false, { val: () => storedGame });
    return;
  }
  storedGame = next;
  done?.(null, true, { val: () => storedGame });
}

const client = {
  ...methods,
  isActive: true,
  myUid: 'top-player', myNick: 'Top', mySide: TOP,
  gameId: 'minimal-history-test',
  gameRef: { transaction },
  _pendingSteps: [{ from: 21, to: 31, capture: false, jumped: null }],
  _cachedSouflaPlain: pendingFor(BOT, 'right_at_ply_1'),
  _awaitingLocalCommit: false,
  _beginLocalCommitWait() { this._awaitingLocalCommit = true; },
  _markLocalCommitSettled() { this._awaitingLocalCommit = false; },
  _touchRoomListActivity() {},
  _isCurrentAuthPlayerInGame() { return true; },
};

// TOP declines its own right by moving, while the move creates a new right for BOT.
context.nextSnapshot = snapshot(BOT, 1);
client.sendMoveToFirebase(21, 31, BOT, 0);
assert.equal(storedGame.ply, 1);
assert.equal(storedGame.soufla.pending.reason, 'right_at_ply_1');
assert.equal(storedGame.states[0].snapshot.soufla.reason, 'right_at_ply_0');
assert.equal(storedGame.states[1].snapshot.soufla.reason, 'right_at_ply_1');

// BOT declines its right by moving; the new state has no right.
client.myUid = 'bottom-player'; client.myNick = 'Bottom'; client.mySide = BOT;
client._pendingSteps = [{ from: 22, to: 32, capture: false, jumped: null }];
client._cachedSouflaPlain = null;
context.nextSnapshot = snapshot(TOP, 2);
client.sendMoveToFirebase(22, 32, TOP, 0);
assert.equal(storedGame.ply, 2);
assert.equal(storedGame.soufla, null);
assert.equal(storedGame.states[2].snapshot.soufla ?? null, null);

// Undo BOT's move: only the right attached to ply 1 returns.
storedGame.undoRequest = {
  status: 'accepted', requesterUid: 'bottom-player', requesterNick: 'Bottom',
  responderUid: 'top-player', responderNick: 'Top', requestedAt: 1, respondedAt: 2, ply: 2,
};
client.myUid = 'top-player'; client.myNick = 'Top'; client.mySide = TOP; client._undoTxnInFlight = false;
client._performUndoTransaction();
assert.equal(storedGame.ply, 1);
assert.equal(storedGame.turn, BOT);
assert.equal(storedGame.soufla.availableFor, BOT);
assert.equal(storedGame.soufla.pending.reason, 'right_at_ply_1');

// Undo TOP's preceding move: the right attached to ply 0 returns, not ply 1's right.
storedGame.undoRequest = {
  status: 'accepted', requesterUid: 'top-player', requesterNick: 'Top',
  responderUid: 'bottom-player', responderNick: 'Bottom', requestedAt: 3, respondedAt: 4, ply: 1,
};
client.myUid = 'bottom-player'; client.myNick = 'Bottom'; client.mySide = BOT; client._undoTxnInFlight = false;
client._performUndoTransaction();
assert.equal(storedGame.ply, 0);
assert.equal(storedGame.turn, TOP);
assert.equal(storedGame.soufla.availableFor, TOP);
assert.equal(storedGame.soufla.pending.reason, 'right_at_ply_0');
assert.notEqual(storedGame.soufla.pending.reason, 'right_at_ply_1');

console.log('Minimal Soufla undo history tests passed');
