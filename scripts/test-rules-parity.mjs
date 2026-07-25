import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const digest = (relative) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');

const manifest = JSON.parse(read('scripts/rules-reference-manifest.json'));
assert.equal(manifest.reference, 'ouglsoft-main');
for (const [name, expected] of Object.entries(manifest.files)) {
  const relative = `shared/${name}`;
  assert.ok(fs.existsSync(path.join(root, relative)), `Missing primary rules module: ${relative}`);
  assert.equal(digest(relative), expected.sha256, `${relative} differs from the primary application`);
  assert.equal(fs.statSync(path.join(root, relative)).size, expected.bytes, `${relative} byte size differs from the primary application`);
}

for (const moduleName of [
  'dhamet-utils.js',
  'dhamet-rules.js',
  'dhamet-state.js',
  'dhamet-turn-resolution.js',
  'dhamet-move.js',
  'dhamet-soufla.js',
  'dhamet-control.js',
  'dhamet-result.js',
  'dhamet-match-end.js',
]) require(`../shared/${moduleName}`);

const Rules = globalThis.DhametRules;
const State = globalThis.DhametState;
const TurnResolution = globalThis.DhametTurnResolution;
const Soufla = globalThis.DhametSoufla;
const Control = globalThis.DhametControl;
assert.ok(Rules && State && TurnResolution && Soufla && Control, 'Primary shared rule modules were not loaded');

const allIndices = Array.from({ length: Rules.N_CELLS }, (_, index) => index);
const topBack = allIndices.find((index) => Rules.isBackRank(index, Rules.TOP));
const botBack = allIndices.find((index) => Rules.isBackRank(index, Rules.BOT));
assert.notEqual(topBack, undefined);
assert.notEqual(botBack, undefined);

const promotionBoard = Array.from({ length: Rules.BOARD_N }, () => Array(Rules.BOARD_N).fill(0));
Rules.setCell(promotionBoard, topBack, Rules.piece(Rules.TOP, Rules.MAN));
Rules.setCell(promotionBoard, botBack, Rules.piece(Rules.BOT, Rules.MAN));
const normalizedQueue = State.normalizeDeferredPromotions([
  { idx: topBack, side: Rules.TOP },
  { idx: topBack, side: Rules.TOP },
  { idx: botBack, side: Rules.BOT },
]);
assert.deepEqual(normalizedQueue, [
  { idx: topBack, side: Rules.TOP },
  { idx: botBack, side: Rules.BOT },
], 'Deferred promotion queue must deduplicate without losing the other side');
const activatedTop = State.activateDeferredPromotions(promotionBoard, normalizedQueue, Rules.TOP);
assert.equal(activatedTop.ok, true);
assert.deepEqual(activatedTop.promoted, [{ idx: topBack, side: Rules.TOP }]);
assert.deepEqual(activatedTop.deferredPromotions, [{ idx: botBack, side: Rules.BOT }]);
assert.equal(Math.abs(Rules.cell(activatedTop.board, topBack)), Rules.KING);
assert.equal(Math.abs(Rules.cell(activatedTop.board, botBack)), Rules.MAN);

const synchronized = State.normalizeStatePayload({
  snapshot: {
    board: promotionBoard,
    player: Rules.TOP,
    inChain: false,
    chainPos: null,
    deferredPromotions: normalizedQueue,
    openingPly: 4,
    opening: { starter: Rules.BOT, forcedOpeningExchangeChoice: 1 },
  },
  deferredPromotions: normalizedQueue,
});
assert.deepEqual(synchronized.deferredPromotions, normalizedQueue);
assert.deepEqual(synchronized.snapshot.deferredPromotions, normalizedQueue);
assert.deepEqual(synchronized.deferredPromotion, normalizedQueue[0]);
assert.equal(synchronized.snapshot.openingPly, 4);
assert.equal(synchronized.snapshot.opening.forcedOpeningExchangeChoice, 1);

assert.equal(
  TurnResolution.outcomeAfterResolution(promotionBoard, Rules.TOP, { pending: true }),
  null,
  'A pending Soufla right must postpone terminal evaluation',
);

const penaltyBoard = Array.from({ length: Rules.BOARD_N }, () => Array(Rules.BOARD_N).fill(0));
const offender = 40;
const topOther = allIndices.find((index) => index !== offender && index !== botBack && !Rules.isBackRank(index, Rules.BOT));
Rules.setCell(penaltyBoard, offender, Rules.piece(Rules.TOP, Rules.MAN));
Rules.setCell(penaltyBoard, topOther, Rules.piece(Rules.TOP, Rules.MAN));
Rules.setCell(penaltyBoard, botBack, Rules.piece(Rules.BOT, Rules.MAN));
const pending = {
  source: 'rules-parity-test',
  penalizer: Rules.BOT,
  offenderSide: Rules.TOP,
  offenders: [offender],
  options: [{ kind: 'remove', offenderIdx: offender }],
  turnStartSnapshot: { board: penaltyBoard, player: Rules.TOP, inChain: false, chainPos: null },
  lastPieceIdx: offender,
  startedFrom: offender,
};
const decision = { kind: 'remove', offenderIdx: offender };
assert.deepEqual(Soufla.matchingOption(pending, decision), decision);
const resolved = TurnResolution.resolveSouflaPenalty({
  pending,
  option: decision,
  penalizer: Rules.BOT,
  currentBoard: penaltyBoard,
  currentDeferredPromotions: [{ idx: botBack, side: Rules.BOT }],
});
assert.equal(resolved.ok, true);
assert.equal(resolved.kind, 'remove');
assert.equal(resolved.nextTurn, Rules.BOT);
assert.equal(Rules.cell(resolved.board, offender), 0);
assert.equal(Math.abs(Rules.cell(resolved.board, botBack)), Rules.KING, 'The next player promotion must activate before terminal evaluation');
assert.deepEqual(resolved.deferredPromotions, []);


const undoCurrentSnapshot = {
  board: promotionBoard,
  player: Rules.BOT,
  inChain: false,
  chainPos: null,
  lastMoveFrom: topBack,
  lastMovePath: [topBack + 1],
  lastMovedTo: topBack + 1,
  forcedEnabled: false,
  forcedPly: 10,
};
const undoPreviousSnapshot = {
  board: promotionBoard,
  player: Rules.TOP,
  inChain: false,
  chainPos: null,
  forcedEnabled: false,
  forcedPly: 10,
};
const undoGame = {
  status: 'active',
  ply: 1,
  moveIndex: 1,
  state: { snapshot: undoCurrentSnapshot, deferredPromotions: normalizedQueue },
  states: { 0: { snapshot: undoPreviousSnapshot, deferredPromotions: normalizedQueue } },
  undoRequest: null,
};
assert.equal(Control.canRequestUndo(undoGame, Rules.TOP).ok, true, 'Only the side that made the last move may request undo');
assert.equal(Control.canRequestUndo(undoGame, Rules.BOT).error, 'control/not-last-mover');
const openingUndoGame = JSON.parse(JSON.stringify(undoGame));
openingUndoGame.states['0'].snapshot.forcedEnabled = true;
openingUndoGame.states['0'].snapshot.forcedPly = 9;
assert.equal(Control.canRequestUndo(openingUndoGame, Rules.TOP).error, 'control/opening-undo-disabled');
const chainUndoGame = JSON.parse(JSON.stringify(undoGame));
chainUndoGame.state.snapshot.inChain = true;
chainUndoGame.state.snapshot.chainPos = topBack;
assert.equal(Control.canRequestUndo(chainUndoGame, Rules.TOP).error, 'control/in-chain');

const runtime = read('js/rules-parity-runtime.js');
for (const token of [
  'State.activateDeferredPromotions',
  'TurnResolution.outcomeAfterResolution',
  'TurnResolution.resolveSouflaPenalty',
  'Soufla.matchingOption',
  'Game.deferredPromotions',
  'expireUnclaimedSouflaOnMoveStart',
  'pushHistoryBeforeMoveParity',
  'forcedOpeningRuntimeSnapshotParity',
  'getForcedOpeningInfosParity',
  'finishForcedOpeningAppliedTurnParity',
]) assert.ok(runtime.includes(token), `Rules parity runtime is missing ${token}`);

const switchStart = runtime.indexOf('switchPlayer = function switchPlayerParity');
const endStart = runtime.indexOf('checkEndConditions = function checkEndConditionsParity');
assert.ok(switchStart >= 0 && endStart > switchStart, 'Parity switch/end functions are missing or out of order');
const switchBody = runtime.slice(switchStart, endStart);
assert.doesNotMatch(switchBody, /checkEndConditions\s*\(/, 'switchPlayer must not evaluate terminal state before next-turn promotion activation');
assert.doesNotMatch(runtime, /Number\(ply\) === 5/, 'Rules parity runtime must not invent an opening branch when the stored exchange choice is absent');

const online = `${read('js/online.js')}\n${read('js/online.passive.js')}`;

const requestAssignment = online.match(/g\.undoRequest = \{[\s\S]*?status: created\.status,[\s\S]*?ply: created\.ply,[\s\S]*?\};/);
assert.ok(requestAssignment, 'Firebase undo request assignment is missing');
for (const forbidden of ['requesterSide:', 'moveIndex:', 'clientActionId:', 'authoritative:', 'serverValidated:']) {
  assert.equal(requestAssignment[0].includes(forbidden), false, `Firebase undo request writes forbidden RTDB field ${forbidden}`);
}
const acceptedAssignment = online.match(/g\.undoRequest = \{[\s\S]*?status: accept \? "accepted" : "rejected",[\s\S]*?responderNick: this\.myNick,[\s\S]*?\};/);
assert.ok(acceptedAssignment, 'Firebase undo response assignment is missing');
for (const forbidden of ['requesterSide:', 'responderSide:', 'moveIndex:', 'clientActionId:', 'authoritative:', 'serverValidated:']) {
  assert.equal(acceptedAssignment[0].includes(forbidden), false, `Firebase undo response writes forbidden RTDB field ${forbidden}`);
}

for (const token of [
  'deferredPromotions',
  'forcedOpeningExchangeChoice',
  'openingPly',
  'DhametSoufla.buildFx',
  'DhametControl',
  'Control.canRequestUndo',
  'Control.previousStateForUndo',
]) assert.ok(online.includes(token), `Firebase state transport is missing ${token}`);

const gamePage = read('pages/game.html');
const scriptOrder = [
  '../shared/dhamet-utils.js',
  '../shared/dhamet-rules.js',
  '../shared/dhamet-state.js',
  '../shared/dhamet-turn-resolution.js',
  '../shared/dhamet-move.js',
  '../shared/dhamet-soufla.js',
  '../shared/dhamet-control.js',
  '../shared/dhamet-result.js',
  '../shared/dhamet-match-end.js',
  '../js/rules-guard.js',
  '../js/game.js',
  '../js/rules-parity-runtime.js',
  '../js/ui.js',
];
let prior = -1;
for (const script of scriptOrder) {
  const position = gamePage.indexOf(script);
  assert.ok(position > prior, `${script} is missing or loaded in the wrong rule-runtime order`);
  prior = position;
}

console.log('Primary game-rules parity tests passed');
