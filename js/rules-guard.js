(function () {
  "use strict";
  const Rules = window.DhametRules;
  if (!Rules) throw new Error("Latest Dhamet rules engine was not loaded");
  window.DHAMET_RULES_VERSION = "shared-rules-v2";

  window.DhametRuleGuard = Object.freeze({
    version: window.DHAMET_RULES_VERSION,
    validateBoard(board) { return !!Rules.normalizeBoard(board); },
    validateMove(board, side, from, path) {
      return Rules.applyMovePath(board, { from: Number(from), path: (path || []).map(Number) }, Number(side));
    },
    outcome(board, sideToMove) { return Rules.getGameOutcome(board, Number(sideToMove)); }
  });
})();
