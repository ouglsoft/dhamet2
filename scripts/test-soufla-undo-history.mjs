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

function extractObjectMethod(text, methodName) {
  const start = text.indexOf(`${methodName}: function`);
  assert.ok(start >= 0, `${methodName} must exist`);
  const bodyStart = text.indexOf('{', start);
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
      if (ch === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`${methodName} body is not closed`);
}

function rightFor(side, reason) {
  return {
    availableFor: side,
    pending: {
      source: 'backup-soufla-undo-history-test',
      reason,
      penalizer: side,
      offenderSide: -side,
      offenders: [30],
      options: [{ kind: 'remove', offenderIdx: 30, path: [], jumps: [], captures: 0 }],
      longestGlobal: 1,
      turnStartSnapshot: {
        board: Rules.createInitialBoard(), player: -side, inChain: false, chainPos: null,
        forcedEnabled: false, forcedPly: 10, openingPly: 10,
        soufla: { penalizer: -side, offenderSide: side, offenders: [31] },
      },
      lastPieceIdx: 30,
      startedFrom: 30,
      lastMoveFrom: 30,
      lastMovePath: [40],
    },
  };
}

function snapshot(player, moveNo = 0) {
  return {
    board: Rules.createInitialBoard(), player, inChain: false, chainPos: null,
    forcedEnabled: false, forcedPly: 10, openingPly: 10,
    opening: { starter: TOP }, openingStarter: TOP, moveCount: moveNo,
    lastMoveFrom: moveNo ? 30 + moveNo : null,
    lastMovePath: moveNo ? [40 + moveNo] : null,
    lastMovedFrom: moveNo ? 30 + moveNo : null,
    lastMovedTo: moveNo ? 40 + moveNo : null,
  };
}

const sendMoveMethod = extractObjectMethod(source, 'sendMoveToFirebase');
const undoMethod = extractObjectMethod(source, '_performUndoTransaction');
assert.match(sendMoveMethod, /Control\.stateWithSoufla\(g\.state, g\.soufla\)/);
assert.match(sendMoveMethod, /g\.states\[currentPly\] = historicalCurrentState/);
assert.match(undoMethod, /Control\.souflaFromState\(previous\.state\)/);
assert.match(undoMethod, /g\.soufla = restoredSoufla/);

const context = {
  console,
  Number,
  Object,
  Array,
  JSON,
  Math,
  String,
  Control,
  Game: { deferredPromotions: [], deferredPromotion: null },
  Visual: { getCapturedOrder() { return []; } },
  guardOnlineWrite() { return true; },
  requireAuthUid() { return true; },
  snapshotState() { return snapshot(BOT, 1); },
  stateRecordWithPromotionQueue(snap) { return State.createStatePayload({ snapshot: snap, capturedOrder: [] }); },
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
const methods = vm.runInContext(`({${sendMoveMethod},${undoMethod}})`, context, { filename: 'online-soufla-history-methods.js' });

const state0 = State.createStatePayload({ snapshot: snapshot(TOP, 0), capturedOrder: [] });
const oldRight = rightFor(TOP, 'right_before_backup_move');
let storedGame = {
  status: 'active', turn: TOP, ply: 0, moveIndex: 0,
  state: state0, states: { 0: state0 }, soufla: oldRight, undoRequest: null,
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
  myUid: 'top-player',
  myNick: 'Top',
  mySide: TOP,
  gameId: 'backup-history-test',
  gameRef: { transaction },
  _pendingSteps: [{ from: 30, to: 40, capture: false, jumped: null }],
  _cachedSouflaPlain: null,
  _awaitingLocalCommit: false,
  _beginLocalCommitWait() { this._awaitingLocalCommit = true; },
  _markLocalCommitSettled() { this._awaitingLocalCommit = false; },
  _touchRoomListActivity() {},
  _isCurrentAuthPlayerInGame() { return true; },
};

client.sendMoveToFirebase(30, 40, BOT, 0);
assert.equal(storedGame.ply, 1);
assert.equal(storedGame.soufla, null, 'playing must expire the current right');
assert.equal(storedGame.states[0].snapshot.soufla.reason, 'right_before_backup_move');
assert.equal(storedGame.states[0].snapshot.soufla.penalizer, TOP);
assert.equal(storedGame.states[0].snapshot.soufla.turnStartSnapshot.soufla, undefined);
assert.equal(storedGame.states[1].snapshot.soufla, null);

storedGame.undoRequest = {
  status: 'accepted', acceptedAt: 1001,
  requesterUid: 'top-player', requesterNick: 'Top', requestedAt: 1000,
  responderUid: 'bottom-player', responderNick: 'Bottom', respondedAt: 1001,
  ply: 1,
};
client.myUid = 'bottom-player';
client.myNick = 'Bottom';
client.mySide = BOT;
client._undoTxnInFlight = false;
client._performUndoTransaction();

assert.equal(storedGame.ply, 0);
assert.equal(storedGame.turn, TOP);
assert.equal(storedGame.soufla.availableFor, TOP);
assert.equal(storedGame.soufla.pending.reason, 'right_before_backup_move');
assert.equal(storedGame.state.snapshot.soufla.reason, 'right_before_backup_move');

// Multiple alternating undos must return only the right attached to each ply.
const right0 = rightFor(TOP, 'right_at_backup_ply_0');
const right1 = rightFor(BOT, 'right_at_backup_ply_1');
const s0 = Control.stateWithSoufla(State.createStatePayload({ snapshot: snapshot(TOP, 0) }), right0);
const s1 = Control.stateWithSoufla(State.createStatePayload({ snapshot: snapshot(BOT, 1) }), right1);
const s2 = Control.stateWithSoufla(State.createStatePayload({ snapshot: snapshot(TOP, 2) }), null);
storedGame = {
  status: 'active', turn: TOP, ply: 2, moveIndex: 20,
  state: s2, states: { 0: s0, 1: s1, 2: s2 }, soufla: null,
  players: {
    white: { uid: 'bottom-player', nickname: 'Bottom' },
    black: { uid: 'top-player', nickname: 'Top' },
  },
  undoRequest: {
    status: 'accepted', requesterUid: 'bottom-player', requesterNick: 'Bottom',
    responderUid: 'top-player', responderNick: 'Top', requestedAt: 1, respondedAt: 2, ply: 2,
  },
  log: [],
};
client.myUid = 'top-player';
client.mySide = TOP;
client._undoTxnInFlight = false;
client._performUndoTransaction();
assert.equal(storedGame.ply, 1);
assert.equal(storedGame.soufla.pending.reason, 'right_at_backup_ply_1');

storedGame.undoRequest = {
  status: 'accepted', requesterUid: 'top-player', requesterNick: 'Top',
  responderUid: 'bottom-player', responderNick: 'Bottom', requestedAt: 3, respondedAt: 4, ply: 1,
};
client.myUid = 'bottom-player';
client.mySide = BOT;
client._undoTxnInFlight = false;
client._performUndoTransaction();
assert.equal(storedGame.ply, 0);
assert.equal(storedGame.soufla.pending.reason, 'right_at_backup_ply_0');
assert.notEqual(storedGame.soufla.pending.reason, 'right_at_backup_ply_1');

console.log('Soufla undo history tests passed');
