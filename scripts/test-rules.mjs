import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
require('../shared/dhamet-utils.js');
require('../shared/dhamet-rules.js');
const R = globalThis.DhametRules;
assert.ok(R, 'DhametRules was not loaded');

const initial = R.createInitialBoard();
const counts = R.countPieces(initial);
assert.equal(counts.top, 40);
assert.equal(counts.bot, 40);
assert.equal(counts.topKings, 0);
assert.equal(counts.botKings, 0);

const exchange = R.forcedOpeningExpectedOptions({
  forcedEnabled: true,
  forcedPly: 3,
  opening: { starter: R.BOT },
  player: R.TOP,
});
assert.equal(exchange.length, 2, 'The fourth opening move must expose both valid exchange choices');
assert.notDeepEqual(exchange[0].fullPath, exchange[1].fullPath);

for (const choice of [0, 1]) {
  const remaining = R.forcedOpeningExpectedOptions({
    forcedEnabled: true,
    forcedPly: 5,
    opening: { starter: R.BOT, exchangeFourthChoice: choice },
    player: R.TOP,
  });
  assert.equal(remaining.length, 1);
  assert.deepEqual(remaining[0].fullPath, exchange[choice === 0 ? 1 : 0].fullPath);
}

const promotionBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
promotionBoard[1][0] = -R.MAN;
promotionBoard[8][8] = R.MAN;
const applied = R.applyMovePath(promotionBoard, { from: 9, path: [0] }, R.BOT);
assert.equal(applied.ok, true);
assert.deepEqual(applied.promotionPending, { idx: 0, side: R.BOT });
const finalized = R.finalizeTurnBoard(applied.board, applied);
assert.equal(finalized.board[0][0], -R.MAN, 'Promotion must remain deferred');
assert.deepEqual(finalized.promotionPending, { idx: 0, side: R.BOT });

const drawBoard = Array.from({ length: 9 }, () => Array(9).fill(0));
drawBoard[0][0] = R.KING;
drawBoard[8][8] = -R.KING;
assert.deepEqual(R.getGameOutcome(drawBoard, R.TOP), {
  status: R.RESULT_DRAW,
  winner: 0,
  reason: 'one_king_each',
});

console.log('Shared rules tests passed');
