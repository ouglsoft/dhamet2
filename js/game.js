const BOARD_N = 9;
const TOP = +1;
const BOT = -1;

const __IN_WORKER =
  typeof DedicatedWorkerGlobalScope !== "undefined" &&
  typeof self !== "undefined" &&
  self instanceof DedicatedWorkerGlobalScope;

function isOnlineFlippedView() {
  return !!(window.Online && window.Online.isActive && window.Online.mySide === TOP);
}

function toViewRC(r, c) {
  if (!isOnlineFlippedView()) return [r, c];
  return [BOARD_N - 1 - r, BOARD_N - 1 - c];
}

function fromViewRC(r, c) {
  if (!isOnlineFlippedView()) return [r, c];
  return [BOARD_N - 1 - r, BOARD_N - 1 - c];
}

const MAN = 1;
const KING = 2;

const N_CELLS = BOARD_N * BOARD_N;
const ACTION_ENDCHAIN = N_CELLS * N_CELLS;
const N_ACTIONS = ACTION_ENDCHAIN + 1;

const APP_BASE_PATH = (() => {
  try {
    try {
      const ov =
        typeof self !== "undefined" && self && typeof self.__APP_BASE_PATH_OVERRIDE === "string"
          ? self.__APP_BASE_PATH_OVERRIDE
          : "";
      if (ov) return ov;
    } catch {}
    let p =
      window && window.location && window.location.pathname
        ? String(window.location.pathname)
        : "/";
    p = p.replace(/[?#].*$/, "");
    let dir = p.substring(0, p.lastIndexOf("/") + 1);
    dir = dir.replace(/\/pages\/$/, "/");
    return dir || "/";
  } catch {
    return "/";
  }
})();

function assetUrl(rel) {
  const r = String(rel || "").replace(/^\/+/, "");
  const base = String(APP_BASE_PATH || "/");
  if (!r) return base;
  if (base.endsWith("/")) return base + r;
  return base + "/" + r;
}

const FO_TOP = [
  [
    [3, 5],
    [4, 4],
  ],
  [
    [5, 3],
    [3, 5],
  ],
  [
    [2, 6],
    [4, 4],
  ],
  [
    [4, 8],
    [2, 6],
  ],
  [
    [1, 7],
    [3, 5],
  ],
  [
    [4, 6],
    [2, 6],
  ],
  [
    [4, 4],
    [4, 6],
    [4, 8],
  ],
  [
    [2, 6],
    [4, 4],
  ],
  [
    [4, 3],
    [4, 5],
  ],
  [
    [5, 5],
    [3, 5],
  ],
];
const FO_BOT = [
  [
    [5, 3],
    [4, 4],
  ],
  [
    [3, 5],
    [5, 3],
  ],
  [
    [6, 2],
    [4, 4],
  ],
  [
    [4, 0],
    [6, 2],
  ],
  [
    [7, 1],
    [5, 3],
  ],
  [
    [4, 2],
    [6, 2],
  ],
  [
    [4, 4],
    [4, 2],
    [4, 0],
  ],
  [
    [6, 2],
    [4, 4],
  ],
  [
    [4, 5],
    [4, 3],
  ],
  [
    [3, 3],
    [5, 3],
  ],
];

const DIAG_A_SEGMENTS = [
  [
    [0, 2],
    [2, 0],
  ],
  [
    [0, 4],
    [4, 0],
  ],
  [
    [0, 6],
    [6, 0],
  ],
  [
    [0, 8],
    [8, 0],
  ],
  [
    [2, 8],
    [8, 2],
  ],
  [
    [4, 8],
    [8, 4],
  ],
  [
    [6, 8],
    [8, 6],
  ],
];
const DIAG_B_SEGMENTS = [
  [
    [0, 6],
    [2, 8],
  ],
  [
    [0, 4],
    [4, 8],
  ],
  [
    [0, 2],
    [6, 8],
  ],
  [
    [0, 0],
    [8, 8],
  ],
  [
    [2, 0],
    [8, 6],
  ],
  [
    [4, 0],
    [8, 4],
  ],
  [
    [6, 0],
    [8, 2],
  ],
];

function rcToIdx(r, c) {
  return r * BOARD_N + c;
}
function idxToRC(idx) {
  return [Math.floor(idx / BOARD_N), idx % BOARD_N];
}
function inside(r, c) {
  return r >= 0 && r < BOARD_N && c >= 0 && c < BOARD_N;
}

function clampInt(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.trunc(n);
  return Math.max(min, Math.min(max, i));
}

const AI_LEVEL_ORDER = Object.freeze(["beginner", "easy", "medium", "hard", "strong", "expert"]);
const AI_LEVEL_CONFIGS = Object.freeze({
  beginner: Object.freeze({ minimaxDepth: 3, thinkTimeMs: 400, timeBoostCriticalMs: 200, moveChoiceTopN: 6, moveMistakeRatePct: 35, evalNoise: 90 }),
  easy: Object.freeze({ minimaxDepth: 4, thinkTimeMs: 900, timeBoostCriticalMs: 500, moveChoiceTopN: 4, moveMistakeRatePct: 22, evalNoise: 45 }),
  medium: Object.freeze({ minimaxDepth: 6, thinkTimeMs: 4000, timeBoostCriticalMs: 2000, moveChoiceTopN: 1, moveMistakeRatePct: 0, evalNoise: 0 }),
  hard: Object.freeze({ minimaxDepth: 8, thinkTimeMs: 5500, timeBoostCriticalMs: 3500, moveChoiceTopN: 1, moveMistakeRatePct: 0, evalNoise: 0 }),
  strong: Object.freeze({ minimaxDepth: 10, thinkTimeMs: 8000, timeBoostCriticalMs: 5000, moveChoiceTopN: 1, moveMistakeRatePct: 0, evalNoise: 0 }),
  expert: Object.freeze({ minimaxDepth: 12, thinkTimeMs: 15000, timeBoostCriticalMs: 10000, moveChoiceTopN: 1, moveMistakeRatePct: 0, evalNoise: 0 }),
});

function normalizeAILevel(level) {
  const v = String(level || "").trim();
  return Object.prototype.hasOwnProperty.call(AI_LEVEL_CONFIGS, v) ? v : "medium";
}
function getAILevelConfig(level) {
  return AI_LEVEL_CONFIGS[normalizeAILevel(level)];
}


function buildSegments(segList, dir) {
  const lines = [];
  for (const [a, b] of segList) {
    const [r0, c0] = a,
      [r1, c1] = b;
    const dr = 1,
      dc = dir === "A" ? -1 : +1;
    const line = [];
    let r = r0,
      c = c0;
    while (true) {
      line.push([r, c]);
      if (r === r1 && c === c1) break;
      r += dr;
      c += dc;
    }
    lines.push(line);
  }
  return lines;
}
const DIAG_A_LINES = buildSegments(DIAG_A_SEGMENTS, "A");
const DIAG_B_LINES = buildSegments(DIAG_B_SEGMENTS, "B");

const IS_IN_DIAG_A = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
const IS_IN_DIAG_B = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
for (const line of DIAG_A_LINES) {
  for (const [r, c] of line) {
    IS_IN_DIAG_A[r][c] = true;
  }
}
for (const line of DIAG_B_LINES) {
  for (const [r, c] of line) {
    IS_IN_DIAG_B[r][c] = true;
  }
}
const IS_WIDE = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
for (let r = 0; r < BOARD_N; r++) {
  for (let c = 0; c < BOARD_N; c++) {
    IS_WIDE[r][c] = IS_IN_DIAG_A[r][c] || IS_IN_DIAG_B[r][c];
  }
}

const MASK_BACK_TOP = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
const MASK_BACK_BOT = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
const MASK_CORNERS = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
const MASK_EYES = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
const MASK_MIDBACK = new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(false));
for (let c = 0; c < BOARD_N; c++) {
  MASK_BACK_TOP[0][c] = true;
  MASK_BACK_BOT[8][c] = true;
}
for (const [r, c] of [
  [0, 0],
  [0, 8],
  [8, 0],
  [8, 8],
])
  MASK_CORNERS[r][c] = true;
for (const [r, c] of [
  [0, 2],
  [0, 6],
  [8, 2],
  [8, 6],
])
  MASK_EYES[r][c] = true;
for (const [r, c] of [
  [0, 4],
  [8, 4],
])
  MASK_MIDBACK[r][c] = true;

const DIRS_ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const DIRS_DIAG_A = [
  [-1, 1],
  [1, -1],
];
const DIRS_DIAG_B = [
  [-1, -1],
  [1, 1],
];

function isDirAllowedFrom(r, c, dr, dc) {
  if (DIRS_ORTHO.some(([rr, cc]) => rr === dr && cc === dc)) return true;
  if (DIRS_DIAG_A.some(([rr, cc]) => rr === dr && cc === dc) && IS_IN_DIAG_A[r][c]) return true;
  if (DIRS_DIAG_B.some(([rr, cc]) => rr === dr && cc === dc) && IS_IN_DIAG_B[r][c]) return true;
  return false;
}

const Game = {
  board: new Array(BOARD_N).fill(0).map(() => new Array(BOARD_N).fill(0)),
  player: TOP,
  inChain: false,
  chainPos: null,
  lastMovedTo: null,
  moveCount: 0,
  gameOver: false,
  winner: null,
  terminationReason: null,
  forcedEnabled: true,
  forcedPly: 0,
  forcedSeq: null,
  openingExchangeFourthChoice: null,
  deferredPromotion: null,

  awaitingPenalty: false,
  _souflaApplying: false,
  _simDepth: 0,
  souflaPending: null,
  availableSouflaForHuman: null,

  history: [],
  lastMovedFrom: null,
  lastMoveFrom: null,
  lastMovePath: null,
  lastMoveSide: null,
  lastMoveWasCapture: false,

  settings: {
    starter: "white",
    aiCaptureMode: "mandatory",
    aiRandomIgnoreCaptureRatePct: 12,
    theme: "light",
    showCoords: false,
    boardStyle: "2d",

    advanced: {
      aiLevel: "medium",
      thinkTimeMs: 4000,
      timeBoostCriticalMs: 2000,
      minimaxDepth: 6,
      moveChoiceTopN: 1,
      moveMistakeRatePct: 0,
      evalNoise: 0,
    },
  },

  pendingAILevel: null,

  names: {
    top: "",
    bot: "",
  },
  humanLogger: {
    moves: [],
    result: null,
  },
  killTimer: {
    running: false,
    startTs: 0,
    elapsedMs: 0,
    interval: null,
    reset() {
      this.stop();
      this.elapsedMs = 0;
      UI.updateKillClock(0);
    },
    start() {
      if (this.running) return;
      this.running = true;
      this.startTs = performance.now();
      UI.updateKillClock(this.elapsedMs | 0);
      this.interval = setInterval(() => {
        const ms = this.elapsedMs + (performance.now() - this.startTs);
        UI.updateKillClock(ms | 0);
      }, 200);
    },
    stop() {
      if (!this.running) return;
      clearInterval(this.interval);
      this.interval = null;
      this.elapsedMs += performance.now() - this.startTs;
      this.running = false;
    },
    hardStop() {
      this.stop();
      this.elapsedMs = 0;
      UI.updateKillClock(0);
    },
  },
};

try {
  if (typeof window !== "undefined") {
    window.Game = Game;
    window.AI_LEVEL_ORDER = AI_LEVEL_ORDER;
    window.AI_LEVEL_CONFIGS = AI_LEVEL_CONFIGS;
  } else if (typeof self !== "undefined") {
    self.Game = Game;
    self.AI_LEVEL_ORDER = AI_LEVEL_ORDER;
    self.AI_LEVEL_CONFIGS = AI_LEVEL_CONFIGS;
  }
} catch (_) {}

Game.normalizeAdvancedSettings = function () {
  const src = (this.settings && this.settings.advanced) || {};
  const level = normalizeAILevel(src.aiLevel || "medium");
  const cfg = getAILevelConfig(level);
  const out = {
    aiLevel: level,
    thinkTimeMs: cfg.thinkTimeMs,
    timeBoostCriticalMs: cfg.timeBoostCriticalMs,
    minimaxDepth: cfg.minimaxDepth,
    moveChoiceTopN: cfg.moveChoiceTopN,
    moveMistakeRatePct: cfg.moveMistakeRatePct,
    evalNoise: cfg.evalNoise,
  };
  const lim = __AI_SEARCH_LIMITS.minimax;
  out.minimaxDepth = clampInt(out.minimaxDepth, lim.minTurnDepth, lim.maxTurnDepth, cfg.minimaxDepth);
  out.thinkTimeMs = clampInt(out.thinkTimeMs, 0, 20000, cfg.thinkTimeMs);
  out.timeBoostCriticalMs = clampInt(out.timeBoostCriticalMs, 0, 20000, cfg.timeBoostCriticalMs);
  out.moveChoiceTopN = clampInt(out.moveChoiceTopN, 1, 12, cfg.moveChoiceTopN);
  out.moveMistakeRatePct = clampInt(out.moveMistakeRatePct, 0, 100, cfg.moveMistakeRatePct);
  out.evalNoise = clampInt(out.evalNoise, 0, 500, cfg.evalNoise);
  if (!this.settings) this.settings = {};
  this.settings.advanced = out;
};

function createInitialBoard() {
  return window.DhametRules.createInitialBoard();
}

function forcedOpeningSeqForStarterSide(side) {
  return side === TOP ? FO_TOP : FO_BOT;
}

function forcedOpeningBaseSide(seq) {
  if (seq === FO_TOP) return TOP;
  if (seq === FO_BOT) return BOT;
  return Game.settings && Game.settings.starter === "white" ? BOT : TOP;
}

function isForcedOpeningActive() {
  return !!(Game.forcedEnabled && Game.forcedPly < 10);
}

function _forcedOpeningSnapshot(ply = Game.forcedPly) {
  const seq = Game.forcedSeq || forcedOpeningSeqForStarterSide(Game.player);
  const starter = forcedOpeningBaseSide(seq);
  const opening = { starter };
  if (Game.openingExchangeFourthChoice === 0 || Game.openingExchangeFourthChoice === 1) {
    opening.exchangeFourthChoice = Game.openingExchangeFourthChoice;
  } else if (Number(ply) === 5) {
    // Compatibility for an older saved room that reached ply 5 without storing
    // the selected exchange branch. New rooms always persist this value.
    opening.exchangeFourthChoice = 0;
  }
  return {
    forcedEnabled: !!Game.forcedEnabled,
    forcedPly: Number(ply) || 0,
    opening,
    openingStarter: starter,
    player: (Number(ply) || 0) % 2 === 0 ? starter : -starter,
  };
}

function getForcedOpeningOptions(ply = Game.forcedPly) {
  if (!Game.forcedEnabled || ply < 0 || ply >= 10) return [];
  const expected = window.DhametRules.forcedOpeningExpectedOptions(_forcedOpeningSnapshot(ply));
  return (expected || []).map((item) => {
    const path = Array.isArray(item.fullPath) ? item.fullPath.slice() : [item.from].concat(item.path || []);
    return {
      seq: Game.forcedSeq || forcedOpeningSeqForStarterSide(item.starterSide),
      step: path.map(idxToRC),
      path,
      from: path[0],
      toFirst: path[1],
      toFinal: path[path.length - 1],
      isChain: path.length > 2,
      base: item.starterSide,
      mover: item.mover,
      ply: item.ply,
      optionIndex: item.optionIndex,
      exchangeChoice: item.exchangeChoice,
    };
  }).filter((info) => info.path.length >= 2);
}

function getForcedOpeningInfo(ply = Game.forcedPly) {
  const options = getForcedOpeningOptions(ply);
  if (!options.length) return null;
  if (Game.inChain && Turn && Turn.ctx && Turn.ctx.startedFrom != null) {
    const matched = options.find((info) => info.from === Turn.ctx.startedFrom);
    if (matched) return matched;
  }
  return options[0];
}

function _forcedActionForInfo(info) {
  if (!info) return null;
  if (
    info.isChain &&
    Game.inChain &&
    Game.chainPos != null &&
    Turn &&
    Turn.ctx &&
    Turn.ctx.startedFrom === info.from
  ) {
    const pos = info.path.indexOf(Game.chainPos);
    if (pos >= 0 && pos < info.path.length - 1) {
      return { info, from: info.path[pos], to: info.path[pos + 1], endChain: false };
    }
    if (pos === info.path.length - 1) {
      return { info, from: null, to: null, endChain: true };
    }
  }
  return { info, from: info.from, to: info.toFirst, endChain: false };
}

function getForcedOpeningExpectedActions() {
  const options = getForcedOpeningOptions();
  if (Game.inChain) {
    const info = getForcedOpeningInfo();
    const action = _forcedActionForInfo(info);
    return action ? [action] : [];
  }
  return options.map(_forcedActionForInfo).filter(Boolean);
}

function getForcedOpeningExpectedAction() {
  const actions = getForcedOpeningExpectedActions();
  return actions.length ? actions[0] : null;
}

function completeForcedOpeningPly() {
  if (Game.forcedPly === 3) {
    const actual = Game.lastMoveFrom == null ? [] : [Game.lastMoveFrom].concat(Array.isArray(Game.lastMovePath) ? Game.lastMovePath : []);
    const selected = getForcedOpeningOptions(3).find((info) => window.DhametRules.samePath(info.path, actual));
    if (selected && (selected.exchangeChoice === 0 || selected.exchangeChoice === 1)) {
      Game.openingExchangeFourthChoice = selected.exchangeChoice;
    }
  }
  Game.forcedPly += 1;
  if (Game.forcedPly === 10) handleForcedOpeningOver();
}

function logForcedOpeningTurn(mover, info) {
  try {
    if (!(window.UI && typeof UI.log === "function")) return;
    const from = Game.lastMoveFrom != null ? Game.lastMoveFrom : info.from;
    const to = Game.lastMovedTo != null ? Game.lastMovedTo : info.toFinal;
    const captures =
      Turn && Turn.ctx && typeof Turn.ctx.capturesDone === "number"
        ? Turn.ctx.capturesDone | 0
        : Game.lastMoveWasCapture
          ? 1
          : 0;
    UI.log({
      kind: "turn",
      side: mover,
      actor: resolveTurnActorLabel(mover),
      from,
      to,
      captures,
      ts: Date.now(),
    });
  } catch (_) {}
}

function applyForcedOpeningInfo(info) {
  if (!info || !Array.isArray(info.path) || info.path.length < 2) return false;
  if (!Turn.ctx) Turn.start();

  let cur = info.from;
  let anyCapture = false;

  for (let i = 1; i < info.path.length; i++) {
    const nxt = info.path[i];
    const [isCap, jumped] = classifyCapture(cur, nxt);

    if (isCap && jumped != null && !anyCapture) {
      Turn.beginCapture(info.from);
    }

    applyMove(cur, nxt, isCap, isCap ? jumped : null);

    if (isCap && jumped != null) {
      anyCapture = true;
      Turn.recordCapture();
    }

    cur = nxt;
  }

  Game.inChain = false;
  Game.chainPos = null;
  Game.lastMovedTo = cur;
  return true;
}

function finishForcedOpeningAppliedTurn(mover, info) {
  Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);
  logForcedOpeningTurn(mover, info);
  completeForcedOpeningPly();

  switchPlayer();
  Turn.start();
  scheduleForcedOpeningAutoIfNeeded();
  Visual.draw();

  if (Game.forcedPly >= 10 && Game.player === aiSide()) {
    Turn.finishTurnAndSoufla();
  }

  if (
    !Game.awaitingPenalty &&
    !Game.gameOver &&
    Game.player === aiSide() &&
    !isForcedOpeningActive()
  ) {
    AI.scheduleMove();
  }
}

function setupInitialBoard() {
  try {
    Visual.clearSouflaFX && Visual.clearSouflaFX();
  } catch {}
  try {
    Visual.setUndoMove && Visual.setUndoMove(null, null);
  } catch {}
  try {
    Visual.setHintPath && Visual.setHintPath(null, null);
  } catch {}
  try {
    Visual.setLastMovePath && Visual.setLastMovePath(null, null);
  } catch {}
  try {
    Visual.setLastMove && Visual.setLastMove(null, null);
  } catch {}
  try {
    Visual.clearCapturedOrder && Visual.clearCapturedOrder();
  } catch {}

  Game.board = createInitialBoard();

  Game.player = Game.settings.starter === "white" ? BOT : TOP;

  Game.inChain = false;
  Game.chainPos = null;
  Game.lastMovedTo = null;
  Game.lastMovedFrom = null;
  Game.lastMoveFrom = null;
  Game.lastMovePath = null;
  Game.lastMoveSide = null;
  Game.lastMoveWasCapture = false;
  try {
    if (Visual.clearPrevMove) Visual.clearPrevMove();
  } catch {}
  Game.moveCount = 0;

  Game.gameOver = false;
  Game.winner = null;
  Game.awaitingPenalty = false;
  Game.souflaPending = null;
  Game.terminationReason = null;
  Game.forcedEnabled = true;
  Game.forcedPly = 0;
  Game.forcedSeq = forcedOpeningSeqForStarterSide(Game.player);
  Game.openingExchangeFourthChoice = null;
  Game.deferredPromotion = null;
  Game.history = [];
  Game.killTimer.hardStop();
  try {
    TrainRecorder.startNewGame();
  } catch {}

  try {
    UI.log({ kind: "i18n", key: "log.forced.openingStarted", ts: Date.now() });
  } catch {}
  UI.updateAll();
}

function handleForcedOpeningOver() {
  UI.log({ kind: "i18n", key: "log.forced.openingEnded", ts: Date.now() });
}

function pieceOwner(v) { return window.DhametRules.owner(v); }
function pieceKind(v) { return window.DhametRules.kind(v); }
function forwardDir(side) { return window.DhametRules.forward(side); }

function isBackRank(idx, forSide) { return window.DhametRules.isBackRank(Number(idx), Number(forSide)); }

function encodeAction(frIdx, toIdx) {
  return frIdx * N_CELLS + toIdx;
}

function generateStepsFrom(fromIdx, v) {
  void v;
  return window.DhametRules.generateStepDestinations(Game.board, Number(fromIdx));
}

function generateCapturesFrom(fromIdx, v) {
  void v;
  return window.DhametRules.captureOptions(Game.board, Number(fromIdx)).map((item) => [item.to, item.jumped]);
}

function maxCaptureLenFrom(fromIdx) {
  const side = pieceOwner(valueAt(Number(fromIdx)));
  if (!side) return 0;
  const info = window.DhametRules.mandatoryCaptureInfo(Game.board, side, { includePaths: false });
  const found = (info.longestByPiece || []).find((entry) => Number(entry[0]) === Number(fromIdx));
  return found ? Math.max(0, Number(found[1]) || 0) : 0;
}

function simEnter() {
  try {
    Game._simDepth = (Game._simDepth || 0) + 1;
  } catch {}
}
function simExit() {
  try {
    Game._simDepth = Math.max(0, (Game._simDepth || 0) - 1);
  } catch {}
}

function computeLongestForPlayer(side) {
  const info = window.DhametRules.mandatoryCaptureInfo(Game.board, Number(side), { includePaths: true, includeAllPiecePaths: true });
  return {
    longestByPiece: new Map(info.longestByPiece || []),
    Lmax: Math.max(0, Number(info.longestGlobal) || 0),
    candidates: Array.isArray(info.candidates) ? info.candidates.slice() : []
  };
}

function cloneBoard(b) { return window.DhametRules.cloneBoard(b); }

function legalActions() {
  const mask = new Uint8Array(N_ACTIONS);
  const meta = new Array(N_CELLS * N_CELLS).fill(null);

  if (Game.gameOver) {
    return { mask, meta };
  }

  if (isForcedOpeningActive()) {
    const expectedActions = getForcedOpeningExpectedActions();
    if (!expectedActions.length) return { mask, meta };
    for (const expected of expectedActions) {
      if (expected.endChain) {
        mask[ACTION_ENDCHAIN] = 1;
        continue;
      }
      const a = encodeAction(expected.from, expected.to);
      mask[a] = 1;
      meta[a] = [expected.from, expected.to];
    }
    return { mask, meta };
  }

  if (Game.inChain && Game.chainPos != null) {
    const v = Game.board[Math.floor(Game.chainPos / BOARD_N)][Game.chainPos % BOARD_N];
    const caps = generateCapturesFrom(Game.chainPos, v);
    for (const [toIdx, _jumped] of caps) {
      const a = encodeAction(Game.chainPos, toIdx);
      mask[a] = 1;
      meta[a] = [Game.chainPos, toIdx];
    }
    mask[ACTION_ENDCHAIN] = 1;
    return { mask, meta };
  }

  for (let idx = 0; idx < N_CELLS; idx++) {
    const [r, c] = idxToRC(idx);
    const v = Game.board[r][c];
    if (!v || pieceOwner(v) !== Game.player) continue;
    for (const toIdx of generateStepsFrom(idx, v)) {
      mask[encodeAction(idx, toIdx)] = 1;
      meta[encodeAction(idx, toIdx)] = [idx, toIdx];
    }
    for (const [toIdx, _] of generateCapturesFrom(idx, v)) {
      mask[encodeAction(idx, toIdx)] = 1;
      meta[encodeAction(idx, toIdx)] = [idx, toIdx];
    }
  }
  mask[ACTION_ENDCHAIN] = 0;
  return { mask, meta };
}

function classifyCapture(fromIdx, toIdx) {
  const result = window.DhametRules.classifyCapture(Game.board, Number(fromIdx), Number(toIdx));
  return [!!result.ok, result.ok ? result.jumped : null];
}

function applyMove(fromIdx, toIdx, isCapture, jumpedIdx) {
  const official = window.DhametRules.applySegment(Game.board, Number(fromIdx), Number(toIdx));
  if (!official || !official.ok) throw new Error("Illegal move rejected by latest rules: " + (official && official.reason || "unknown"));
  if (!!isCapture !== (official.type === window.DhametRules.MOVE_CAPTURE)) throw new Error("Move classification mismatch");
  if (official.jumped != null && jumpedIdx != null && Number(official.jumped) !== Number(jumpedIdx)) throw new Error("Captured-piece mismatch");
  pushHistoryBeforeMove(fromIdx, toIdx);
  if (official.jumped != null) Visual.capturedOrderPush(official.jumped);
  Game.board = official.board;
  Game.lastMovedFrom = fromIdx;
  Game.lastMovedTo = toIdx;

  if (
    isCapture &&
    typeof Turn !== "undefined" &&
    Turn &&
    Turn.ctx &&
    Turn.ctx.startedFrom != null
  ) {
    Game.lastMoveFrom = Turn.ctx.startedFrom;
    if (!Array.isArray(Game.lastMovePath) || Turn.ctx.capturesDone === 0) {
      Game.lastMovePath = [];
    }
    Game.lastMovePath.push(toIdx);
  } else {
    Game.lastMoveFrom = fromIdx;
    Game.lastMovePath = [toIdx];
  }

  Game.lastMoveSide = Game.player;
  Game.lastMoveWasCapture = !!isCapture;

  try {
    if (window.Online && window.Online.isActive && !window.Online._isApplyingRemote) {
      window.Online.recordLocalStep(
        fromIdx,
        toIdx,
        !!isCapture,
        jumpedIdx != null ? jumpedIdx : null,
      );
    }
  } catch {}

  try {
    SessionGame.saveSoon();
  } catch {}
}

function promoteIfNeeded(idx) {
  const v = valueAt(idx);
  if (!v) return;
  if (pieceKind(v) !== MAN) return;
  const owner = pieceOwner(v);
  if (isBackRank(idx, owner)) {
    setValueAt(idx, owner === TOP ? KING : -KING);
    Visual.queueCrown(idx);
    UI.log({ kind: "promote", idx: idx, side: owner, ts: Date.now() });
  }
}

function maybeQueueDeferredPromotion(idx) {
  const v = valueAt(idx);
  if (!v) return;
  if (pieceKind(v) !== MAN) return;
  const owner = pieceOwner(v);
  if (isBackRank(idx, owner)) {
    Game.deferredPromotion = { idx, side: owner };
  }
}

function valueAt(idx) {
  const [r, c] = idxToRC(idx);
  return Game.board[r][c];
}
function setValueAt(idx, v) {
  const [r, c] = idxToRC(idx);
  Game.board[r][c] = v;
}
function rcStr(idx) {
  const [r, c] = idxToRC(idx);
  return `${r}.${c}`;
}

const TurnFX = {
  capturedOrder: [],
  reset() {
    this.capturedOrder.length = 0;
  },
};
Game.souflaSticky = {
  armed: false,
  clearOnSide: null,
};

function armSouflaFXPersistence(clearOnSide) {
  Game.souflaSticky.armed = true;
  Game.souflaSticky.clearOnSide = clearOnSide != null ? clearOnSide : null;
}

function consumeTurnClearForMove() {
  try {
    if (typeof Visual !== "undefined" && Visual && typeof Visual.consumeTurnClear === "function") {
      const sticky = Game.souflaSticky;
      const preserve =
        !!(sticky && sticky.armed && sticky.clearOnSide != null && Game.player !== sticky.clearOnSide);
      if (preserve) Visual.consumeTurnClear({ preserveSoufla: true });
      else Visual.consumeTurnClear();
      if (sticky && sticky.armed && sticky.clearOnSide != null && Game.player === sticky.clearOnSide) {
        sticky.armed = false;
        sticky.clearOnSide = null;
      }
    }
  } catch (_) {}
}

const Turn = {
  ctx: null,

  start() {
    if (Game.deferredPromotion && Game.player === Game.deferredPromotion.side) {
      const { idx, side } = Game.deferredPromotion;
      const v = valueAt(idx);
      if (v && pieceKind(v) === MAN && pieceOwner(v) === side) {
        setValueAt(idx, side === TOP ? KING : -KING);
        Visual.queueCrown(idx);
        UI.log({ kind: "promote", idx: idx, side: side, ts: Date.now() });
      }
      Game.deferredPromotion = null;
    }

    const { longestByPiece, Lmax, candidates } = computeLongestForPlayer(Game.player);

    this.ctx = {
      longestByPiece,
      Lmax,
      candidates,
      startedFrom: null,
      capturesDone: 0,
      snapshot: snapshotState(),
    };
    try {
      if (typeof Visual !== "undefined" && Visual && typeof Visual.markTurnBoundary === "function")
        Visual.markTurnBoundary();
    } catch {}
    Game.killTimer.hardStop();

    if (Game.gameOver) {
      UI.updateStatus();
      return;
    }

    try {
      const { mask } = legalActions();
      let any = false;
      for (let a = 0; a < N_ACTIONS; a++) {
        if (mask[a] && a !== ACTION_ENDCHAIN) {
          any = true;
          break;
        }
      }
      if (!any) {
        Game.gameOver = true;
        Game.winner = -Game.player;
        Game.terminationReason = "no_legal_moves";
        try {
          SessionGame.clear();
        } catch {}
        try {
          UI.showGameOverModal?.(Game.winner);
        } catch {}
        try {
          Promise.resolve(
            TrainRecorder.finalizeAndUpload({
              winner: Game.winner,
              endReason: "no_legal_moves",
            }),
          ).finally(() => {
            try {
              TrainRecorder.startNewGame();
            } catch {}
          });
        } catch {}
        return;
      }
    } catch {}

    UI.updateStatus();
  },
  beginCapture(fromIdx) {
    if (!this.ctx) this.start();
    if (this.ctx.startedFrom == null) this.ctx.startedFrom = fromIdx;
    if (!Game.killTimer.running && Game.player === humanSide()) {
      Game.killTimer.start();
    }
  },

  recordCapture() {
    if (!this.ctx) {
      this.start();
    }
    this.ctx.capturesDone += 1;
  },

  finishTurnAndSoufla() {
    const endedBy = Game.player;

    if (Game.lastMovedTo != null) {
      try { maybeQueueDeferredPromotion(Game.lastMovedTo); } catch (_) {}
    }

    try {
      const from = Game.lastMoveFrom;
      const to = Game.lastMovedTo;
      if (from != null && to != null && window.UI && typeof window.UI.log === "function") {
        const captures =
          this.ctx && typeof this.ctx.capturesDone === "number"
            ? this.ctx.capturesDone | 0
            : Game.lastMoveWasCapture
              ? 1
              : 0;
        window.UI.log({
          kind: "turn",
          side: endedBy,
          actor: resolveTurnActorLabel(endedBy),
          from,
          to,
          captures,
          ts: Date.now(),
        });
      }
    } catch {}

    const pending = this.computeSouflaPending();
    Game.inChain = false;
    Game.chainPos = null;

    try {
      TrainRecorder.turnEnd({ pending });
    } catch {}

    if (pending) {
      if (window.Online?.isActive) {
        try {
          window.Online.cacheSouflaPending(pending);
        } catch {}

        if (pending.penalizer === humanSide()) {
          Game.availableSouflaForHuman = pending;
        } else {
          Game.availableSouflaForHuman = null;
        }
      } else {
        if (pending.penalizer === humanSide()) {
          Game.availableSouflaForHuman = pending;
        } else {
          try {
            Game.awaitingPenalty = true;
            Game.souflaPending = pending;
            Game.availableSouflaForHuman = null;
          } catch {}

          try {
            if (window.UI && typeof UI.updateStatus === "function") UI.updateStatus();
          } catch {}

          AI.pickSouflaDecision(pending)
            .then((decision) => {
              applySouflaDecision(decision, pending);
              try {
                UI.showSouflaAgainstHuman(decision, pending);
              } catch {}
            })
            .catch((e) => {
              const fallback =
                pending.options.find((o) => o.kind === "remove") || pending.options[0];
              applySouflaDecision(fallback, pending);
              try {
                UI.showSouflaAgainstHuman(fallback, pending);
              } catch {}
            });
          return;
        }
      }
    }

    switchPlayer();
    Turn.start();
    scheduleForcedOpeningAutoIfNeeded();
    UI.updateAll();

    if (window.Online && window.Online.isActive) {
      window.Online.sendMoveToFirebase(Game.lastMovedFrom, Game.lastMovedTo, Game.player);
    }

    if (endedBy === humanSide()) {
      Visual.clearForcedOpeningArrow();
    }
  },

  computeSouflaPending() {
    if (!this.ctx || !this.ctx.snapshot || !this.ctx.snapshot.board) return null;
    if ((this.ctx.Lmax | 0) <= 0) return null;

    const from = Game.lastMoveFrom != null ? Number(Game.lastMoveFrom) : null;
    const path = Array.isArray(Game.lastMovePath)
      ? Game.lastMovePath.map(Number).filter(window.DhametRules.validIdx)
      : [];
    const captures = Math.max(0, Number(this.ctx.capturesDone || 0) | 0);
    if (!window.DhametRules.validIdx(from) || !path.length) return null;

    const pending = window.DhametRules.detectSoufla(
      this.ctx.snapshot,
      this.ctx.snapshot.board,
      Game.player,
      {
        from,
        to: Game.lastMovedTo != null ? Number(Game.lastMovedTo) : path[path.length - 1],
        path,
        captures,
        mandatory: {
          hasCapture: (this.ctx.Lmax | 0) > 0,
          longestGlobal: this.ctx.Lmax | 0,
          longestByPiece: this.ctx.longestByPiece && typeof this.ctx.longestByPiece.entries === "function"
            ? Array.from(this.ctx.longestByPiece.entries())
            : [],
          candidates: Array.isArray(this.ctx.candidates) ? this.ctx.candidates.slice() : [],
        },
      },
    );
    if (!pending) return null;

    pending.longestByPiece = new Map(
      Array.isArray(pending.longestByPiece) ? pending.longestByPiece : [],
    );
    pending.turnStartSnapshot = this.ctx.snapshot;
    return pending;
  },
};

function snapshotState() {
  return {
    board: cloneBoard(Game.board),
    player: Game.player,
    inChain: Game.inChain,
    chainPos: Game.chainPos != null ? Game.chainPos : null,
    lastMovedTo: Game.lastMovedTo,
    lastMovedFrom: Game.lastMovedFrom,
    lastMoveFrom: Game.lastMoveFrom,
    lastMovePath: Array.isArray(Game.lastMovePath) ? Game.lastMovePath.slice() : null,
    moveCount: Game.moveCount,

    forcedEnabled: Game.forcedEnabled,
    forcedPly: Game.forcedPly,
    openingExchangeFourthChoice: Game.openingExchangeFourthChoice,
    opening: {
      starter: forcedOpeningBaseSide(Game.forcedSeq),
      exchangeFourthChoice: Game.openingExchangeFourthChoice,
    },
    deferredPromotion: Game.deferredPromotion ? { ...Game.deferredPromotion } : null,
  };
}

function pushHistoryBeforeMove(fromIdx, toIdx) {
  if ((Game._simDepth || 0) > 0) return;

  try {
    const onlineActive = !!(window.Online && window.Online.isActive);
    if (
      !onlineActive &&
      typeof TrainRecorder !== "undefined" &&
      TrainRecorder &&
      typeof TrainRecorder.beginMoveBoundary === "function"
    ) {
      TrainRecorder.beginMoveBoundary({
        type: "move",
        actor: Game.player,
        fromIdx,
        toIdx,
      });
    }
  } catch (_) {}

  const snap = snapshotState();
  snap.lastMovedFrom = fromIdx;
  snap.lastMovedTo = toIdx;
  Game.history.push(snap);
  if (Game.history.length > 10) Game.history.splice(0, Game.history.length - 10);
}

function restoreSnapshot(snap, opts) {
  let redraw = true;
  let visual = true;

  if (typeof opts === "boolean") {
    redraw = opts;
  } else if (opts && typeof opts === "object") {
    if (opts.redraw === false) redraw = false;
    if (opts.visual === false) visual = false;
  }

  Game.board = cloneBoard(snap.board);
  Game.player = snap.player;
  Game.inChain = snap.inChain;
  Game.chainPos = snap.chainPos != null ? snap.chainPos : null;
  Game.lastMovedTo = snap.lastMovedTo;
  Game.lastMovedFrom = snap.lastMovedFrom;

  Game.lastMoveFrom = snap.lastMoveFrom != null ? snap.lastMoveFrom : snap.lastMovedFrom;
  Game.lastMovePath = Array.isArray(snap.lastMovePath)
    ? snap.lastMovePath.slice()
    : snap.lastMovedTo != null
      ? [snap.lastMovedTo]
      : null;

  Game.moveCount = snap.moveCount;

  if (typeof snap.forcedEnabled === "boolean") Game.forcedEnabled = snap.forcedEnabled;
  if (typeof snap.forcedPly === "number") Game.forcedPly = snap.forcedPly;
  const openingChoice = snap.opening && snap.opening.exchangeFourthChoice != null
    ? Number(snap.opening.exchangeFourthChoice)
    : Number(snap.openingExchangeFourthChoice);
  Game.openingExchangeFourthChoice = openingChoice === 0 || openingChoice === 1 ? openingChoice : null;
  Game.deferredPromotion = snap.deferredPromotion && typeof snap.deferredPromotion === "object"
    ? { idx: Number(snap.deferredPromotion.idx), side: Number(snap.deferredPromotion.side) }
    : null;

  if (visual) {
    try {
      if (
        Game.lastMoveFrom != null &&
        Array.isArray(Game.lastMovePath) &&
        Game.lastMovePath.length
      ) {
        Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);
      } else {
        Visual.setLastMove(null, null);
      }
    } catch {}
    try {
      Visual.clearCapturedOrder();
    } catch {}
  }

  if (redraw) {
    UI.updateAll();
  }
}

function restoreSnapshotSilent(snap) {
  restoreSnapshot(snap, { redraw: false, visual: false });
}

const SessionGame = (() => {
  const KEY_ONLINE = "dhamet2.session.game.online.v1";
  const MAX_KB = 256;

  function _getKey() {
    return KEY_ONLINE;
  }
  let _t = null;

  function _safeNowMs() {
    try {
      return Date.now();
    } catch {
      return 0;
    }
  }

  function _getKillMs() {
    try {
      return (
        ((Game.killTimer?.elapsedMs || 0) +
          (Game.killTimer?.running ? performance.now() - (Game.killTimer.startTs || 0) : 0)) |
        0
      );
    } catch {
      return 0;
    }
  }

  function _capture() {
    const snap = snapshotState();
    const data = {
      v: 1,
      ts: _safeNowMs(),
      snapshot: snap,

      gameOver: !!Game.gameOver,
      winner: Game.winner == null ? null : Game.winner | 0,
      terminationReason: Game.terminationReason == null ? null : String(Game.terminationReason),

      forcedSeqKey:
        Game.forcedSeq === FO_TOP ? "FO_TOP" : Game.forcedSeq === FO_BOT ? "FO_BOT" : null,
      settings: Game.settings,
      turnCtx: (() => {
        try {
          const ctx = typeof Turn !== "undefined" && Turn && Turn.ctx ? Turn.ctx : null;
          if (!ctx) return null;
          return {
            startedFrom: ctx.startedFrom == null ? null : ctx.startedFrom | 0,
            capturesDone: typeof ctx.capturesDone === "number" ? ctx.capturesDone | 0 : 0,
            Lmax: typeof ctx.Lmax === "number" ? ctx.Lmax | 0 : 0,
            candidates: Array.isArray(ctx.candidates) ? ctx.candidates.slice() : null,
          };
        } catch {
          return null;
        }
      })(),
      history: Array.isArray(Game.history) ? Game.history : [],
      logEvents: window.LogMgr && Array.isArray(window.LogMgr._events) ? window.LogMgr._events : [],
      logHtml: typeof qs === "function" && qs("#log") ? qs("#log").innerHTML : "",
      killTimerMs: Math.max(0, _getKillMs()),
    };
    return data;
  }

  function clear() {
    try {
      sessionStorage.removeItem(_getKey());
    } catch {}
  }

  function saveNow() {
    if ((Game._simDepth || 0) > 0) return;

    if (Game.gameOver) {
      clear();
      return;
    }

    try {
      const data = _capture();
      const raw = JSON.stringify(data);
      if (raw && raw.length / 1024 > MAX_KB) return;
      sessionStorage.setItem(_getKey(), raw);
    } catch {}
  }

  function saveSoon() {
    try {
      if (_t) return;
      _t = setTimeout(() => {
        _t = null;
        saveNow();
      }, 0);
    } catch {
      saveNow();
    }
  }

  function restore() {
    let raw = null;
    try {
      raw = sessionStorage.getItem(_getKey());
    } catch {}
    if (!raw) return false;

    let data = null;
    try {
      data = JSON.parse(raw);
    } catch {
      clear();
      return false;
    }
    if (!data || typeof data !== "object") {
      clear();
      return false;
    }

    if (data.gameOver) {
      clear();
      return false;
    }

    const snap = data.snapshot;
    if (!snap || !snap.board || !Array.isArray(snap.board)) {
      clear();
      return false;
    }

    try {
      if (data.settings && typeof data.settings === "object") {
        Game.settings = data.settings;
        try {
          Game.normalizeAdvancedSettings();
        } catch {}
      }

      if (data.forcedSeqKey === "FO_TOP") Game.forcedSeq = FO_TOP;
      else if (data.forcedSeqKey === "FO_BOT") Game.forcedSeq = FO_BOT;
      else {
        try {
          const fp = typeof snap.forcedPly === "number" ? snap.forcedPly | 0 : 0;
          const cur = snap.player;
          const base = fp % 2 === 0 ? cur : -cur;
          Game.forcedSeq = base === TOP ? FO_TOP : FO_BOT;
        } catch {
          Game.forcedSeq = FO_BOT;
        }
      }

      restoreSnapshot(snap, { redraw: false, visual: true });

      Game.gameOver = false;
      Game.winner = null;
      Game.terminationReason = null;

      Game.history = Array.isArray(data.history) ? data.history : [];

      try {
        if (
          window.LogMgr &&
          typeof window.LogMgr.setEvents === "function" &&
          Array.isArray(data.logEvents)
        ) {
          window.LogMgr.setEvents(data.logEvents);
        } else if (typeof data.logHtml === "string" && typeof qs === "function" && qs("#log")) {
          qs("#log").innerHTML = data.logHtml;
        }
      } catch {}
      try {
        const km = typeof data.killTimerMs === "number" ? data.killTimerMs : 0;
        Game.killTimer.hardStop();
        Game.killTimer.elapsedMs = Math.max(0, km | 0);
        try {
          UI.updateKillClock(Game.killTimer.elapsedMs | 0);
        } catch {}
        if (Game.inChain) {
          try {
            Game.killTimer.start();
          } catch {}
        }
        try {
          if (typeof syncEndKillAvailability === "function") syncEndKillAvailability(Game.inChain);
          else {
            const btn = typeof qs === "function" ? qs("#btnEndKill") : null;
            if (btn) {
              btn.disabled = false;
              btn.setAttribute("data-chain-active", Game.inChain ? "true" : "false");
              btn.setAttribute("aria-disabled", Game.inChain ? "false" : "true");
            }
          }
        } catch {}
      } catch {}

      try {
        UI.updateAll();
      } catch {}

      return true;
    } catch {
      clear();
      return false;
    }
  }

  return { KEY: KEY_ONLINE, KEY_ONLINE, getKey: _getKey, saveNow, saveSoon, restore, clear };
})();

try {
  window.SessionGame = SessionGame;
} catch {}

function longestPathsWithJumpsFrom(fromIdx, maxLen) {
  simEnter();
  try {
    const startV = valueAt(fromIdx);
    const owner = pieceOwner(startV);
    const out = [];

    function dfs(curIdx, vCur, depth, path, jumps) {
      if (depth === maxLen) {
        out.push({ path: path.slice(), jumps: jumps.slice() });
        return;
      }
      const moves = generateCapturesFrom(curIdx, vCur);
      for (const [toIdx, jumpedIdx] of moves) {
        const keep = cloneBoard(Game.board);
        const [r1, c1] = idxToRC(curIdx);
        const [r2, c2] = idxToRC(toIdx);
        const [jr, jc] = idxToRC(jumpedIdx);

        Game.board[r1][c1] = 0;
        Game.board[jr][jc] = 0;
        Game.board[r2][c2] = vCur;

        const rem = maxCaptureLenFrom(toIdx);
        if (rem >= maxLen - (depth + 1)) {
          dfs(toIdx, vCur, depth + 1, path.concat(toIdx), jumps.concat(jumpedIdx));
        }

        Game.board = keep;
      }
    }

    dfs(fromIdx, startV, 0, [], []);
    return out;
  } finally {
    simExit();
  }
}

function applySouflaDecision(decision, pending) {
  if (!decision || !pending) return;

  let _fxRedSegments = null;
  let _fxRemoveIdx = null;
  let _fxForcePath = null;
  let _fxUndoArrow = null;

  try {
    Visual.clearSouflaFX(true);
  } catch {}

  Game._souflaApplying = true;
  try {
    Visual.setSuspended(true);
  } catch {}
  try {
    Board3D.setSuspended(true);
  } catch {}

  try {
    setTimeout(() => {
      if (Game._souflaApplying) {
        try {
          Board3D.setSuspended(false);
          Board3D.invalidate();
        } catch {}
        try {
          Game._souflaApplying = false;
          Visual.setSuspended(false);
        } catch {}
        try {
          UI.updateAll();
        } catch {}
      }
    }, 1500);
  } catch {}

  try {
    Game.lastMoveFrom = null;
    Game.lastMovePath = null;
    Game.lastMovedFrom = null;
    Game.lastMovedTo = null;
    Visual.setLastMovePath(null, null);
    Visual.setLastMove(null, null);
  } catch {}

  const redSegments = [];
  try {
    const offIdx = decision.offenderIdx;
    const maxLen =
      pending.longestByPiece && pending.longestByPiece.get
        ? pending.longestByPiece.get(offIdx) || 0
        : 0;
    if (offIdx != null && maxLen > 0 && pending.turnStartSnapshot) {
      const keep = snapshotState();
      simEnter();
      try {
        restoreSnapshotSilent(pending.turnStartSnapshot);
        const full = longestPathsWithJumpsFrom(offIdx, maxLen) || [];
        full.sort((a, b) => {
          const sa = (a.path || []).join(",") + "|" + (a.jumps || []).join(",");
          const sb = (b.path || []).join(",") + "|" + (b.jumps || []).join(",");
          return sa < sb ? -1 : sa > sb ? 1 : 0;
        });
        const chosen = full[0];
        if (chosen && Array.isArray(chosen.path) && chosen.path.length) {
          redSegments.push({
            from: offIdx,
            path: chosen.path.slice(),
            jumps: Array.isArray(chosen.jumps) ? chosen.jumps.slice() : [],
          });
        }
      } finally {
        restoreSnapshotSilent(keep);
        simExit();
      }
    }
  } catch {}
  _fxRedSegments = redSegments;

  let __prevOnlineApplying = null;
  let __hadOnline = false;
  try {
    if (window.Online && window.Online.isActive) {
      __hadOnline = true;
      __prevOnlineApplying = window.Online._isApplyingRemote;
      window.Online._isApplyingRemote = true;
      window.Online.clearPendingLocalMove?.();
    }
  } catch {}

  try {
    if (decision.kind === "remove") {
      const originalIdx = decision.offenderIdx;

      const actualRemoveIdx =
        pending.startedFrom === decision.offenderIdx && pending.lastPieceIdx != null
          ? pending.lastPieceIdx
          : decision.offenderIdx;

      setValueAt(actualRemoveIdx, 0);
      _fxRemoveIdx = originalIdx;

      UI.log({ kind: "soufla_remove", idx: originalIdx, ts: Date.now() });

      armSouflaFXPersistence(-pending.penalizer);

      try {
        TrainRecorder.souflaApplied(decision, pending);
      } catch {}

      if (Game.player !== pending.penalizer) {
        switchPlayer();
      }
    } else if (decision.kind === "force") {
      try {
        TrainRecorder.souflaBeginForce(decision, pending);
      } catch {}

      restoreSnapshotSilent(pending.turnStartSnapshot);

      try {
        if (
          pending.lastMoveFrom != null &&
          Array.isArray(pending.lastMovePath) &&
          pending.lastMovePath.length
        ) {
          const nodes = [pending.lastMoveFrom]
            .concat(pending.lastMovePath)
            .map((n) => Number(n))
            .filter(Number.isFinite);
          if (nodes.length >= 2) {
            const rev = nodes.slice().reverse();
            _fxUndoArrow = { from: rev[0], path: rev.slice(1) };
          }
        } else if (pending.startedFrom != null && pending.lastPieceIdx != null) {
          _fxUndoArrow = {
            from: pending.lastPieceIdx,
            to: pending.startedFrom,
          };
        }
      } catch {}

      try {
        Turn.start();
      } catch {}
      const from = decision.offenderIdx;

      try {
        Turn.beginCapture(from);
      } catch {}

      let cur = from;
      const fullPath = [from];

      for (const to of decision.path || []) {
        const prev = cur;
        const [isCap, jumped] = classifyCapture(prev, to);
        if (!isCap || jumped == null) break;

        applyMove(prev, to, true, jumped);
        try {
          Turn.recordCapture();
        } catch {}
        cur = to;
        fullPath.push(to);
      }

      try {
        maybeQueueDeferredPromotion(cur);
      } catch {}

      Game.inChain = false;
      Game.chainPos = null;
      try {
        if (typeof syncEndKillAvailability === "function") syncEndKillAvailability(false);
        else {
          const btn = qs("#btnEndKill");
          if (btn) {
            btn.disabled = false;
            btn.setAttribute("data-chain-active", "false");
            btn.setAttribute("aria-disabled", "true");
          }
        }
      } catch {}

      _fxForcePath = fullPath.slice();

      UI.log({
        kind: "soufla_force",
        from: from,
        path: decision.path || [],
        ts: Date.now(),
      });

      armSouflaFXPersistence(-pending.penalizer);

      try {
        TrainRecorder.souflaEndForce(decision, pending);
      } catch {}

      switchPlayer();
    }
  } finally {
    try {
      if (__hadOnline && window.Online) {
        window.Online._isApplyingRemote = __prevOnlineApplying === true;
      }
    } catch {}
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        Visual.applySouflaFXBatch(
          {
            redSegments: _fxRedSegments,
            removeIdx: _fxRemoveIdx,
            forcePath: _fxForcePath,
            undoArrow: _fxUndoArrow,
          },
          { noDraw: true },
        );
      } catch {}

      try {
        Game.awaitingPenalty = false;
        Game.souflaPending = null;
        Game.availableSouflaForHuman = null;
      } catch {}

      try {
        Turn.start();
      } catch {}
      try {
        scheduleForcedOpeningAutoIfNeeded();
      } catch {}
      try {
        UI.updateAll();
      } catch {}

      try {
        Board3D.setSuspended(false);
        Board3D.invalidate();
      } catch {}
      try {
        Game._souflaApplying = false;
        Visual.setSuspended(false);
      } catch {}

      if (
        !Game.awaitingPenalty &&
        !Game.gameOver &&
        Game.player === aiSide() &&
        !(Game.forcedEnabled && Game.forcedPly < 10)
      ) {
        try {
          AI.scheduleMove();
        } catch {}
      }
    });
  });
  if (window.Online && window.Online.isActive && !window.Online._isApplyingRemote) {
    try {
      window.Online.clearPendingLocalMove?.();
    } catch {}
    try {
      window.Online.sendSouflaDecisionToFirebase(decision, pending, Game.player);
    } catch {}
  }
}

function switchPlayer() {
  try {
    if (Visual.clearPrevMove) Visual.clearPrevMove();
  } catch {}
  Game.player = -Game.player;
  Game.moveCount += 1;
  try {
    if (typeof Visual !== "undefined" && Visual && typeof Visual.markTurnBoundary === "function")
      Visual.markTurnBoundary();
  } catch {}
  Game.killTimer.hardStop();
  checkEndConditions();
  UI.updateStatus();
}

function checkEndConditions() {
  const counts = window.DhametRules.countPieces(Game.board);
  try { UI.updateCounts?.({ top: counts.top, bot: counts.bot, tKings: counts.topKings, bKings: counts.botKings }); } catch (_) {}
  const outcome = window.DhametRules.getGameOutcome(Game.board, Game.player);
  if (!outcome || outcome.status === window.DhametRules.RESULT_ONGOING) return;
  Game.gameOver = true;
  Game.winner = outcome.status === window.DhametRules.RESULT_DRAW ? null : outcome.winner;
  Game.terminationReason = outcome.reason || (Game.winner == null ? "draw" : "natural_win");
  try { SessionGame.clear(); } catch (_) {}
  try { UI.showGameOverModal?.(Game.winner); } catch (_) {}
}

function scheduleForcedOpeningAutoIfNeeded() {
  if (!isForcedOpeningActive()) return;
  if (Game.gameOver) return;

  const info = getForcedOpeningInfo();
  if (!info || Game.player !== info.mover || info.mover !== aiSide()) return;

  Game.awaitingPenalty = false;
  Game.souflaPending = null;

  setTimeout(() => {
    if (!isForcedOpeningActive()) return;
    const current = getForcedOpeningInfo();
    if (!current || current.ply !== info.ply || Game.player !== current.mover) return;

    consumeTurnClearForMove();

    if (!applyForcedOpeningInfo(current)) return;

    finishForcedOpeningAppliedTurn(current.mover, current);
  }, 500);
}
function detectCriticalState(side) {
  const { Lmax } = computeLongestForPlayer(side);
  if (Lmax > 0) return true;

  for (let idx = 0; idx < N_CELLS; idx++) {
    const v = valueAt(idx);
    if (!v || pieceOwner(v) !== side || pieceKind(v) !== MAN) continue;
    const [r] = idxToRC(idx);
    if ((side === TOP && r >= 7) || (side === BOT && r <= 1)) return true;
  }

  try {
    if ((__aiCrownPriority(side) | 0) > 0) return true;
  } catch {}

  const opp = -side;
  for (let from = 0; from < N_CELLS; from++) {
    const v = valueAt(from);
    if (!v || pieceOwner(v) !== opp) continue;
    const caps = generateCapturesFrom(from, v);
    for (const [toIdx, jIdx] of caps) {
      const jv = valueAt(jIdx);
      if (jv && pieceOwner(jv) === side && pieceKind(jv) === KING) {
        return true;
      }
    }
  }
  return false;
}

/* AI engine removed: this deployment supports online play only. */

function humanSide() {
  if (window.Online && window.Online.isActive) return window.Online.mySide;
  return BOT;
}
function resolveTurnActorLabel(side) {
  try {
    if (side === humanSide()) {
      if (window.I18N && typeof window.I18N.text === "function") return String(window.I18N.text("players.you") || "You").trim();
      return "You";
    }
  } catch (_) {}
  try {
    if (typeof sideLabel === "function") {
      const raw = String(sideLabel(side) || "").trim();
      const clean = raw.replace(/\s*\((?:أنت|You|Vous)\)\s*/giu, " ").trim();
      if (clean) return clean;
    }
  } catch (_) {}
  try {
    if (window.Game && Game.names) {
      const raw = side === TOP ? Game.names.top : side === BOT ? Game.names.bot : "";
      const clean = String(raw || "").replace(/\s*\((?:أنت|You|Vous)\)\s*/giu, " ").trim();
      if (clean) return clean;
    }
  } catch (_) {}
  return "";
}
function aiSide() {
  if (window.Online && window.Online.isActive) return 0;
  return -humanSide();
}


const TrainRecorder = Object.freeze({
  startNewGame() {}, beginDecision() {}, endDecision() {},
  finalizeAndUpload() { return Promise.resolve({ uploaded: false, skipped: true }); },
  captureStateForTraining() { return null; }, recordExternalDecision() {},
  beginMoveBoundary() {}, rollbackLastMoveBoundary() {}, recordSouflaPenaltyChoice() {},
  turnEnd() {}, souflaBeginForce() {}, souflaApplied() {}, souflaEndForce() {}
});

const AI = Object.freeze({
  scheduleMove() {},
  pickSouflaDecision(pending) {
    const options = pending && Array.isArray(pending.options) ? pending.options : [];
    return Promise.resolve(options.find((item) => item && item.kind === "remove") || options[0] || null);
  },
  reset() {}
});
window.AI = AI;

/* Moved from pages/game.html to keep page markup declarative. */

      const qs = (sel, root = document) => root.querySelector(sel);
      const qsa = (sel, root = document) =>
        Array.from(root.querySelectorAll(sel));
      const nowHHMMSS = () => {
        const d = new Date();
        return d.toLocaleTimeString("en-GB", { hour12: false });
      };
      const popup = (
        msg,
        title = window.I18N.text("modals.notice", null, currentGameLang) || "تنبيه"
      ) => {
        const div = document.createElement("div");
        div.style.whiteSpace = "pre-wrap";
        div.textContent = String(msg ?? "");
        Modal.open({
          title,
          body: div,
          buttons: [
            {
              label: window.I18N.text("actions.ok", null, currentGameLang) || "حسناً",
              className: "primary",
              onClick: () => Modal.close(),
            },
          ],
        });
      };
      const fmtHHMMSS = (ts) => {
        try {
          const d = new Date(ts);
          return d.toLocaleTimeString("en-GB", { hour12: false });
        } catch {
          return nowHHMMSS();
        }
      };
      const LogMgr = __IN_WORKER
        ? {
            addEvent() {},
            addText() {},
            setEvents() {},
            retranslate() {},
            _events: [],
          }
        : (() => {

        const events = [];
        const MAX = 500;

        const _t = (key, vars) => {
          try {
            return window.I18N.text(key, vars, currentGameLang);
          } catch (_) {}
          return String(key || "");
        };

        const _rc = (idx) => {
          try {
            if (typeof rcStr === "function") return rcStr(idx);
          } catch (_) {}
          const n = Number(idx);
          if (!Number.isFinite(n)) return "";
          const r = Math.floor(n / 8);
          const c = n % 8;
          return `${r}.${c}`;
        };

        const _isoLtr = (s) => {
          const v = String(s ?? "").trim();
          return v ? `⁦${v}⁩` : "";
        };

        const _stripIcon = (s) => String(s || "").replace(/^[⚫⚪]\s*/u, "").trim();

        const _plainSide = (side) => {
          try {
            if (typeof sideLabel === "function") return _stripIcon(String(sideLabel(side) || ""));
          } catch (_) {}
          try {
            const w = (typeof BOT !== "undefined") ? BOT : -1;
            return _stripIcon(String(side === w ? _t("players.white") : _t("players.black")));
          } catch (_) {}
          return "";
        };

        const _escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\\[\\]\\\\]/g, "\\$&");

        const _selfNames = () => {
          const out = [];
          const push = (v) => {
            v = String(v || "").trim();
            if (v) out.push(v);
          };
          try { push(_stripIcon(_t("players.you"))); } catch (_) {}
          try {
            const session = typeof readStoredSession === "function" ? readStoredSession() : null;
            if (typeof sessionNickname === "function") push(sessionNickname(session));
          } catch (_) {}
          try {
            if (window.Online && window.Online.isActive && !window.Online.isSpectator) {
              const mySide = window.Online.mySide;
              if (window.Game && window.Game.names) {
                if (mySide === TOP) push(Game.names.top);
                if (mySide === BOT) push(Game.names.bot);
              }
            }
          } catch (_) {}
          try {
            const ids = ["pTopName", "pBotName", "pTopNameM", "pBotNameM"];
            for (const id of ids) {
              const el = document.getElementById(id);
              if (!el) continue;
              const txt = String(el.textContent || "");
              if (/\((?:أنت|You|Vous)\)/iu.test(txt)) push(txt);
            }
          } catch (_) {}
          return out
            .map((v) => {
              try { v = _stripIcon(v); } catch (_) {}
              return String(v || "").replace(/\s*\((?:أنت|You|Vous)\)\s*/giu, " ").trim();
            })
            .filter(Boolean);
        };

        const _normalizeName = (s) => {
          try { s = _stripIcon(String(s || "")); } catch (_) { s = String(s || ""); }
          s = String(s || "").replace(/\s*\((?:أنت|You|Vous)\)\s*/giu, " ").trim();
          if (!s) return "";
          try {
            const selfNames = _selfNames();
            for (const nm of selfNames) {
              if (nm && s.localeCompare(nm, undefined, { sensitivity: "accent" }) === 0) {
                return _stripIcon(_t("players.you")) || "You";
              }
            }
          } catch (_) {}
          return s;
        };

        const _addNameVariants = (arr, s) => {
          const base = _normalizeName(s);
          if (!base || base.length < 2) return;
          const push = (v) => {
            v = String(v || "").trim();
            if (v && v.length >= 2) arr.push(v);
          };
          push(base);

          // Arabic "player" prefix variants
          if (/^لاعب\s+/u.test(base)) push(base.replace(/^لاعب\s+/u, "").trim());
          else push("لاعب " + base);

          // English/French prefix variants (in case UI language differs from log language)
          if (/^Player\s+/i.test(base)) push(base.replace(/^Player\s+/i, "").trim());
          else push("Player " + base);

          if (/^Joueur\s+/i.test(base)) push(base.replace(/^Joueur\s+/i, "").trim());
          else push("Joueur " + base);
        };

        const _colorWords = () => {
          const out = [];
          try { out.push(_stripIcon(_t("players.white"))); } catch (_) {}
          try { out.push(_stripIcon(_t("players.black"))); } catch (_) {}
          out.push("الأبيض", "الأسود", "الابيض", "الاسود", "White", "Black");

          try {
            if (window.Game && window.Game.names) {
              _addNameVariants(out, Game.names.top);
              _addNameVariants(out, Game.names.bot);
            }
          } catch (_) {}

          // Also pick up names rendered in the UI (they may include a "you" tag)
          try {
            const ids = ["pTopName", "pBotName", "pTopNameM", "pBotNameM"];
            for (const id of ids) {
              const el = document.getElementById(id);
              if (el) _addNameVariants(out, el.textContent || "");
            }
          } catch (_) {}

          const uniq = [];
          const seen = new Set();
          for (const w of out) {
            const ww = String(w || "").trim();
            if (!ww || ww.length < 2) continue;
            if (seen.has(ww)) continue;
            seen.add(ww);
            uniq.push(ww);
          }
          uniq.sort((a, b) => b.length - a.length);
          return uniq;
        };

        const _actorWords = () => {
          const out = [];
          const push = (v) => {
            v = _normalizeName(v);
            v = String(v || "").trim();
            if (v && v.length >= 2) out.push(v);
          };
          try { push(_t("players.you")); } catch (_) {}
          try {
            if (window.Game && window.Game.names) {
              push(Game.names.top);
              push(Game.names.bot);
            }
          } catch (_) {}
          try {
            const session = typeof readStoredSession === "function" ? readStoredSession() : null;
            if (typeof sessionNickname === "function") push(sessionNickname(session));
          } catch (_) {}
          try { if (typeof computerPlayerLabel === "function") push(computerPlayerLabel()); } catch (_) {}
          try {
            const ids = ["pTopName", "pBotName", "pTopNameM", "pBotNameM"];
            for (const id of ids) {
              const el = document.getElementById(id);
              if (el) push(el.textContent || "");
            }
          } catch (_) {}
          const uniq = [];
          const seen = new Set();
          for (const w of out) {
            if (!w || seen.has(w)) continue;
            seen.add(w);
            uniq.push(w);
          }
          uniq.sort((a, b) => b.length - a.length);
          return uniq;
        };

        const _actorFromSide = (side) => {
          try {
            if (typeof sideLabel === "function") {
              const label = _normalizeName(sideLabel(side));
              if (label) return label;
            }
          } catch (_) {}
          return _plainSide(side);
        };

        const _appendHighlighted = (el, txt) => {
          const text = String(txt ?? "");
          const words = _colorWords();
          if (!words.length) { el.textContent = text; return; }
          const actorWords = new Set(_actorWords());

          const re = new RegExp(`(${words.map(_escapeRegExp).join("|")})`, "gu");
          let last = 0;
          let matched = false;

          text.replace(re, (m, _g, off) => {
            matched = true;
            if (off > last) el.appendChild(document.createTextNode(text.slice(last, off)));
            const sp = document.createElement("span");
            sp.className = actorWords.has(_normalizeName(m)) ? "actor-word" : "color-word";
            sp.textContent = m;
            el.appendChild(sp);
            last = off + m.length;
            return m;
          });

          if (!matched) { el.textContent = text; return; }
          if (last < text.length) el.appendChild(document.createTextNode(text.slice(last)));
        };

        const _msgFor = (ev) => {
          if (!ev || typeof ev !== "object") return String(ev ?? "");

          if (ev.kind === "turn") {
            const side = _normalizeName(ev.actor || _actorFromSide(ev.side));
            const from = _isoLtr(_rc(ev.from));
            const to = _isoLtr(_rc(ev.to));
            const n = (ev.captures | 0);
            if (n > 0) return _t("log.turnCaptureFmt", { side, from, to, n });
            return _t("log.turnMoveFmt", { side, from, to });
          }

          if (ev.kind === "promote") {
            const cell = _isoLtr(_rc(ev.idx));
            const side = _normalizeName(ev.actor || _actorFromSide(ev.side));
            return _t("log.promote", { cell, side });
          }

          if (ev.kind === "soufla_remove") {
            const cell = _isoLtr(_rc(ev.idx));
            return _t("log.soufla.remove", { cell });
          }

          if (ev.kind === "soufla_force") {
            const from = _isoLtr(_rc(ev.from));
            const path = Array.isArray(ev.path) ? ev.path.map((v) => _isoLtr(_rc(v))).join("→") : _isoLtr(String(ev.path || ""));
            return _t("log.soufla.force", { from, path });
          }

          if (ev.kind === "undo") {
            const from = ev.from != null ? _isoLtr(_rc(ev.from)) : "";
            const to = ev.to != null ? _isoLtr(_rc(ev.to)) : "";
            return _t("undo.applied", { movePart: (from && to) ? _t("undo.appliedMovePart", { from, to }) : "" });
          }

          if (ev.kind === "i18n_suffix") {
            const base = _t(String(ev.key || ""), (ev.vars && typeof ev.vars === "object") ? ev.vars : undefined);
            const sfx = ev.suffix != null ? String(ev.suffix) : "";
            return sfx ? `${base} (${sfx})` : base;
          }

                    if (ev.kind === "i18n") {
            return _t(String(ev.key || ""), (ev.vars && typeof ev.vars === "object") ? ev.vars : undefined);
          }

          if (ev.kind === "actor_i18n") {
            const actor = _normalizeName(ev.actor || "");
            const msg = _t(String(ev.key || ""), (ev.vars && typeof ev.vars === "object") ? ev.vars : undefined);
            return actor ? `${actor}: ${msg}` : msg;
          }

          if (ev.kind === "raw") return String(ev.text ?? "");
          if (typeof ev.text === "string") return ev.text;
          return String(ev.msg ?? "");
        };

        const _makeEl = (ev) => {
          const el = document.createElement("div");
          el.className = "log-item";

          const timeEl = document.createElement("span");
          timeEl.className = "time";
          const ts = (ev && typeof ev === "object" && ev.ts != null) ? ev.ts : null;
          timeEl.textContent = ts != null ? fmtHHMMSS(ts) : nowHHMMSS();

          const msgEl = document.createElement("span");
          msgEl.className = "msg";
          _appendHighlighted(msgEl, _msgFor(ev));

          el.appendChild(timeEl);
          el.appendChild(document.createTextNode(" "));
          el.appendChild(msgEl);
          return el;
        };

        let stickToTop = true;
        let userBrowsingLog = false;
        let browseReleaseTimer = 0;

        const render = () => {
          const log = qs("#log");
          if (!log) return;

          const prevTop = log.scrollTop || 0;
          const prevH = log.scrollHeight || 0;
          const atTop = prevTop <= 2;

          log.innerHTML = "";
          for (let i = events.length - 1; i >= 0; i--) {
            log.appendChild(_makeEl(events[i]));
          }

          if (stickToTop && atTop && !userBrowsingLog) {
            log.scrollTop = 0;
          } else if (userBrowsingLog) {
            stickToTop = false;
            requestAnimationFrame(() => {
              try {
                log.scrollTop = prevTop;
              } catch (_) {}
            });
          } else {
            stickToTop = false;
            const newH = log.scrollHeight || 0;
            const delta = newH - prevH;
            const nextTop = Math.max(0, prevTop + (delta > 0 ? delta : 0));
            requestAnimationFrame(() => {
              try {
                log.scrollTop = nextTop;
              } catch (_) {}
            });
          }
        };

        const addEvent = (ev) => {
          const e = (ev && typeof ev === "object") ? ev : { kind: "raw", text: String(ev ?? "") };
          if (e.ts == null) e.ts = Date.now();
          events.push(e);
          if (events.length > MAX) events.splice(0, events.length - MAX);
          render();
        };

        const addText = (txt, ts = null) => {
          addEvent({ kind: "raw", text: String(txt ?? ""), ts: ts != null ? ts : Date.now() });
        };

        const setEvents = (arr) => {
          const list = Array.isArray(arr) ? arr : [];
          events.length = 0;
          const sliced = list.length > MAX ? list.slice(-MAX) : list;
          for (const it of sliced) {
            if (it && typeof it === "object") {
              const e = Object.assign({}, it);
              if (e.ts == null) e.ts = Date.now();
              events.push(e);
            } else {
              events.push({ kind: "raw", text: String(it ?? ""), ts: Date.now() });
            }
          }
          render();
        };

        const retranslate = () => render();

        requestAnimationFrame(() => {
          const log = qs("#log");
          if (!log || log.__zScrollBound) return;
          log.__zScrollBound = true;
          const markBrowsing = () => {
            try {
              userBrowsingLog = true;
              stickToTop = false;
              if (browseReleaseTimer) clearTimeout(browseReleaseTimer);
              browseReleaseTimer = setTimeout(() => {
                try {
                  userBrowsingLog = (log.scrollTop || 0) > 2;
                  stickToTop = !userBrowsingLog;
                } catch (_) {}
              }, 420);
            } catch (_) {}
          };
          log.addEventListener("touchstart", markBrowsing, { passive: true });
          log.addEventListener("touchmove", markBrowsing, { passive: true });
          log.addEventListener("touchend", markBrowsing, { passive: true });
          log.addEventListener("pointerdown", markBrowsing, { passive: true });
          log.addEventListener("wheel", markBrowsing, { passive: true });
          log.addEventListener("scroll", markBrowsing, { passive: true });
        });

        return { addEvent, addText, setEvents, retranslate, _events: events };
      })();

      try { window.LogMgr = LogMgr; } catch (_) {}

      const logLine = (txt, ts = null) => {
        try {
          LogMgr.addText(txt, ts);
        } catch (_) {
          const log = qs("#log");
          const el = document.createElement("div");
          el.className = "log-item";
          const timeEl = document.createElement("span");
          timeEl.className = "time";
          timeEl.textContent = ts != null ? fmtHHMMSS(ts) : nowHHMMSS();
          const msgEl = document.createElement("span");
          msgEl.className = "msg";
          msgEl.textContent = String(txt ?? "");
          el.appendChild(timeEl);
          el.appendChild(document.createTextNode(" "));
          el.appendChild(msgEl);
          log.prepend(el);
          log.scrollTop = 0;
        }
      };
      const AppPref = {
        getLang() {
          const url = new URL(location.href);
          const q = url.searchParams.get("lang");
          return q || localStorage.getItem("zamat.lang") || "ar";
        },
        setLang(lang) {
          localStorage.setItem("zamat.lang", lang);
        },
        getTheme() {
          return localStorage.getItem("zamat.theme") || "light";
        },
        setTheme(th) {
          localStorage.setItem("zamat.theme", th);
        },
      };

      try {
        const sp = new URLSearchParams(location.search || "");
        const spectator = !!(sp.get("spectate") || sp.get("spectator") || sp.get("spec"));
        const pvp = sp.get("pvp");
        const online = spectator || !!(sp.get("room") || sp.get("rid") || sp.get("gid") || sp.get("game") || sp.get("id") || (pvp && pvp !== "0" && pvp !== "false"));
        const root = document.documentElement;
        root.classList.remove("z-spectator", "mode-pvp", "mode-pvc", "role-pending", "ui-ready");
        root.classList.toggle("z-spectator", spectator);
        root.classList.add(online ? "mode-pvp" : "mode-pvc");
        if (online) {
          root.classList.add("role-pending");
        } else {
          root.classList.remove("ui-hold");
          root.classList.add("ui-ready");
        }
        document.body.classList.toggle("z-spectator", spectator);
        document.body.classList.toggle("mode-pvp", !!online);
      } catch (_) {}

      function applyTheme(theme) {
        const root = document.documentElement;
        const normalized = theme === "dark" ? "dark" : "light";
        if (normalized === "dark") root.classList.add("dark");
        else root.classList.remove("dark");

        try { localStorage.setItem("zamat.theme", normalized); } catch (e) {}
        try {
          var raw = sessionStorage.getItem("zamat.session.settings.v2");
          var obj = raw ? JSON.parse(raw) : {};
          if (!obj || typeof obj !== "object") obj = {};
          obj.theme = normalized;
          sessionStorage.setItem("zamat.session.settings.v2", JSON.stringify(obj));
        } catch (e) {}

        try {
          Visual.draw();
        } catch (e) {}
      }

      function _sessionSettingsKey() {
        return "zamat.session.settings.v2";
      }
      function saveSessionSettings() {
        try {
          sessionStorage.setItem(
            _sessionSettingsKey(),
            JSON.stringify(Game.settings)
          );
        } catch {}
      }
      function loadSessionSettings() {
        try {
          const raw = sessionStorage.getItem(_sessionSettingsKey());
          if (!raw) return;
          const data = JSON.parse(raw);
          if (!data || typeof data !== "object") return;

          const allowed = ["starter","aiCaptureMode","aiRandomIgnoreCaptureRatePct","theme","showCoords","boardStyle"];
          const merged = {};
          for (const k of allowed) {
            merged[k] = (data && Object.prototype.hasOwnProperty.call(data, k)) ? data[k] : Game.settings[k];
          }
          merged.advanced = Object.assign(
            {},
            Game.settings.advanced || {},
            (data && data.advanced && typeof data.advanced === "object") ? data.advanced : {}
          );
          Game.settings = merged;

          try {
            Game.normalizeAdvancedSettings();
          } catch {}
        } catch {}
      }

      let currentGameLang = ((window.ZShell && typeof ZShell.getLang === "function") ? ZShell.getLang() : "ar");
      function initI18n() {
        const pref = AppPref.getLang();
        applyLanguage(pref);
      }

      function gameAsset(path) {
        const raw = String(path || "").trim().replace(/^(?:\.\.\/)+/g, "").replace(/^\/+/, "");
        return raw ? "../" + raw : "";
      }

      function readStoredSession() {
        try {
          const s = window.ZAuth && typeof ZAuth.readSession === "function" ? ZAuth.readSession() : null;
          if (s && typeof s === "object") return s;
        } catch (e) {}
        try {
          const raw = sessionStorage.getItem("zamat.session.user.v1") || localStorage.getItem("zamat.session.user.persist.v1");
          if (raw) {
            const obj = JSON.parse(raw);
            if (obj && typeof obj === "object") return obj;
          }
        } catch (e) {}
        return null;
      }

      function normalizeGameIcon(raw, fallback) {
        let s = String(raw || "").trim();
        s = s.replace(/^(?:\.\.\/)+/g, "").replace(/^\/+/, "");
        if (!s) s = String(fallback || "assets/icons/users/user1.png");
        if (/^assets\/icons\/usre1\.svg$/i.test(s)) s = "assets/icons/users/user1.png";

        let m = s.match(/^assets\/icons\/user(\d{1,2})\.(svg|png)$/i);
        if (m) s = `assets/icons/users/user${m[1]}.png`;
        if (/^assets\/icons\/user\.(svg|png)$/i.test(s)) s = "assets/icons/users/user1.png";

        m = s.match(/^assets\/icons\/users\/user(\d{1,2})\.(svg|png)$/i);
        if (m) s = `assets/icons/users/user${m[1]}.png`;
        if (/^assets\/icons\/users\/user\.(svg|png)$/i.test(s)) s = "assets/icons/users/user1.png";

        if (/^user(\d{1,2})$/i.test(s)) {
          const n = s.match(/^user(\d{1,2})$/i);
          s = `assets/icons/users/user${n[1]}.png`;
        }
        if (/^user(\d{1,2})\.(svg|png)$/i.test(s)) {
          const n = s.match(/^user(\d{1,2})\.(svg|png)$/i);
          s = `assets/icons/users/user${n[1]}.png`;
        }
        if (/^(autouser1|autouser2|autouser1)(\.(svg|png))?$/i.test(s)) {
          const n = s.match(/^(autouser1|autouser2|autouser1)/i);
          s = `assets/icons/users/${n[1]}.png`;
        }
        if (/^assets\/icons\/users\/(autouser1|autouser2|autouser1)\.(svg|png)$/i.test(s)) {
          const n = s.match(/^assets\/icons\/users\/(autouser1|autouser2|autouser1)\.(svg|png)$/i);
          s = `assets/icons/users/${n[1]}.png`;
        }
        if (!/^assets\/icons\/users\/(user\d{1,2}|autouser1|autouser2|autouser1)\.png$/i.test(s)) {
          s = String(fallback || "assets/icons/users/user1.png");
        }
        return gameAsset(s);
      }

      function gameDefaultGuestIcon(side) {
        return normalizeGameIcon(side === "top" ? "assets/icons/users/autouser1.png" : "assets/icons/users/autouser2.png");
      }

      function sessionNickname(session) {
        const fromSession = session && session.nickname ? String(session.nickname).trim() : "";
        if (fromSession) return fromSession;
        try {
          const n = String(sessionStorage.getItem("zamat.nick") || "").trim();
          if (n) return n;
        } catch (e) {}
        return "";
      }

      function sessionOwnIcon(session, side) {
        if (session && session.kind === "registered" && session.icon) {
          return normalizeGameIcon(session.icon, side === "top" ? "assets/icons/users/user1.png" : "assets/icons/users/user2.png");
        }
        return gameDefaultGuestIcon(side);
      }

      function computerPlayerLabel() {
        return window.I18N.text("players.computer", null, currentGameLang) || "Computer";
      }

      function decorateSelfName() {
        return window.I18N.text("players.you", null, currentGameLang) || "You";
      }

      function onlineSlotState(side, session) {
        try {
          const data = window.Online && window.Online._lastGameData ? window.Online._lastGameData : null;
          const players = data && data.players ? data.players : null;
          if (!players) return null;
          const colorKey = side === "top" ? "black" : "white";
          const entry = players[colorKey] || {};
          const uid = entry && entry.uid ? String(entry.uid) : "";
          const nick = entry && entry.nickname ? String(entry.nickname).trim() : "";
          const isSelf = !!(window.Online && !window.Online.isSpectator && uid && window.Online.myUid && String(window.Online.myUid) === uid);
          const pres = data && data.presence && uid ? data.presence[uid] : null;
          const fallbackIcon = isSelf ? sessionOwnIcon(session, side) : gameDefaultGuestIcon(side);
          const icon = normalizeGameIcon(pres && pres.icon ? pres.icon : entry && entry.icon ? entry.icon : fallbackIcon, fallbackIcon);
          return {
            name: isSelf ? decorateSelfName(nick) : nick || (window.I18N.text("players.player", null, currentGameLang) || "Player"),
            statusName: nick || (window.I18N.text("players.player", null, currentGameLang) || "Player"),
            avatar: icon,
            side: side,
            self: isSelf,
          };
        } catch (e) {
          return null;
        }
      }

      function resolveGameSlot(side) {
        const session = readStoredSession();
        const onlineState = onlineSlotState(side, session);
        if (onlineState) return onlineState;

        if (window.Online && window.Online.isSpectator) {
          const fallbackName = side === "top" ? (Game.names.top || window.I18N.text("players.player", null, currentGameLang) || "Player") : (Game.names.bot || window.I18N.text("players.player", null, currentGameLang) || "Player");
          return { name: fallbackName, statusName: fallbackName, avatar: gameDefaultGuestIcon(side), side: side, self: false };
        }

        if (document.documentElement.classList.contains("mode-pvp") || (window.Online && window.Online.isActive)) {
          const fallbackName = side === "top" ? (Game.names.top || window.I18N.text("players.player", null, currentGameLang) || "Player") : (Game.names.bot || window.I18N.text("players.player", null, currentGameLang) || "Player");
          return { name: fallbackName, statusName: fallbackName, avatar: gameDefaultGuestIcon(side), side: side, self: false };
        }

        if (side === "top") {
          const aiName = computerPlayerLabel();
          return { name: aiName, statusName: aiName, avatar: normalizeGameIcon("assets/icons/users/autouser1.png"), side: side, self: false };
        }

        const nick = sessionNickname(session);
        return { name: nick ? decorateSelfName(nick) : (window.I18N.text("players.you", null, currentGameLang) || "You"), statusName: nick || (window.I18N.text("players.you", null, currentGameLang) || "You"), avatar: sessionOwnIcon(session, side), side: side, self: true };
      }

      function applySlotDom(side, state) {
        const nameId = side === "top" ? "#pTopName" : "#pBotName";
        const nameMId = side === "top" ? "#pTopNameM" : "#pBotNameM";
        const avatarId = side === "top" ? "#pTopAvatar" : "#pBotAvatar";
        const avatarMId = side === "top" ? "#pTopAvatarM" : "#pBotAvatarM";
        const frameId = side === "top" ? "#pTopAvatarFrame" : "#pBotAvatarFrame";
        const frameMId = side === "top" ? "#pTopAvatarFrameM" : "#pBotAvatarFrameM";
        const pieceClass = side === "top" ? "is-black-piece" : "is-white-piece";
        const nameEl = qs(nameId);
        const nameMEl = qs(nameMId);
        const avatarEl = qs(avatarId);
        const avatarMEl = qs(avatarMId);
        const frameEl = qs(frameId);
        const frameMEl = qs(frameMId);
        if (nameEl) nameEl.textContent = state.name || "—";
        if (nameMEl) nameMEl.textContent = state.name || "—";
        if (avatarEl) avatarEl.src = state.avatar;
        if (avatarMEl) avatarMEl.src = state.avatar;
        [frameEl, frameMEl].forEach((el) => {
          if (!el) return;
          el.classList.remove("is-black-piece", "is-white-piece", "is-active-turn");
          el.classList.add(pieceClass);
        });
      }

      function syncActivePlayerFrames() {
        const active = Game.player === BOT ? "bot" : "top";
        ["top", "bot"].forEach((side) => {
          const desktop = qs(side === "top" ? "#pTopAvatarFrame" : "#pBotAvatarFrame");
          const mobile = qs(side === "top" ? "#pTopAvatarFrameM" : "#pBotAvatarFrameM");
          [desktop, mobile].forEach((el) => {
            if (!el) return;
            el.classList.toggle("is-active-turn", side === active);
          });
        });
      }

      function refreshGamePlayerBoxes() {
        try {
          const top = resolveGameSlot("top");
          const bot = resolveGameSlot("bot");
          applySlotDom("top", top);
          applySlotDom("bot", bot);
          if (window.Game && Game.names) {
            Game.names.top = top && top.statusName ? top.statusName : "";
            Game.names.bot = bot && bot.statusName ? bot.statusName : "";
          }
          syncActivePlayerFrames();
          try { if (window.Mobile && typeof window.Mobile.syncGameHeadNow === "function") window.Mobile.syncGameHeadNow(); } catch (e) {}
        } catch (e) {}
      }

      window.ZGamePlayers = { refresh: refreshGamePlayerBoxes, resolveSlot: resolveGameSlot };

      function applyLanguage(lang) {
        lang = lang || ((window.ZShell && typeof ZShell.getLang === "function") ? ZShell.getLang() : "ar");

        currentGameLang = lang || currentGameLang;

        try {
          if (window.I18N && typeof window.I18N.apply === "function") {
            window.I18N.apply(document, lang);
          }
        } catch (_) {}

        try {
          const schemaEl = qs("#schema-data");
          if (schemaEl) {
            const schemaObj = {
              "@context": "https://schema.org",
              "@type": window.I18N.text("schema_game_type", null, currentGameLang) || "Game",
              name: window.I18N.text("schema_game_name", null, currentGameLang) || "Zamat",
              genre: window.I18N.text("schema_game_genre", null, currentGameLang) || "Strategy Game",
              applicationCategory: "Game",
              operatingSystem: "Web",
              url: location.href,
              description: window.I18N.text("meta_description", null, currentGameLang) || "",
            };
            schemaEl.textContent = JSON.stringify(schemaObj, null, 2);
          }
        } catch {}

        try { window.UI?.updateAiLevelDisplay?.(); } catch (e) {}
        try { refreshGamePlayerBoxes(); } catch (e) {}
        UI.updateStatus();
        try { window.Online?.refreshPresenceUi?.(); } catch (e) {}
        try { window.Modal?.setDir?.(); } catch (e) {}
        try { window.Online?.refreshPvpControls?.(); } catch (e) {}
        AppPref.setLang(lang);
      }
      try { window.applyLanguage = applyLanguage; } catch (_) {}


      function sideLabel(side) {
        try {
          if (window.ZGamePlayers && typeof window.ZGamePlayers.resolveSlot === "function") {
            const slotSide = side === TOP ? "top" : side === BOT ? "bot" : "";
            const slot = slotSide ? window.ZGamePlayers.resolveSlot(slotSide) : null;
            const name = slot && slot.name ? String(slot.name || "").trim() : "";
            if (name) return name;
          }
        } catch (_) {}

        try {
          if (window.Online && window.Online.isActive && !window.Online.isSpectator) {
            if (side === window.Online.mySide) return window.I18N.text("players.you", null, currentGameLang);
            const opp = side === TOP ? Game.names.top : side === BOT ? Game.names.bot : "";
            if (opp) return opp;
          }
        } catch (_) {}

        const name = side === TOP ? Game.names.top : side === BOT ? Game.names.bot : "";
        if (name) return name;

        return side === BOT
          ? window.I18N.text("players.white", null, currentGameLang) || "الأبيض"
          : window.I18N.text("players.black", null, currentGameLang) || "الأسود";
      }
      function shouldShowKillTimerAlert(clickedIdx) {
        if (!Game.killTimer.running) return false;

        const isHumanTurn =
          window.Online && window.Online.isActive
            ? Game.player === window.Online.mySide
            : Game.player === humanSide();
        if (!isHumanTurn) return false;

        if (Game.inChain && clickedIdx === Game.chainPos) return false;

        if (Game.inChain && Game.chainPos !== null) {
          const v = valueAt(Game.chainPos);
          if (v) {
            const caps = generateCapturesFrom(Game.chainPos, v);
            const isLegalCaptureDest = caps.some(
              ([toIdx, _jumped]) => toIdx === clickedIdx
            );
            if (isLegalCaptureDest) return false;
          }
        }

        return true;
      }
