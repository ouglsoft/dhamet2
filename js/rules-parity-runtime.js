/*
 * Dhamet2 rules parity runtime.
 *
 * Keeps the Firebase transport but makes the browser-side rule transitions use
 * the same shared state, Soufla, promotion, snapshot, and terminal-resolution
 * modules as the primary application.
 */
(function (root) {
  'use strict';

  const Rules = root.DhametRules;
  const State = root.DhametState;
  const TurnResolution = root.DhametTurnResolution;
  const Soufla = root.DhametSoufla;

  if (!Rules || !State || !TurnResolution || !Soufla) {
    throw new Error('Dhamet2 rules parity runtime requires the primary shared rule modules');
  }
  if (typeof Game === 'undefined' || typeof Turn === 'undefined') {
    throw new Error('Dhamet2 rules parity runtime must load after game.js');
  }

  const TOP_SIDE = Rules.TOP;
  const BOT_SIDE = Rules.BOT;

  function copyEntry(entry) {
    return { idx: Number(entry.idx), side: Number(entry.side) };
  }

  function installOpeningCompatibilityAlias() {
    const legacy = Game.openingExchangeFourthChoice;
    if (!(Game.forcedOpeningExchangeChoice === 0 || Game.forcedOpeningExchangeChoice === 1)) {
      Game.forcedOpeningExchangeChoice = legacy === 0 || legacy === 1 ? legacy : null;
    }
    try {
      delete Game.openingExchangeFourthChoice;
      Object.defineProperty(Game, 'openingExchangeFourthChoice', {
        configurable: true,
        enumerable: false,
        get() {
          return this.forcedOpeningExchangeChoice;
        },
        set(value) {
          const n = Number(value);
          this.forcedOpeningExchangeChoice = n === 0 || n === 1 ? n : null;
        },
      });
    } catch (_) {
      Game.openingExchangeFourthChoice = Game.forcedOpeningExchangeChoice;
    }
  }

  installOpeningCompatibilityAlias();

  function forcedOpeningRuntimeSnapshotParity(ply) {
    const currentPly = ply == null ? Game.forcedPly : ply;
    const seq = Game.forcedSeq || forcedOpeningSeqForStarterSide(Game.player);
    const starter = forcedOpeningBaseSide(seq);
    const opening = { starter };
    if (Game.forcedOpeningExchangeChoice === 0 || Game.forcedOpeningExchangeChoice === 1) {
      opening.exchangeFourthChoice = Game.forcedOpeningExchangeChoice;
    }
    return {
      forcedEnabled: !!Game.forcedEnabled,
      forcedPly: Math.max(0, Number(currentPly) || 0),
      openingPly: Math.max(0, Number(currentPly) || 0),
      opening,
      openingStarter: starter,
      player: Math.max(0, Number(currentPly) || 0) % 2 === 0 ? starter : -starter,
    };
  }

  function getForcedOpeningInfosParity(ply) {
    const currentPly = ply == null ? Game.forcedPly : Number(ply);
    if (!Game.forcedEnabled || currentPly < 0 || currentPly >= 10) return [];
    const seq = Game.forcedSeq || forcedOpeningSeqForStarterSide(Game.player);
    const starter = forcedOpeningBaseSide(seq);
    let expected = [];
    try {
      expected = Rules.forcedOpeningExpectedOptions(forcedOpeningRuntimeSnapshotParity(currentPly));
    } catch (_) {
      expected = [];
    }
    if (!expected.length) {
      const step = seq && seq[currentPly];
      if (step) {
        const path = step.map(([r, c]) => rcToIdx(r, c));
        expected = [{ fullPath: path, exchangeChoice: null }];
      }
    }
    return expected.map((item, optionIndex) => {
      const path = Array.isArray(item.fullPath) ? item.fullPath.slice() : [item.from].concat(item.path || []);
      return {
        seq,
        step: path.map((idx) => idxToRC(idx)),
        path,
        from: path[0],
        toFirst: path[1],
        toFinal: path[path.length - 1],
        isChain: path.length > 2,
        base: starter,
        mover: currentPly % 2 === 0 ? starter : -starter,
        ply: currentPly,
        optionIndex,
        exchangeChoice: item.exchangeChoice === 0 || item.exchangeChoice === 1 ? item.exchangeChoice : null,
      };
    }).filter((info) => info.path.length >= 2);
  }

  _forcedOpeningSnapshot = forcedOpeningRuntimeSnapshotParity;
  getForcedOpeningOptions = getForcedOpeningInfosParity;
  getForcedOpeningInfo = function getForcedOpeningInfoParity(ply, preferredFrom) {
    const infos = getForcedOpeningInfosParity(ply == null ? Game.forcedPly : ply);
    if (!infos.length) return null;
    if (preferredFrom != null) {
      const selected = infos.find((info) => Number(info.from) === Number(preferredFrom));
      if (selected) return selected;
    }
    if (Game.inChain && Turn && Turn.ctx && Turn.ctx.startedFrom != null) {
      const selected = infos.find((info) => Number(info.from) === Number(Turn.ctx.startedFrom));
      if (selected) return selected;
    }
    return infos[0];
  };
  getForcedOpeningExpectedActions = function getForcedOpeningExpectedActionsParity(preferredFrom) {
    const infos = getForcedOpeningInfosParity(Game.forcedPly);
    if (!infos.length) return [];
    const selectedFrom = preferredFrom != null
      ? preferredFrom
      : (typeof Input !== 'undefined' && Input && Input.selected != null ? Input.selected : null);
    if (Game.inChain) {
      const info = getForcedOpeningInfo(Game.forcedPly, selectedFrom);
      if (!info) return [];
      const pos = info.path.indexOf(Game.chainPos);
      if (pos >= 0 && pos < info.path.length - 1) {
        return [{ info, from: info.path[pos], to: info.path[pos + 1], endChain: false }];
      }
      if (pos === info.path.length - 1) return [{ info, from: null, to: null, endChain: true }];
      return [];
    }
    const filtered = selectedFrom == null
      ? infos
      : infos.filter((info) => Number(info.from) === Number(selectedFrom));
    return filtered.map((info) => ({ info, from: info.from, to: info.toFirst, endChain: false }));
  };
  getForcedOpeningExpectedAction = function getForcedOpeningExpectedActionParity(preferredFrom) {
    const actions = getForcedOpeningExpectedActions(preferredFrom);
    return actions.length ? actions[0] : null;
  };
  completeForcedOpeningPly = function completeForcedOpeningPlyParity() {
    Game.forcedPly += 1;
    if (Game.forcedPly === 10) handleForcedOpeningOver();
  };
  finishForcedOpeningAppliedTurn = function finishForcedOpeningAppliedTurnParity(mover, info) {
    Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);
    logForcedOpeningTurn(mover, info);
    if (info && info.ply === 3 && (info.exchangeChoice === 0 || info.exchangeChoice === 1)) {
      Game.forcedOpeningExchangeChoice = info.exchangeChoice;
    }
    completeForcedOpeningPly();
    switchPlayer();
    Turn.start();
    scheduleForcedOpeningAutoIfNeeded();
    Visual.draw();
  };

  if (!Array.isArray(Game.deferredPromotions)) {
    Game.deferredPromotions = State.normalizeDeferredPromotions({
      deferredPromotion: Game.deferredPromotion || null,
    });
  }

  const primarySetupInitialBoard = setupInitialBoard;
  setupInitialBoard = function setupInitialBoardParity() {
    primarySetupInitialBoard();
    Game.deferredPromotions = [];
    Game.deferredPromotion = null;
    Game.forcedOpeningExchangeChoice = null;
    Game.awaitingPenalty = false;
    Game.souflaPending = null;
    Game.availableSouflaForHuman = null;
    Turn.ctx = null;
  };

  function normalizeDeferredPromotionQueue() {
    const queue = State.sanitizeDeferredPromotions(Game.board, {
      deferredPromotions: Array.isArray(Game.deferredPromotions) ? Game.deferredPromotions : undefined,
      deferredPromotion: Game.deferredPromotion || null,
    });
    Game.deferredPromotions = queue.map(copyEntry);
    Game.deferredPromotion = queue.length ? copyEntry(queue[0]) : null;
    return Game.deferredPromotions;
  }

  maybeQueueDeferredPromotion = function maybeQueueDeferredPromotionParity(idx) {
    const cellValue = valueAt(idx);
    if (!cellValue || Rules.kind(cellValue) !== Rules.MAN) return;
    const ownerSide = Rules.owner(cellValue);
    if (!Rules.isBackRank(Number(idx), ownerSide)) return;
    const queue = normalizeDeferredPromotionQueue();
    if (!queue.some((entry) => entry.idx === Number(idx) && entry.side === ownerSide)) {
      queue.push({ idx: Number(idx), side: ownerSide });
    }
    Game.deferredPromotions = queue.map(copyEntry);
    Game.deferredPromotion = queue.length ? copyEntry(queue[0]) : null;
  };

  function hasUnresolvedSoufla() {
    // A visible but unopened right does not freeze the turn; an actively
    // resolving or authoritative pending penalty does.
    return !!(!Game._souflaApplying && (Game.awaitingPenalty || Game.souflaPending));
  }

  function expireUnclaimedSouflaOnMoveStart() {
    const pending = Game.availableSouflaForHuman;
    if (!pending || Game._souflaApplying) return false;
    if (Number(pending.penalizer) !== Number(Game.player)) return false;
    Game.availableSouflaForHuman = null;
    if (Game.souflaPending === pending) Game.souflaPending = null;
    Game.awaitingPenalty = false;
    return true;
  };

  pushHistoryBeforeMove = function pushHistoryBeforeMoveParity() {
    if ((Game._simDepth || 0) > 0) return false;
    if (Game.forcedEnabled && Number(Game.forcedPly || 0) < 10) return false;
    const ctx = Turn && Turn.ctx ? Turn.ctx : null;
    if (ctx && ctx.historyPushed) return false;
    const snap = ctx && ctx.snapshot
      ? JSON.parse(JSON.stringify(ctx.snapshot))
      : snapshotState({ includeTurnCtx: false });
    Game.history.push(snap);
    if (ctx) ctx.historyPushed = true;
    return true;
  };

  applyMove = function applyMoveParity(fromIdx, toIdx, isCapture, jumpedIdx) {
    const expiredSoufla = expireUnclaimedSouflaOnMoveStart();
    if (expiredSoufla && (!Turn.ctx || !Turn.ctx.snapshot)) Turn.start();

    const applied = Rules.applySegment(Game.board, Number(fromIdx), Number(toIdx));
    if (!applied || !applied.ok) {
      throw new Error(applied && applied.reason ? applied.reason : 'move/illegal-segment');
    }
    const actualCapture = applied.type === Rules.MOVE_CAPTURE;
    if (!!isCapture !== actualCapture) throw new Error('move/type-mismatch');
    if (actualCapture && Number(applied.jumped) !== Number(jumpedIdx)) {
      throw new Error('move/captured-piece-mismatch');
    }
    if (!actualCapture && jumpedIdx != null) throw new Error('move/unexpected-captured-piece');

    pushHistoryBeforeMove();
    Game.board = applied.board;
    if (actualCapture) Visual.capturedOrderPush(applied.jumped);
    Game.lastMovedFrom = Number(fromIdx);
    Game.lastMovedTo = Number(toIdx);

    if (actualCapture && Turn && Turn.ctx && Turn.ctx.startedFrom != null) {
      Game.lastMoveFrom = Turn.ctx.startedFrom;
      if (!Array.isArray(Game.lastMovePath) || Turn.ctx.capturesDone === 0) Game.lastMovePath = [];
      Game.lastMovePath.push(Number(toIdx));
    } else {
      Game.lastMoveFrom = Number(fromIdx);
      Game.lastMovePath = [Number(toIdx)];
    }

    Game.lastMoveSide = Game.player;
    Game.lastMoveWasCapture = actualCapture;

    try {
      if (root.Online && root.Online.isActive && !root.Online._isApplyingRemote) {
        root.Online.recordLocalStep(
          Number(fromIdx),
          Number(toIdx),
          actualCapture,
          actualCapture ? Number(applied.jumped) : null,
        );
      }
    } catch (_) {}

    try { SessionGame.saveSoon(); } catch (_) {}
  };

  function serializeSouflaPending(pending) {
    if (!pending || typeof pending !== 'object') return null;
    const out = {};
    Object.keys(pending).forEach((key) => {
      const value = pending[key];
      if (value instanceof Map) out[key] = { __map: Array.from(value.entries()) };
      else if (typeof value !== 'function') {
        try { out[key] = JSON.parse(JSON.stringify(value)); } catch (_) {}
      }
    });
    return out;
  };

  function restoreSouflaPending(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    Object.keys(raw).forEach((key) => {
      const value = raw[key];
      out[key] = value && typeof value === 'object' && Array.isArray(value.__map)
        ? new Map(value.__map)
        : value;
    });
    return out;
  };

  function resetTransientGameState(options) {
    const opts = options && typeof options === 'object' ? options : {};
    Game.awaitingPenalty = false;
    Game._souflaApplying = false;
    Game.souflaPending = null;
    Game.availableSouflaForHuman = null;
    if (!opts.keepCapture) {
      Game.inChain = false;
      Game.chainPos = null;
    }
    if (!opts.keepTurnCtx) Turn.ctx = null;
  };
  root.resetTransientGameState = resetTransientGameState;

  function openingStarterFromSnapshot(snapshot) {
    const snap = snapshot && typeof snapshot === 'object' ? snapshot : {};
    if (typeof Rules.openingStarterSide === 'function') {
      try { return Rules.openingStarterSide(snap); } catch (_) {}
    }
    const explicit = Number(
      snap.opening && snap.opening.starter != null
        ? snap.opening.starter
        : snap.openingStarter != null
          ? snap.openingStarter
          : snap.starter,
    );
    if (explicit === TOP_SIDE || explicit === BOT_SIDE) return explicit;
    const ply = Math.max(0, Number(snap.forcedPly != null ? snap.forcedPly : snap.openingPly) || 0);
    const mover = Number(snap.player);
    if (mover === TOP_SIDE || mover === BOT_SIDE) return ply % 2 === 0 ? mover : -mover;
    return forcedOpeningBaseSide(Game.forcedSeq);
  }

  snapshotState = function snapshotStateParity(options) {
    const opts = options && typeof options === 'object' ? options : {};
    const queue = normalizeDeferredPromotionQueue().map(copyEntry);
    const starter = forcedOpeningBaseSide(Game.forcedSeq);
    const opening = { starter };
    if (Game.forcedOpeningExchangeChoice === 0 || Game.forcedOpeningExchangeChoice === 1) {
      opening.exchangeFourthChoice = Game.forcedOpeningExchangeChoice;
    }

    const out = {
      board: Rules.cloneBoard(Game.board),
      player: Game.player,
      inChain: !!Game.inChain,
      chainPos: Game.chainPos != null ? Number(Game.chainPos) : null,
      lastMovedTo: Game.lastMovedTo != null ? Number(Game.lastMovedTo) : null,
      lastMovedFrom: Game.lastMovedFrom != null ? Number(Game.lastMovedFrom) : null,
      lastMoveFrom: Game.lastMoveFrom != null ? Number(Game.lastMoveFrom) : null,
      lastMovePath: Array.isArray(Game.lastMovePath) ? Game.lastMovePath.map(Number) : null,
      moveCount: Number(Game.moveCount || 0) || 0,
      deferredPromotions: queue,
      deferredPromotion: queue.length ? copyEntry(queue[0]) : null,
      forcedEnabled: !!Game.forcedEnabled,
      forcedPly: Math.max(0, Number(Game.forcedPly || 0) || 0),
      openingPly: Math.max(0, Number(Game.forcedPly || 0) || 0),
      opening,
      openingStarter: starter,
      openingExchangeFourthChoice: Game.forcedOpeningExchangeChoice,
      forcedOpeningExchangeChoice: Game.forcedOpeningExchangeChoice,
      awaitingPenalty: !!Game.awaitingPenalty,
      souflaPending: serializeSouflaPending(Game.souflaPending),
      availableSouflaForHuman: serializeSouflaPending(Game.availableSouflaForHuman),
    };

    if (opts.includeTurnCtx !== false && Turn.ctx) {
      const ctx = Turn.ctx;
      out.turnCtx = {
        Lmax: Number(ctx.Lmax || 0) || 0,
        candidates: Array.isArray(ctx.candidates) ? ctx.candidates.slice() : [],
        startedFrom: ctx.startedFrom != null ? Number(ctx.startedFrom) : null,
        capturesDone: Number(ctx.capturesDone || 0) || 0,
        historyPushed: !!ctx.historyPushed,
        snapshot: ctx.snapshot ? JSON.parse(JSON.stringify(ctx.snapshot)) : null,
        longestByPiece: ctx.longestByPiece && typeof ctx.longestByPiece.entries === 'function'
          ? Array.from(ctx.longestByPiece.entries())
          : [],
      };
    }
    return out;
  };

  restoreSnapshot = function restoreSnapshotParity(snap, opts) {
    let redraw = true;
    let visual = true;
    if (typeof opts === 'boolean') redraw = opts;
    else if (opts && typeof opts === 'object') {
      if (opts.redraw === false) redraw = false;
      if (opts.visual === false) visual = false;
    }

    const normalized = State.normalizeSnapshot(snap, { defaultPlayer: Game.player });
    if (!normalized) throw new Error('state/invalid-snapshot');

    Game.board = Rules.cloneBoard(normalized.board);
    Game.player = normalized.player;
    Game.inChain = !!normalized.inChain;
    Game.chainPos = normalized.chainPos != null ? Number(normalized.chainPos) : null;
    Game.lastMovedTo = snap.lastMovedTo != null ? Number(snap.lastMovedTo) : null;
    Game.lastMovedFrom = snap.lastMovedFrom != null ? Number(snap.lastMovedFrom) : null;
    Game.lastMoveFrom = snap.lastMoveFrom != null ? Number(snap.lastMoveFrom) : Game.lastMovedFrom;
    Game.lastMovePath = Array.isArray(snap.lastMovePath)
      ? snap.lastMovePath.map(Number)
      : Game.lastMovedTo != null ? [Game.lastMovedTo] : null;
    Game.moveCount = Number(snap.moveCount || 0) || 0;

    Game.deferredPromotions = State.normalizeDeferredPromotions(snap).map(copyEntry);
    Game.deferredPromotion = Game.deferredPromotions.length ? copyEntry(Game.deferredPromotions[0]) : null;
    normalizeDeferredPromotionQueue();

    if (typeof snap.forcedEnabled === 'boolean') Game.forcedEnabled = snap.forcedEnabled;
    Game.forcedPly = Math.max(0, Number(snap.forcedPly != null ? snap.forcedPly : snap.openingPly) || 0);
    Game.forcedSeq = forcedOpeningSeqForStarterSide(openingStarterFromSnapshot(snap));
    const choice = Number(
      snap.opening && snap.opening.exchangeFourthChoice != null
        ? snap.opening.exchangeFourthChoice
        : snap.forcedOpeningExchangeChoice != null
          ? snap.forcedOpeningExchangeChoice
          : snap.openingExchangeFourthChoice,
    );
    Game.forcedOpeningExchangeChoice = choice === 0 || choice === 1 ? choice : null;

    Game.awaitingPenalty = !!snap.awaitingPenalty;
    Game._souflaApplying = false;
    Game.souflaPending = restoreSouflaPending(snap.souflaPending);
    Game.availableSouflaForHuman = restoreSouflaPending(snap.availableSouflaForHuman);

    if (snap.turnCtx) {
      const tc = snap.turnCtx;
      Turn.ctx = {
        longestByPiece: new Map(Array.isArray(tc.longestByPiece) ? tc.longestByPiece : []),
        Lmax: Number(tc.Lmax || 0) || 0,
        candidates: Array.isArray(tc.candidates) ? tc.candidates.slice() : [],
        startedFrom: tc.startedFrom != null ? Number(tc.startedFrom) : null,
        capturesDone: Number(tc.capturesDone || 0) || 0,
        historyPushed: !!tc.historyPushed,
        snapshot: tc.snapshot ? JSON.parse(JSON.stringify(tc.snapshot)) : snapshotState({ includeTurnCtx: false }),
      };
    } else {
      Turn.ctx = null;
    }

    if (visual) {
      try {
        if (Game.lastMoveFrom != null && Array.isArray(Game.lastMovePath) && Game.lastMovePath.length) {
          Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);
        } else {
          Visual.setLastMove(null, null);
        }
      } catch (_) {}
      try { Visual.clearCapturedOrder(); } catch (_) {}
    }
    if (redraw) UI.updateAll();
  };

  restoreSnapshotSilent = function restoreSnapshotSilentParity(snap) {
    restoreSnapshot(snap, { redraw: false, visual: false });
  };

  Turn.start = function startTurnParity() {
    const queue = normalizeDeferredPromotionQueue();
    const activated = State.activateDeferredPromotions(Game.board, queue, Game.player);
    if (!activated || !activated.ok) {
      throw new Error(activated && activated.error ? activated.error : 'game/promotion-failed');
    }
    Game.board = activated.board;
    Game.deferredPromotions = activated.deferredPromotions.map(copyEntry);
    Game.deferredPromotion = activated.deferredPromotion ? copyEntry(activated.deferredPromotion) : null;
    for (const promoted of activated.promoted) {
      try { Visual.queueCrown(promoted.idx); } catch (_) {}
      try {
        UI.log({
          kind: 'promote',
          idx: promoted.idx,
          side: promoted.side,
          actor: typeof resolveTurnActorLabel === 'function' ? resolveTurnActorLabel(promoted.side) : '',
          ts: Date.now(),
        });
      } catch (_) {}
    }

    if (hasUnresolvedSoufla()) {
      this.ctx = null;
      Game.killTimer.hardStop();
      UI.updateStatus();
      return;
    }

    if (!Game.gameOver) checkEndConditions();
    if (Game.gameOver) {
      UI.updateStatus();
      return;
    }

    const info = computeLongestForPlayer(Game.player);
    this.ctx = {
      longestByPiece: info.longestByPiece,
      Lmax: info.Lmax,
      candidates: info.candidates,
      startedFrom: null,
      capturesDone: 0,
      historyPushed: false,
      snapshot: snapshotState({ includeTurnCtx: false }),
    };
    try { Visual.markTurnBoundary && Visual.markTurnBoundary(); } catch (_) {}
    Game.killTimer.hardStop();
    UI.updateStatus();

    if (isForcedOpeningActive() && Game.player === humanSide()) {
      try { Visual.clearForcedOpeningArrow && Visual.clearForcedOpeningArrow(true); } catch (_) {}
    }
  };

  Turn.beginCapture = function beginCaptureParity(fromIdx) {
    if (!this.ctx) {
      expireUnclaimedSouflaOnMoveStart();
      this.start();
    }
    if (!this.ctx) throw new Error('game/turn-context-unavailable');
    if (this.ctx.startedFrom == null) this.ctx.startedFrom = Number(fromIdx);
    if (!Game.killTimer.running && Game.player === humanSide()) Game.killTimer.start();
  };

  Turn.recordCapture = function recordCaptureParity() {
    if (!this.ctx) this.start();
    if (!this.ctx) throw new Error('game/turn-context-unavailable');
    this.ctx.capturesDone += 1;
  };

  switchPlayer = function switchPlayerParity() {
    try { Visual.clearPrevMove && Visual.clearPrevMove(); } catch (_) {}
    Game.player = -Game.player;
    Game.moveCount += 1;
    try { Visual.markTurnBoundary && Visual.markTurnBoundary(); } catch (_) {}
    Game.killTimer.hardStop();
    // Terminal evaluation belongs to Turn.start(), after the arriving side's
    // deferred promotions have become active.
    UI.updateStatus();
  };

  checkEndConditions = function checkEndConditionsParity() {
    const counts = Rules.countPieces(Game.board);
    try {
      UI.updateCounts && UI.updateCounts({
        top: counts.top,
        bot: counts.bot,
        tKings: counts.topKings,
        bKings: counts.botKings,
      });
    } catch (_) {}

    const outcome = TurnResolution.outcomeAfterResolution(
      Game.board,
      Game.player,
      hasUnresolvedSoufla(),
    );
    if (!outcome || outcome.status === Rules.RESULT_ONGOING) return;

    Game.gameOver = true;
    Game.winner = outcome.status === Rules.RESULT_DRAW ? null : Number(outcome.winner);
    Game.terminationReason = outcome.reason || (Game.winner == null ? 'draw' : 'natural_win');
    try {
      UI.log({
        kind: 'game_result',
        winner: Game.winner,
        actor: Game.winner == null || typeof resolveTurnActorLabel !== 'function'
          ? ''
          : resolveTurnActorLabel(Game.winner),
        ts: Date.now(),
      });
    } catch (_) {}
    try { SessionGame.clear(); } catch (_) {}
    try { UI.showGameOverModal && UI.showGameOverModal(Game.winner); } catch (_) {}
  };

  applySouflaDecision = function applySouflaDecisionParity(requestedDecision, pending) {
    const decision = Soufla.matchingOption(pending, requestedDecision);
    if (!decision || !pending) return false;

    const prepared = TurnResolution.resolveSouflaPenalty({
      currentBoard: Game.board,
      currentDeferredPromotions: normalizeDeferredPromotionQueue(),
      pending,
      option: decision,
      penalizer: pending.penalizer,
    });
    if (!prepared || !prepared.ok) return false;

    const stateBefore = snapshotState();
    const fx = Soufla.buildFx(pending, decision) || {};
    let previousOnlineApplying = null;
    let hadOnline = false;

    try { Visual.clearSouflaFX(true); } catch (_) {}
    Game._souflaApplying = true;
    try { Visual.setSuspended(true); } catch (_) {}

    try {
      if (root.Online && root.Online.isActive) {
        hadOnline = true;
        previousOnlineApplying = root.Online._isApplyingRemote;
        root.Online._isApplyingRemote = true;
        root.Online.clearPendingLocalMove && root.Online.clearPendingLocalMove();
      }
    } catch (_) {}

    try {
      Game.lastMoveFrom = null;
      Game.lastMovePath = null;
      Game.lastMovedFrom = null;
      Game.lastMovedTo = null;
      try { Visual.setLastMovePath(null, null); } catch (_) {}
      try { Visual.setLastMove(null, null); } catch (_) {}

      if (decision.kind === 'remove') {
        Game.board = prepared.preActivationBoard;
        Game.deferredPromotions = prepared.preActivationPromotions.map(copyEntry);
        Game.deferredPromotion = Game.deferredPromotions.length ? copyEntry(Game.deferredPromotions[0]) : null;
        try {
          UI.log({
            kind: 'soufla_remove',
            actor: typeof resolveTurnActorLabel === 'function' ? resolveTurnActorLabel(pending.penalizer) : '',
            side: pending.penalizer,
            idx: decision.offenderIdx,
            ts: Date.now(),
          });
        } catch (_) {}
        armSouflaFXPersistence(-pending.penalizer);
        if (Game.player !== pending.penalizer) switchPlayer();
      } else {
        restoreSnapshotSilent(pending.turnStartSnapshot);
        Turn.start();
        Turn.beginCapture(decision.offenderIdx);
        let current = Number(decision.offenderIdx);
        for (let i = 0; i < decision.path.length; i += 1) {
          const to = Number(decision.path[i]);
          const result = Rules.classifyCapture(Game.board, current, to);
          const expectedJump = Array.isArray(decision.jumps) ? decision.jumps[i] : null;
          if (!result || !result.ok || (expectedJump != null && Number(result.jumped) !== Number(expectedJump))) {
            throw new Error(`soufla/force-segment-mismatch:${i}`);
          }
          applyMove(current, to, true, result.jumped);
          Turn.recordCapture();
          current = to;
        }
        if (!Rules.boardsEqual(Game.board, prepared.preActivationBoard)) {
          throw new Error('soufla/force-board-mismatch');
        }
        maybeQueueDeferredPromotion(current);
        const replayQueue = normalizeDeferredPromotionQueue();
        const expectedQueue = prepared.preActivationPromotions;
        const sameQueue = replayQueue.length === expectedQueue.length && replayQueue.every((entry, index) =>
          Number(entry.idx) === Number(expectedQueue[index].idx) &&
          Number(entry.side) === Number(expectedQueue[index].side),
        );
        if (!sameQueue) throw new Error('soufla/force-promotion-queue-mismatch');
        Game.inChain = false;
        Game.chainPos = null;
        try { if (typeof syncEndKillAvailability === 'function') syncEndKillAvailability(false); } catch (_) {}
        try {
          UI.log({
            kind: 'soufla_force',
            actor: typeof resolveTurnActorLabel === 'function' ? resolveTurnActorLabel(pending.penalizer) : '',
            side: pending.penalizer,
            from: decision.offenderIdx,
            to: decision.path.length ? decision.path[decision.path.length - 1] : decision.offenderIdx,
            captures: Array.isArray(decision.jumps) ? decision.jumps.length : decision.path.length,
            ts: Date.now(),
          });
        } catch (_) {}
        armSouflaFXPersistence(-pending.penalizer);
        switchPlayer();
      }
    } catch (error) {
      try { restoreSnapshotSilent(stateBefore); } catch (_) {}
      Game._souflaApplying = false;
      try { Visual.setSuspended(false); } catch (_) {}
      try { UI.updateAll(); } catch (_) {}
      try { console.error('Soufla application failed atomically', error); } catch (_) {}
      return false;
    } finally {
      try {
        if (hadOnline && root.Online) root.Online._isApplyingRemote = previousOnlineApplying === true;
      } catch (_) {}
    }

    Game.awaitingPenalty = false;
    Game.souflaPending = null;
    Game.availableSouflaForHuman = null;

    try {
      Turn.start();
      if (!Rules.boardsEqual(Game.board, prepared.board)) {
        throw new Error('soufla/resolved-board-mismatch');
      }
      scheduleForcedOpeningAutoIfNeeded();
    } catch (error) {
      try { restoreSnapshotSilent(stateBefore); } catch (_) {}
      Game._souflaApplying = false;
      try { Visual.setSuspended(false); } catch (_) {}
      try { UI.updateAll(); } catch (_) {}
      try { console.error('Soufla finalization failed atomically', error); } catch (_) {}
      return false;
    }

    try {
      Visual.applySouflaFXBatch({
        redPaths: Array.isArray(fx.redPaths) ? fx.redPaths : [],
        removeIdx: fx.removeIdx,
        forcePath: fx.forcePath,
        undoArrow: fx.undoArrow,
      }, { noDraw: true });
    } catch (_) {}
    try { Visual.setSuspended(false); } catch (_) {}
    Game._souflaApplying = false;
    try { UI.updateAll(); } catch (_) {}

    if (root.Online && root.Online.isActive && !root.Online._isApplyingRemote) {
      try { root.Online.clearPendingLocalMove && root.Online.clearPendingLocalMove(); } catch (_) {}
      try { root.Online.sendSouflaDecisionToFirebase(decision, pending, Game.player); } catch (_) {}
    }
    return true;
  };

  root.DhametRulesParity = Object.freeze({
    version: 'rules-parity-runtime-v1',
    source: 'primary-shared-rules',
    modules: Object.freeze({
      rules: Rules.version || 'shared-rules',
      state: State.version || 'shared-state',
      turnResolution: 'shared-turn-resolution',
      soufla: Soufla.version || 'shared-soufla',
    }),
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
