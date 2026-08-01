(function (root) {
  'use strict';

  const Utils = root.DhametUtils;
  if (!Utils) throw new Error('DhametMatchEnd requires DhametUtils');

  const Result = root.DhametResult || null;
  const TOP = +1;
  const BOT = -1;
  const POLICY = Object.freeze({ administrativeResults: false });
  const clone = Utils.cloneJson;
  const nowMs = Utils.nowMs;
  const cleanString = Utils.cleanStringLoose;
  const cleanDisplay = Utils.cleanDisplayText || Utils.cleanText;

  function side(value, fallback) {
    const n = Number(value);
    if (n === TOP || n === BOT) return n;
    return fallback === TOP || fallback === BOT ? fallback : null;
  }

  function opponent(value) {
    const s = side(value, null);
    return s == null ? null : -s;
  }

  function cleanKind(value) {
    const k = cleanString(value || '', 40).toLowerCase().replace(/[_\s]+/g, '-');
    if (k === 'resign' || k === 'surrender' || k === 'forfeit' || k === 'concede') return 'resign';
    if (k === 'leave' || k === 'exit' || k === 'quit' || k === 'end' || k === 'end-match' || k === 'ended-by-player' || k === 'end-by-player') return 'leave';
    if (k === 'opponent-absent' || k === 'absent' || k === 'absence' || k === 'disconnect-win' || k === 'claim-absence') return 'opponent-absent';
    if (k === 'cancel' || k === 'abort' || k === 'void') return k;
    return k || '';
  }

  function normalizeMatchEndPayload(payload) {
    const src = payload && typeof payload === 'object' ? payload : {};
    const actionSrc = src.action && typeof src.action === 'object' ? src.action : src;
    const kind = cleanKind(actionSrc.kind || actionSrc.type || src.kind || src.type || src.actionType);
    return {
      type: 'match_end_action',
      kind,
      gameId: cleanString(src.gameId || actionSrc.gameId, 160),
      clientEndId: cleanString(src.clientEndId || src.clientActionId || src.clientRequestId || actionSrc.clientEndId || actionSrc.clientActionId || actionSrc.clientRequestId, 160),
      baseMoveIndex: Number(src.baseMoveIndex != null ? src.baseMoveIndex : actionSrc.baseMoveIndex),
      actor: cleanString(src.actor || src.uid || actionSrc.actor || actionSrc.uid, 160) || null,
      by: side(src.by != null ? src.by : actionSrc.by, null),
      nick: cleanDisplay(src.nick || src.byNick || actionSrc.nick || actionSrc.byNick, 80),
      reason: cleanString(src.reason || src.endedReason || actionSrc.reason || actionSrc.endedReason, 80),
      ts: Math.max(0, Number(src.ts || actionSrc.ts || nowMs()) || nowMs()),
      meta: src.meta && typeof src.meta === 'object' ? clone(src.meta) : {},
    };
  }

  function policyForEnd(kind, actorSide, input) {
    const k = cleanKind(kind);
    const src = input && typeof input === 'object' ? input : {};
    if (!['cancel', 'abort', 'void', 'resign', 'leave', 'opponent-absent'].includes(k)) {
      return { ok: false, error: 'match-end/unsupported-action' };
    }
    const resultReason = k === 'opponent-absent'
      ? 'opponent_absent'
      : (k === 'resign' || k === 'leave' ? 'ended_by_player' : k);
    return {
      ok: true,
      kind: k,
      reason: src.reason || resultReason,
      resultReason,
      winner: null,
      loser: null,
      countsAsResult: false,
      neutralEnd: true,
      adjudicated: false,
      terminalType: 'administrative-neutral',
      terminalConfidence: 'certain',
      terminalTag: null,
      rejectionReason: 'backup-administrative-neutral',
      assessment: null,
    };
  }

  function createTerminalResult(input) {
    const src = input && typeof input === 'object' ? input : {};
    const winner = side(src.winner, null);
    const metaCounts = src.meta && typeof src.meta === 'object' ? src.meta.countsAsResult : undefined;
    const countsAsResult = src.countsAsResult !== false && metaCounts !== false;
    const neutralEnd = winner == null && countsAsResult === false;
    const value = {
      status: neutralEnd ? 'ongoing' : (winner == null ? 'draw' : 'win'),
      winner: winner == null ? 0 : winner,
      reason: src.reason || null,
      mode: src.mode || 'pvp',
      moveIndex: src.moveIndex,
      ply: src.ply,
      endedAt: src.endedAt || nowMs(),
      source: src.source || 'firebase-match-end-neutral-v1',
      meta: Object.assign({}, src.meta || {}, { countsAsResult }),
    };
    if (Result && typeof Result.normalizeResult === 'function') return Result.normalizeResult(value);
    return Object.assign({ terminal: !neutralEnd }, value);
  }

  function createAdministrativeEnd(input) {
    const src = input && typeof input === 'object' ? input : {};
    const policy = policyForEnd(src.kind, src.actorSide, { reason: src.reason });
    if (!policy.ok) return policy;
    const endedAt = Math.max(0, Number(src.endedAt || nowMs()) || nowMs());
    const actorUid = cleanString(src.actorUid || src.uid, 160);
    const actorNick = cleanDisplay(src.actorNick || src.nickname, 80);
    const result = createTerminalResult({
      winner: null,
      reason: policy.resultReason,
      mode: 'pvp',
      moveIndex: Number(src.moveIndex || 0) || 0,
      ply: Number(src.ply || 0) || 0,
      endedAt,
      source: 'firebase-administrative-neutral-v1',
      countsAsResult: false,
      meta: {
        kind: policy.kind,
        countsAsResult: false,
        neutralEnd: true,
        adjudicated: false,
        rejectionReason: policy.rejectionReason,
      },
    });
    return {
      ok: true,
      status: 'ended',
      endedAt,
      endedReason: policy.reason,
      endedBy: { uid: actorUid || null, nickname: actorNick },
      winner: null,
      result,
      policy,
    };
  }

  root.DhametMatchEnd = Object.freeze({
    version: 'backup-match-end-neutral-v1',
    POLICY,
    clone,
    cleanKind,
    normalizeMatchEndPayload,
    policyForEnd,
    createTerminalResult,
    createAdministrativeEnd,
    opponent,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
