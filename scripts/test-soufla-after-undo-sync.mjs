import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('js/online.js', 'utf8');

function extractObjectMethod(text, methodName) {
  const start = text.indexOf(`${methodName}: function`);
  assert.ok(start >= 0, `${methodName} must exist`);
  const bodyStart = text.indexOf('{', start);
  assert.ok(bodyStart >= 0, `${methodName} body must exist`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = bodyStart; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`${methodName} body is not closed`);
}

const listenerSouflaAt = source.indexOf('if (data.soufla && data.soufla.availableFor === this.mySide)');
assert.equal(listenerSouflaAt, -1, 'the listener must not install Soufla before restoring the board snapshot');

const applySource = extractObjectMethod(source, '_applyRemoteState');
const resetAt = applySource.indexOf('resetTransientGameState()');
const restoreAt = applySource.indexOf('restoreSnapshot(snap');
const installAt = applySource.indexOf('this._installOfficialSouflaState(data)');
assert.ok(resetAt >= 0 && restoreAt > resetAt && installAt > restoreAt,
  'remote state order must be reset -> restore snapshot -> install official Soufla');

const helperSource = extractObjectMethod(source, '_installOfficialSouflaState');
const trace = [];
const board = Array.from({ length: 9 }, () => Array(9).fill(0));
const context = {
  console,
  Number,
  Object,
  Array,
  JSON,
  Math,
  String,
  Game: {
    board,
    player: 1,
    inChain: false,
    chainPos: null,
    awaitingPenalty: false,
    souflaPending: null,
    availableSouflaForLocalPlayer: null,
    deferredPromotions: [],
    deferredPromotion: null,
  },
  Turn: {
    ctx: null,
    start() { trace.push('turn'); },
  },
  UI: {
    updateCounts() {},
    updateAll() { trace.push('ui'); },
  },
  Visual: {
    setLastMove() {},
    setUndoMove() {},
    setUndoMovePath() {},
    markTurnBoundary() {},
  },
  resetTransientGameState() {
    trace.push('reset');
    context.Game.awaitingPenalty = false;
    context.Game.souflaPending = null;
    context.Game.availableSouflaForLocalPlayer = null;
    context.Turn.ctx = null;
  },
  restoreSnapshot(snap) {
    trace.push('restore');
    context.Game.board = snap.board.map((row) => row.slice());
    context.Game.player = snap.player;
    context.Game.inChain = !!snap.inChain;
    context.Game.chainPos = snap.chainPos ?? null;
    context.Game.awaitingPenalty = !!snap.awaitingPenalty;
    context.Game.souflaPending = snap.souflaPending || null;
    context.Game.availableSouflaForLocalPlayer = snap.availableSouflaForLocalPlayer || null;
  },
  plainToSoufla(value) {
    trace.push('install');
    return value ? JSON.parse(JSON.stringify(value)) : null;
  },
  deferredPromotionQueue() { return []; },
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
const methods = vm.runInContext(`({${helperSource},${applySource}})`, context, { filename: 'online-soufla-methods.js' });

const client = {
  ...methods,
  mySide: -1,
  isSpectator: false,
  _awaitingLocalCommit: false,
  _lastSeenMoveModal: 0,
  _lastSouflaFXMoveIndex: null,
};

const stalePending = {
  penalizer: 1,
  offender: -1,
  reason: 'stale_before_undo',
  offenders: [{ idx: 3 }],
};
const baseSnapshot = {
  board,
  player: -1,
  inChain: false,
  chainPos: null,
  awaitingPenalty: true,
  souflaPending: stalePending,
  availableSouflaForLocalPlayer: stalePending,
};

// Undo must clear any local Soufla fields stored in the restored historical snapshot.
trace.length = 0;
client._applyRemoteState({
  moveIndex: 10,
  turn: -1,
  state: { snapshot: baseSnapshot },
  lastMove: { kind: 'undo', moveIndex: 10, undoneFrom: 3, undonePath: [4] },
  soufla: null,
});
assert.equal(context.Game.availableSouflaForLocalPlayer, null, 'undo must not revive stale Soufla');
assert.equal(context.Game.souflaPending, null, 'undo must clear stale pending penalty state');
assert.equal(context.Game.awaitingPenalty, false, 'undo must not leave a stale penalty modal active');
assert.deepEqual(trace.slice(0, 4), ['reset', 'restore', 'turn', 'ui']);

// After undo, a newly detected missed capture must survive the restored snapshot.
const missedCapture = {
  penalizer: -1,
  offender: 1,
  reason: 'missed_capture',
  startedFrom: 12,
  lastPieceIdx: 13,
  offenders: [{ idx: 12 }],
};
trace.length = 0;
client._applyRemoteState({
  moveIndex: 11,
  turn: -1,
  state: { snapshot: { ...baseSnapshot, awaitingPenalty: false, souflaPending: null, availableSouflaForLocalPlayer: null } },
  lastMove: { kind: 'move', moveIndex: 11, by: 1, from: 12, path: [13] },
  soufla: { availableFor: -1, pending: missedCapture },
});
assert.equal(context.Game.availableSouflaForLocalPlayer?.reason, 'missed_capture');
assert.equal(context.Game.availableSouflaForLocalPlayer?.penalizer, -1);
assert.equal(context.Game.awaitingPenalty, false, 'receiving a claimable right must not auto-open the choice modal');
assert.equal(context.Game.souflaPending, null, 'the pending choice is opened only after pressing the Soufla button');
assert.deepEqual(trace.slice(0, 5), ['reset', 'restore', 'install', 'turn', 'ui']);

// The same guarantee applies to stopping a mandatory capture chain after one step.
const cutChain = {
  penalizer: -1,
  offender: 1,
  reason: 'cut_chain',
  startedFrom: 20,
  lastPieceIdx: 29,
  longestGlobal: 3,
  offenders: [{ idx: 20 }],
};
client._applyRemoteState({
  moveIndex: 12,
  turn: -1,
  state: { snapshot: { ...baseSnapshot, awaitingPenalty: false, souflaPending: null, availableSouflaForLocalPlayer: null } },
  lastMove: { kind: 'move', moveIndex: 12, by: 1, from: 20, path: [29] },
  soufla: { availableFor: -1, pending: cutChain },
});
assert.equal(context.Game.availableSouflaForLocalPlayer?.reason, 'cut_chain');
assert.equal(context.Game.availableSouflaForLocalPlayer?.longestGlobal, 3);

// A right owned by the opponent or observed by a spectator must never be exposed locally.
client.mySide = 1;
client._applyRemoteState({
  moveIndex: 13,
  turn: -1,
  state: { snapshot: { ...baseSnapshot, awaitingPenalty: false, souflaPending: null, availableSouflaForLocalPlayer: cutChain } },
  soufla: { availableFor: -1, pending: cutChain },
});
assert.equal(context.Game.availableSouflaForLocalPlayer, null);
client.mySide = -1;
client.isSpectator = true;
client._applyRemoteState({
  moveIndex: 14,
  turn: -1,
  state: { snapshot: { ...baseSnapshot, awaitingPenalty: false, souflaPending: null, availableSouflaForLocalPlayer: cutChain } },
  soufla: { availableFor: -1, pending: cutChain },
});
assert.equal(context.Game.availableSouflaForLocalPlayer, null);

console.log('Soufla after undo synchronization tests passed');
