const BoardGeometryModule = globalThis.DhametBoardGeometry;
const BoardViewModule = globalThis.DhametBoardView;
const SouflaViewModule = globalThis.DhametSouflaView;
const ThemeModule = globalThis.DhametTheme;
if (!BoardGeometryModule || !BoardViewModule) throw new Error("Primary board modules must load before ui.js");
function themeColor(name) {
  return ThemeModule && typeof ThemeModule.get === "function" ? ThemeModule.get(name) : "";
}
function themeChannels(name, alpha) {
  return ThemeModule && typeof ThemeModule.channels === "function" ? ThemeModule.channels(name, alpha) : "";
}
const Visual = (() => {
  const S = {
    lastMove: null,
    prevMove: null,
    undoMove: null,
    capturedOrder: [],
    pendingTurnClear: false,
    souflaRemove: null,
    souflaForcePath: [],
    souflaMarks: [],
    souflaForcePathsAll: [],
    ignoredKills: [],
    forcedOpeningArrow: null,
    forcedOpeningArrows: [],
    highlightCells: [],
    crownQueue: [],
    showCoords: false,
  };

  const SouflaFX = {
    active: false,
    redPaths: [],
    undoArrow: null,
  };

  function clearAllFxExceptUndo() {
    S.lastMove = null;
    S.prevMove = null;
    S.undoMove = null;
    S.capturedOrder = [];
    S.pendingTurnClear = false;
    S.forcedOpeningArrow = null;
    S.forcedOpeningArrows = [];
    S.highlightCells = [];
    S.souflaRemove = null;
    S.souflaForcePath = [];
    S.souflaMarks = [];
    S.souflaForcePathsAll = [];
    S.ignoredKills = [];
    SouflaFX.active = false;
    SouflaFX.redPaths = [];
    SouflaFX.undoArrow = null;
    try {
      if (Array.isArray(S.crownQueue)) S.crownQueue.length = 0;
    } catch {}
  }

  function _cloneSouflaState() {
    const redPaths = Array.isArray(SouflaFX.redPaths)
      ? SouflaFX.redPaths.map((seg) => ({
          from: seg.from,
          path: Array.isArray(seg.path) ? seg.path.slice() : [],
          jumps: Array.isArray(seg.jumps) ? seg.jumps.slice() : null,
        }))
      : [];
    const undoArrow =
      SouflaFX.undoArrow && Array.isArray(SouflaFX.undoArrow.nodes)
        ? { nodes: SouflaFX.undoArrow.nodes.slice() }
        : SouflaFX.undoArrow
          ? { ...SouflaFX.undoArrow }
          : null;

    return {
      souflaRemove: S.souflaRemove,
      souflaForcePath: Array.isArray(S.souflaForcePath) ? S.souflaForcePath.slice() : [],
      souflaMarks: Array.isArray(S.souflaMarks) ? S.souflaMarks.slice() : [],
      souflaForcePathsAll: Array.isArray(S.souflaForcePathsAll)
        ? S.souflaForcePathsAll.map((p) => (Array.isArray(p) ? p.slice() : []))
        : [],
      ignoredKills: Array.isArray(S.ignoredKills) ? S.ignoredKills.slice() : [],
      showCoords: !!S.showCoords,
      activeStyle: S._activeStyle || null,
      souflaActive: !!SouflaFX.active,
      redPaths,
      undoArrow,
    };
  }

  function _restoreSouflaState(st) {
    if (!st) return;
    S.souflaRemove = st.souflaRemove != null ? st.souflaRemove : null;
    S.souflaForcePath = Array.isArray(st.souflaForcePath) ? st.souflaForcePath.slice() : [];
    S.souflaMarks = Array.isArray(st.souflaMarks) ? st.souflaMarks.slice() : [];
    S.souflaForcePathsAll = Array.isArray(st.souflaForcePathsAll)
      ? st.souflaForcePathsAll.map((p) => (Array.isArray(p) ? p.slice() : []))
      : [];
    S.ignoredKills = Array.isArray(st.ignoredKills) ? st.ignoredKills.slice() : [];
    S.showCoords = !!st.showCoords;
    S._activeStyle = st.activeStyle || null;
    SouflaFX.active = !!st.souflaActive;
    SouflaFX.redPaths = Array.isArray(st.redPaths)
      ? st.redPaths.map((seg) => ({
          ...seg,
          path: Array.isArray(seg.path) ? seg.path.slice() : [],
          jumps: Array.isArray(seg.jumps) ? seg.jumps.slice() : null,
        }))
      : [];
    SouflaFX.undoArrow = st.undoArrow
      ? st.undoArrow.nodes
        ? { nodes: st.undoArrow.nodes.slice() }
        : { ...st.undoArrow }
      : null;
  }

  function _clearTurnFx(preserveSoufla) {
    const keep = preserveSoufla ? _cloneSouflaState() : null;

    S.lastMove = null;
    S.prevMove = null;
    S.undoMove = null;
    S.capturedOrder = [];
    S.pendingTurnClear = false;
    S.forcedOpeningArrow = null;
    S.forcedOpeningArrows = [];
    S.highlightCells = [];

    if (!preserveSoufla) {
      S.souflaRemove = null;
      S.souflaForcePath = [];
      S.souflaMarks = [];
      S.souflaForcePathsAll = [];
      S.ignoredKills = [];
      SouflaFX.active = false;
      SouflaFX.redPaths = [];
      SouflaFX.undoArrow = null;
      if (S._activeStyle && S._activeStyle.kind === "souflaPreview") S._activeStyle = null;
    }

    try {
      if (Array.isArray(S.crownQueue)) S.crownQueue.length = 0;
    } catch {}

    if (keep) _restoreSouflaState(keep);
  }

  function clearTurnFx(preserveSoufla, noDraw) {
    _clearTurnFx(!!preserveSoufla);
    if (!noDraw) draw();
  }

  function clearSouflaFX(noDraw) {
    SouflaFX.active = false;
    SouflaFX.redPaths = [];
    SouflaFX.undoArrow = null;
    S.souflaForcePath = [];
    S.souflaRemove = null;
    S.souflaMarks = [];
    S.souflaForcePathsAll = [];
    S.showCoords = false;
    if (S._activeStyle && S._activeStyle.kind === "souflaPreview") S._activeStyle = null;
    if (!noDraw) draw();
  }

  function renderSouflaPreview(canvas, payload) {
    if (!canvas) return;
    payload = payload || {};

    const savedSuspendDraw = !!S._suspendDraw;
    const savedSouflaApplying = !!(Game && Game._souflaApplying);
    S._suspendDraw = false;
    if (Game) Game._souflaApplying = false;

    const saved = {
      active: SouflaFX.active,
      redPaths: SouflaFX.redPaths.slice(),
      undoArrow: SouflaFX.undoArrow ? { ...SouflaFX.undoArrow } : null,
      forcePath: Array.isArray(S.souflaForcePath) ? S.souflaForcePath.slice() : [],
      forcePathsAll: Array.isArray(S.souflaForcePathsAll)
        ? S.souflaForcePathsAll.map((p) => p.slice())
        : [],
      remove: S.souflaRemove,
      marks: Array.isArray(S.souflaMarks) ? S.souflaMarks.slice() : [],
      activeStyle: S._activeStyle || null,
      showCoords: !!S.showCoords,
      activeCanvas: S._activeCanvas || null,
    };

    try {
      S._activeStyle = {
        kind: "souflaPreview",
        arrow: { lineWidth: 6.6, head: 22 },
        arrowStrong: { lineWidth: 9.2, head: 28 },
        forceAllAlpha: 0.55,
        colors: {
          souflaRed: themeColor("--mark-danger"),
          souflaRedText: themeColor("--mark-danger-strong"),

          souflaGreen: themeColor("--mark-move"),
          souflaGreenStrong: themeColor("--mark-move-strong"),
          removeRing: themeChannels("--rgb-danger-500", ".95"),
        },
        coords: {
          font: "bold 18px Calibri, Carlito, Segoe UI, sans-serif",
          lineWidth: 4,
          radiusMul: 0.28,
          bgLight: themeChannels("--rgb-white", ".72"),
          bgDark: themeChannels("--rgb-black", ".55"),
          fillLight: themeColor("--color-text-strong"),
          fillDark: themeColor("--color-on-dark"),
          strokeLight: themeChannels("--rgb-white", "1"),
          strokeDark: themeChannels("--rgb-black", ".95"),
        },
      };
      S.showCoords = !!(Game && Game.settings && Game.settings.showCoords);

      SouflaFX.active = true;
      SouflaFX.redPaths = Array.isArray(payload.redPaths) ? payload.redPaths.slice() : [];
      SouflaFX.undoArrow = null;

      S.souflaRemove = null;
      S.souflaMarks = Array.isArray(payload.marks) ? payload.marks.slice() : [];
      S.souflaForcePathsAll = Array.isArray(payload.forcePathsAll)
        ? payload.forcePathsAll.map((p) => p.slice())
        : [];
      S.souflaForcePath = Array.isArray(payload.highlightForcePath)
        ? payload.highlightForcePath.slice()
        : [];

      const __bs = Game.settings.boardStyle;
      try {
        Game.settings.boardStyle = "2d";
        draw(canvas);
      } finally {
        Game.settings.boardStyle = __bs;
      }

      if (payload.removeRingIdx != null) {
        const prevCv = S._activeCanvas;
        try {
          S._activeCanvas = canvas;
          const ctx = canvas.getContext("2d");
          const [x, y, stepX, stepY] = cellCenter(payload.removeRingIdx);
          const rad = Math.max(6, Math.min(stepX, stepY) / 2 - 25);
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, rad + 6, 0, Math.PI * 2);
          ctx.lineWidth = Math.max(6, rad * 0.18);
          ctx.strokeStyle =
            (S._activeStyle && S._activeStyle.colors && S._activeStyle.colors.removeRing) ||
            themeChannels("--rgb-danger-500", ".95");
          ctx.shadowColor = themeChannels("--rgb-black", ".35");
          ctx.shadowBlur = 10;
          ctx.stroke();
          ctx.restore();
        } catch {
        } finally {
          S._activeCanvas = prevCv;
        }
      }
    } finally {
      SouflaFX.active = saved.active;
      SouflaFX.redPaths = saved.redPaths;
      SouflaFX.undoArrow = saved.undoArrow;

      S.souflaForcePath = saved.forcePath;
      S.souflaForcePathsAll = saved.forcePathsAll;
      S.souflaRemove = saved.remove;
      S.souflaMarks = saved.marks;

      S._activeStyle = saved.activeStyle;
      S.showCoords = saved.showCoords;
      S._activeCanvas = saved.activeCanvas;
      S._suspendDraw = savedSuspendDraw;
      if (Game) Game._souflaApplying = savedSouflaApplying;
    }
  }

  function setSouflaIgnoredPaths(list) {
    SouflaFX.active = true;
    SouflaFX.redPaths = list.slice();
    draw();
  }
  function setSouflaUndoArrow(from, to) {
    SouflaFX.active = true;

    try {
      if (Array.isArray(from)) {
        const nodes = from.map((n) => Number(n)).filter(Number.isFinite);
        SouflaFX.undoArrow = nodes.length >= 2 ? { nodes } : null;
      } else if (Array.isArray(to)) {
        const nodes = [from]
          .concat(to)
          .map((n) => Number(n))
          .filter(Number.isFinite);
        SouflaFX.undoArrow = nodes.length >= 2 ? { nodes } : null;
      } else if (from != null && to != null) {
        const a = Number(from),
          b = Number(to);
        SouflaFX.undoArrow = Number.isFinite(a) && Number.isFinite(b) ? { nodes: [a, b] } : null;
      } else {
        SouflaFX.undoArrow = null;
      }
    } catch {
      SouflaFX.undoArrow = null;
    }

    draw();
  }

  function applySouflaFXBatch(payload, opts) {
    payload = payload || {};
    opts = opts || {};
    const noDraw = !!opts.noDraw;

    // Soufla replaces the ordinary turn trace; do not leave stale move,
    // capture numbering, highlights, or an old undo marker underneath it.
    _clearTurnFx(false);

    const redPaths = payload.redPaths;
    const removeIdx = payload.removeIdx;
    const forcePath = payload.forcePath;
    const undoArrow = payload.undoArrow;

    const hasAny =
      (Array.isArray(redPaths) && redPaths.length) ||
      removeIdx != null ||
      (Array.isArray(forcePath) && forcePath.length) ||
      (undoArrow &&
        ((Array.isArray(undoArrow.nodes) && undoArrow.nodes.length >= 2) ||
          (undoArrow.from != null && Array.isArray(undoArrow.path) && undoArrow.path.length) ||
          (undoArrow.from != null && undoArrow.to != null)));

    SouflaFX.active = !!hasAny;
    SouflaFX.redPaths = Array.isArray(redPaths) ? redPaths.slice() : [];

    SouflaFX.undoArrow = null;
    try {
      if (undoArrow) {
        if (Array.isArray(undoArrow.nodes)) {
          const nodes = undoArrow.nodes.map((n) => Number(n)).filter(Number.isFinite);
          if (nodes.length >= 2) SouflaFX.undoArrow = { nodes };
        } else if (undoArrow.from != null && Array.isArray(undoArrow.path)) {
          const nodes = [undoArrow.from]
            .concat(undoArrow.path)
            .map((n) => Number(n))
            .filter(Number.isFinite);
          if (nodes.length >= 2) SouflaFX.undoArrow = { nodes };
        } else if (undoArrow.from != null && undoArrow.to != null) {
          const a = Number(undoArrow.from),
            b = Number(undoArrow.to);
          if (Number.isFinite(a) && Number.isFinite(b)) SouflaFX.undoArrow = { nodes: [a, b] };
        }
      }
    } catch {}

    S.souflaRemove = removeIdx != null ? removeIdx : null;
    S.souflaForcePath = Array.isArray(forcePath) ? forcePath.slice() : [];

    if (!noDraw) draw();
  }

  function moveColorForSide(side) {
    const s = side != null ? side : Game.lastMoveSide != null ? Game.lastMoveSide : Game.player;
    if (s === TOP) return themeColor("--mark-move");
    if (s === BOT) return themeColor("--color-primary");
    return themeColor("--mark-move");
  }

  function _setLastMoveInternal(fr, path, side) {
    if (fr == null || !Array.isArray(path) || path.length === 0) {
      S.lastMove = null;
      return;
    }
    S.undoMove = null;
    S.prevMove = null;
    const s = side != null ? side : Game.lastMoveSide != null ? Game.lastMoveSide : Game.player;
    S.lastMove = { from: fr, path: path.slice(), color: moveColorForSide(s), side: s };
  }

  function setLastMove(fr, to, side) {
    if (fr == null || to == null) return _setLastMoveInternal(null, [], side);
    _setLastMoveInternal(fr, [to], side);
  }

  function setLastMovePath(fr, path, side) {
    _setLastMoveInternal(fr, path, side);
  }

  function clearPrevMove() {
    S.prevMove = null;
    S.pendingTurnClear = true;
  }

  function setUndoMove(fr, to, noDraw) {
    if (fr == null || to == null) {
      S.undoMove = null;
      if (!noDraw) draw();
      return;
    }
    clearAllFxExceptUndo();
    S.undoMove = { from: fr, path: [to] };
    S.pendingTurnClear = true;
    if (!noDraw) draw();
  }

  function setUndoMovePath(fr, path, noDraw) {
    if (fr == null || !Array.isArray(path) || !path.length) {
      S.undoMove = null;
      if (!noDraw) draw();
      return;
    }
    clearAllFxExceptUndo();
    S.undoMove = { from: fr, path: path.slice() };
    S.pendingTurnClear = true;
    if (!noDraw) draw();
  }

  function setSouflaRemove(idx) {
    S.souflaRemove = idx;
    draw();
  }

  function setSouflaForcePath(path) {
    S.souflaForcePath = path.slice();
    draw();
  }

  function setIgnoredKills(list) {
    S.ignoredKills = list.slice();
    draw();
  }

  function setForcedOpeningArrow(fr, to) {
    S.forcedOpeningArrow = { from: fr, to: to };
    S.forcedOpeningArrows = [];
    draw();
  }
  function setForcedOpeningArrows(items, noDraw) {
    S.forcedOpeningArrow = null;
    S.forcedOpeningArrows = Array.isArray(items)
      ? items
          .filter((item) => item && item.from != null && item.to != null)
          .map((item) => ({ from: Number(item.from), to: Number(item.to) }))
      : [];
    if (!noDraw) draw();
  }
  function clearForcedOpeningArrow(noDraw) {
    S.forcedOpeningArrow = null;
    S.forcedOpeningArrows = [];
    if (!noDraw) draw();
  }

  function setHighlightCells(cells) {
    S.highlightCells = cells || [];
  }
  function queueCrown(idx) {
    S.crownQueue.push(idx);
    setTimeout(() => {
      S.crownQueue.shift();
      draw();
    }, 1200);
  }

  function setSuspended(v) {
    S._suspendDraw = !!v;

    if (!S._suspendDraw && S._pendingDraw) {
      S._pendingDraw = false;

      draw();
    }
  }

  function draw(canvasOverride) {
    if (S._suspendDraw || (Game && ((Game._simDepth || 0) > 0 || Game._souflaApplying))) {
      S._pendingDraw = true;
      return;
    }
    const cv = canvasOverride || qs("#board");
    const prevCv = S._activeCanvas || null;
    S._activeCanvas = cv;
    try {
      const ctx = cv.getContext("2d");
      const W = cv.width,
        H = cv.height;
      ctx.clearRect(0, 0, W, H);

      drawGrid(ctx, W, H);
      if (S.showCoords || Game.settings.showCoords) drawCoords(ctx, W, H);

      for (const [r, c] of S.highlightCells) {
        drawCellHighlight(ctx, r, c);
      }
      drawPieces(ctx);
      const __numLabels = [];
      try { S._arrowStacks = new Map(); } catch (_) { S._arrowStacks = null; }

      if (S.souflaRemove != null) {
        drawX(ctx, S.souflaRemove, themeColor("--mark-danger"));
      }

      if (S.souflaMarks && S.souflaMarks.length) {
        for (const mi of S.souflaMarks) drawX(ctx, mi, themeColor("--mark-danger"));
      }

      if (SouflaFX.active) {
        const colR =
          (S._activeStyle && S._activeStyle.colors && S._activeStyle.colors.souflaRed) || themeColor("--mark-danger");
        const colJump =
          (S._activeStyle && S._activeStyle.colors && S._activeStyle.colors.souflaRedText) ||
          themeColor("--mark-danger-strong");
        for (const seg of SouflaFX.redPaths) {
          let cur = seg.from;
          for (let i = 0; i < seg.path.length; i++) {
            drawArrow(ctx, cur, seg.path[i], colR);
            if (
              !(S._activeStyle && S._activeStyle.kind === "souflaPreview") &&
              seg.jumps &&
              seg.jumps[i] != null
            ) {
              __numLabels.push({ idx: seg.jumps[i], text: String(i + 1), fill: colJump });
            }
            cur = seg.path[i];
          }
        }
      }

      if (S.prevMove) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        drawPath(ctx, S.prevMove.from, S.prevMove.path, S.prevMove.color || themeColor("--mark-move"));
        ctx.restore();
      }

      if (S.lastMove)
        drawPath(ctx, S.lastMove.from, S.lastMove.path, S.lastMove.color || themeColor("--mark-move"));

      if (S.souflaForcePathsAll && S.souflaForcePathsAll.length) {
        const colG =
          (S._activeStyle && S._activeStyle.colors && S._activeStyle.colors.souflaGreen) ||
          themeColor("--mark-move");
        ctx.save();
        ctx.globalAlpha =
          S._activeStyle && typeof S._activeStyle.forceAllAlpha === "number"
            ? S._activeStyle.forceAllAlpha
            : 0.35;
        for (const pp of S.souflaForcePathsAll) {
          if (!pp || pp.length < 2) continue;
          for (let i = 0; i < pp.length - 1; i++) {
            drawArrow(ctx, pp[i], pp[i + 1], colG);
          }
        }
        ctx.restore();
      }

      if (S.souflaForcePath?.length) {
        const p = S.souflaForcePath;
        const colGS =
          (S._activeStyle && S._activeStyle.colors && S._activeStyle.colors.souflaGreenStrong) ||
          themeColor("--mark-move");
        const strong =
          S._activeStyle && S._activeStyle.arrowStrong ? S._activeStyle.arrowStrong : null;
        for (let i = 0; i < p.length - 1; i++) {
          drawArrow(ctx, p[i], p[i + 1], colGS, strong);
        }
      }

      if (
        S.undoMove &&
        S.undoMove.from != null &&
        Array.isArray(S.undoMove.path) &&
        S.undoMove.path.length
      ) {
        try {
          const nodes = [S.undoMove.from]
            .concat(S.undoMove.path)
            .map((n) => Number(n))
            .filter(Number.isFinite);
          if (nodes.length >= 2) {
            for (let i = nodes.length - 1; i >= 1; i--) {
              drawArrow(ctx, nodes[i], nodes[i - 1], themeColor("--mark-undo"));
            }
          }
        } catch {}
      }

      if (SouflaFX.active && SouflaFX.undoArrow && Array.isArray(SouflaFX.undoArrow.nodes)) {
        try {
          const nodes = SouflaFX.undoArrow.nodes.map((n) => Number(n)).filter(Number.isFinite);
          if (nodes.length >= 2) {
            for (let i = nodes.length - 1; i >= 1; i--) {
              drawArrow(ctx, nodes[i], nodes[i - 1], themeColor("--mark-undo"));
            }
          }
        } catch {}
      }

      try { S._arrowStacks = null; } catch (_) {}
      try {
        const order = S.capturedOrder;
        if (order && order.length) {
          const isDark = document.documentElement.classList.contains("dark");
          const fill = isDark ? themeColor("--mark-move") : themeColor("--mark-move-strong");
          for (let i = 0; i < order.length; i++) {
            __numLabels.push({ idx: order[i], text: String(i + 1), fill: fill });
          }
        }
      } catch (_) {}
      drawStackedNumbers(ctx, __numLabels);


      for (const idx of S.crownQueue) {
        drawCrownPulse(ctx, idx);
      }

      // Mandatory-opening guidance is the highest-priority board effect.
      if (Array.isArray(S.forcedOpeningArrows) && S.forcedOpeningArrows.length) {
        for (const openingArrow of S.forcedOpeningArrows) {
          drawArrow(ctx, openingArrow.from, openingArrow.to, themeColor("--mark-danger"));
        }
      } else if (S.forcedOpeningArrow) {
        drawArrow(ctx, S.forcedOpeningArrow.from, S.forcedOpeningArrow.to, themeColor("--mark-danger"));
      }
    } finally {
      S._activeCanvas = prevCv;
    }

  }

  function cellCenter(idx) {
    const cv = S._activeCanvas || qs("#board");
    return BoardGeometryModule.cellCenter(idx, cv, {
      boardSize: BOARD_N,
      idxToRC: idxToRC,
      toViewRC: toViewRC,
    });
  }

  function boardViewOptions(extra) {
    extra = extra || {};
    const cv = S._activeCanvas || qs("#board");
    return {
      canvas: cv,
      activeCanvas: cv,
      boardSize: BOARD_N,
      idxToRC: idxToRC,
      rcToIdx: rcToIdx,
      toViewRC: toViewRC,
      cellCenter: cellCenter,
      pieceOwner: pieceOwner,
      pieceKind: pieceKind,
      BOT: BOT,
      board: Game && Game.board,
      diagA: DIAG_A_SEGMENTS,
      diagB: DIAG_B_SEGMENTS,
      rules: globalThis.DhametRules,
      documentElement: typeof document !== "undefined" ? document.documentElement : null,
      activeStyle: S._activeStyle || null,
      arrowStacks: S._arrowStacks || null,
      boardStyle: Game && Game.settings && Game.settings.boardStyle === "3d" ? "3d" : "2d",
      requestRedraw: () => { try { draw(); } catch (_) {} },
      ...extra,
    };
  }

  function drawGrid(ctx, W, H) {
    return BoardViewModule.drawGrid(ctx, W, H, boardViewOptions());
  }
  function drawCoords(ctx, W, H) {
    return BoardViewModule.drawCoords(ctx, W, H, boardViewOptions({
      style: S._activeStyle && S._activeStyle.coords ? S._activeStyle.coords : null,
    }));
  }
  function drawCellHighlight(ctx, r, c) {
    return BoardViewModule.drawCellHighlight(ctx, r, c, boardViewOptions());
  }
  function drawPieces(ctx) {
    return BoardViewModule.drawPieces(ctx, Game.board, boardViewOptions());
  }
  function drawStackedNumbers(ctx, labels) {
    return BoardViewModule.drawStackedNumbers(ctx, labels, boardViewOptions());
  }
  function drawArrow(ctx, fromIdx, toIdx, color, opts) {
    return BoardViewModule.drawArrow(ctx, fromIdx, toIdx, color, boardViewOptions({ arrowStyle: opts || null }));
  }
  function drawPath(ctx, fromIdx, pathList, color) {
    return BoardViewModule.drawPath(ctx, fromIdx, pathList, color, boardViewOptions());
  }
  function drawX(ctx, idx, color) {
    return BoardViewModule.drawX(ctx, idx, color, boardViewOptions());
  }
  function drawCrownPulse(ctx, idx) {
    return BoardViewModule.drawCrownPulse(ctx, idx, boardViewOptions());
  }

  return {
    draw,
    setSuspended,
    getHighlightCells: () => S.highlightCells || [],
    setLastMove,
    setLastMovePath,
    clearPrevMove,
    setUndoMove,
    setUndoMovePath,
    setSouflaRemove,
    setSouflaForcePath,
    setIgnoredKills,
    setForcedOpeningArrow,
    setForcedOpeningArrows,
    clearForcedOpeningArrow,
    setHighlightCells,
    queueCrown,
    getCapturedOrder() {
      return Array.isArray(S.capturedOrder) ? S.capturedOrder.slice() : [];
    },
    setCapturedOrder(list, noDraw) {
      S.capturedOrder = Array.isArray(list) ? list.slice() : [];
      if (!noDraw) draw();
    },
    markTurnBoundary() {
      S.pendingTurnClear = true;
    },
    consumeTurnClear(opts) {
      if (!S.pendingTurnClear) return false;
      const preserveSoufla = !!(opts && opts.preserveSoufla);
      clearTurnFx(preserveSoufla, false);
      return true;
    },
    capturedOrderPush(idx) {
      if (!Array.isArray(S.capturedOrder)) S.capturedOrder = [];
      if (S.pendingTurnClear) {
        clearTurnFx(false, true);
      }
      S.capturedOrder.push(idx);
      draw();
    },
    clearCapturedOrder(noDraw) {
      S.capturedOrder = [];
      S.pendingTurnClear = false;
      if (!noDraw) draw();
    },
    setShowCoords(v) {
      S.showCoords = !!v;
      draw();
    },
    setSouflaIgnoredPaths: setSouflaIgnoredPaths,
    setSouflaUndoArrow: setSouflaUndoArrow,
    clearSouflaFX: clearSouflaFX,
    applySouflaFXBatch: applySouflaFXBatch,
    renderSouflaPreview: renderSouflaPreview,
  };
})();

try {
  if (typeof window !== "undefined") window.Visual = Visual;
  if (typeof globalThis !== "undefined") globalThis.Visual = Visual;
} catch (_) {}

function trBegin(payload) {
  try {
    if (typeof TrainRecorder === "undefined") return null;
    return TrainRecorder.beginDecision(payload);
  } catch {
    return null;
  }
}

function trEnd(token, payload) {
  try {
    if (typeof TrainRecorder === "undefined") return;
    TrainRecorder.endDecision(token, payload);
  } catch {}
}

function _trFinalizeOnce(reason) {
  try {
    if (window.__zamat_tr_finalized) return;
    try {
      const isOnline = !!(window.Online && window.Online.isActive);
      if (isOnline) {
        let internalNav = false;
        try {
          const ts = parseInt(
            (sessionStorage && sessionStorage.getItem("zamat.internalNavTs")) || "0",
            10,
          );
          internalNav = !!(ts && Date.now() - ts < 2500);
        } catch (e) {}
        if (internalNav) return;
      }
    } catch (e) {}
    if (window.Game && Game.gameOver) return;
    if (
      typeof TrainRecorder === "undefined" ||
      !TrainRecorder ||
      typeof TrainRecorder.finalizeAndUpload !== "function"
    )
      return;
    window.__zamat_tr_finalized = true;
    TrainRecorder.finalizeAndUpload({
      winner: window.Game ? Game.winner : null,
      endReason: String(reason || "disconnect"),
    });
  } catch {}
}

try {
  window.addEventListener("pagehide", () => _trFinalizeOnce("disconnect"), { capture: true });
} catch {}

function boardIdxFromClient(canvas, clientX, clientY) {
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;

  if (!(x >= 0 && y >= 0 && x < canvas.width && y < canvas.height)) return null;

  const stepX = canvas.width / BOARD_N;
  const stepY = canvas.height / BOARD_N;

  const cView = Math.floor(x / stepX);
  const rView = Math.floor(y / stepY);

  if (rView < 0 || rView >= BOARD_N || cView < 0 || cView >= BOARD_N) return null;

  const [r, c] = fromViewRC(rView, cView);
  return rcToIdx(r, c);
}



function computerBusyKind() {
  try {
    if (window.Online && window.Online.isActive) return null;
  } catch (_) {}

  try {
    if (document && document.body && document.body.classList) {
      if (document.body.classList.contains("mode-pvp") || document.body.classList.contains("z-spectator")) return null;
    }
  } catch (_) {}

  try {
    if (window.Game && Game && Game.awaitingPenalty && Game.souflaPending) {
      try {
        if (Game.souflaPending && Game.souflaPending.penalizer === aiSide()) return "soufla";
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if (window.AI && typeof AI.isThinking === "function" && AI.isThinking()) {
      try {
        if (window.Game && Game && Game.player === aiSide()) return "move";
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if (window.Game && Game) {
      if (Game.awaitingPenalty) return null;
      if (Game.player === aiSide()) return "move";
    }
  } catch (_) {}

  return null;
}

let __aiBusyToastAt = 0;

function aiText(key, args) {
  return window.I18N && typeof window.I18N.text === "function"
    ? window.I18N.text(key, args)
    : String(key);
}

function showUiNotice(message, title, opts) {
  const cfg = opts && typeof opts === "object" ? { ...opts } : {};
  cfg.title = title || cfg.title || aiText("modals.notice");
  if (cfg.body == null && cfg.text == null) cfg.text = String(message == null ? "" : message);
  if (!cfg.okLabel) cfg.okLabel = aiText("actions.ok");
  Modal.alert(cfg);
}

function formatAiThinkingSeconds(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "0";
  const sec = n / 1000;
  if (sec > 0 && sec < 1) return String(Math.round(sec * 10) / 10);
  if (Math.abs(sec - Math.round(sec)) < 0.05) return String(Math.round(sec));
  return String(Math.round(sec * 10) / 10);
}

function getAiThinkingContext() {
  const adv = Game && Game.settings && Game.settings.advanced ? Game.settings.advanced : {};
  const level = typeof normalizeAILevel === "function"
    ? normalizeAILevel(adv.aiLevel || "medium")
    : String(adv.aiLevel || "medium");
  const levelLabel = aiText("settings.levels." + level) || level;

  let isCritical = false;
  try {
    if (typeof detectCriticalState === "function") isCritical = !!detectCriticalState(Game.player);
  } catch (_) {}

  let cfg = null;
  try {
    if (typeof getAILevelConfig === "function") cfg = getAILevelConfig(level);
  } catch (_) {}
  if (!cfg && window.AI_LEVEL_CONFIGS) cfg = window.AI_LEVEL_CONFIGS[level] || window.AI_LEVEL_CONFIGS.medium || null;

  const baseMs = Math.max(0, Number((cfg && cfg.thinkTimeMs) || adv.thinkTimeMs || 0) || 0);
  const boostMs = Math.max(0, Number((cfg && cfg.timeBoostCriticalMs) || adv.timeBoostCriticalMs || 0) || 0);
  const minSeconds = formatAiThinkingSeconds(baseMs);
  const maxSeconds = formatAiThinkingSeconds(baseMs + boostMs);
  const durationLine = aiText("status.aiThinkingMoveLevelDuration", {
    level: levelLabel,
    min: minSeconds,
    max: maxSeconds,
  });

  return { adv, level, levelLabel, isCritical, baseMs, boostMs, minSeconds, maxSeconds, durationLine };
}

function openAiBusyMoveModal(info) {
  if (!(window.Modal && Modal && typeof Modal.alert === "function")) return false;

  const wrap = document.createElement("div");
  wrap.style.textAlign = "center";
  wrap.style.fontSize = "1.1em";
  wrap.style.lineHeight = "1.55";
  wrap.style.whiteSpace = "normal";

  const waitLine = document.createElement("div");
  waitLine.textContent = aiText("status.aiThinkingMoveWaitLine");

  const levelLine = document.createElement("div");
  levelLine.textContent = info.durationLine || `${aiText("status.currentLevel")}: ${info.levelLabel}`;

  const noteLine = document.createElement("div");
  noteLine.textContent = aiText("status.aiThinkingMoveLevelNote");

  wrap.appendChild(waitLine);
  wrap.appendChild(document.createElement("br"));
  wrap.appendChild(levelLine);
  wrap.appendChild(document.createElement("br"));
  wrap.appendChild(noteLine);

  Modal.alert({
    title: aiText("status.aiThinkingMove"),
    body: wrap,
    okLabel: aiText("actions.ok"),
    okClassName: "primary",
  });
  return true;
}

function toastComputerBusy(kind) {
  try {
    if (!window.Game) return;

    const now = Date.now();
    if (now - (__aiBusyToastAt || 0) < 350) return;

    let msg = "";
    let title = null;

    if (kind === "soufla") {
      msg = aiText("status.aiThinkingSoufla");
    } else {
      try {
        const info = getAiThinkingContext();
        title = aiText("status.aiThinkingMove");
        msg = [
          aiText("status.aiThinkingMoveWaitLine"),
          info.durationLine || `${aiText("status.currentLevel")}: ${info.levelLabel}`,
          aiText("status.aiThinkingMoveLevelNote"),
        ].join("\n");
        if (openAiBusyMoveModal(info)) {
          __aiBusyToastAt = now;
          return;
        }
      } catch (_) {
        msg = aiText("status.aiThinkingMove");
        title = null;
      }
    }

    try {
      showUiNotice(msg, title, { allowSpectator: true });
      __aiBusyToastAt = now;
    } catch (_) {
      __aiBusyToastAt = 0;
    }
  } catch (_) {}
}

let __aiThinkingNoticeShownKey = null;

function showAiThinkingNoticeOncePerTurn() {
  try {
    if (!window.AI || typeof window.AI.isThinking !== "function") return;
    if (!AI.isThinking()) return;
    if (!window.Game) return;

    const key = String(Game.moveCount) + "|" + String(Game.player);
    if (__aiThinkingNoticeShownKey === key) return;
    __aiThinkingNoticeShownKey = key;

    const info = getAiThinkingContext();
    const msg = [
      aiText("status.aiThinkingMoveWaitLine"),
      info.durationLine || `${aiText("status.currentLevel")}: ${info.levelLabel}`,
      aiText("status.aiThinkingMoveLevelNote"),
    ].join("\n");

    showUiNotice(msg, aiText("status.aiThinkingMove"), { allowSpectator: true });
  } catch (_) {}
}

const Input = {
  selected: null,

  onBoardClick(ev) {
    const cv = qs("#board");

    try {
      var root = document.documentElement;
      if (
        root &&
        root.classList &&
        (root.classList.contains("role-pending") || root.classList.contains("ui-hold"))
      ) {
        if (
          document.body &&
          document.body.classList &&
          document.body.classList.contains("mode-pvp")
        )
          return;
      }
    } catch (_) {}
    if (Game.gameOver) return;

    try {
      if (window.Online && window.Online.isActive && window.Online.isSpectator) {
        const idxSp = boardIdxFromClient(cv, ev.clientX, ev.clientY);
        if (idxSp != null) {
          try {
            const vSp = valueAt(idxSp);
            if (vSp) {
              Modal.alert({
                title: t("modals.notice"),
                text: t("spectator.only"),
                allowSpectator: true,
                okLabel: t("actions.close"),
              });
            }
          } catch (_) {}
        }
        return;
      }
    } catch (_) {}

    if (window.Online && window.Online.isActive) {
      if (Game.player !== window.Online.mySide) {
        showUiNotice(t("status.wait"));
        return;
      }
    }
    const idx = boardIdxFromClient(cv, ev.clientX, ev.clientY);
    if (idx == null) return;

    try {
      const busy = computerBusyKind();
      if (busy) {
        const clickedValue = valueAt(idx);
        if (clickedValue) {
          Input.selected = null;
          try {
            Visual.setHighlightCells([]);
            Visual.draw();
          } catch (_) {}

          try {
            if (window.UI && typeof UI.updateStatus === "function") UI.updateStatus();
          } catch (_) {}

          toastComputerBusy(busy);
        }
        return;
      }
    } catch (_) {}

    if (Game.awaitingPenalty) {
      return;
    }

    const [r, c] = idxToRC(idx);
    if (shouldShowKillTimerAlert(idx)) {
      showUiNotice(t("chain.notice.body"), t("modals.notice"));
      return;
    }

    if (Game.forcedEnabled && Game.forcedPly < 10) {
      if (Game.player !== humanSide()) return;

      const openingOptions = getForcedOpeningOptions();
      if (!openingOptions.length) return;
      const selectedOption = Input.selected == null
        ? openingOptions.find((item) => Number(item.from) === Number(idx)) || null
        : null;
      const expected = getForcedOpeningExpectedAction(
        Input.selected != null ? Input.selected : selectedOption && selectedOption.from,
      );
      if (!expected) return;

      const info = expected.info;
      const fr0 = info.from;
      const to1 = info.toFirst;
      const isChainOpening = info.isChain;
      const toFinal = info.toFinal;

      if (expected.endChain) {
        const msg = t("status.forcedChainIncomplete");
        UI.status(msg);
        showUiNotice(msg);
        return;
      }

      const frExp = expected.from;
      const toExp = expected.to;

      if (Input.selected == null) {
        const v = valueAt(idx);
        const allowedStart = Game.inChain && Game.chainPos != null
          ? Game.chainPos
          : selectedOption && selectedOption.from;
        const hintInfo = selectedOption || openingOptions[0];
        const hintFrom = Game.inChain && Game.chainPos != null ? Game.chainPos : hintInfo.from;
        const hintTo = hintInfo.toFirst;

        if (allowedStart == null || idx !== allowedStart || pieceOwner(v) !== Game.player) {
          if (openingOptions.length > 1 && typeof Visual.setForcedOpeningArrows === "function") {
            Visual.setForcedOpeningArrows(
              openingOptions.map((item) => ({ from: item.from, to: item.toFirst })),
              true,
            );
            Visual.setHighlightCells(openingOptions.map((item) => idxToRC(item.from)));
            Visual.draw();
          } else {
            Visual.setForcedOpeningArrow(hintFrom, hintTo);
          }
          UI.status(
            t("status.forcedMove", {
              from: rcStr(hintFrom),
              to: rcStr(hintTo),
            }),
          );

          Modal.alert({
            title: t("modals.forcedOpening.title"),
            body: `<div>${t("modals.forcedOpening.body")}</div>`,
            okLabel: t("actions.close"),
            okClassName: "primary",
            onClick: () => UI.showSettingsModal(prefill),
          });
          return;
        }
        Input.selected = idx;
        if (typeof Visual.clearForcedOpeningArrow === "function") {
          Visual.clearForcedOpeningArrow(true);
        }
        Visual.setHighlightCells([[r, c]]);
        Visual.draw();
        return;
      } else {
        const v = valueAt(Input.selected);

        if (
          isChainOpening &&
          Input.selected === fr0 &&
          idx === toFinal &&
          (!Game.inChain || Game.chainPos == null)
        ) {
          Visual.setForcedOpeningArrow(fr0, toFinal);
          const msg = t("status.forcedChainStepByStep");
          UI.status(msg);
          showUiNotice(msg);
          Visual.setHighlightCells([[Math.floor(Input.selected / BOARD_N), Input.selected % BOARD_N]]);
          Visual.draw();
          return;
        }

        const [isCapSingle, jumpedSingle] = classifyCapture(Input.selected, idx);

        if (!isCapSingle) {
          if (idx !== toExp) {
            Visual.setForcedOpeningArrow(frExp, toExp);
            UI.status(
              t("status.forcedMove", {
                from: rcStr(frExp),
                to: rcStr(toExp),
              }),
            );
            Visual.setHighlightCells([[Math.floor(Input.selected / BOARD_N), Input.selected % BOARD_N]]);
            Visual.draw();
            return;
          }

          if (Game.forcedPly === 0) {
            try { Visual && typeof Visual.consumeTurnClear === "function" && Visual.consumeTurnClear(); } catch (_) {}
            applyMove(Input.selected, idx, false, null);
            Game.inChain = false;
            Game.chainPos = null;
            Game.lastMovedTo = idx;
            Game.killTimer.hardStop();

            Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);

            if (typeof Visual.clearForcedOpeningArrow === "function") {
              Visual.clearForcedOpeningArrow();
            }

            completeForcedOpeningPly();

            Input.selected = null;
            Visual.setHighlightCells([]);

            Turn.finishTurnAndSoufla();

            if (
              !Game.awaitingPenalty &&
              !Game.gameOver &&
              Game.player === aiSide() &&
              !(Game.forcedEnabled && Game.forcedPly < 10)
            ) {
              window.AI && window.AI.scheduleMove();
            }
            return;
          }

          Visual.setForcedOpeningArrow(frExp, toExp);
          UI.status(
            t("status.forcedMove", {
              from: rcStr(frExp),
              to: rcStr(toExp),
            }),
          );
          Visual.setHighlightCells([[Math.floor(Input.selected / BOARD_N), Input.selected % BOARD_N]]);
          Visual.draw();
          return;
        }

        if (!Turn.ctx) Turn.start();
        Turn.beginCapture(Input.selected);
        try { Visual && typeof Visual.consumeTurnClear === "function" && Visual.consumeTurnClear(); } catch (_) {}
        applyMove(Input.selected, idx, true, jumpedSingle);
        Turn.recordCapture();

        Game.inChain = true;
        Game.chainPos = idx;
        Game.lastMovedTo = idx;
        if (!Game.killTimer.running) Game.killTimer.start();
        syncEndKillAvailability(true);

        Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);
        if (typeof Visual.clearForcedOpeningArrow === "function") {
          Visual.clearForcedOpeningArrow(true);
        }

        Input.selected = idx;
        Visual.setHighlightCells([[r, c]]);
        Visual.draw();
        return;
      }
    }

    if (Game.player !== humanSide()) {
      try {
        const onlineActive = !!(window.Online && window.Online.isActive);
        if (!onlineActive && Game.player === aiSide()) {
          showAiThinkingNoticeOncePerTurn();
        }
      } catch (_) {}
      return;
    }
    const v = valueAt(idx);
    if (Input.selected == null) {
      if (!v || pieceOwner(v) !== Game.player) {
        return;
      }
      Input.selected = idx;
      Visual.setHighlightCells([[r, c]]);
      Visual.draw();
      return;
    } else {
      if (!Game.inChain && v && pieceOwner(v) === Game.player && idx !== Input.selected) {
        Input.selected = idx;
        Visual.setHighlightCells([[r, c]]);
        Visual.draw();
        return;
      }

      const fromIdx = Input.selected;
      const toIdx = idx;
      const { mask } = legalActions();
      const a = encodeAction(fromIdx, toIdx);
      if (!mask[a]) {
        const keepIdx = Game.inChain && Game.chainPos != null ? Game.chainPos : Input.selected;
        Input.selected = keepIdx;
        if (keepIdx != null) {
          const [keepR, keepC] = idxToRC(keepIdx);
          Visual.setHighlightCells([[keepR, keepC]]);
        }
        Visual.draw();
        return;
      }
      const [isCap, jumped] = classifyCapture(fromIdx, toIdx);
      if (isCap) {
        if (!Turn.ctx) Turn.start();
        Turn.beginCapture(fromIdx);
        const tr = trBegin({
          fromIdx,
          toIdx,
          action: encodeAction(fromIdx, toIdx),
          actor: Game.player,
        });
        try { Visual && typeof Visual.consumeTurnClear === "function" && Visual.consumeTurnClear(); } catch (_) {}
        applyMove(fromIdx, toIdx, true, jumped);
        Turn.recordCapture();
        Game.inChain = true;
        Game.chainPos = toIdx;
        Game.lastMovedTo = toIdx;
        Visual.setLastMovePath(Game.lastMoveFrom, Game.lastMovePath);

        trEnd(tr, { cap: 1, fromStr: rcStr(fromIdx), toStr: rcStr(toIdx) });

        const caps = generateCapturesFrom(toIdx, valueAt(toIdx));
        if (caps.length === 0) {
          syncEndKillAvailability(true);
        } else {
          syncEndKillAvailability(true);
        }
      } else {
        if (Game.inChain) {
          Input.selected = null;
          Visual.setHighlightCells([]);
          Visual.draw();
          return;
        }
        const tr = trBegin({
          fromIdx,
          toIdx,
          action: encodeAction(fromIdx, toIdx),
          actor: Game.player,
        });
        try { Visual && typeof Visual.consumeTurnClear === "function" && Visual.consumeTurnClear(); } catch (_) {}
        applyMove(fromIdx, toIdx, false, null);
        Game.inChain = false;
        Game.chainPos = null;
        Game.lastMovedTo = toIdx;
        Visual.setLastMove(fromIdx, toIdx);

        trEnd(tr, { cap: 0, fromStr: rcStr(fromIdx), toStr: rcStr(toIdx) });

        maybeQueueDeferredPromotion(toIdx);
        Turn.finishTurnAndSoufla();
      }
      if (isCap) {
        Input.selected = toIdx;
        const [toR, toC] = idxToRC(toIdx);
        Visual.setHighlightCells([[toR, toC]]);
      } else {
        Input.selected = null;
        Visual.setHighlightCells([]);
      }
      Visual.draw();

      if (
        !Game.awaitingPenalty &&
        !Game.gameOver &&
        Game.player === aiSide() &&
        !(Game.forcedEnabled && Game.forcedPly < 10)
      ) {
        window.AI && window.AI.scheduleMove();
      }
    }
  },
};
try { if (typeof window !== "undefined") window.Input = Input; } catch (_) {}

function restoreCaptureContinuationVisualState() {
  if (!Game.inChain || Game.chainPos == null) return false;

  Input.selected = Game.chainPos;
  const [r, c] = idxToRC(Game.chainPos);
  Visual.setHighlightCells([[r, c]]);
  syncEndKillAvailability(true);

  if (!Game.killTimer.running && Game.player === humanSide()) {
    Game.killTimer.start();
  }

  Visual.draw();
  return true;
}

function normalizeMobileControlIcons() {
  // Intentionally empty: mobile controls use the same SVG files and CSS rules
  // as desktop, matching the primary application.
}

function syncKillTimerVisualState() {
  try {
    const row = qs(".timer-row");
    const btn = qs("#btnEndKill");
    if (!row || !btn) return;
    const active = btn.getAttribute("data-chain-active") === "true";
    row.classList.toggle("is-live", active);
    row.classList.toggle("is-disabled", !active);
    normalizeMobileControlIcons();
  } catch (_) {}
}

function syncEndKillAvailability(active) {
  try {
    const btn = qs("#btnEndKill");
    if (!btn) return;
    const state = !!active;
    btn.disabled = false;
    btn.hidden = false;
    btn.removeAttribute("hidden");
    btn.setAttribute("data-chain-active", state ? "true" : "false");
    btn.setAttribute("aria-disabled", state ? "false" : "true");
    syncKillTimerVisualState();
    normalizeMobileControlIcons();
  } catch (_) {}
}

function releaseResolvedOnlineUiHold() {
  try {
    const online = window.Online;
    if (!online || !online.isActive || online.isSpectator) return false;
    const root = document.documentElement;
    if (root && root.classList) { root.classList.remove("ui-hold", "role-pending"); root.classList.add("ui-ready"); }
    if (document.body && document.body.classList) document.body.classList.add("z-online-active");
    return true;
  } catch (_) { return false; }
}
function endKillPressed() {
  try {
    var root = document.documentElement;
    const resolvedOnline = releaseResolvedOnlineUiHold();
    if (!resolvedOnline && root && root.classList && (root.classList.contains("role-pending") || root.classList.contains("ui-hold"))) return;
    if (window.Online && window.Online.isActive && window.Online.isSpectator) {
      return;
    }
  } catch (_) {}

  if (Game.player !== humanSide()) {
    try {
      if (window.Online && window.Online.isActive && !window.Online.isSpectator) {
        showUiNotice(t("status.wait"));
      }
    } catch (_) {}
    return;
  }
  if (!Game.inChain) return;

  Game.killTimer.stop();

  if (isForcedOpeningActive()) {
    const info = getForcedOpeningInfo();
    if (!info) return;

    const startedFrom =
      Turn.ctx && Turn.ctx.startedFrom != null
        ? Turn.ctx.startedFrom
        : Game.lastMoveFrom != null
          ? Game.lastMoveFrom
          : null;
    const endedAt = Game.chainPos ?? Game.lastMovedTo;

    if (info.isChain && startedFrom === info.from && endedAt !== info.toFinal) {
      const pos = info.path.indexOf(endedAt);
      const nextFrom = pos >= 0 && pos < info.path.length - 1 ? info.path[pos] : info.from;
      const nextTo = pos >= 0 && pos < info.path.length - 1 ? info.path[pos + 1] : info.toFirst;

      Visual.setForcedOpeningArrow(nextFrom, nextTo);
      const msg = t("status.forcedChainIncomplete");
      UI.status(msg);
      showUiNotice(msg);
      Visual.draw();
      return;
    }

    if (startedFrom !== info.from || endedAt !== info.toFinal) {
      try {
        window.Online?.clearPendingLocalMove?.();
      } catch {}
      if (Turn.ctx?.snapshot) {
        restoreSnapshot(Turn.ctx.snapshot);
      }

      Visual.setForcedOpeningArrow(info.from, info.toFinal);

      const msg = info.isChain
        ? t("status.forcedChainStepByStep")
        : t("status.forcedMove", {
            from: rcStr(info.from),
            to: rcStr(info.toFinal),
          });

      UI.status(msg);
      Turn.start();
      Visual.draw();
      return;
    }

    if (info && info.ply === 3 && (info.exchangeChoice === 0 || info.exchangeChoice === 1)) {
      Game.forcedOpeningExchangeChoice = info.exchangeChoice;
      Game.openingExchangeFourthChoice = info.exchangeChoice;
    }
    completeForcedOpeningPly();
  }

  try {
    const fromIdx = Game.chainPos ?? Game.lastMovedTo ?? null;
    if (
      typeof TrainRecorder !== "undefined" &&
      TrainRecorder &&
      typeof TrainRecorder.beginMoveBoundary === "function"
    ) {
      TrainRecorder.beginMoveBoundary({ type: "end_chain", actor: Game.player, fromIdx });
    }
    const tr = trBegin({ action: ACTION_ENDCHAIN, actor: Game.player, fromIdx });
    const fromStr = fromIdx != null ? rcStr(fromIdx) : "END";
    trEnd(tr, { cap: 0, fromStr, toStr: "END" });
  } catch {}

  maybeQueueDeferredPromotion(Game.chainPos ?? Game.lastMovedTo);

  Game.inChain = false;
  Game.chainPos = null;
  syncEndKillAvailability(false);

  try {
    Input.selected = null;
    Visual.setHighlightCells([]);
    Visual.draw();
  } catch (_) {}

  Turn.finishTurnAndSoufla();

  if (
    !Game.awaitingPenalty &&
    !Game.gameOver &&
    Game.player === aiSide() &&
    !(Game.forcedEnabled && Game.forcedPly < 10)
  ) {
    window.AI && window.AI.scheduleMove();
  }
}

const UI = {
  confirmMatchExit: confirmMatchExitAction,
  restoreCaptureContinuationVisualState,
  updateAll() {
    this.updateStatus();
    this.updateAiLevelDisplay();
    try { if (window.ZGamePlayers && typeof window.ZGamePlayers.refresh === "function") window.ZGamePlayers.refresh(); } catch (_) {}
    try { normalizeMobileControlIcons(); } catch (_) {}
    Visual.draw();

    try {
      SessionGame.saveSoon();
    } catch {}
  },
  _setStatusWithPawn(txt, pawnSide) {
    const msgEl = qs("#statusTextMsg") || qs("#statusText");
    const pawnEl = qs("#turnPawn");
    if (msgEl) msgEl.textContent = String(txt ?? "");
    if (!pawnEl) return;

    if (pawnSide === TOP || pawnSide === BOT) {
      pawnEl.style.display = "";
      pawnEl.src =
        pawnSide === BOT ? "../assets/icons/pawn-white.svg" : "../assets/icons/pawn-black.svg";
    } else {
      pawnEl.style.display = "none";
    }
  },

  updateStatus() {
    const s = qs("#statusText");
    if (!s) return;
    if (Game.player !== TOP && Game.player !== BOT) {
      this._setStatusWithPawn("", null);
      return;
    }
    this._setStatusWithPawn(`${t("status.turn")} ${sideLabel(Game.player)}`, Game.player);
  },

  updateAiLevelDisplay() {
    try {
      const box = qs("#aiLevelBox");
      const valEl = qs("#aiLevelValue");
      const prefixEl = qs("#aiLevelPrefix");
      if (!box || !valEl) return;

      try {
        const lang =
          document.documentElement && document.documentElement.lang
            ? document.documentElement.lang
            : "en";
        box.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
        valEl.setAttribute("dir", lang === "ar" ? "auto" : "ltr");
      } catch (_) {}

      const onlineActive = !!(window.Online && window.Online.isActive);
      const isPvp = !!(
        document.documentElement &&
        document.documentElement.classList &&
        document.documentElement.classList.contains("mode-pvp")
      );
      if (onlineActive || isPvp) {
        box.style.display = "none";
        return;
      }
      box.style.display = "";
      if (prefixEl) prefixEl.textContent = t("settings.aiLevel");

      try {
        Game.normalizeAdvancedSettings();
      } catch (_) {}
      const adv = Game.settings && Game.settings.advanced ? Game.settings.advanced : {};
      const normalizeLevel = (value) => typeof normalizeAILevel === "function"
        ? normalizeAILevel(value || "medium")
        : String(value || "medium");
      const actualLevel = normalizeLevel(adv.aiLevel || "medium");
      const pendingLevel = Game.pendingAILevel ? normalizeLevel(Game.pendingAILevel) : null;
      const currentLevel = pendingLevel || actualLevel;
      const levels = Array.isArray(window.AI_LEVEL_ORDER)
        ? window.AI_LEVEL_ORDER
        : ["beginner", "easy", "medium", "hard", "strong", "expert"];

      const existingSelect = valEl.querySelector && valEl.querySelector("select.ai-level-select");
      if (existingSelect) {
        existingSelect.setAttribute("aria-label", t("settings.aiLevel"));
        existingSelect.dataset.currentLevel = currentLevel;
        existingSelect.dataset.actualLevel = actualLevel;
        Array.from(existingSelect.options || []).forEach((option) => {
          try { option.textContent = t("settings.levels." + normalizeLevel(option.value)); } catch (_) {}
        });
        if (existingSelect.value !== currentLevel) existingSelect.value = currentLevel;
        return;
      }

      valEl.innerHTML = "";
      const select = document.createElement("select");
      select.id = "aiLevelQuickSelect";
      select.className = "ai-level-select";
      select.setAttribute("aria-label", t("settings.aiLevel"));
      select.dataset.currentLevel = currentLevel;
      select.dataset.actualLevel = actualLevel;
      for (const level of levels) {
        const option = document.createElement("option");
        option.value = level;
        option.textContent = t("settings.levels." + level);
        if (level === currentLevel) option.selected = true;
        select.appendChild(option);
      }

      select.addEventListener("change", () => {
        const nextLevel = normalizeLevel(select.value);
        const actualBefore = normalizeLevel(select.dataset.actualLevel || actualLevel);
        try {
          Game.pendingAILevel = nextLevel === actualBefore ? null : nextLevel;
          select.value = nextLevel;
          select.dataset.currentLevel = nextLevel;
          select.dataset.actualLevel = actualBefore;
          if (typeof saveSessionSettings === "function") saveSessionSettings();
          if (window.UI && typeof UI.updateAll === "function") UI.updateAll();
          if (window.ZGamePlayers && typeof window.ZGamePlayers.refresh === "function") window.ZGamePlayers.refresh();
          setTimeout(() => { try { select.blur(); } catch (_) {} }, 0);
        } catch (_) {}
      });


      valEl.appendChild(select);
    } catch (_) {}
  },

  updateCounts({ top, bot, tKings, bKings }) {
    const set = (id, val) => {
      const el = qs(id);
      if (el) el.textContent = String(val);
    };

    set("#topLeft", top);
    set("#topLeftM", top);
    set("#botLeft", bot);
    set("#botLeftM", bot);

    set("#topKings", tKings);
    set("#topKingsM", tKings);
    set("#botKings", bKings);
    set("#botKingsM", bKings);

    set("#topCaptured", 40 - top);
    set("#topCapturedM", 40 - top);
    set("#botCaptured", 40 - bot);
    set("#botCapturedM", 40 - bot);
  },
  showGameOverModal(winner) {
    try {
      if (window.Online && typeof window.Online._buildOnlineEndPresentation === "function" && typeof UI.showOnlineGameOverModal === "function") {
        return UI.showOnlineGameOverModal(window.Online._buildOnlineEndPresentation({ winner }));
      }
    } catch (_) {}
    const player = winner === TOP ? (Game.names && Game.names.top) : winner === BOT ? (Game.names && Game.names.bot) : "";
    const text = winner === TOP || winner === BOT
      ? t("online.endPresentation.winner", { player: player || t("players.player") })
      : t("modals.gameOver.draw");
    if (typeof UI.showOnlineGameOverModal === "function") {
      return UI.showOnlineGameOverModal({ title: t("modals.gameOver.title"), text });
    }
    return Modal.alert({ title: t("modals.gameOver.title"), body: `<div>${text}</div>`, okLabel: t("actions.ok"), okClassName: "ok" });
  },

  status() {
    this.updateStatus();
  },

  updateKillClock(ms) {
    const mm = Math.floor(ms / 60000)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor((ms % 60000) / 1000)
      .toString()
      .padStart(2, "0");
    const killClockEl = qs("#killClock");
    if (killClockEl) killClockEl.textContent = `${mm}:${ss}`;
    syncKillTimerVisualState();
  },
  log(txt) {
    try {
      if (window.LogMgr) {
        if (txt && typeof txt === "object") window.LogMgr.addEvent(txt);
        else window.LogMgr.addText(String(txt ?? ""));
        return;
      }
    } catch (_) {}
    logLine(String(txt ?? ""));
  },
  showSettingsModal(prefill) {
    const wrap = document.createElement("div");
    wrap.className = "settings-general";

    const isOnline = !!(window.Online && window.Online.isActive);

    try {
      Game.normalizeAdvancedSettings();
    } catch (_) {}

    const adv = Game.settings && Game.settings.advanced ? Game.settings.advanced : {};
    const levels = Array.isArray(window.AI_LEVEL_ORDER)
      ? window.AI_LEVEL_ORDER
      : ["beginner", "easy", "medium", "hard", "strong", "expert"];
    const normalizeLevel = (value) => typeof normalizeAILevel === "function"
      ? normalizeAILevel(value || (window.DhametAIConfig && DhametAIConfig.DEFAULT_AI_LEVEL || "hard"))
      : String(value || (window.DhametAIConfig && DhametAIConfig.DEFAULT_AI_LEVEL || "hard"));
    const selectedLevel = normalizeLevel(adv.aiLevel || Game.pendingAILevel || (window.DhametAIConfig && DhametAIConfig.DEFAULT_AI_LEVEL || "hard"));

    const esc = (value) => String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    const mkOptions = (arr, selected, labelFn) =>
      arr
        .map((v) => {
          const val = String(v);
          const lab = labelFn ? labelFn(v) : val;
          return `<option value="${esc(val)}" ${String(selected) === val ? "selected" : ""}>${esc(lab)}</option>`;
        })
        .join("");

    const row = (label, control, hint = "") => `
      <div class="settings-row">
        <div class="settings-label"><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</div>
        <div class="settings-control">${control}</div>
      </div>
    `;

    const starterChoices = [
      ["white", t("players.white")],
      ["black", t("players.black")],
    ];
    const themeChoices = [
      ["light", t("settings.light")],
      ["dark", t("settings.dark")],
    ];
    const boardChoices = [
      ["2d", t("settings.board2d")],
      ["3d", t("settings.board3d")],
    ];

    const aiRows = !isOnline ? `
      ${row(
        t("settings.aiLevel"),
        `<select id="advAILevel">${mkOptions(levels, selectedLevel, (level) => t("settings.levels." + level))}</select>`,
        t("settings.aiLevelHint"),
      )}
      ${row(
        t("settings.starter"),
        `<select id="setStarter">${starterChoices
          .map(([value, label]) => `<option value="${value}" ${Game.settings.starter === value ? "selected" : ""}>${label}</option>`)
          .join("")}</select>`,
      )}
    ` : "";

    wrap.innerHTML = `
      <div class="settings-list simple-settings">
        ${aiRows}
        ${row(
          t("settings.theme"),
          `<select id="setTheme">${themeChoices
            .map(([value, label]) => `<option value="${value}" ${Game.settings.theme === value ? "selected" : ""}>${label}</option>`)
            .join("")}</select>`,
        )}
        ${row(
          t("settings.boardStyle"),
          `<select id="setBoardStyle">${boardChoices
            .map(([value, label]) => `<option value="${value}" ${(Game.settings.boardStyle || "2d") === value ? "selected" : ""}>${label}</option>`)
            .join("")}</select>`,
        )}
        ${row(
          t("settings.coords"),
          `<label class="checkline"><input id="setCoords" type="checkbox" ${Game.settings.showCoords ? "checked" : ""} /> <span>${t("settings.showCoords")}</span></label>`,
        )}
      </div>
    `;

    const settingsDropdowns = [];
    try {
      qsa("select", wrap).forEach((selectEl) => {
        selectEl.addEventListener("change", () => {
          setTimeout(() => { try { selectEl.blur(); } catch (_) {} }, 0);
        });
        try {
          if (window.DhametDropdownView) {
            window.DhametDropdownView.enhance(selectEl);
            settingsDropdowns.push(selectEl);
          }
        } catch (_) {}
      });
    } catch (_) {}

    const onlineNow = () => !!(window.Online && window.Online.isActive);
    const levelLabel = (value) => t("settings.levels." + normalizeLevel(value));
    const starterLabel = (value) => value === "black" ? t("players.black") : t("players.white");
    const themeLabel = (value) => value === "dark" ? t("settings.dark") : t("settings.light");
    const boardLabel = (value) => value === "3d" ? t("settings.board3d") : t("settings.board2d");
    const boolLabel = (value) => value ? t("settings.enabled") : t("settings.disabled");

    const renderSettingsResult = (changes, notes) => {
      const extra = notes ? `<p class="settings-change-note">${esc(notes.trim())}</p>` : "";
      if (!changes.length) {
        return `<div class="settings-feedback warn"><p>${esc(t("modals.applySettings.noChanges"))}</p>${extra}</div>`;
      }
      const isRtl = !!(document.documentElement && document.documentElement.dir === "rtl");
      const arrow = isRtl ? "←" : "→";
      const items = changes
        .map((ch) => `<li><b>${esc(ch.label)}:</b> <bdi>${esc(ch.from)}</bdi> <span class="settings-change-arrow">${arrow}</span> <bdi>${esc(ch.to)}</bdi>${ch.note ? ` <small>${esc(ch.note)}</small>` : ""}</li>`)
        .join("");
      return `<div class="settings-feedback ok"><p>${esc(t("modals.applySettings.applied"))}</p><div><b>${esc(t("modals.applySettings.changedTitle"))}</b></div><ul class="settings-change-list">${items}</ul>${extra}</div>`;
    };

    const applyNow = () => {
      const changes = [];
      const addChange = (label, from, to, note = "") => {
        if (String(from) === String(to) && !note) return;
        changes.push({ label, from, to, note });
      };

      const starterBefore = Game.settings.starter;
      const levelBefore = normalizeLevel(adv.aiLevel || Game.pendingAILevel || (window.DhametAIConfig && DhametAIConfig.DEFAULT_AI_LEVEL || "hard"));
      const themeBefore = Game.settings.theme === "dark" ? "dark" : "light";
      const boardBefore = (Game.settings.boardStyle || "2d") === "3d" ? "3d" : "2d";
      const coordsBefore = !!Game.settings.showCoords;

      let starterChanged = false;
      let starterDeferred = false;

      if (!onlineNow()) {
        const level = normalizeLevel(qs("#advAILevel", wrap)?.value || (window.DhametAIConfig && DhametAIConfig.DEFAULT_AI_LEVEL || "hard"));
        if (level !== levelBefore) {
          if (!Game.settings) Game.settings = {};
          if (window.DhametAIConfig && typeof DhametAIConfig.createDefaultAdvancedSettings === "function") {
            Game.settings.advanced = DhametAIConfig.createDefaultAdvancedSettings(level);
          } else {
            Game.settings.advanced = Object.assign({}, Game.settings.advanced || {}, { aiLevel: level });
          }
          Game.pendingAILevel = null;
          addChange(t("settings.aiLevel"), levelLabel(levelBefore), levelLabel(level), t("settings.aiLevelNextMoveNote"));
        }

        const starterEl = qs("#setStarter", wrap);
        if (starterEl) {
          const nextStarter = starterEl.value === "black" ? "black" : "white";
          starterChanged = String(starterBefore) !== String(nextStarter);
          if (starterChanged) addChange(t("settings.starter"), starterLabel(starterBefore), starterLabel(nextStarter));
          Game.settings.starter = nextStarter;
        }
      }

      const theme = qs("#setTheme", wrap)?.value === "dark" ? "dark" : "light";
      const boardStyle = qs("#setBoardStyle", wrap)?.value === "3d" ? "3d" : "2d";
      const showCoords = !!qs("#setCoords", wrap)?.checked;

      if (theme !== themeBefore) addChange(t("settings.theme"), themeLabel(themeBefore), themeLabel(theme));
      if (boardStyle !== boardBefore) addChange(t("settings.boardStyle"), boardLabel(boardBefore), boardLabel(boardStyle));
      if (showCoords !== coordsBefore) addChange(t("settings.coords"), boolLabel(coordsBefore), boolLabel(showCoords));

      Game.settings.theme = theme;
      Game.settings.boardStyle = boardStyle;
      Game.settings.showCoords = showCoords;
      applyTheme(theme);
      applyBoardStyle(boardStyle);
      Visual.setShowCoords(showCoords);

      if (!onlineNow() && starterChanged) {
        const atStart =
          !Game.gameOver &&
          (Game.moveCount | 0) === 0 &&
          (Game.forcedPly | 0) === 0 &&
          !Game.inChain &&
          Game.lastMovedTo == null &&
          (Game.history && Game.history.length ? Game.history.length === 0 : true);

        if (atStart) {
          try { SessionGame.clear(); } catch (_) {}
          setupInitialBoard();
          try {
            if (window.DhametMatchCoordinator) DhametMatchCoordinator.resetPresentation({ draw: true });
            else Visual.draw();
            Turn.start();
            scheduleForcedOpeningAutoIfNeeded();
          } catch (_) {}
          try {
            if (!Game.gameOver && Game.player === aiSide() && !(Game.forcedEnabled && Game.forcedPly < 10)) {
              window.AI && window.AI.scheduleMove();
            }
          } catch (_) {}
        } else {
          starterDeferred = true;
        }
      }

      try { Visual.draw(); } catch (_) {}
      try { UI.updateAll(); } catch (_) {}
      try { saveSessionSettings(); } catch (_) {}

      const notes = starterDeferred ? "\n" + t("settings.starterNextGameNote") : "";
      Modal.close();
      setTimeout(() => {
        showUiNotice(null, t("modals.applySettings.title"), {
          body: renderSettingsResult(changes, notes),
          okLabel: t("actions.ok"),
        });
      }, 0);
    };

    const keyHandler = (e) => {
      if (!Modal.isOpen()) return;
      const bodyEl = Modal.getBody();
      if (!bodyEl || !bodyEl.querySelector(".settings-general")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        Modal.close();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        applyNow();
      }
    };

    document.addEventListener("keydown", keyHandler);

    Modal.open({
      title: t("buttons.settings"),
      body: wrap,
      modalClassName: "z-apply-settings",
      onEnter: applyNow,
      onClose: () => {
        document.removeEventListener("keydown", keyHandler);
        try {
          if (window.DhametDropdownView) settingsDropdowns.forEach((selectEl) => window.DhametDropdownView.destroy(selectEl));
        } catch (_) {}
      },
      buttons: [
        { label: t("modals.apply"), className: "ok", onClick: applyNow },
        ...(!isOnline ? [{ label: t("advHelp.title"), className: "adv-help", onClick: () => UI.showAdvancedSettingsHelp(prefill) }] : []),
        { label: t("actions.cancel"), className: "ghost", onClick: () => Modal.close() },
      ],
    });
  },

  showAdvancedSettingsHelp(prefill) {
    const levels = Array.isArray(window.AI_LEVEL_ORDER)
      ? window.AI_LEVEL_ORDER
      : ["beginner", "easy", "medium", "hard", "strong", "expert"];
    const rows = levels.map((level) => `
      <section class="ai-level-help-item">
        <h3>${t("settings.aiLevelWithValue", { level: t("settings.levels." + level) })}</h3>
        <p>${t("advHelp.levelDetails." + level)}</p>
      </section>
    `).join("");
    const body = `<div class="rules-container ai-level-help">
      <p>${t("advHelp.levelsIntro")}</p>
      ${rows}
    </div>`;

    Modal.open({
      title: t("advHelp.title"),
      body,
      buttons: [
        { label: t("actions.back"), className: "ghost", onClick: () => UI.showSettingsModal(prefill) },
        { label: t("actions.close"), className: "ok", onClick: () => Modal.close() },
      ],
    });
  },

  showSouflaModal(pending) {
    return SouflaViewModule.showSouflaModal(pending, {
      game: Game, t, Modal, Visual, BOARD_N, idxToRC, toViewRC, valueAt, boardIdxFromClient,
      applySouflaDecision, UI,
    });
  },
  showSouflaAgainstHuman(decision, pending) {
    return SouflaViewModule.showSouflaAgainstHuman(decision, pending, { t, Modal, rcStr });
  },
};

try {
  window.UI = UI;
} catch (_) {}
try {
  const buf = window.__uiLogBuffer;
  if (Array.isArray(buf) && buf.length) {
    const drained = buf.splice(0, buf.length);
    for (const msg of drained) {
      try {
        if (UI && typeof UI.log === "function") UI.log(msg);
      } catch (_) {}
    }
  }
} catch (_) {}

function confirmUndo() {
  if (window.Online && window.Online.isActive) {
    if (window.Online.isSpectator) return;
    window.Online.requestUndo();
    return;
  }

  if (!Game.history.length) {
    Modal.alert({
      title: t("modals.notice"),
      body: `<div>${t("ui.noUndo")}</div>`,
      okLabel: t("actions.close"),
      onClick: () => UI.showSettingsModal(prefill),
    });
    return;
  }

  const candidate = Game.history[Game.history.length - 1];

  if (candidate && candidate.forcedEnabled && candidate.forcedPly < 10) {
    Modal.alert({
      title: t("modals.undo.notAllowedTitle"),
      body: `<div>${t("modals.undo.notAllowedBody")}</div>`,
      okLabel: t("actions.close"),
    });
    return;
  }

  const snap = Game.history.pop();
  let __beforeUndoSnap = null;
  try {
    __beforeUndoSnap = typeof snapshotState === "function" ? snapshotState() : null;
  } catch {}
  try {
    if (
      typeof TrainRecorder !== "undefined" &&
      TrainRecorder &&
      typeof TrainRecorder.rollbackLastMoveBoundary === "function"
    )
      TrainRecorder.rollbackLastMoveBoundary();
  } catch {}
  restoreSnapshot(snap);

  try {
    if (__beforeUndoSnap && typeof Visual !== "undefined" && Visual) {
      const fr =
        __beforeUndoSnap.lastMoveFrom != null
          ? __beforeUndoSnap.lastMoveFrom
          : __beforeUndoSnap.lastMovedFrom;
      const p = __beforeUndoSnap.lastMovePath;
      if (
        fr != null &&
        Array.isArray(p) &&
        p.length &&
        typeof Visual.setUndoMovePath === "function"
      ) {
        Visual.setUndoMovePath(fr, p);
      } else if (
        fr != null &&
        __beforeUndoSnap.lastMovedTo != null &&
        typeof Visual.setUndoMove === "function"
      ) {
        Visual.setUndoMove(fr, __beforeUndoSnap.lastMovedTo);
      }
    }
  } catch {}

  try {
    Turn.start();
  } catch {}
  try {
    scheduleForcedOpeningAutoIfNeeded();
  } catch {}
  try {
    UI.updateStatus();
  } catch {}

  try {
    if (
      !Game.awaitingPenalty &&
      !Game.gameOver &&
      Game.player === aiSide() &&
      !(Game.forcedEnabled && Game.forcedPly < 10)
    ) {
      window.AI && window.AI.scheduleMove();
    }
  } catch {}
}

function saveGame() {
  const killMs =
    Game.killTimer.elapsedMs +
    (Game.killTimer.running ? performance.now() - Game.killTimer.startTs : 0);

  const data = {
    v: 2,
    snapshot: snapshotState(),
    forcedSeqKey:
      Game.forcedSeq === FO_TOP ? "FO_TOP" : Game.forcedSeq === FO_BOT ? "FO_BOT" : null,
    settings: Game.settings,
    history: Game.history,
    logHtml: qs("#log") ? qs("#log").innerHTML : "",
    killTimerMs: Math.max(0, killMs | 0),
  };

  localStorage.setItem("zamat.save", JSON.stringify(data));

  Modal.alert({
    title: t("buttons.save"),
    body: `<div>${t("log.save.done")}</div>`,
    okLabel: t("actions.close"),
  });
}

function resumeGame() {
  const raw = localStorage.getItem("zamat.save");
  if (!raw) {
    Modal.alert({
      title: t("buttons.resume"),
      body: `<div>${t("log.save.none")}</div>`,
      okLabel: t("actions.close"),
    });
    return;
  }

  function applySavedGame() {
    try {
      const data = JSON.parse(raw);
      const snap = data.snapshot || data;

      Game.board = snap.board;
      Game.player = snap.player;
      Game.inChain = !!snap.inChain;
      Game.chainPos = snap.chainPos ?? null;
      Game.lastMovedTo = snap.lastMovedTo ?? null;
      Game.lastMovedFrom = snap.lastMovedFrom ?? null;
      Game.moveCount = snap.moveCount ?? 0;
      Game.forcedEnabled = typeof snap.forcedEnabled === "boolean" ? snap.forcedEnabled : true;
      Game.forcedPly = typeof snap.forcedPly === "number" ? snap.forcedPly : 0;

      Game.settings = data.settings || snap.settings || Game.settings;
      Game.normalizeAdvancedSettings();
      Game.history = Array.isArray(data.history) ? data.history : [];

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

      if (qs("#log") && typeof data.logHtml === "string") {
        qs("#log").innerHTML = data.logHtml;
      }

      Game.killTimer.hardStop();
      Game.killTimer.elapsedMs = typeof data.killTimerMs === "number" ? data.killTimerMs : 0;
      UI.updateKillClock(Game.killTimer.elapsedMs | 0);
      if (Game.inChain) Game.killTimer.start();

      syncEndKillAvailability(Game.inChain);

      Turn.start();
      scheduleForcedOpeningAutoIfNeeded();
      UI.updateAll();

      Modal.alert({
        title: t("buttons.resume"),
        body: `<div>${t("log.save.resumed")}</div>`,
        okLabel: t("actions.close"),
      });
    } catch (e) {
      Modal.alert({
        title: t("buttons.resume"),
        body: `<div>${t("log.save.error")}</div>`,
        okLabel: t("actions.close"),
      });
    }
  }

  Modal.twoAction({
    title: t("buttons.resume"),
    body: `<div>${t("log.save.confirm")}</div>`,
    firstLabel: t("actions.cancel"),
    firstClassName: "secondary",
    secondLabel: t("buttons.resume"),
    secondClassName: "primary",
    onSecond: applySavedGame,
  });
}

function souflaPressed() {
  try {
    var root = document.documentElement;
    if (
      root &&
      root.classList &&
      (root.classList.contains("role-pending") || root.classList.contains("ui-hold"))
    )
      return;
    if (window.Online && window.Online.isActive && window.Online.isSpectator) {
      return;
    }
  } catch (_) {}

  try {
    if (window.Online && typeof Online.logSouflaPressedToFirebase === "function") {
      Online.logSouflaPressedToFirebase();
    }
  } catch {}

  try {
    if (
      window.Online &&
      Online.isActive &&
      Online.mySide != null &&
      Game.player != null &&
      Game.player !== Online.mySide
    ) {
      showUiNotice(t("status.wait"));
      return;
    }
  } catch {}
  if (Game.forcedEnabled && Game.forcedPly < 10) {
    showUiNotice(t("modals.soufla.forcedOpeningWarning"));
    return;
  }
  if (Game.availableSouflaForHuman) {
    Game.awaitingPenalty = true;
    Game.souflaPending = Game.availableSouflaForHuman;
    UI.showSouflaModal(Game.souflaPending);
    return;
  }

  Modal.alert({
    title: t("modals.soufla.header"),
    body: `<div>${t("modals.soufla.none")}</div>`,
    okLabel: t("actions.close"),
  });
}

async function confirmMatchExitAction(onConfirm) {
  const msg = t("modals.endMatch.confirm") || "هل تريد إنهاء المباراة؟";
  const title = t("buttons.endMatch") || "إنهاء المباراة";
  const yesLabel = t("buttons.endMatch") || "إنهاء المباراة";
  const noLabel = t("actions.cancel") || "إلغاء";
  const ok = await Modal.confirm(msg, title, yesLabel, noLabel);
  if (!ok) return false;
  await onConfirm();
  return true;
}

async function endLocalMatchPressed() {
  try {
    const isOnline = !!(window.Online && window.Online.isActive);
    if (isOnline) return;

    await confirmMatchExitAction(async () => {
      try {
        if (!window.__zamat_tr_finalized) {
          window.__zamat_tr_finalized = true;
          if (
            typeof TrainRecorder !== "undefined" &&
            TrainRecorder &&
            typeof TrainRecorder.finalizeAndUpload === "function"
          ) {
            await Promise.race([
              TrainRecorder.finalizeAndUpload({
                winner: window.Game ? Game.winner : null,
                endReason: "cancel",
              }),
              new Promise((r) => setTimeout(r, 1200)),
            ]);
          }
        }
      } catch {}

      try {
        SessionGame.clear();
      } catch (_) {}
      try {
        localStorage.removeItem("zamat.activeGameId");
      } catch (_) {}
      try {
        localStorage.removeItem("zamat.activeGameTs");
      } catch (_) {}

      const href = "https://ouglsoft.com/dhamet/pages/mode.html";
      try {
        location.replace(href);
      } catch (_) {
        try {
          location.href = href;
        } catch (_) {}
      }
    });
  } catch (e) {
    try {
      const msg =
        (window.I18N && typeof window.I18N.text === "function" ? window.I18N.text("modals.endMatch.confirm") || "" : "") ||
        "هل تريد إنهاء المباراة؟";
      if (confirm(msg)) {
        try {
          SessionGame.clear();
        } catch (_) {}
        const href = "https://ouglsoft.com/dhamet/pages/mode.html";
        try {
          location.replace(href);
        } catch (_) {
          try {
            location.href = href;
          } catch (_) {}
        }
      }
    } catch (_) {}
  }
}

function bindUI() {
  qs("#btnSoufla").addEventListener("click", souflaPressed);

  try {
    const endBtn = qs("#btnEndLocalMatch");
    if (endBtn) {
      const isOnline = !!(window.Online && window.Online.isActive);
      const isSpectator = !!(
        document.body &&
        document.body.classList &&
        document.body.classList.contains("z-spectator")
      );
      endBtn.style.display = !isOnline && !isSpectator ? "" : "none";
      endBtn.addEventListener("click", endLocalMatchPressed);
    }
  } catch (_) {}
  qs("#btnUndo").addEventListener("click", confirmUndo);
  qs("#btnSync")?.addEventListener("click", async () => {
    try {
      const ok = await window.Online?.syncNow?.({ force: true, emitSignal: false, repairPresence: true });
      if (ok !== false) return;
    } catch (e) {}
    try {
      sessionStorage.setItem("zamat.forceResyncOnLoad", "1");
    } catch (e) {}
    setTimeout(() => {
      try {
        location.reload();
      } catch (e) {}
    }, 120);
  });
  qs("#btnChat")?.addEventListener("click", () => window.Online?.openChatModal?.());
  qs("#btnSpk")?.addEventListener("click", () => window.Online?.toggleSpeaker?.());
  qs("#btnMic")?.addEventListener("click", () => window.Online?.toggleMic?.());
  qs("#btnLeaveRoom")?.addEventListener("click", () => window.Online?.leaveRoom?.());
  qs("#btnSettings").addEventListener("click", () => UI.showSettingsModal());
  qs("#btnNew")?.addEventListener("click", () => {
    Modal.twoAction({
      title: t("modals.newGame.title"),
      body: `<div>${t("modals.newGame.confirm")}</div>`,
      firstLabel: t("modals.yes"),
      firstClassName: "ok",
      onFirst: () => {
        try {
          SessionGame.clear();
        } catch {}
        setupInitialBoard();
        Visual.clearCapturedOrder();
        Visual.clearSouflaFX();
        Visual.setHighlightCells([]);
        Visual.clearForcedOpeningArrow();
        Visual.setLastMove(null, null);
        Visual.setUndoMove(null, null);

        Visual.draw();
        try {
          Turn.start();
        } catch {}
        try {
          scheduleForcedOpeningAutoIfNeeded();
        } catch {}
        try {
          if (
            !Game.gameOver &&
            Game.player === aiSide() &&
            !(Game.forcedEnabled && Game.forcedPly < 10)
          ) {
            window.AI && window.AI.scheduleMove();
          }
        } catch {}
      },
      secondLabel: t("modals.no"),
      secondClassName: "ghost",
    });
  });

  qs("#btnSave")?.addEventListener("click", saveGame);
  qs("#btnResume")?.addEventListener("click", resumeGame);
  const endKillButton = qs("#btnEndKill");
  if (endKillButton) endKillButton.addEventListener("click", endKillPressed);

  const killTimerTile = qs(".timer-row");
  if (killTimerTile) {
    killTimerTile.setAttribute("role", "button");
    killTimerTile.setAttribute("tabindex", "0");
    killTimerTile.setAttribute("aria-label", t("buttons.endKill"));
    killTimerTile.addEventListener("click", function (ev) {
      // Reuse the exact end-capture action used by the nested button.
      if (ev && ev.target && ev.target.closest && ev.target.closest("#btnEndKill")) return;
      if (ev) ev.preventDefault();
      endKillPressed();
    });
    killTimerTile.addEventListener("keydown", function (ev) {
      const key = ev && (ev.key || ev.code);
      if (key === "Enter" || key === " " || key === "Spacebar") {
        ev.preventDefault();
        endKillPressed();
      }
    });
  }

  qs("#board").addEventListener("click", Input.onBoardClick);
  const __boardPd = qs("#board");
  if (__boardPd)
    __boardPd.addEventListener(
      "pointerdown",
      (ev) => {
        try {
          const busy = computerBusyKind();
          if (busy === "move" || busy === "soufla") {
            try {
              ev.preventDefault();
            } catch (_) {}
          }
        } catch (_) {}
      },
      true,
    );
}

function mountModeControls(_mode, isSpectator) {
  try {
    if (
      document.body &&
      document.body.classList &&
      document.body.classList.contains("z-mobile-on") &&
      document.body.getAttribute("data-mobile-page") === "game"
    ) {
      return;
    }
  } catch (_) {}

  const pool = document.getElementById("controlsPool");
  const pvpBox = document.getElementById("pvpControlsBox");
  const row1 = document.getElementById("pvpRow1");
  const row2 = document.getElementById("pvpRow2");
  const row3 = document.getElementById("pvpRow3");
  const specBar = document.getElementById("specBar");
  if (!pool || !pvpBox || !row1 || !row2 || !row3 || !specBar) return;

  const els = {
    endOnline: document.getElementById("btnEndOnline"),
    sync: document.getElementById("btnSync"),
    undo: document.getElementById("btnUndo"),
    settings: document.getElementById("btnSettings"),
    chat: document.getElementById("btnChat"),
    spk: document.getElementById("btnSpk"),
    mic: document.getElementById("btnMic"),
  };

  const clear = (node) => {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  };

  Object.values(els).forEach((el) => {
    if (el && el.parentElement !== pool) pool.appendChild(el);
  });

  clear(row1);
  clear(row2);
  clear(row3);

  if (isSpectator) {
    const leaveRoom = document.getElementById("btnLeaveRoom");
    if (leaveRoom && leaveRoom.parentElement !== specBar) specBar.appendChild(leaveRoom);
    if (els.chat && els.chat.parentElement !== specBar) specBar.appendChild(els.chat);
    return;
  }

  [els.endOnline, els.sync, els.undo].forEach((el) => el && row1.appendChild(el));
  [els.chat, els.settings].forEach((el) => el && row2.appendChild(el));
  [els.spk, els.mic].forEach((el) => el && row3.appendChild(el));
}

window.ZamatControls = window.ZamatControls || {};
window.ZamatControls.mount = function (isOnline, isSpectator) {
  try {
    mountModeControls("pvp", !!isSpectator);
  } catch (e) {}
};

function applyBoardStyle(style) {
  const requested = style === "3d" ? "3d" : "2d";
  Game.settings.boardStyle = requested;
  try {
    document.body && document.body.classList.toggle("board-depth", requested === "3d");
  } catch {}
  try { Visual.draw(); } catch {}
}

function bindEndKillShortcut() {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.repeat) return;

    const ae = document.activeElement;
    const tag = ae && ae.tagName ? ae.tagName.toUpperCase() : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || (ae && ae.isContentEditable)) return;

    if (Modal.isOpen()) return;

    const btn = qs("#btnEndKill");
    if (btn && !btn.disabled && Game && Game.inChain) {
      btn.click();
      e.preventDefault();
    }
  });
}

function init() {
  initI18n();
  loadSessionSettings();

  applyTheme(Game.settings.theme || AppPref.getTheme());
  try {
    window.ZamatControls &&
      window.ZamatControls.mount(
        document.body.classList.contains("mode-pvp"),
        document.body.classList.contains("z-spectator"),
      );
  } catch (e) {}
  bindUI();
  bindEndKillShortcut();

  const _isOnlineMode = !!(
    document.body &&
    (document.body.classList.contains("mode-pvp") ||
      document.body.classList.contains("z-spectator"))
  );

  if (!_isOnlineMode) {
    let restored = false;
    try {
      restored = !!SessionGame.restore();
    } catch {
      restored = false;
    }
    if (!restored) {
      setupInitialBoard();
      try {
        SessionGame.saveNow();
      } catch {}
    }
  }

  try {
    applyBoardStyle(Game.settings.boardStyle || "2d");
  } catch {}

  try {
    if (window.Online && typeof Online.initPresence === "function") {
      Online.initPresence();
    }
    if (window.Online && typeof Online.initInvitesPassive === "function") {
      Online.initInvitesPassive();
    }
  } catch {}

  if (!_isOnlineMode) {
    Visual.draw();
    Turn.start();
    scheduleForcedOpeningAutoIfNeeded();

    if (
      !Game.gameOver &&
      Game.player === aiSide() &&
      !(Game.forcedEnabled && Game.forcedPly < 10)
    ) {
      window.AI && window.AI.scheduleMove();
    }
  }
}

window.addEventListener("load", () => {
  init();
});

