(function () {
  function formatTpl(s, vars) {
    return (s || "").replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] != null ? vars[k] : ""));
  }

  const Logger = (() => {
    const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
    const NAMES = ["error", "warn", "info", "debug"];
    let level = 1;
    let remoteUrl = "";
    let remoteEnabled = false;
    let buffer = [];
    const MAX_BUF = 200;

    function _now() {
      try {
        return Date.now();
      } catch (e) {
        return 0;
      }
    }

    function _parseLevel(v) {
      const s = String(v || "")
        .toLowerCase()
        .trim();
      if (s === "debug") return 3;
      if (s === "info") return 2;
      if (s === "warn" || s === "warning") return 1;
      if (s === "error") return 0;
      const n = Number(s);
      return Number.isFinite(n) ? Math.max(0, Math.min(3, n | 0)) : null;
    }

    function _readQuery() {
      try {
        const sp = new URLSearchParams(location.search || "");
        const ql = sp.get("log") || sp.get("logger") || "";
        const dbg = sp.get("debug");
        if (dbg === "1" || dbg === "true") return 3;
        const lv = _parseLevel(ql);
        return lv == null ? null : lv;
      } catch (e) {
        return null;
      }
    }

    function _readStorage() {
      try {
        const v = localStorage.getItem("zamat.log.level");
        const lv = _parseLevel(v);
        return lv == null ? null : lv;
      } catch (e) {
        return null;
      }
    }

    function _init() {
      const q = _readQuery();
      if (q != null) {
        level = q;
        return;
      }
      const s = _readStorage();
      if (s != null) {
        level = s;
        return;
      }
      level = 1;
    }

    function setLevel(v) {
      const lv = _parseLevel(v);
      if (lv == null) return false;
      level = lv;
      try {
        localStorage.setItem("zamat.log.level", NAMES[level]);
      } catch (e) {}
      return true;
    }

    function getLevel() {
      return NAMES[level];
    }

    function _safeClone(x) {
      try {
        if (x == null) return null;
        if (typeof x === "string") return x.length > 500 ? x.slice(0, 500) : x;
        if (typeof x === "number" || typeof x === "boolean") return x;
        if (Array.isArray(x)) return x.slice(0, 20).map(_safeClone);
        if (typeof x === "object") {
          const out = {};
          const ks = Object.keys(x).slice(0, 40);
          for (const k of ks) {
            const lk = String(k).toLowerCase();
            if (
              lk.includes("token") ||
              lk.includes("password") ||
              lk.includes("secret") ||
              lk.includes("auth")
            )
              continue;
            out[k] = _safeClone(x[k]);
          }
          return out;
        }
      } catch (e) {}
      return null;
    }

    function _emitConsole(kind, msg, meta) {
      try {
        const fn =
          kind === "error"
            ? console.error
            : kind === "warn"
              ? console.warn
              : kind === "info"
                ? console.info
                : console.debug;
        if (meta != null) fn("[ZAMAT]", msg, meta);
        else fn("[ZAMAT]", msg);
      } catch (e) {}
    }

    function _push(kind, msg, meta) {
      try {
        const entry = { ts: _now(), level: kind, msg: String(msg || ""), meta: _safeClone(meta) };
        buffer.push(entry);
        if (buffer.length > MAX_BUF) buffer = buffer.slice(buffer.length - MAX_BUF);
        try {
          sessionStorage.setItem("zamat.log.buffer.v1", JSON.stringify(buffer));
        } catch (e) {}
      } catch (e) {}
    }

    async function _sendRemote(entry) {
      if (!remoteEnabled || !remoteUrl) return;
      try {
        await fetch(remoteUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            kind: entry.level,
            ts: entry.ts,
            msg: entry.msg,
            meta: entry.meta,
          }),
        });
      } catch (e) {}
    }

    function _logAt(lv, kind, args) {
      if (lv > level) return;
      const a = Array.prototype.slice.call(args || []);
      const msg = a.length ? String(a[0]) : "";
      const meta = a.length > 1 ? a[1] : null;
      _push(kind, msg, meta);
      _emitConsole(kind, msg, meta);
      _sendRemote({ ts: _now(), level: kind, msg, meta: _safeClone(meta) });
    }

    function error() {
      _logAt(0, "error", arguments);
    }
    function warn() {
      _logAt(1, "warn", arguments);
    }
    function info() {
      _logAt(2, "info", arguments);
    }
    function debug() {
      _logAt(3, "debug", arguments);
    }

    function capture(err, ctx) {
      try {
        const e = err || {};
        const meta = {
          ctx: _safeClone(ctx),
          name: String(e.name || ""),
          code: String(e.code || ""),
          message: String(e.message || ""),
          stack: typeof e.stack === "string" ? e.stack.split("\n").slice(0, 6).join("\n") : "",
        };
        error("error", meta);
      } catch (e2) {}
    }

    function setRemote(url, enabled) {
      remoteUrl = String(url || "").trim();
      remoteEnabled = !!enabled && !!remoteUrl;
      return remoteEnabled;
    }

    function getBuffer() {
      try {
        const raw = sessionStorage.getItem("zamat.log.buffer.v1");
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return buffer.slice();
    }

    _init();
    return { setLevel, getLevel, setRemote, getBuffer, capture, error, warn, info, debug };
  })();
  try {
    window.Logger = Logger;
  } catch (e) {}

  async function tryFinalizeTrainingOnExit() {
    return false;
  }

  function normalizeSouflaFx(fx) {
    try {
      if (!fx || typeof fx !== "object") return null;
      const out = {};

      if (Array.isArray(fx.redPaths) && fx.redPaths.length) {
        const rp = [];
        for (const seg of fx.redPaths) {
          if (!seg) continue;
          const from = Number(seg.from);
          const path = Array.isArray(seg.path)
            ? seg.path.map(Number).filter(Number.isFinite)
            : null;
          if (!Number.isFinite(from) || !path || !path.length) continue;
          const jumps = Array.isArray(seg.jumps)
            ? seg.jumps.map(Number).filter(Number.isFinite)
            : [];
          rp.push({ from, path, jumps });
        }
        if (rp.length) out.redPaths = rp;
      }

      if (!out.redPaths && fx.red && fx.red.from != null && fx.red.to != null) {
        const f = Number(fx.red.from);
        const t = Number(fx.red.to);
        if (Number.isFinite(f) && Number.isFinite(t)) out.red = { from: f, to: t };
      }

      if (fx.undoArrow) {
        try {
          const f = fx.undoArrow.from != null ? Number(fx.undoArrow.from) : null;
          if (Array.isArray(fx.undoArrow.path) && f != null && Number.isFinite(f)) {
            const path = fx.undoArrow.path.map(Number).filter(Number.isFinite);
            if (path.length) out.undoArrow = { from: f, path };
          } else if (fx.undoArrow.from != null && fx.undoArrow.to != null) {
            const f2 = Number(fx.undoArrow.from);
            const t2 = Number(fx.undoArrow.to);
            if (Number.isFinite(f2) && Number.isFinite(t2)) out.undoArrow = { from: f2, to: t2 };
          }
        } catch (e) {}
      }

      if (fx.removeIdx != null) {
        const r = Number(fx.removeIdx);
        if (Number.isFinite(r)) out.removeIdx = r;
      }

      if (Array.isArray(fx.forcePath) && fx.forcePath.length) {
        const fp = fx.forcePath.map(Number).filter(Number.isFinite);
        if (fp.length) out.forcePath = fp;
      }

      return Object.keys(out).length ? out : null;
    } catch (e) {
      return null;
    }
  }

  function buildSouflaFxFromDecisionAndPending(decision, pending) {
    try {
      if (!decision || !pending) return null;
      const fx = {};

      try {
        const offIdx = decision.offenderIdx;
        const maxLen =
          pending.longestByPiece && pending.longestByPiece.get
            ? pending.longestByPiece.get(offIdx) || 0
            : 0;

        if (
          offIdx != null &&
          maxLen > 0 &&
          pending.turnStartSnapshot &&
          typeof snapshotState === "function" &&
          typeof restoreSnapshotSilent === "function" &&
          typeof longestPathsWithJumpsFrom === "function"
        ) {
          const keep = snapshotState();
          try {
            if (typeof simEnter === "function") simEnter();
          } catch (e) {}
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
              fx.redPaths = [
                {
                  from: Number(offIdx),
                  path: chosen.path.slice(),
                  jumps: Array.isArray(chosen.jumps) ? chosen.jumps.slice() : [],
                },
              ];
            }
          } finally {
            try {
              restoreSnapshotSilent(keep);
            } catch (e) {}
            try {
              if (typeof simExit === "function") simExit();
            } catch (e) {}
          }
        }
      } catch (e) {}

      if (decision.kind === "remove") {
        fx.removeIdx = decision.offenderIdx;
      } else if (decision.kind === "force") {
        const p = [decision.offenderIdx].concat(Array.isArray(decision.path) ? decision.path : []);
        fx.forcePath = p;
        if (pending.startedFrom != null && pending.lastPieceIdx != null) {
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
                fx.undoArrow = { from: rev[0], path: rev.slice(1) };
              }
            } else if (pending.startedFrom != null && pending.lastPieceIdx != null) {
              fx.undoArrow = { from: pending.lastPieceIdx, to: pending.startedFrom };
            }
          } catch (e) {}
        }
      }

      return fx;
    } catch (e) {
      return null;
    }
  }

  function isPermissionDenied(err) {
    const parts = [];
    try {
      if (err && err.code != null) parts.push(String(err.code));
    } catch (e) {}
    try {
      if (err && err.message) parts.push(String(err.message));
    } catch (e) {}
    const msg = parts.join(" | ");
    return /permission[_ -]?denied/i.test(msg);
  }

  function _ctx(meta) {
    try {
      return String((meta && (meta.ctx || meta.context)) || "");
    } catch (e) {
      return "";
    }
  }

  function _spectatorMayWrite(ctx) {
    ctx = String(ctx || "");
    return /^(players\.|gamePresence\.|spectator\.|chat\.)/.test(ctx);
  }

  function _dbErrorMessage(err, fallbackMsg, meta) {
    try {
      if (!isPermissionDenied(err)) return fallbackMsg || "";
      const ctx = _ctx(meta);
      const info = getAuthDebug();
      if (!info.signedIn) return window.I18N.translateArgs("online.errors.authRequired");
      if (ctx.indexOf("gamePresence") === 0) return window.I18N.translateArgs("online.errors.presenceWriteDenied");
      if (ctx.indexOf("invite") === 0) return window.I18N.translateArgs("online.errors.inviteWriteDenied");
      if (ctx.indexOf("chat") === 0) return window.I18N.translateArgs("online.errors.chatWriteDenied");
      if (ctx.indexOf("rtc") === 0) return window.I18N.translateArgs("online.errors.voiceWriteDenied");
      if (ctx.indexOf("move") === 0 || ctx.indexOf("soufla") === 0 || ctx.indexOf("undo") === 0 || ctx.indexOf("log") === 0) {
        try {
          if (window.Online && window.Online.isSpectator) {
            return window.I18N.translateArgs("spectator.only") || window.I18N.translateArgs("online.errors.spectatorAction");
          }
          if (window.Online && window.Online._lastGameData && window.Online._lastGameData.status && window.Online._lastGameData.status !== "active") {
            return window.I18N.translateArgs("online.errors.matchEnded");
          }
        } catch (e) {}
        return window.I18N.translateArgs("online.errors.moveWriteDenied");
      }
      return fallbackMsg || window.I18N.translateArgs("online.permissionDenied");
    } catch (e) {
      return fallbackMsg || "";
    }
  }

  function handleDbError(err, fallbackMsg, meta) {
    try {
      const msg = _dbErrorMessage(err, fallbackMsg, meta || null);
      if (msg) showOnlineNotice(msg, { allowSpectator: true });
    } catch (e) {}
  }

  const DENIED_LOG_TTL_MS = 4000;
  const DENIED_LOG_MAX_KEYS = 200;
  const _DENIED_LOG_LAST = Object.create(null);
  let _DENIED_LOG_KEYS = 0;
  function _shouldLogDenied(key) {
    try {
      const now = Date.now();
      const last = _DENIED_LOG_LAST[key] || 0;
      if (now - last < DENIED_LOG_TTL_MS) return false;
      _DENIED_LOG_LAST[key] = now;
      _DENIED_LOG_KEYS++;
      if (_DENIED_LOG_KEYS > DENIED_LOG_MAX_KEYS) {
        for (const k in _DENIED_LOG_LAST) delete _DENIED_LOG_LAST[k];
        _DENIED_LOG_KEYS = 0;
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  function guardOnlineWrite(meta) {
    try {
      const ctx = _ctx(meta);
      if (window.Online && window.Online.isSpectator && !_spectatorMayWrite(ctx)) {
        showOnlineNotice(
          window.I18N.translateArgs("spectator.only") || window.I18N.translateArgs("online.errors.spectatorAction"),
          { allowSpectator: true },
        );
        return false;
      }
    } catch (e) {}
    return true;
  }

  function getAuthDebug() {
    try {
      const u =
        auth && auth.currentUser
          ? auth.currentUser
          : firebase && firebase.auth
            ? firebase.auth().currentUser
            : null;
      const signedIn = !!(u && u.uid);
      const authUid = signedIn ? String(u.uid) : null;
      return { signedIn, authUid };
    } catch (e) {
      return { signedIn: false, authUid: null };
    }
  }

  function requireAuthUid(expectedUid) {
    const info = getAuthDebug();
    if (!info.signedIn || !info.authUid) return null;
    if (expectedUid != null && String(expectedUid) !== info.authUid) return null;
    return info.authUid;
  }

  function refPathString(ref) {
    try {
      return ref && typeof ref.toString === "function" ? ref.toString() : String(ref || "");
    } catch (e) {
      return "";
    }
  }

  function logDeniedWrite(meta, err) {
    try {
      const info = getAuthDebug();
      const op = meta && meta.op ? String(meta.op) : "write";
      const path =
        meta && meta.path ? String(meta.path) : meta && meta.ref ? refPathString(meta.ref) : "";
      const uid = meta && meta.uid ? String(meta.uid) : "";
      const ctx = meta && meta.ctx ? String(meta.ctx) : "";
      const key = op + "|" + path + "|" + ctx;
      if (!_shouldLogDenied(key)) return;
    } catch (e) {}
  }

  async function safeDbWrite(op, ref, data, meta) {
    meta = meta || {};
    meta.op = op;
    meta.ref = ref;

    if (!guardOnlineWrite(meta)) return false;

    if (meta.uid != null) {
      const okUid = requireAuthUid(meta.uid);
      if (!okUid) return false;
    } else {
      const info = getAuthDebug();
      if (!info.signedIn) return false;
    }

    try {
      if (op === "update") {
        await ref.update(data);
        return true;
      }
      if (op === "set") {
        await ref.set(data);
        return true;
      }
      if (op === "remove") {
        await ref.remove();
        return true;
      }
      if (op === "push") {
        await ref.push(data);
        return true;
      }
      await ref.set(data);
      return true;
    } catch (err) {
      if (isPermissionDenied(err)) {
        logDeniedWrite(meta, err);
        try {
          if (typeof meta.onDenied === "function") meta.onDenied(err);
        } catch (e) {}
        if (!meta.suppressGlobalDenied) handleDbError(err, null, meta);
        return false;
      }
      try {
        Logger.warn("db_write_failed", {
          op: String(op || ""),
          path: String(meta.path || ""),
          ctx: String(meta.ctx || ""),
          code: String((err && (err.code || err.name)) || ""),
          message: String((err && (err.message || (err.toString && err.toString()))) || ""),
        });
      } catch (e) {}
      return false;
    }
  }

  function safeDbWriteNoAwait(op, ref, data, meta) {
    meta = meta || {};
    meta.op = op;
    meta.ref = ref;

    if (!guardOnlineWrite(meta)) return false;

    if (meta.uid != null) {
      const okUid = requireAuthUid(meta.uid);
      if (!okUid) return false;
    } else {
      const info = getAuthDebug();
      if (!info.signedIn) return false;
    }

    try {
      let p;
      if (op === "update") p = ref.update(data);
      else if (op === "set") p = ref.set(data);
      else if (op === "remove") p = ref.remove();
      else if (op === "push") p = ref.push(data);
      else p = ref.set(data);

      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          if (isPermissionDenied(err)) {
            logDeniedWrite(meta, err);
            try {
              if (typeof meta.onDenied === "function") meta.onDenied(err);
            } catch (e) {}
            if (!meta.suppressGlobalDenied) handleDbError(err, null, meta);
          } else {
            try {
              Logger.warn("db_write_failed", {
                op: String(op || ""),
                path: String(meta.path || ""),
                ctx: String(meta.ctx || ""),
                code: String((err && (err.code || err.name)) || ""),
                message: String((err && (err.message || (err.toString && err.toString()))) || ""),
              });
            } catch (e) {}
          }
        });
      }
      return true;
    } catch (err) {
      if (isPermissionDenied(err)) {
        logDeniedWrite(meta, err);
        try {
          if (typeof meta.onDenied === "function") meta.onDenied(err);
        } catch (e) {}
        if (!meta.suppressGlobalDenied) handleDbError(err, null, meta);
      }
      try {
        Logger.warn("db_write_failed", {
          op: String(op || ""),
          path: String(meta.path || ""),
          ctx: String(meta.ctx || ""),
          code: String((err && (err.code || err.name)) || ""),
          message: String((err && (err.message || (err.toString && err.toString()))) || ""),
        });
      } catch (e) {}
      return false;
    }
  }

  async function safePlayerWrite(ref, uid, data, ctx, onDenied) {
    uid = String(uid || "");
    if (!uid) return false;
    return await safeDbWrite("update", ref, data, { uid, path: "/players/" + uid, ctx, onDenied });
  }
  function safePlayerWriteNoAwait(ref, uid, data, ctx, onDenied) {
    uid = String(uid || "");
    if (!uid) return false;
    return safeDbWriteNoAwait("update", ref, data, { uid, path: "/players/" + uid, ctx, onDenied });
  }

  function isGamePage() {
    try {
      return !!document.getElementById("board");
    } catch (e) {
      return false;
    }
  }

  function escapeHtml(s) {
    const str = String(s == null ? "" : s);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const LOG_ENC_PREFIX = "@@ZL1@";

  function encodeSharedLogText(ev) {
    try {
      if (!ev || typeof ev !== "object") return String(ev ?? "");
      const kind = String(ev.kind || "");
      let packed = null;

      if (kind === "i18n") {
        packed = {
          k: "i",
          K: String(ev.key || ""),
          v: ev.vars && typeof ev.vars === "object" ? ev.vars : {},
        };
      } else if (kind === "actor_i18n") {
        packed = {
          k: "a",
          a: String(ev.actor || ""),
          K: String(ev.key || ""),
          v: ev.vars && typeof ev.vars === "object" ? ev.vars : {},
        };
      } else if (kind === "turn") {
        packed = { k: "t", s: ev.side, f: ev.from, t: ev.to, c: ev.captures | 0 };
      } else if (kind === "promote") {
        packed = { k: "p", s: ev.side, i: ev.idx };
      } else if (kind === "soufla_remove") {
        packed = { k: "sr", i: ev.idx };
      } else if (kind === "soufla_force") {
        packed = { k: "sf", f: ev.from, p: Array.isArray(ev.path) ? ev.path : ev.path };
      } else if (kind === "undo") {
        packed = { k: "u", f: ev.from, t: ev.to };
      } else if (kind === "raw") {
        return String(ev.text ?? "");
      } else {
        return String(ev.text ?? ev.msg ?? "");
      }

      let txt = LOG_ENC_PREFIX + JSON.stringify(packed);

      if (txt.length > 200) {
        try {
          if ((packed.k === "i" || packed.k === "a") && packed.v && typeof packed.v === "object") {
            for (const kk of Object.keys(packed.v)) {
              const vv = packed.v[kk];
              if (typeof vv === "string" && vv.length > 80) packed.v[kk] = vv.slice(0, 80);
            }
          }
          if (packed.k === "sf" && typeof packed.p === "string" && packed.p.length > 120) {
            packed.p = packed.p.slice(0, 120);
          }
          if (packed.k === "sf" && Array.isArray(packed.p) && packed.p.length > 60) {
            packed.p = packed.p.slice(0, 60);
          }
          txt = LOG_ENC_PREFIX + JSON.stringify(packed);
        } catch (e) {}
      }

      if (txt.length > 200) {
        try {
          if (packed.k === "i")
            txt = LOG_ENC_PREFIX + JSON.stringify({ k: "i", K: packed.K, v: {} });
          else if (packed.k === "a")
            txt = LOG_ENC_PREFIX + JSON.stringify({ k: "a", a: packed.a, K: packed.K, v: {} });
          else txt = txt.slice(0, 200);
        } catch (e) {
          txt = txt.slice(0, 200);
        }
      }

      if (txt.length > 200) txt = txt.slice(0, 200);
      return txt;
    } catch (e) {
      return "";
    }
  }

  function decodeSharedLogText(text) {
    try {
      if (typeof text !== "string") return null;
      if (!text.startsWith(LOG_ENC_PREFIX)) return null;
      const raw = text.slice(LOG_ENC_PREFIX.length);
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return null;

      if (obj.k === "i")
        return { kind: "i18n", key: obj.K, vars: obj.v && typeof obj.v === "object" ? obj.v : {} };
      if (obj.k === "a")
        return {
          kind: "actor_i18n",
          actor: obj.a || "",
          key: obj.K,
          vars: obj.v && typeof obj.v === "object" ? obj.v : {},
        };
      if (obj.k === "t")
        return { kind: "turn", side: obj.s, from: obj.f, to: obj.t, captures: obj.c | 0 };
      if (obj.k === "p") return { kind: "promote", side: obj.s, idx: obj.i };
      if (obj.k === "sr") return { kind: "soufla_remove", idx: obj.i };
      if (obj.k === "sf") return { kind: "soufla_force", from: obj.f, path: obj.p };
      if (obj.k === "u") return { kind: "undo", from: obj.f, to: obj.t };

      return null;
    } catch (e) {
      return null;
    }
  }

  function normalizeLogArrayForWrite(arr) {
    try {
      if (!Array.isArray(arr)) return [];
      for (let i = 0; i < arr.length; i++) {
        const it = arr[i];
        if (!it || typeof it !== "object") continue;

        const hasStructured =
          it.kind != null ||
          it.type != null ||
          it.key != null ||
          it.actor != null ||
          it.side != null ||
          it.by != null ||
          it.s != null ||
          it.from != null ||
          it.to != null ||
          it.f != null ||
          it.t != null ||
          it.idx != null ||
          it.path != null ||
          it.captures != null ||
          it.c != null ||
          typeof it.msg === "string";

        if (typeof it.text === "string") {
          const dec = decodeSharedLogText(it.text);
          if (dec) continue;
          if (!hasStructured) continue;
        }

        const pick = (a, b) => (a !== undefined && a !== null ? a : b);

        let ev = null;
        const k = String(it.kind || it.type || "");

        const side = pick(it.side, pick(it.by, it.s));
        const from = pick(it.from, it.f);
        const to = pick(it.to, it.t);
        const captures = pick(it.captures, it.c);

        if (
          k === "turn" ||
          (from != null && to != null && side != null && (k === "" || k === "move"))
        ) {
          ev = { kind: "turn", side: side, from: from, to: to, captures: captures | 0 };
        } else if (k === "undo") {
          ev = { kind: "undo", from: from, to: to };
        } else if (k === "promote") {
          ev = { kind: "promote", side: side, idx: it.idx };
        } else if (k === "soufla_remove") {
          ev = { kind: "soufla_remove", idx: it.idx };
        } else if (k === "soufla_force") {
          ev = { kind: "soufla_force", from: from, path: it.path };
        } else if (k === "actor_i18n" || it.actor) {
          ev = { kind: "actor_i18n", actor: it.actor, key: it.key, vars: it.vars };
        } else if (k === "i18n" || it.key) {
          ev = { kind: "i18n", key: it.key, vars: it.vars };
        } else if (typeof it.msg === "string") {
          ev = { kind: "raw", text: it.msg };
        } else if (typeof it.text === "string") {
          ev = { kind: "raw", text: it.text };
        }

        it.ts = typeof it.ts === "number" ? it.ts : nowTs();
        it.text = encodeSharedLogText(ev || { kind: "raw", text: "" });

        try {
          delete it.kind;
          delete it.key;
          delete it.vars;
          delete it.actor;
          delete it.side;
          delete it.by;
          delete it.s;
          delete it.from;
          delete it.f;
          delete it.to;
          delete it.t;
          delete it.captures;
          delete it.c;
          delete it.idx;
          delete it.path;
          delete it.msg;
        } catch (e) {}
      }
      return arr;
    } catch (e) {
      return arr;
    }
  }

  const firebaseConfig =
    window.firebaseConfig && typeof window.firebaseConfig === "object"
      ? window.firebaseConfig
      : null;

  let db = null;
  let auth = null;

  function showOnlineNotice(msg, opts) {
    const cfg = opts && typeof opts === "object" ? opts : {};
    try {
      if (
        !cfg.allowSpectator &&
        document.body &&
        document.body.classList &&
        document.body.classList.contains("z-spectator")
      )
        return;
    } catch (_) {}
    const titleText = cfg.title || window.I18N.translateArgs(cfg.titleKey || "modals.notice");
    const safeMsg = String(msg ?? "");
    try {
      if (window.Modal && typeof Modal.alert === "function") {
        Modal.alert({
          title: titleText,
          text: safeMsg,
          okLabel: cfg.okLabel || window.I18N.translateArgs("actions.close"),
          okClassName: cfg.okClassName,
          allowSpectator: cfg.allowSpectator,
          allowEsc: cfg.allowEsc,
          focusSelector: cfg.focusSelector,
          modalClassName: cfg.modalClassName,
          onClick: cfg.onClick,
          onClose: cfg.onClose,
          onEnter: cfg.onEnter,
        });
        return;
      }
    } catch (e) {}
    try {
      alert(safeMsg);
    } catch (e) {}
  }


  function ensureFirebase() {
    if (db && auth) return true;
    try {
      if (typeof firebase === "undefined") return false;
      if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
      db = firebase.database();
      auth = firebase.auth();
      try {
        initServerTimeOffset();
      } catch (e) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  let _serverOffsetMs = 0;
  let _serverOffsetInit = false;

  function initServerTimeOffset() {
    if (_serverOffsetInit) return;
    _serverOffsetInit = true;
    try {
      if (!db || !db.ref) return;
      db.ref(".info/serverTimeOffset").on("value", (s) => {
        try {
          _serverOffsetMs = Number((s && s.val && s.val()) || 0) || 0;
        } catch (e) {
          _serverOffsetMs = 0;
        }
      });
    } catch (e) {}
  }

  function nowTs() {
    return Date.now() + (_serverOffsetMs || 0);
  }
  function localNow() {
    return Date.now();
  }

  const PERSIST_GAME_ID_KEY = "zamat.activeGameId";
  const PERSIST_GAME_TS_KEY = "zamat.activeGameTs";

  function ssGet(k) {
    try {
      return sessionStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function ssSet(k, v) {
    try {
      sessionStorage.setItem(k, v);
    } catch (e) {}
  }
  function ssRemove(k) {
    try {
      sessionStorage.removeItem(k);
    } catch (e) {}
  }

  function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  }
  function chatLastReadKey(gameId, uid) {
    try {
      return "zamat.chatLastRead." + String(gameId || "") + "." + String(uid || "");
    } catch (e) {
      return "zamat.chatLastRead";
    }
  }function nickSuffixFromUid(uid) {
    try {
      const s = String(uid || "");
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }

      const n = (h % 9000) + 1000;
      return String(n);
    } catch (e) {
      return String(Math.floor(1000 + Math.random() * 9000));
    }
  }

  function defaultNick(uid) {
    const base = window.I18N.translateArgs("players.player");
    return `${base} ${nickSuffixFromUid(uid)}`;
  }

  const NICK_KEY = "zamat.nick";
  const NICK_EXPLICIT_KEY = "zamat.nickExplicit";

  const MIGRATION_VERSION_KEY = "zamat.migrationVersion";

  function readMigrationVersion() {
    try {
      const v = parseInt(localStorage.getItem(MIGRATION_VERSION_KEY) || "0", 10);
      return Number.isFinite(v) ? Math.max(0, v | 0) : 0;
    } catch (e) {
      return 0;
    }
  }

  function writeMigrationVersion(v) {
    try {
      localStorage.setItem(MIGRATION_VERSION_KEY, String(v | 0));
    } catch (e) {}
  }

  function runMigrationsOnline() {
    const cur = readMigrationVersion();
    if (cur >= 1) return;

    let legacyNick = "";
    let legacyExplicit = "";
    try {
      legacyNick = String(localStorage.getItem(NICK_KEY) || "").trim();
    } catch (e) {
      legacyNick = "";
    }
    try {
      legacyExplicit = String(localStorage.getItem(NICK_EXPLICIT_KEY) || "").trim();
    } catch (e) {
      legacyExplicit = "";
    }

    if (legacyNick) {
      try {
        if (!sessionStorage.getItem(NICK_KEY)) sessionStorage.setItem(NICK_KEY, legacyNick);
      } catch (e) {}
    }
    if (legacyExplicit) {
      try {
        if (!sessionStorage.getItem(NICK_EXPLICIT_KEY))
          sessionStorage.setItem(NICK_EXPLICIT_KEY, legacyExplicit);
      } catch (e) {}
    }

    let ok = true;
    if (legacyNick) {
      try {
        ok = ok && String(sessionStorage.getItem(NICK_KEY) || "").trim() === legacyNick;
      } catch (e) {
        ok = false;
      }
    }

    if (ok) {
      try {
        localStorage.removeItem(NICK_KEY);
      } catch (e) {}
      try {
        localStorage.removeItem(NICK_EXPLICIT_KEY);
      } catch (e) {}
      writeMigrationVersion(1);
      try {
        Logger.info("migration", { step: 1 });
      } catch (e) {}
    } else {
      try {
        Logger.warn("migration_failed", { step: 1 });
      } catch (e) {}
    }
  }

  runMigrationsOnline();

  const PRESENCE_STABLE_TTL_MS = 90 * 1000;
  const PRESENCE_LIST_TTL_MS = PRESENCE_STABLE_TTL_MS;
  const PRESENCE_ONLINE_TTL_MS = PRESENCE_STABLE_TTL_MS;

  const PRESENCE_HEARTBEAT_MS = 25 * 1000;
  const GAME_PRESENCE_HEARTBEAT_MS = 12 * 1000;
  const GAME_PRESENCE_ONLINE_TTL_MS = 45 * 1000;
  const SPECTATOR_COUNT_STALE_MS = 90 * 1000;
  const ROOM_ABANDONED_CLEANUP_MS = 60 * 1000;
  const ROOM_ENDED_PURGE_DELAY_MS = 1500;
  const ROOM_ACTIVITY_TOUCH_MS = 60 * 1000;
  const INVITE_PREF_CACHE_KEY = "zamat.acceptsInvites.v1";
  const ROOM_VISIBILITY_PUBLIC = "public";
  const ROOM_VISIBILITY_PRIVATE = "private";

  const INVITE_TTL_MS = 30 * 1000;
  const INVITE_CLEANUP_INTERVAL_MS = 5 * 1000;
  const OPPONENT_ABSENCE_MS = 2 * 60 * 1000;
  const OPPONENT_ABSENCE_CHECK_MS = 5 * 1000;
  const MOVE_SYNC_STALL_MS = 20 * 1000;
  const MOVE_SYNC_WARN_AFTER_MS = 30 * 1000;
  const MOVE_SYNC_WATCHDOG_MS = 2 * 1000;
  const RECOVERY_SIGNAL_MAX_AGE_MS = 2 * 60 * 1000;
  const MAX_SIMULTANEOUS_CONNECTIONS = 100;
  function isPresenceFresh(ts, ttlMs) {
    try {
      const lastSeen = Number(ts || 0) || 0;
      const ttl = Number(ttlMs || PRESENCE_STABLE_TTL_MS) || PRESENCE_STABLE_TTL_MS;
      return !!(lastSeen && nowTs() - lastSeen <= ttl);
    } catch (e) {
      return false;
    }
  }

  function normalizeRoomVisibility(value) {
    return String(value || ROOM_VISIBILITY_PUBLIC) === ROOM_VISIBILITY_PRIVATE
      ? ROOM_VISIBILITY_PRIVATE
      : ROOM_VISIBILITY_PUBLIC;
  }

  function playerAcceptsInvites(player) {
    return !(player && player.acceptsInvites === false);
  }

  function localAcceptsInvitesPreference() {
    try {
      return localStorage.getItem(INVITE_PREF_CACHE_KEY) !== "0";
    } catch (e) {
      return true;
    }
  }

  function formatPresenceDisconnectElapsed(startedAt) {
    try {
      const start = Number(startedAt || 0) || 0;
      if (!start) return '00:00';
      const totalSeconds = Math.max(0, Math.floor((nowTs() - start) / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    } catch (e) {
      return '00:00';
    }
  }

  function getNickFromSessionUser() {
    try {
      const raw = sessionStorage.getItem("zamat.session.user.v1");
      if (!raw) return "";
      const obj = JSON.parse(raw);
      const n = obj && obj.nickname ? String(obj.nickname).trim() : "";
      return n;
    } catch (e) {
      return "";
    }
  }

  function getSavedNick() {
    const fromSessionUser = getNickFromSessionUser();
    if (fromSessionUser) return fromSessionUser;
    try {
      const n = (sessionStorage.getItem(NICK_KEY) || "").trim();
      if (n) return n;
    } catch (e) {}
    try {
      return (sessionStorage.getItem(NICK_KEY) || "").trim();
    } catch (e) {
      return "";
    }
  }

  function saveNickSession(nick, explicit) {
    try {
      sessionStorage.setItem(NICK_KEY, String(nick || ""));
      if (explicit) sessionStorage.setItem(NICK_EXPLICIT_KEY, "1");
    } catch (e) {}

    try {
      localStorage.removeItem(NICK_KEY);
    } catch (e) {}
    try {
      localStorage.removeItem(NICK_EXPLICIT_KEY);
    } catch (e) {}
  }

  let _authReadyPromise = null;
  async function ensureAuthReady() {
    if (!ensureFirebase()) return false;
    try {
      // emergency-shell owns anonymous sign-in. Await its shared promise first so
      // this module never starts a second anonymous sign-in with a different UID.
      try {
        if (window.DhametEmergencyReady && typeof window.DhametEmergencyReady.then === "function") {
          await window.DhametEmergencyReady;
        }
      } catch (_) {}

      if (auth && auth.currentUser && auth.currentUser.isAnonymous) return true;
      if (auth && auth.currentUser && !auth.currentUser.isAnonymous) {
        await auth.signOut();
      }
      if (!_authReadyPromise) {
        _authReadyPromise = auth.signInAnonymously()
          .then(() => !!(auth && auth.currentUser && auth.currentUser.isAnonymous))
          .catch(() => false)
          .finally(() => { _authReadyPromise = null; });
      }
      return await _authReadyPromise;
    } catch (_) {
      _authReadyPromise = null;
      return false;
    }
  }

  function getSavedNickOrDefault(uid) {
    const saved = getSavedNick();
    const nick = saved || defaultNick(uid);

    if (!getNickFromSessionUser()) {
      saveNickSession(nick, !!saved);
    }
    return nick;
  }

  function allowedUserIcons() {
    const raw = window.ZIconManifest && Array.isArray(window.ZIconManifest) ? window.ZIconManifest : null;
    if (raw && raw.length) {
      return raw.filter((p, i, arr) => {
        const s = String(p || "").trim();
        return /^assets\/icons\/users\/(user\d+|autouser1|autouser2|autouser1)\.png$/i.test(s) && arr.indexOf(p) === i;
      });
    }
    const a = [];
    for (let i = 1; i <= 20; i++) a.push("assets/icons/users/user" + i + ".png");
    a.push("assets/icons/users/autouser1.png");
    a.push("assets/icons/users/autouser2.png");
    a.push("assets/icons/users/autouser1.png");
    return a;
  }

  function sanitizeUserIcon(p) {
    p = String(p || "").trim();
    p = p.replace(/^(?:\.\.\/)+/g, "").replace(/^\/+/, "");
    if (!p) return "";

    if (/^assets\/icons\/usre1\.svg$/i.test(p)) p = "assets/icons/users/user1.png";

    let m = p.match(/^assets\/icons\/user(\d+)\.(svg|png)$/i);
    if (m) p = `assets/icons/users/user${m[1]}.png`;
    if (/^assets\/icons\/user\.(svg|png)$/i.test(p)) p = "assets/icons/users/user1.png";

    m = p.match(/^assets\/icons\/users\/user(\d+)\.(svg|png)$/i);
    if (m) p = `assets/icons/users/user${m[1]}.png`;
    if (/^assets\/icons\/users\/user\.(svg|png)$/i.test(p)) p = "assets/icons/users/user1.png";

    if (/^user(\d+)$/i.test(p)) {
      const n = p.match(/^user(\d+)$/i);
      p = `assets/icons/users/user${n[1]}.png`;
    }
    if (/^user(\d+)\.(svg|png)$/i.test(p)) {
      const n = p.match(/^user(\d+)\.(svg|png)$/i);
      p = `assets/icons/users/user${n[1]}.png`;
    }
    if (/^(autouser1|autouser2|autouser1)(\.(svg|png))?$/i.test(p)) {
      const n = p.match(/^(autouser1|autouser2|autouser1)/i);
      p = `assets/icons/users/${n[1]}.png`;
    }
    if (/^assets\/icons\/users\/(autouser1|autouser2|autouser1)\.(svg|png)$/i.test(p)) {
      const n = p.match(/^assets\/icons\/users\/(autouser1|autouser2|autouser1)\.(svg|png)$/i);
      p = `assets/icons/users/${n[1]}.png`;
    }

    if (!/^assets\/icons\/users\/[a-z0-9_-]+\.png$/i.test(p)) return "";
    if (!allowedUserIcons().includes(p)) return "";
    return p;
  }

  const ASSET_PREFIX = (function () {
    try {
      const p = location && location.pathname ? String(location.pathname) : "";
      return p.includes("/pages/") ? "../" : "";
    } catch (e) {
      return "";
    }
  })();

  function iconSrcForPage(p) {
    const ic = sanitizeUserIcon(p) || "assets/icons/users/user1.png";
    return ASSET_PREFIX + ic;
  }

  function getSavedIconOrDefault() {
    const def = "assets/icons/users/user1.png";
    try {
      const raw = sessionStorage.getItem("zamat.session.user.v1");
      if (raw) {
        const obj = JSON.parse(raw);
        const ic = sanitizeUserIcon(obj && obj.icon);
        if (ic) return ic;
      }
    } catch (e) {}

    try {
      const ic = sanitizeUserIcon(localStorage.getItem("zamat.icon"));
      if (ic) return ic;
    } catch (e) {}

    return def;
  }
  function currentSessionIsRegistered() {
    try {
      if (window.ZAuth && typeof window.ZAuth.readSession === "function") {
        const s = window.ZAuth.readSession();
        return false;
      }
    } catch (e) {}
    return false;
  }

  function guestListIconByIndex(index) {
    return index % 2 === 0 ? ASSET_PREFIX + "assets/icons/users/autouser1.png" : ASSET_PREFIX + "assets/icons/users/autouser2.png";
  }

  function openOnlineTextPrompt(opts) {
    const cfg = opts && typeof opts === "object" ? opts : {};
    return new Promise((resolve) => {
      try {
        const body = document.createElement("div");
        if (cfg.bodyClassName) body.className = String(cfg.bodyClassName);
        if (cfg.bodyStyle && typeof cfg.bodyStyle === "object") Object.assign(body.style, cfg.bodyStyle);

        if (cfg.description) {
          const description = document.createElement("div");
          description.textContent = String(cfg.description);
          if (cfg.descriptionClassName) description.className = String(cfg.descriptionClassName);
          if (cfg.descriptionStyle && typeof cfg.descriptionStyle === "object")
            Object.assign(description.style, cfg.descriptionStyle);
          body.appendChild(description);
        }

        if (cfg.label) {
          const labelEl = document.createElement("label");
          labelEl.textContent = String(cfg.label);
          if (cfg.labelClassName) labelEl.className = String(cfg.labelClassName);
          if (cfg.labelStyle && typeof cfg.labelStyle === "object") Object.assign(labelEl.style, cfg.labelStyle);
          body.appendChild(labelEl);
        }

        const input = document.createElement("input");
        input.type = "text";
        input.value = String(cfg.value || "");
        input.placeholder = String(cfg.placeholder || "");
        input.autocomplete = cfg.autocomplete != null ? String(cfg.autocomplete) : "off";
        if (cfg.inputId) input.id = String(cfg.inputId);
        if (cfg.inputClassName) input.className = String(cfg.inputClassName);
        if (cfg.maxLength != null) input.maxLength = Number(cfg.maxLength) || input.maxLength;
        if (cfg.inputStyle && typeof cfg.inputStyle === "object") Object.assign(input.style, cfg.inputStyle);
        body.appendChild(input);

        if (typeof cfg.afterInput === "function") {
          try {
            cfg.afterInput(body, input);
          } catch (e) {}
        }

        let done = false;
        const finish = (value, submitted) => {
          if (done) return;
          done = true;
          resolve(cfg.returnMeta ? { value, submitted: !!submitted } : value);
        };

        const normalizeValue = () => {
          const raw = String(input.value || "");
          return typeof cfg.normalizeValue === "function" ? cfg.normalizeValue(raw, input) : raw.trim();
        };

        const invalid = () => {
          try {
            if (typeof cfg.onInvalid === "function") cfg.onInvalid(input);
            else input.focus();
          } catch (e) {}
        };

        const submit = () => {
          const value = normalizeValue();
          const emptyValue = typeof cfg.isEmptyValue === "function"
            ? cfg.isEmptyValue(value)
            : !String(value || "").trim();
          if (!cfg.allowEmpty && emptyValue) {
            invalid();
            return;
          }
          finish(value, true);
          if (cfg.autoCloseSubmit !== false) {
            try {
              Modal.close();
            } catch (e) {}
          }
        };

        Modal.form({
          allowSpectator: !!cfg.allowSpectator,
          allowEsc: cfg.allowEsc !== false,
          title: cfg.title,
          body,
          focusSelector: cfg.focusSelector || (cfg.inputId ? '#' + cfg.inputId : null),
          submitLabel: cfg.submitLabel || window.I18N.translateArgs("actions.ok"),
          submitClassName: cfg.submitClassName || "primary",
          onSubmit: submit,
          cancelLabel: cfg.cancelLabel || window.I18N.translateArgs("actions.cancel"),
          cancelClassName: cfg.cancelClassName || "ghost",
          onCancel: () => {
            const value = typeof cfg.getCancelValue === "function" ? cfg.getCancelValue(input) : "";
            finish(value, false);
          },
          onClose:
            typeof cfg.getCloseValue === "function"
              ? () => {
                  finish(cfg.getCloseValue(input), false);
                }
              : null,
          modalClassName: cfg.modalClassName,
        });

        if (cfg.autoFocus) {
          setTimeout(() => {
            try {
              input.focus();
            } catch (e) {}
          }, 0);
        }

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        });
      } catch (e) {
        resolve(typeof cfg.fallbackValue === "function" ? cfg.fallbackValue() : "");
      }
    });
  }

  function askNickname() {
    const saved = getSavedNick();
    const title = window.I18N.translateArgs("modals.pickOnlineNickTitle");
    const label = title;
    const resolveFallbackNick = () => {
      const uid = (auth && auth.currentUser && auth.currentUser.uid) || "";
      return saved || defaultNick(uid);
    };

    return openOnlineTextPrompt({
      returnMeta: true,
      allowSpectator: true,
      title,
      label,
      value: saved,
      placeholder: label,
      inputId: "nickInput",
      inputClassName: "input",
      maxLength: 18,
      labelStyle: { display: "block", marginBottom: "6px", fontWeight: "600" },
      normalizeValue: (raw) => {
        const nick = String(raw || "").trim();
        return nick || resolveFallbackNick();
      },
      getCancelValue: () => resolveFallbackNick(),
      cancelClassName: "secondary",
    }).then((result) => {
      const nick = result && typeof result === "object" ? result.value : result;
      if (result && typeof result === "object" && result.submitted) saveNickSession(nick, true);
      return nick;
    });
  }

  function stripUndefined(x) {
    if (x === undefined) return undefined;
    if (x === null) return null;

    if (Array.isArray(x)) {
      return x.map(stripUndefined).filter((v) => v !== undefined);
    }
    if (typeof x === "object") {
      const o = {};
      for (const k of Object.keys(x)) {
        const v = stripUndefined(x[k]);
        if (v !== undefined) o[k] = v;
      }
      return o;
    }
    return x;
  }

  function askRoomName() {
    let visibility = ROOM_VISIBILITY_PUBLIC;
    return openOnlineTextPrompt({
      title: window.I18N.translateArgs("online.roomNameTitle"),
      description: window.I18N.translateArgs("online.roomNamePrompt"),
      placeholder: window.I18N.translateArgs("online.roomNamePlaceholder"),
      maxLength: 30,
      bodyStyle: { display: "grid", gap: "10px" },
      inputStyle: {
        padding: "10px",
        border: "1px solid #666",
        borderRadius: "10px",
      },
      afterInput: (body) => {
        const wrap = document.createElement("div");
        wrap.style.display = "grid";
        wrap.style.gap = "6px";
        wrap.innerHTML = `
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="radio" name="roomVisibility" value="public" checked />
            <span>${window.I18N.translateArgs("online.roomVisibility.public")}</span>
          </label>
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
            <input type="radio" name="roomVisibility" value="private" />
            <span>${window.I18N.translateArgs("online.roomVisibility.private")}</span>
          </label>
        `;
        wrap.addEventListener("change", (ev) => {
          const target = ev.target;
          if (target && target.name === "roomVisibility") visibility = normalizeRoomVisibility(target.value);
        });
        body.appendChild(wrap);
      },
      submitLabel: window.I18N.translateArgs("actions.continue"),
      submitClassName: "ok",
      cancelLabel: window.I18N.translateArgs("actions.cancel"),
      cancelClassName: "ghost",
      allowEsc: true,
      autoFocus: true,
      normalizeValue: (raw) => ({ roomName: String(raw || "").trim(), visibility: normalizeRoomVisibility(visibility) }),
      isEmptyValue: (value) => !String((value && value.roomName) || "").trim(),
      getCancelValue: () => ({ roomName: "", visibility: ROOM_VISIBILITY_PUBLIC }),
      getCloseValue: () => ({ roomName: "", visibility: ROOM_VISIBILITY_PUBLIC }),
      fallbackValue: () => ({ roomName: "", visibility: ROOM_VISIBILITY_PUBLIC }),
    });
  }

  function hasExplicitNick(uid) {
    try {
      const flag = (sessionStorage.getItem(NICK_EXPLICIT_KEY) || "") === "1";
      if (flag) return true;

      const saved = getSavedNick();
      if (!saved) return false;

      const u = uid || (auth && auth.currentUser && auth.currentUser.uid) || "";
      if (!u) return true;
      const def = defaultNick(u);
      return saved !== def;
    } catch (e) {
      return false;
    }
  }

  function souflaToPlain(pending) {
    if (!pending) return null;
    const lb = [];
    try {
      pending.longestByPiece && pending.longestByPiece.forEach((v, k) => lb.push([k, v]));
    } catch (e) {}
    return {
      offenders: pending.offenders || [],
      longestByPiece: lb,
      longestGlobal: pending.longestGlobal || 0,
      options: pending.options || [],
      turnStartSnapshot: stripUndefined(pending.turnStartSnapshot) || null,
      lastPieceIdx: pending.lastPieceIdx != null ? pending.lastPieceIdx : null,
      startedFrom: pending.startedFrom != null ? pending.startedFrom : null,
      lastMoveFrom: pending.lastMoveFrom != null ? pending.lastMoveFrom : null,
      lastMovePath: Array.isArray(pending.lastMovePath) ? pending.lastMovePath.slice() : null,
      penalizer: pending.penalizer,
    };
  }

  function plainToSoufla(plain) {
    if (!plain) return null;
    const m = new Map();
    (plain.longestByPiece || []).forEach(([k, v]) => m.set(k, v));
    return {
      offenders: plain.offenders || [],
      longestByPiece: m,
      longestGlobal: plain.longestGlobal || 0,
      options: plain.options || [],
      turnStartSnapshot: plain.turnStartSnapshot || null,
      lastPieceIdx: plain.lastPieceIdx != null ? plain.lastPieceIdx : null,
      startedFrom: plain.startedFrom != null ? plain.startedFrom : null,
      lastMoveFrom: plain.lastMoveFrom != null ? plain.lastMoveFrom : null,
      lastMovePath: Array.isArray(plain.lastMovePath) ? plain.lastMovePath.slice() : null,
      penalizer: plain.penalizer,
    };
  }

  const Online = {
    isActive: false,

    myUid: null,

    mySide: null,

    myNick: "",

    gameId: null,

    gameRef: null,

    playersRef: null,

    invitesRef: null,

    statusRef: null,

    _invitePreferenceRef: null,

    _invitePreferenceCb: null,

    _inviteToggleEl: null,

    _lastAcceptsInvites: true,

    _lastRoomActivityTouchAt: 0,

    _lobbyActivePlayerRooms: null,

    _lobbyPlayersLastSnap: null,

    moveIndex: 0,

    ply: 0,

    _pendingSteps: [],

    _cachedSouflaPlain: null,

    _isApplyingRemote: false,

    _lastTrainLoggedMoveIndex: 0,

    _awaitingLocalCommit: false,

    _expectedMoveIndex: null,

    _moveRetryTimer: null,

    _moveRetryAttempt: 0,

    _moveRetryArgs: null,

    _moveRetryNotified: false,

    _lobbyUnsub: null,

    _viewHooksInstalled: false,

    _lastSeenMoveModal: 0,

    _lastSouflaFXMoveIndex: null,

    _undoWaitOpen: false,

    _undoWaitKey: null,

    _undoWaitDismissedKey: null,

    _undoWaitAutoClose: false,

    _presenceInited: false,

    _presenceStatus: "available",

    _presenceRole: null,

    _presenceRoomId: null,

    _lobbyOpenedAt: 0,

    _inviteQuery: null,

    userEventsRef: null,

    _userEventsQuery: null,

    _userEventsHandler: null,

    _inviteCleanupInterval: null,

    _inviteCleanupRunning: false,

    _outInviteWatchMap: null,

    _outInviteWatchTimer: null,

    _outInviteWatchStarted: false,

    presenceRef: null,

    _gamePresenceJoinedAt: 0,

    _spectatorRef: null,

    _spectatorJoinedAt: 0,

    _selfOfflineSince: null,

    _oppOfflineSince: null,

    _oppLeftModalShown: false,

    _oppAbsenceWatchTimer: null,

    _oppName: "",

    _lastRenderedLogKey: "",

    _wasConnected: true,

    _selfConnected: true,

    _oppOnline: true,

    _presenceUiReady: false,

    _presenceTicker: null,

    _presenceChipTop: null,

    _presenceChipBot: null,

    _topDisplayName: "",

    _botDisplayName: "",

    _topPresenceOnline: true,

    _botPresenceOnline: true,

    _topPresenceOfflineSince: null,

    _botPresenceOfflineSince: null,

    _moveCommitWatchdogTimer: null,

    _moveCommitStartedAt: 0,

    _moveCommitEscalatedAt: 0,

    _syncIssueVisible: false,

    _lastRecoverySignalNonce: "",

    _recoverySignalPrimed: false,

    _browserOfflineSince: null,

    _gameDisconnectedAt: null,

    _reconnectRecoveryBound: false,

    _autoReconnectActionAt: 0,

    _bindReconnectRecovery: function () {
          try {
            if (this._reconnectRecoveryBound) return;
            this._reconnectRecoveryBound = true;
    
            window.addEventListener("offline", () => {
              try {
                if (!this.isActive) return;
                this._noteReconnectLoss("browser");
              } catch (e) {}
            });
    
            window.addEventListener("online", () => {
              try {
                this._handleReconnectRecovery();
              } catch (e) {}
            });
          } catch (e) {}
        },

    _noteReconnectLoss: function (source) {
          try {
            const ts = nowTs();
            if (source === "browser") {
              if (!this._browserOfflineSince) this._browserOfflineSince = ts;
              return;
            }
            if (!this._gameDisconnectedAt) this._gameDisconnectedAt = ts;
          } catch (e) {}
        },

    _handleReconnectRecovery: function () {
          try {
            if (!this.isActive || !this.gameRef) return "none";
            const now = nowTs();
            if (this._autoReconnectActionAt && now - this._autoReconnectActionAt < 500) return "none";
    
            const starts = [];
            if (this._browserOfflineSince) starts.push(Number(this._browserOfflineSince) || 0);
            if (this._gameDisconnectedAt) starts.push(Number(this._gameDisconnectedAt) || 0);
            this._browserOfflineSince = null;
            this._gameDisconnectedAt = null;
    
            const base = starts.filter((v) => v > 0).sort((a, b) => a - b)[0] || 0;
            const downtimeMs = base ? Math.max(0, now - base) : 0;
            if (!downtimeMs) return "none";
    
            this._autoReconnectActionAt = now;
            if (downtimeMs >= 40 * 1000) {
              try {
                this._emitRecoverySignal("reload", "reconnect");
              } catch (e) {}
              try {
                sessionStorage.setItem("zamat.forceResyncOnLoad", "1");
              } catch (e) {}
              setTimeout(() => {
                try {
                  location.reload();
                } catch (e) {}
              }, 180);
              return "reload";
            }
    
            try {
              this._emitRecoverySignal("sync", "reconnect");
            } catch (e) {}
            try {
              this.syncNow();
            } catch (e) {}
            return "sync";
          } catch (e) {
            this._browserOfflineSince = null;
            this._gameDisconnectedAt = null;
          }
          return "none";
        },

    _persistActiveGame: function () {
          try {
            const gid = String(this.gameId || this._presenceRoomId || "").trim();
            if (!gid) return;
            ssSet(PERSIST_GAME_ID_KEY, gid);
            ssSet(PERSIST_GAME_TS_KEY, String(Date.now()));
          } catch (e) {}
        },

    _clearPersistedActiveGame: function () {
          try {
            ssRemove(PERSIST_GAME_ID_KEY);
          } catch (e) {}
          try {
            ssRemove(PERSIST_GAME_TS_KEY);
          } catch (e) {}
        },

    _getPersistedActiveGameId: function () {
          try {
            return String(ssGet(PERSIST_GAME_ID_KEY) || "").trim();
          } catch (e) {
            return "";
          }
        },

    _findActivePlayerRoomInRoomList: async function (uid) {
          const me = String(uid || this.myUid || (auth && auth.currentUser && auth.currentUser.uid) || "").trim();
          if (!me || !db || !db.ref) return "";
          try {
            const snap = await db.ref("roomList").orderByChild("status").equalTo("active").limitToLast(100).once("value");
            const all = snap && snap.val ? snap.val() : null;
            if (!all) return "";
            const candidates = [];
            for (const [gid, r] of Object.entries(all)) {
              if (!r || r.status !== "active") continue;
              const players = r.players || {};
              const wuid = String((players.white && players.white.uid) || "").trim();
              const buid = String((players.black && players.black.uid) || "").trim();
              if (me !== wuid && me !== buid) continue;
              if (this._isLobbyRoomStale && this._isLobbyRoomStale(r)) {
                try { await this._sweepStaleLobbyRoom(gid, r); } catch (e) {}
                continue;
              }
              candidates.push({ gid, ts: Number(r.updatedAt || r.acceptedAt || r.createdAt || 0) || 0 });
            }
            candidates.sort((a, b) => b.ts - a.ts);
            return candidates.length ? String(candidates[0].gid || "") : "";
          } catch (e) {
            Logger.warn("active_room_list_check_failed", { err: String(e && (e.message || e)) });
            return "";
          }
        },

    _getActivePlayerRoomId: async function () {
          const ok = await ensureAuthReady();
          const uid = this.myUid || (auth && auth.currentUser && auth.currentUser.uid) || "";
          if (!ok || !uid || !db || !db.ref) return "";
    
          let gid = String(this.gameId || this._presenceRoomId || this._getPersistedActiveGameId() || "").trim();
    
          if (gid) {
            try {
              const snap = await db.ref("games").child(gid).once("value");
              const g = snap && snap.val ? snap.val() : null;
              if (g && g.status === "active" && g.players) {
                const wuid = g.players.white && g.players.white.uid ? String(g.players.white.uid) : "";
                const buid = g.players.black && g.players.black.uid ? String(g.players.black.uid) : "";
                if (uid === wuid || uid === buid) {
                  this.myUid = uid;
                  this._presenceStatus = "inPvP";
                  this._presenceRole = "player";
                  this._presenceRoomId = gid;
                  try { this._persistActiveGame(); } catch (e) {}
                  return gid;
                }
              }
              this._clearPersistedActiveGame();
              gid = "";
            } catch (e) {
              Logger.warn("active_room_check_failed", { gameId: gid, err: String(e && (e.message || e)) });
              this.myUid = uid;
              this._presenceStatus = "inPvP";
              this._presenceRole = "player";
              this._presenceRoomId = gid;
              return gid;
            }
          }
    
          gid = await this._findActivePlayerRoomInRoomList(uid);
          if (!gid) return "";
    
          this.myUid = uid;
          this._presenceStatus = "inPvP";
          this._presenceRole = "player";
          this._presenceRoomId = gid;
          try { this._persistActiveGame(); } catch (e) {}
          return gid;
        },

    _markPlayerBusyWithRoom: async function (gameId, ctx) {
          const gid = String(gameId || "").trim();
          if (!gid || !this.statusRef || !this.myUid) return false;
          this._presenceStatus = "inPvP";
          this._presenceRole = "player";
          this._presenceRoomId = gid;
          await safePlayerWrite(
            this.statusRef,
            this.myUid,
            {
              status: "inPvP",
              role: "player",
              roomId: gid,
              nickname: this.myNick || getSavedNickOrDefault(this.myUid),
              icon: this.myIcon || getSavedIconOrDefault(),
              acceptsInvites: this._lastAcceptsInvites === false ? false : localAcceptsInvitesPreference(),
              updatedAt: nowTs(),
            },
            ctx || "players.activeRoom",
          );
          return true;
        },

    _markBusyIfActivePlayerRoom: async function (ctx) {
          const gid = await this._getActivePlayerRoomId();
          if (!gid) return false;
          return await this._markPlayerBusyWithRoom(gid, ctx || "players.activeRoom");
        },

    _syncLobbyAvailabilityFromActiveGame: async function () {
          const busy = await this._markBusyIfActivePlayerRoom("players.lobbyActiveRoom");
          if (busy) return true;
          await this._setLobbyStatus("available");
          return false;
        },

    initPresence: async function () {
          const ok = await ensureAuthReady();
          if (!ok) return false;
    
          try {
            const liveUid = auth && auth.currentUser && auth.currentUser.uid ? String(auth.currentUser.uid) : "";
            if (this._presenceInited && this.myUid && liveUid && this.myUid !== liveUid) {
              const oldStatusRef = this.statusRef;
              const oldPresenceRef = this.presenceRef;
              const oldSpectatorRef = this._spectatorRef;
              try {
                this._stopPresenceHeartbeat();
              } catch (e) {}
              try {
                this._teardownGamePresence();
              } catch (e) {}
              try {
                if (this._presenceConnInfoRef && this._presenceConnInfoHandler) {
                  this._presenceConnInfoRef.off("value", this._presenceConnInfoHandler);
                }
              } catch (e) {}
              this._presenceConnInfoRef = null;
              this._presenceConnInfoHandler = null;
              this._presenceInited = false;
              this.statusRef = null;
              this.invitesRef = null;
              this.userEventsRef = null;
              this.playersRef = null;
              this.presenceRef = null;
              this._spectatorRef = null;
              this._spectatorJoinedAt = 0;
              try {
                oldStatusRef && oldStatusRef.remove && oldStatusRef.remove();
              } catch (e) {}
              try {
                oldPresenceRef && oldPresenceRef.remove && oldPresenceRef.remove();
              } catch (e) {}
              try {
                oldSpectatorRef && oldSpectatorRef.remove && oldSpectatorRef.remove();
              } catch (e) {}
            }
            if (this._presenceInited) return true;
          } catch (e) {}
    
          if (!ok) return false;
    
          try {
            this.myUid = auth.currentUser.uid;
            this.playersRef = db.ref("players");
            this.invitesRef = db.ref("invites").child(this.myUid);
            this.userEventsRef = db.ref("userEvents").child(this.myUid);
            this.statusRef = this.playersRef.child(this.myUid);
    
            this.myNick = getSavedNickOrDefault(this.myUid);
            this.myIcon = getSavedIconOrDefault();
            this._presenceRegistered = currentSessionIsRegistered();
    
            this._presenceStatus = "available";
            this._presenceRole = null;
            this._presenceRoomId = null;
    
            const serverNow = () => nowTs();
            const payload = () => ({
              status: this._presenceStatus || "available",
              role:
                this._presenceRole ||
                (this._presenceStatus === "inPvP"
                  ? "player"
                  : this._presenceStatus === "spectating"
                    ? "spectator"
                    : this._presenceStatus === "available"
                      ? "lobby"
                      : null),
              roomId: this._presenceRoomId || null,
              nickname: this.myNick || getSavedNickOrDefault(this.myUid),
              icon: this.myIcon || getSavedIconOrDefault(),
              registered: false,
              acceptsInvites: this._lastAcceptsInvites === false ? false : localAcceptsInvitesPreference(),
              updatedAt: serverNow(),
            });
    
            try {
              this._presenceConnInfoRef = db.ref(".info/connected");
              this._presenceConnInfoHandler = (s) => {
                const connected = !!(s && s.val && s.val());
                if (!connected) return;
    
                try {
                  this.statusRef.onDisconnect().remove();
                } catch (e) {
                  Logger.warn("presence_ondisconnect_failed", { err: String(e && (e.message || e)) });
                }
                try {
                  const okW = safePlayerWriteNoAwait(
                    this.statusRef,
                    this.myUid,
                    payload(),
                    "players.conn.reconnect",
                    () => {
                      try {
                        this._stopPresenceHeartbeat();
                      } catch (e) {}
                    },
                  );
                  if (okW) {
                    try {
                      this._startPresenceHeartbeat();
                    } catch (e) {}
                  }
                } catch (e) {}
              };
              this._presenceConnInfoRef.on("value", this._presenceConnInfoHandler);
            } catch (e) {}
    
            try {
              this.statusRef.onDisconnect().remove();
            } catch (e) {
              Logger.warn("presence_ondisconnect_failed", { err: String(e && (e.message || e)) });
            }
            const initialPresenceOk = await safePlayerWrite(
              this.statusRef,
              this.myUid,
              payload(),
              "players.initPresence",
            );
            if (!initialPresenceOk) return false;
    
            this._presenceInited = true;
            try {
              this._startPresenceHeartbeat();
            } catch (e) {}
            try {
              this._bindLifecycleCleanup();
            } catch (e) {}
            try {
              this._bindInvitePreferenceListener();
            } catch (e) {}
            try {
              await this._markBusyIfActivePlayerRoom("players.initPresence.activeRoom");
            } catch (e) {}
    
            return true;
          } catch (e) {
            return false;
          }
        },

    _startPresenceHeartbeat: function () {
          try {
            if (!this.statusRef || !this.myUid) return;
            if (this._presenceHeartbeatTimer) return;
            const tick = () => {
              try {
                const ts = nowTs();
                if (!requireAuthUid(this.myUid)) {
                  try {
                    this._stopPresenceHeartbeat();
                  } catch (e) {}
                  return;
                }
                const hb = {
                  updatedAt: ts,
                  status: this._presenceStatus || "available",
                  nickname: this.myNick || getSavedNickOrDefault(this.myUid),
                };
                try {
                  if (this._presenceRole) hb.role = this._presenceRole;
                } catch (e) {}
                try {
                  if (this._presenceRoomId) hb.roomId = String(this._presenceRoomId);
                } catch (e) {}
                try {
                  hb.icon = this.myIcon || getSavedIconOrDefault();
                } catch (e) {}
                safePlayerWriteNoAwait(this.statusRef, this.myUid, hb, "players.heartbeat", () => {
                  try {
                    this._stopPresenceHeartbeat();
                  } catch (e) {}
                });
              } catch (e) {}
            };
            tick();
            this._presenceHeartbeatTimer = setInterval(tick, PRESENCE_HEARTBEAT_MS);
          } catch (e) {}
        },

    _stopPresenceHeartbeat: function () {
          try {
            if (this._presenceHeartbeatTimer) clearInterval(this._presenceHeartbeatTimer);
          } catch (e) {}
          this._presenceHeartbeatTimer = null;
        },

    _bindLifecycleCleanup: function () {
          try {
            if (this._lifecycleBound) return;
            this._lifecycleBound = true;
    
            const cleanup = () => {
              try {
                this._stopPresenceHeartbeat();
              } catch (e) {}
              try {
                if (this._stopGamePresenceHeartbeat) this._stopGamePresenceHeartbeat();
              } catch (e) {}
    
              let internalNav = false;
              try {
                const ts = parseInt(ssGet("zamat.internalNavTs") || "0", 10);
                internalNav = !!(ts && Date.now() - ts < 2500);
              } catch (e) {}
    
              const hasActiveGame = !!(
                this.gameId ||
                this._presenceRoomId ||
                (ssGet && ssGet(PERSIST_GAME_ID_KEY))
              );
              const isPvpContext = !!(
                this.isActive ||
                this._presenceStatus === "inPvP" ||
                this._presenceRole === "player"
              );
    
              if (internalNav && hasActiveGame && isPvpContext) {
                try {
                  this._touchRoomListActivity(this.gameId || this._presenceRoomId || ssGet(PERSIST_GAME_ID_KEY), true);
                } catch (e) {}
                try {
                  if (this.presenceRef) this.presenceRef.remove();
                } catch (e) {}
                return;
              }
    
              try {
                if (this.statusRef) this.statusRef.remove();
              } catch (e) {}
              try {
                if (this.presenceRef) this.presenceRef.remove();
              } catch (e) {}
            };
    
            window.addEventListener("pagehide", cleanup, { capture: true });
            window.addEventListener("beforeunload", cleanup, { capture: true });
            try {
              this._bindReconnectRecovery();
            } catch (e) {}
          } catch (e) {}
        },

    initInvitesPassive: async function () {
          try {
            if (!window.firebase || !firebase.auth || !firebase.database) return;
            const authReady = await ensureAuthReady();
            if (!authReady) return;
            if (!this._presenceInited) {
              await this.initPresence();
            }
            const user = firebase.auth().currentUser;
            if (!user) return;
    
            this.myUid = user.uid;
            const db = firebase.database();
            if (!this.playersRef) this.playersRef = db.ref("players");
            if (!this.invitesRef) this.invitesRef = db.ref("invites").child(this.myUid);
            if (!this.statusRef && this.playersRef) this.statusRef = this.playersRef.child(this.myUid);
    
            if (this._invitesPassiveOn) return;
            this._invitesPassiveOn = true;
    
            if (typeof this._listenInvites === "function") {
              this._listenInvites();
            }
    
            try {
              if (typeof this._startOutgoingInviteWatches === "function")
                this._startOutgoingInviteWatches();
            } catch (e) {}
            try {
              if (typeof this._refreshOutgoingInviteWatches === "function")
                this._refreshOutgoingInviteWatches();
            } catch (e) {}
          } catch (e) {}
        },

    _listenInvites: function () {
          try {
            this._bindInviteListener();
          } catch (e) {}
        },

    _bindInvitePreferenceListener: function () {
          if (!this.playersRef || !this.myUid) return;
          const ref = this.playersRef.child(this.myUid).child("acceptsInvites");
          if (this._invitePreferenceRef && this._invitePreferenceCb) {
            try {
              this._invitePreferenceRef.off("value", this._invitePreferenceCb);
            } catch (e) {}
          }
          this._invitePreferenceRef = ref;
          this._invitePreferenceCb = (snap) => {
            const accepts = !(snap && snap.exists && snap.exists() && snap.val() === false);
            this._syncInviteToggleButton(accepts);
          };
          ref.on("value", this._invitePreferenceCb);
        },

    _unbindInvitePreferenceListener: function () {
          try {
            if (this._invitePreferenceRef && this._invitePreferenceCb) {
              this._invitePreferenceRef.off("value", this._invitePreferenceCb);
            }
          } catch (e) {}
          this._invitePreferenceRef = null;
          this._invitePreferenceCb = null;
        },

    _setAcceptsInvites: async function (enabled) {
          if ((!this.statusRef || !this.myUid) && typeof this.initPresence === "function") {
            try {
              await this.initPresence();
            } catch (e) {}
          }
          if (!this.statusRef || !this.myUid) return false;
          const ok = await safePlayerWrite(
            this.statusRef,
            this.myUid,
            { acceptsInvites: !!enabled, updatedAt: nowTs() },
            "players.acceptsInvites",
          );
          if (ok !== false) this._syncInviteToggleButton(!!enabled);
          return ok !== false;
        },

    _rejectInviteRoom: async function (inv, inviteRef) {
          try {
            if (inv && inv.gameId) {
              await db.ref("games").child(inv.gameId).transaction((g) => {
                if (!g) return g;
                if (g.status !== "active" && g.status !== "pending") return g;
                g.status = "rejected";
                g.endedAt = nowTs();
                g.endedReason = "rejected";
                g.log = Array.isArray(g.log) ? g.log : [];
                normalizeLogArrayForWrite(g.log);
                const who = this.myNick || window.I18N.translateArgs("players.player");
                g.log.push({
                  ts: nowTs(),
                  type: "invite_rejected",
                  text: encodeSharedLogText({ kind: "i18n", key: "online.log.inviteRejected", vars: { player: who } }),
                });
                if (g.log.length > 200) g.log = g.log.slice(-200);
                return g;
              });
            }
          } catch (e) {}
          try {
            if (inviteRef) await inviteRef.remove();
          } catch (e) {}
        },

    _restoreInviteToggleFromCache: function () {
          try {
            const cached = localStorage.getItem(INVITE_PREF_CACHE_KEY);
            this._syncInviteToggleButton(cached === "0" ? false : true);
          } catch (e) {
            try { this._syncInviteToggleButton(true); } catch (_) {}
          }
        },

    _bindInviteInlineToggle: function () {
          if (typeof document === "undefined") return null;
          const row = document.getElementById("inviteReceiveToggleRow");
          const btn = document.getElementById("btnInviteReceiveToggle");
          if (!row || !btn) return null;
          if (!btn.__zInviteReceiveBound) {
            btn.__zInviteReceiveBound = true;
            btn.addEventListener("click", async (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              const next = !(this._lastAcceptsInvites !== false);
              btn.disabled = true;
              try {
                const ok = await this._setAcceptsInvites(next);
                if (ok) {
                  showOnlineNotice(window.I18N.translateArgs(next ? "online.invites.receivingEnabled" : "online.invites.receivingDisabled"));
                }
              } catch (e) {
              } finally {
                btn.disabled = false;
              }
            });
          }
          return { row, btn };
        },

    _syncInviteToggleButton: function (accepts) {
          this._lastAcceptsInvites = accepts !== false;
          try {
            if (accepts === false) localStorage.setItem(INVITE_PREF_CACHE_KEY, "0");
            else localStorage.setItem(INVITE_PREF_CACHE_KEY, "1");
          } catch (e) {}

          try {
            const old = this._inviteToggleEl;
            this._inviteToggleEl = null;
            old && old.parentNode && old.parentNode.removeChild(old);
          } catch (e) {}

          const parts = this._bindInviteInlineToggle();
          if (!parts) return;
          const enabled = accepts !== false;
          const row = parts.row;
          const btn = parts.btn;
          const state = btn.querySelector("[data-invite-toggle-state]") || btn;
          try {
            row.classList.toggle("is-disabled", !enabled);
            row.classList.toggle("is-enabled", enabled);
            btn.classList.toggle("is-disabled", !enabled);
            btn.classList.toggle("is-enabled", enabled);
            const key = enabled ? "online.invites.enabled" : "online.invites.disabled";
            btn.setAttribute("aria-pressed", enabled ? "true" : "false");
            btn.setAttribute("title", window.I18N.translateArgs(key));
            if (state && state.setAttribute) state.setAttribute("data-i18n", key);
            state.textContent = window.I18N.translateArgs(key);
          } catch (e) {}
        },

    _setLobbyStatus: async function (status) {
          try {
            if (!this.statusRef) return;
            if (status === "available") {
              const busy = await this._markBusyIfActivePlayerRoom("players.lobbyStatus.activeRoom");
              if (busy) return;
            }
            this._presenceStatus = status;
            this._presenceRole =
              status === "available"
                ? "lobby"
                : status === "inPvP"
                  ? "player"
                  : status === "spectating"
                    ? "spectator"
                    : null;
            this._presenceRoomId = null;
    
            await safePlayerWrite(
              this.statusRef,
              this.myUid,
              {
                status,
                role: this._presenceRole,
                roomId: null,
                nickname: this.myNick,
                icon: this.myIcon || getSavedIconOrDefault(),
                updatedAt: nowTs(),
              },
              "players.lobbyStatus",
              () => {
                try {
                  this._stopPresenceHeartbeat();
                } catch (e) {}
              },
            );
          } catch (e) {}
        },

    _clearPendingInviteWatcher: function () {
          try {
            if (this._pendingGameWatchRef && this._pendingGameWatchCb) {
              this._pendingGameWatchRef.off("value", this._pendingGameWatchCb);
            }
          } catch (e) {}
          this._pendingGameWatchRef = null;
          this._pendingGameWatchCb = null;
          this._pendingGameId = null;
        },

    _watchPendingInvite: function (gameId) {
          try {
            this._clearPendingInviteWatcher();
          } catch (e) {}
    
          this._pendingGameId = gameId;
          const ref = db.ref("games").child(gameId);
          this._pendingGameWatchRef = ref;
    
          const cb = async (snap) => {
            const g = snap && snap.val ? snap.val() : null;
            if (!g) {
              try {
                this._clearPendingInviteWatcher();
              } catch (e) {}
              return;
            }
    
            const st = g.status;
    
            if (st === "active" || st === "pending") {
              const acceptedAt = g && typeof g.acceptedAt === "number" ? g.acceptedAt : 0;
              if (!acceptedAt) {
                try {
                  const createdAt = Number(g.createdAt || 0);
                  const now = nowTs();
                  if (st === "pending" && createdAt && now - createdAt >= INVITE_TTL_MS) {
                    const oppUid =
                      g.players && g.players.black && g.players.black.uid
                        ? String(g.players.black.uid)
                        : "";
                    const inviteKey = `${this.myUid}_${gameId}`;
                    const updates = this._buildRoomDeleteUpdates(gameId);
                    if (oppUid) updates[`invites/${oppUid}/${inviteKey}`] = null;
                    try {
                      await db.ref().update(updates);
                    } catch (e) {}
                    try {
                      this._untrackOutgoingInviteByGame(gameId);
                    } catch (e) {}
                    try {
                      this._clearPendingInviteWatcher();
                    } catch (e) {}
                    return;
                  }
                } catch (e) {}
                return;
              }
    
              try {
                const wu = g && g.players && g.players.white && g.players.white.uid;
                if (wu && wu !== this.myUid) return;
              } catch (e) {}
              try {
                this._clearPendingInviteWatcher();
              } catch (e) {}
              if (!isGamePage()) {
                try {
                  this._goToGameAsPlayer(gameId);
                } catch (e) {}
              } else {
                try {
                  await this._startInviterGame(gameId);
                } catch (e) {}
              }
              return;
            }
    
            if (st === "rejected" || st === "ended") {
              try {
                this._clearPendingInviteWatcher();
              } catch (e) {}
              try {
                ref.remove();
              } catch (e) {}
    
              if (st === "rejected") {
                try {
                  showOnlineNotice(window.I18N.translateArgs("online.inviteRejected"));
                } catch (e) {}
              }
              return;
            }
          };
    
          this._pendingGameWatchCb = cb;
          ref.on("value", cb);
        },

    _bindUserEventsListener: function () {
          try {
            if (this._userEventsQuery) return;
            if (!this.userEventsRef) return;
            const handler = async (snap) => {
              const ev = snap && snap.val ? snap.val() : null;
              if (!ev || !ev.type) return;
              try {
                const expiresAt = Number(ev.expiresAt || 0) || 0;
                if (expiresAt && nowTs() >= expiresAt) {
                  try { snap.ref.remove(); } catch (e) {}
                  return;
                }
              } catch (e) {}
              try {
                if (String(ev.type) === "match_end") {
                  const fromName = ev.fromNick || window.I18N.translateArgs("players.player");
                  try { snap.ref.remove(); } catch (e) {}
                  const sameGame = this.gameId && ev.gameId === this.gameId;
                  if (sameGame) {
                    try {
                      this._localEndedOnline = false;
                      this._enterPostMatch({
                        reason: ev.reason || "ended_by_player",
                        byUid: ev.fromUid || null,
                        byNick: fromName,
                        endedBy: { uid: ev.fromUid || null, nickname: fromName },
                      });
                    } catch (e) {}
                  }
                }
              } catch (e) {}
            };
            this.userEventsRef.on("child_added", handler);
            this._userEventsQuery = this.userEventsRef;
            this._userEventsHandler = handler;
          } catch (e) {}
        },

    _unbindUserEventsListener: function () {
          try {
            if (this._userEventsQuery && this._userEventsHandler) {
              this._userEventsQuery.off("child_added", this._userEventsHandler);
            } else if (this._userEventsQuery) {
              this._userEventsQuery.off();
            }
          } catch (e) {}
          this._userEventsQuery = null;
          this._userEventsHandler = null;
        },

    _bindInviteListener: function () {
          try {
            if (this._inviteQuery) this._inviteQuery.off();
          } catch (e) {}
          try {
            this.invitesRef && this.invitesRef.off();
          } catch (e) {}
          try {
            this._stopInviteCleanup();
          } catch (e) {}
          try {
            this._bindUserEventsListener();
          } catch (e) {}
    
          if (!this.invitesRef) return;
    
          const handler = async (snap) => {
            const inv = snap.val();
            if (!inv || !inv.gameId) return;
    
            try {
              const now = nowTs();
              const baseType = String((inv && (inv.type || inv.kind)) || "invite");
              if (baseType === "invite") {
                const createdAt = Number(inv.createdAt || 0);
                const expiresAt =
                  Number(inv.expiresAt || 0) ||
                  (createdAt ? createdAt + INVITE_TTL_MS : now + INVITE_TTL_MS);
    
                if (now >= expiresAt) {
                  try {
                    snap.ref.remove();
                  } catch (e) {}
                  return;
                }
    
                try {
                  let inMatch = !!(
                    this.isActive ||
                    this._presenceStatus === "inPvP" ||
                    this._presenceRole === "player" ||
                    this.gameId
                  );
                  if (!inMatch && typeof this._getActivePlayerRoomId === "function") {
                    const activeRoomId = await this._getActivePlayerRoomId();
                    inMatch = !!activeRoomId;
                  }
                  if (inMatch) {
                    try {
                      snap.ref.remove();
                    } catch (e) {}
                    return;
                  }
                } catch (e) {}
              }
            } catch (e) {}
    
            try {
              const t = String((inv && (inv.type || inv.kind)) || "invite").trim();
              if (t !== "invite") {
                try { snap.ref.remove(); } catch (e) {}
                return;
              }
            } catch (e) {}

            const name = inv.fromNick || window.I18N.translateArgs("players.player");
            const title = window.I18N.translateArgs("online.newInviteTitle");
            const roomName = (inv.roomName || "").trim();
            const body = roomName
              ? window.I18N.translateArgs("online.newInviteBody", {
                  fromName: name,
                  roomPart: window.I18N.translateArgs("online.newInviteRoomPart", { roomName }),
                })
              : window.I18N.translateArgs("online.newInviteBody", { fromName: name, roomPart: "" });
    
            const canModal = typeof Modal !== "undefined" && Modal && typeof Modal.open === "function";
            const plainText = (html) => {
              try {
                return String(html || "")
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
              } catch (e) {
                return String(html || "");
              }
            };
    
            if (!canModal) {
              const msg = plainText(body);
              const ok = window.confirm(String(title || "") + "\n\n" + String(msg || ""));
              if (ok) {
                await this._acceptInviteLobby(inv, snap.ref);
              } else {
                await this._rejectInviteRoom(inv, snap.ref);
              }
              return;
            }
    
            Modal.open({
              title,
              body: `<div>${body}</div>`,
              modalClassName: "z-invite-modal",
              buttons: [
                {
                  label: window.I18N.translateArgs("actions.accept"),
                  className: "z-invite-choice z-invite-accept",
                  onClick: async () => {
                    Modal.close();
    
                    try {
                      const uid =
                        this.myUid || (auth && auth.currentUser && auth.currentUser.uid) || "";
    
                      if (!hasExplicitNick(uid)) {
                        const picked = ((await askNickname()) || "").trim();
                        if (picked) this.myNick = picked;
                        if (!this.myNick) this.myNick = getSavedNickOrDefault(uid);
                      } else {
                        const saved = (getSavedNick() || "").trim();
                        if (saved) this.myNick = saved;
                        if (!this.myNick) this.myNick = getSavedNickOrDefault(uid);
                      }
    
                      try {
                        if (this.statusRef) {
                          const uidForWrite = uid || this.myUid;
                          safePlayerWriteNoAwait(
                            this.statusRef,
                            uidForWrite,
                            {
                              nickname: this.myNick,
                              icon: this.myIcon || getSavedIconOrDefault(),
                              updatedAt: nowTs(),
                            },
                            "players.nickUpdate",
                            () => {
                              try {
                                this._stopPresenceHeartbeat();
                              } catch (e) {}
                            },
                          );
                        }
                      } catch (e) {}
                    } catch (e) {}
                    await this._acceptInviteLobby(inv, snap.ref);
                  },
                },
                {
                  label: window.I18N.translateArgs("actions.reject"),
                  className: "z-invite-choice z-invite-reject",
                  onClick: async () => {
                    Modal.close();
                    await this._rejectInviteRoom(inv, snap.ref);
                  },
                },
              ],
            });
          };
    
          this.invitesRef.on("child_added", handler);
          this._inviteQuery = this.invitesRef;
          try {
            this._startInviteCleanup();
          } catch (e) {}
        },

    _loadOutgoingInvites: function () {
          try {
            const raw = localStorage.getItem("zamat.online.outInvites.v1");
            const arr = JSON.parse(raw || "[]");
            return Array.isArray(arr) ? arr : [];
          } catch (e) {
            return [];
          }
        },

    _saveOutgoingInvites: function (arr) {
          try {
            const clean = Array.isArray(arr) ? arr.slice(-50) : [];
            localStorage.setItem("zamat.online.outInvites.v1", JSON.stringify(clean));
          } catch (e) {}
        },

    _trackOutgoingInvite: function (meta) {
          try {
            if (!meta || !meta.gameId || !meta.toUid || !meta.inviteKey) return;
            const now = nowTs();
            const expiresAt = Number(meta.expiresAt || now + INVITE_TTL_MS);
            const createdAt = Number(meta.createdAt || now);
            const arr = this._loadOutgoingInvites();
            const kept = arr.filter((x) => x && x.gameId && x.gameId !== String(meta.gameId));
            kept.push({
              gameId: String(meta.gameId),
              toUid: String(meta.toUid),
              inviteKey: String(meta.inviteKey),
              createdAt,
              expiresAt,
            });
            this._saveOutgoingInvites(kept);
          } catch (e) {}
        },

    _untrackOutgoingInviteByGame: function (gameId) {
          try {
            if (!gameId) return;
            const arr = this._loadOutgoingInvites();
            const kept = arr.filter((x) => x && x.gameId && x.gameId !== String(gameId));
            this._saveOutgoingInvites(kept);
          } catch (e) {}
        },

    _purgeOutgoingInvitesOnce: async function (opts) {
          opts = opts || {};
          try {
            if (!window.firebase || !firebase.database) return;
            const now = nowTs();
            const db2 = firebase.database();
            const arr = this._loadOutgoingInvites();
            if (!arr.length) return;
    
            const updates = {};
            const kept = [];
    
            for (const it of arr) {
              if (!it || !it.gameId || !it.toUid || !it.inviteKey) continue;
              const expiresAt =
                Number(it.expiresAt || 0) || Number(it.createdAt || now) + INVITE_TTL_MS;
              const shouldExpire = now >= expiresAt || !!opts.force;
              if (shouldExpire) {
                updates[`invites/${it.toUid}/${it.inviteKey}`] = null;
    
                try {
                  const gid = String(it.gameId);
                  const s = await db2.ref("games").child(gid).child("status").once("value");
                  const st = s && s.val ? s.val() : null;
                  if (st === "pending") {
                    Object.assign(updates, this._buildRoomDeleteUpdates(gid));
                  }
                } catch (e) {}
                continue;
              }
              kept.push(it);
            }
    
            if (Object.keys(updates).length) {
              try {
                await db2.ref().update(updates);
              } catch (e) {}
            }
            this._saveOutgoingInvites(kept);
          } catch (e) {}
        },

    _purgePendingIncomingInvitesOnce: async function (opts) {
          try {
            const purgeAll = !!(opts && opts.all);
            if (!this.invitesRef) return;
            const snap = await this.invitesRef.once("value");
            const all = snap && snap.val ? snap.val() : null;
            if (!all || typeof all !== "object") return;
    
            const now = nowTs();
            const updates = {};
            for (const [k, inv] of Object.entries(all)) {
              if (!k) continue;
              if (!inv || typeof inv !== "object") {
                updates[k] = null;
                continue;
              }
              const t = String(inv.type || inv.kind || "invite");
              if (t !== "invite") continue;
    
              if (purgeAll) {
                updates[k] = null;
                continue;
              }
    
              const createdAt = Number(inv.createdAt || 0);
              const expiresAt =
                Number(inv.expiresAt || 0) || (createdAt ? createdAt + INVITE_TTL_MS : now + 1);
              if (now >= expiresAt) updates[k] = null;
            }
    
            if (Object.keys(updates).length) {
              try {
                await this.invitesRef.update(updates);
              } catch (e) {}
            }
          } catch (e) {}
        },

    _purgeInvitesOnEnterMatch: async function () {
          try {
            await this._purgePendingIncomingInvitesOnce({ all: true });
          } catch (e) {}
          try {
            await this._purgeOutgoingInvitesOnce({ force: true });
          } catch (e) {}
        },

    _startOutgoingInviteWatches: function () {
          try {
            if (this._outInviteWatchStarted) return;
            if (!window.firebase || !firebase.database) return;
            this._outInviteWatchStarted = true;
            if (!this._outInviteWatchMap) this._outInviteWatchMap = {};
    
            try {
              this._refreshOutgoingInviteWatches();
            } catch (e) {}
    
            if (this._outInviteWatchTimer) return;
            this._outInviteWatchTimer = setInterval(() => {
              try {
                this._refreshOutgoingInviteWatches();
              } catch (e) {}
            }, 7000);
          } catch (e) {}
        },

    _stopOutgoingInviteWatches: function () {
          try {
            if (this._outInviteWatchTimer) clearInterval(this._outInviteWatchTimer);
          } catch (e) {}
          this._outInviteWatchTimer = null;
          try {
            const m = this._outInviteWatchMap || {};
            for (const gid of Object.keys(m)) {
              const w = m[gid];
              try {
                if (w && w.ref && w.cb) w.ref.off("value", w.cb);
              } catch (e) {}
            }
          } catch (e) {}
          this._outInviteWatchMap = {};
          this._outInviteWatchStarted = false;
        },

    _refreshOutgoingInviteWatches: function () {
          try {
            if (!window.firebase || !firebase.database) return;
            if (!db || !db.ref) return;
            if (!this._outInviteWatchMap) this._outInviteWatchMap = {};
    
            const now = nowTs();
            let arr = [];
            try {
              arr = this._loadOutgoingInvites();
            } catch (e) {
              arr = [];
            }
            arr = Array.isArray(arr) ? arr : [];
    
            const kept = [];
            for (const it of arr) {
              if (!it || !it.gameId) continue;
              const expiresAt = Number(it.expiresAt || 0);
              if (expiresAt && now >= expiresAt + 2500) continue;
              kept.push(it);
            }
            try {
              this._saveOutgoingInvites(kept);
            } catch (e) {}
    
            const want = new Set(kept.map((x) => String(x.gameId)));
    
            for (const gid of Object.keys(this._outInviteWatchMap)) {
              if (!want.has(String(gid))) {
                const w = this._outInviteWatchMap[gid];
                try {
                  if (w && w.ref && w.cb) w.ref.off("value", w.cb);
                } catch (e) {}
                try {
                  delete this._outInviteWatchMap[gid];
                } catch (e) {}
              }
            }
    
            const slice = kept.slice(-12);
            for (const it of slice) {
              const gid = String(it.gameId);
              if (!gid) continue;
              if (this._outInviteWatchMap[gid]) continue;
    
              const ref = db.ref("games").child(gid);
              const cb = async (snap) => {
                try {
                  const g = snap && snap.val ? snap.val() : null;
                  if (!g) {
                    try {
                      this._untrackOutgoingInviteByGame(gid);
                    } catch (e) {}
                    return;
                  }
    
                  const st = String(g.status || "");
                  const acceptedAt = Number(g.acceptedAt || 0) || 0;
    
                  if (acceptedAt > 0 && (st === "active" || st === "pending")) {
                    await this._handleOutgoingInviteAccepted(gid);
                    return;
                  }
    
                  if (st === "rejected" || st === "ended") {
                    try {
                      this._untrackOutgoingInviteByGame(gid);
                    } catch (e) {}
                  }
                } catch (e) {}
              };
    
              ref.on("value", cb);
              this._outInviteWatchMap[gid] = { ref, cb };
            }
          } catch (e) {}
        },

    _handleOutgoingInviteAccepted: async function (gameId) {
          try {
            if (!gameId) return;
    
            const inMatch = !!(
              this.isActive ||
              this.gameId ||
              this._presenceStatus === "inPvP" ||
              this._presenceRole === "player"
            );
            if (inMatch) return;
    
            try {
              const gid = String(gameId);
              const w = this._outInviteWatchMap && this._outInviteWatchMap[gid];
              if (w && w.ref && w.cb) {
                try {
                  w.ref.off("value", w.cb);
                } catch (e) {}
              }
              if (this._outInviteWatchMap) {
                try {
                  delete this._outInviteWatchMap[gid];
                } catch (e) {}
              }
            } catch (e) {}
    
            try {
              await this._purgeInvitesOnEnterMatch();
            } catch (e) {}
    
            if (!isGamePage()) {
              try {
                this._goToGameAsPlayer(gameId);
              } catch (e) {}
            } else {
              try {
                await this._startInviterGame(gameId);
              } catch (e) {}
            }
          } catch (e) {}
        },

    _startInviteCleanup: function () {
          try {
            if (this._inviteCleanupInterval) return;
            const tick = () => {
              try {
                this._cleanupInvitesOnce();
              } catch (e) {}
            };
            tick();
            this._inviteCleanupInterval = setInterval(tick, INVITE_CLEANUP_INTERVAL_MS);
          } catch (e) {}
        },

    _stopInviteCleanup: function () {
          try {
            if (this._inviteCleanupInterval) clearInterval(this._inviteCleanupInterval);
          } catch (e) {}
          this._inviteCleanupInterval = null;
          this._inviteCleanupRunning = false;
        },

    _cleanupInvitesOnce: async function () {
          try {
            await this._purgePendingIncomingInvitesOnce();
          } catch (e) {}
    
          try {
            await this._purgeOutgoingInvitesOnce({ force: false });
          } catch (e) {}
        },

    _isPlayerBusyForInvite: async function (uid) {
          try {
            uid = String(uid || "").trim();
            if (!uid || !this.playersRef) return true;
            const ps = await this.playersRef.child(uid).once("value");
            const p = (ps && ps.val && ps.val()) || null;
            const updatedAt = Number((p && p.updatedAt) || 0) || 0;
            if (!isPresenceFresh(updatedAt, PRESENCE_LIST_TTL_MS)) return true;
            if (!playerAcceptsInvites(p)) return true;
            const status = String((p && p.status) || "");
            const role = String((p && p.role) || "");
            const roomId = String((p && p.roomId) || "").trim();
            return !!((status === "inPvP" || role === "player") && roomId);
          } catch (e) {
            return true;
          }
        },

    _buildRoomDeleteUpdates: function (gameId) {
          const gid = String(gameId || "").trim();
          if (!gid) return {};
          return {
            ["games/" + gid]: null,
            ["chats/" + gid]: null,
            ["rtc/" + gid]: null,
            ["spectators/" + gid]: null,
            ["roomList/" + gid]: null,
          };
        },

    _buildRoomListEntry: function (gameId, g) {
          const gid = String(gameId || "").trim();
          if (!gid || !g || g.status !== "active") return null;
          const players = g.players || {};
          const white = players.white || {};
          const black = players.black || {};
          const wuid = String(white.uid || "").trim();
          const buid = String(black.uid || "").trim();
          if (!wuid || !buid) return null;
          const spectatorCount = Math.max(0, Math.min(3, Number(g.spectatorCount || 0) || 0));
          const spectatorCountUpdatedAt = Number(g.spectatorCountUpdatedAt || 0) || nowTs();
          return {
            status: "active",
            roomName: String((g.roomName || g.name || "")).slice(0, 40),
            visibility: normalizeRoomVisibility(g.visibility),
            createdAt: Number(g.createdAt || 0) || nowTs(),
            acceptedAt: Number(g.acceptedAt || 0) || nowTs(),
            updatedAt: nowTs(),
            cleanupAt: nowTs() + ROOM_ABANDONED_CLEANUP_MS,
            spectatorCount,
            spectatorCountUpdatedAt,
            players: {
              white: { uid: wuid, nickname: String(white.nickname || "").slice(0, 32) },
              black: { uid: buid, nickname: String(black.nickname || "").slice(0, 32) },
            },
          };
        },

    _publishRoomListEntry: async function (gameId, g) {
          const gid = String(gameId || "").trim();
          if (!gid || !db || !db.ref) return false;
          const entry = this._buildRoomListEntry(gid, g || this._lastGameData || null);
          try {
            if (!entry) {
              await db.ref("roomList").child(gid).remove();
              return true;
            }
            await db.ref("roomList").child(gid).set(entry);
            return true;
          } catch (e) {
            Logger.warn("room_list_update_failed", { gameId: gid, err: String(e && (e.message || e)) });
            return false;
          }
        },

    _removeRoomListEntry: async function (gameId) {
          const gid = String(gameId || "").trim();
          if (!gid || !db || !db.ref) return false;
          try {
            await db.ref("roomList").child(gid).remove();
            return true;
          } catch (e) {
            Logger.warn("room_list_remove_failed", { gameId: gid, err: String(e && (e.message || e)) });
            return false;
          }
        },

    _touchRoomListActivity: function (gameId, force) {
          const gid = String(gameId || this.gameId || "").trim();
          if (!gid || !db || !db.ref || this.isSpectator) return false;
          const ts = nowTs();
          if (!force && this._lastRoomActivityTouchAt && ts - this._lastRoomActivityTouchAt < ROOM_ACTIVITY_TOUCH_MS) return true;
          this._lastRoomActivityTouchAt = ts;
          try {
            const p = db.ref("roomList").child(gid).update({ updatedAt: ts, cleanupAt: ts + ROOM_ABANDONED_CLEANUP_MS });
            if (p && typeof p.catch === "function") {
              p.catch((e) => Logger.warn("room_list_touch_failed", { gameId: gid, err: String(e && (e.message || e)) }));
            }
            return true;
          } catch (e) {
            Logger.warn("room_list_touch_failed", { gameId: gid, err: String(e && (e.message || e)) });
            return false;
          }
        },

    _isLobbyRoomStale: function (room) {
          const cleanupAt = Number((room && room.cleanupAt) || 0) || 0;
          if (cleanupAt) return nowTs() >= cleanupAt;
          const ts = Number((room && room.updatedAt) || (room && room.acceptedAt) || (room && room.createdAt) || 0) || 0;
          return !!(ts && nowTs() - ts >= ROOM_ABANDONED_CLEANUP_MS);
        },

    _sweepStaleLobbyRoom: async function (gameId, room) {
          const gid = String(gameId || "").trim();
          if (!gid || !db || !db.ref) return false;
          if (!this._isLobbyRoomStale(room)) return false;
          try {
            const gameSnap = await db.ref("games").child(gid).once("value");
            const g = gameSnap && gameSnap.val ? gameSnap.val() : null;
            if (!g || g.status !== "active") {
              await db.ref("roomList").child(gid).remove();
              if (g && g.status && g.status !== "active") await this._purgeRoomData(gid, g.status);
              return true;
            }
            const presence = g.presence && typeof g.presence === "object" ? g.presence : {};
            const players = g.players || {};
            const wuid = players.white && players.white.uid ? String(players.white.uid) : "";
            const buid = players.black && players.black.uid ? String(players.black.uid) : "";
            const wFresh = wuid && presence[wuid] && isPresenceFresh(presence[wuid].updatedAt || presence[wuid].joinedAt, ROOM_ABANDONED_CLEANUP_MS);
            const bFresh = buid && presence[buid] && isPresenceFresh(presence[buid].updatedAt || presence[buid].joinedAt, ROOM_ABANDONED_CLEANUP_MS);
            if (wFresh || bFresh) {
              await this._publishRoomListEntry(gid, g);
              return false;
            }
            await db.ref().update(this._buildRoomDeleteUpdates(gid));
            return true;
          } catch (e) {
            try {
              await db.ref("roomList").child(gid).remove();
              return true;
            } catch (removeErr) {
              Logger.warn("stale_room_sweep_failed", { gameId: gid, err: String(e && (e.message || e)), removeErr: String(removeErr && (removeErr.message || removeErr)) });
              return false;
            }
          }
        },

    _purgeRoomData: async function (gameId, reason) {
          const gid = String(gameId || "").trim();
          if (!gid) return false;
          if (typeof firebase === "undefined" || !firebase || !firebase.database) return false;
    
          try {
            const database = firebase.database();
            let g = this._lastGameData || null;
    
            if (!g || String(this.gameId || "") !== gid) {
              try {
                const snap = await database.ref("games/" + gid).once("value");
                g = snap && typeof snap.val === "function" ? snap.val() : null;
              } catch (readErr) {
                Logger.warn("room_purge_read_failed", { gameId: gid, reason, err: String(readErr && (readErr.message || readErr)) });
                return false;
              }
            }
    
            if (g && g.players) {
              const w = g.players.white && g.players.white.uid;
              const b = g.players.black && g.players.black.uid;
              const amPlayer = !!(this.myUid && (this.myUid === w || this.myUid === b));
              const isActiveRoom = g.status === "active" && !g.endedAt;
              if (!amPlayer || isActiveRoom) return false;
            } else if (this.isSpectator) {
              return false;
            }
    
            const updates = this._buildRoomDeleteUpdates(gid);
            if (!Object.keys(updates).length) return false;
            await database.ref().update(updates);
            return true;
          } catch (e) {
            Logger.warn("room_purge_failed", { gameId: gid, reason, err: String(e && (e.message || e)) });
            return false;
          }
        },

    _goToGameAsPlayer: function (gameId) {
          try {
            const inPages = (location.pathname || "").includes("/pages/");
            const base = inPages ? "./game.html" : "pages/game.html";
            const url = `${base}?pvp=1&gid=${encodeURIComponent(String(gameId || ""))}`;
            location.href = url;
          } catch (e) {}
        },

    _invalidateInviteLocally: async function (inv, inviteRef) {
          try {
            if (inviteRef && typeof inviteRef.remove === "function") {
              await inviteRef.remove();
            }
          } catch (e) {}
          try {
            const gid = String((inv && inv.gameId) || "").trim();
            if (!gid || !db || !db.ref) return;
            const gameRef = db.ref("games").child(gid);
            await gameRef.transaction((g) => {
              if (!g) return g;
              if (g.status !== "pending") return g;
              g.status = "rejected";
              g.endedAt = nowTs();
              g.endedReason = "rejected";
              return g;
            });
          } catch (e) {}
        },

    _validateInviteBeforeAccept: async function (inv, inviteRef) {
          try {
            if (!inv || !inv.gameId || !inv.fromUid) return { ok: false };
            const uid = String(this.myUid || "").trim();
            if (!uid) return { ok: false };
    
            const activeRoomId = typeof this._getActivePlayerRoomId === "function" ? await this._getActivePlayerRoomId() : "";
            if (activeRoomId && String(activeRoomId) !== String(inv.gameId || "")) return { ok: false };
    
            if (inviteRef && typeof inviteRef.once === "function") {
              const snap = await inviteRef.once("value");
              const live = snap && snap.val ? snap.val() : null;
              if (!live) return { ok: false };
              if (String((live.status || "")).trim() !== "pending") return { ok: false };
              if (String(live.gameId || "") !== String(inv.gameId || "")) return { ok: false };
              if (String(live.fromUid || "") !== String(inv.fromUid || "")) return { ok: false };
              if (String(live.toUid || "") !== uid) return { ok: false };
              inv = Object.assign({}, inv, live);
            }
    
            const gid = String(inv.gameId || "").trim();
            const fromUid = String(inv.fromUid || "").trim();
            if (!gid || !fromUid) return { ok: false };
    
            const [gameSnap, senderSnap, selfSnap] = await Promise.all([
              db.ref("games").child(gid).once("value"),
              db.ref("players").child(fromUid).once("value"),
              db.ref("players").child(uid).once("value"),
            ]);
    
            const game = gameSnap && gameSnap.val ? gameSnap.val() : null;
            if (!game) return { ok: false };
            if (String(game.status || "") !== "pending") return { ok: false };
    
            const blackUid = String((((game || {}).players || {}).black || {}).uid || "").trim();
            if (blackUid && blackUid !== uid) return { ok: false };
    
            const sender = senderSnap && senderSnap.val ? senderSnap.val() : null;
            const selfP = selfSnap && selfSnap.val ? selfSnap.val() : null;
            const senderFresh = isPresenceFresh(sender && sender.updatedAt, PRESENCE_LIST_TTL_MS);
            const senderRoom = String((sender && sender.roomId) || "").trim();
            const selfRoom = String((selfP && selfP.roomId) || "").trim();
            const senderRole = String((sender && sender.role) || "").trim();
            const selfRole = String((selfP && selfP.role) || "").trim();
            const senderBusy = sender && (sender.status === "inPvP" || senderRole === "player") && senderRoom && senderRoom !== gid;
            const selfBusy = selfP && (selfP.status === "inPvP" || selfRole === "player") && selfRoom && selfRoom !== gid;
    
            if (!senderFresh || senderBusy || selfBusy) return { ok: false };
    
            return { ok: true, invite: inv, game };
          } catch (e) {
            return { ok: false };
          }
        },

    _acceptInviteLobby: async function (inv, inviteRef) {
          try {
            if (!inv || !inv.gameId) return;
            const ok = await this.initPresence();
            if (!ok) {
              showOnlineNotice(window.I18N.translateArgs("status.onlineInitFail"));
              return;
            }
    
            const validated = await this._validateInviteBeforeAccept(inv, inviteRef);
            if (!validated || !validated.ok) {
              try {
                await this._invalidateInviteLocally(inv, inviteRef);
              } catch (e) {}
              showOnlineNotice(window.I18N.translateArgs("online.inviteInvalidated"));
              return;
            }
    
            inv = validated.invite || inv;
            const gameId = inv.gameId;
            const gameRef = db.ref("games").child(gameId);
            let committed = false;
    
            const tx = await gameRef.transaction((g) => {
              if (!g) return g;
              if (g.status !== "pending") return g;
    
              g.players = g.players || {};
              g.players.white = g.players.white || {};
              g.players.black = g.players.black || {};
    
              if (g.players.black && g.players.black.uid && g.players.black.uid !== this.myUid) {
                return g;
              }
    
              g.players.black = { uid: this.myUid, nickname: this.myNick };
              g.status = "active";
    
              if (!g.acceptedAt) {
                g.acceptedAt = nowTs();
                g.log = Array.isArray(g.log) ? g.log : [];
                normalizeLogArrayForWrite(g.log);
                const who = this.myNick || window.I18N.translateArgs("players.player");
                g.log.push({
                  ts: nowTs(),
                  type: "invite_accepted",
                  text: encodeSharedLogText({
                    kind: "i18n",
                    key: "online.log.inviteAccepted",
                    vars: { player: who },
                  }),
                });
                if (g.log.length > 200) g.log = g.log.slice(-200);
              }
              return g;
            });
            committed = !!(tx && tx.committed);
            if (committed) {
              try {
                const g = tx && tx.snapshot && typeof tx.snapshot.val === "function" ? tx.snapshot.val() : null;
                await this._publishRoomListEntry(gameId, g);
              } catch (e) {}
            }
            if (!committed) {
              try {
                await this._invalidateInviteLocally(inv, inviteRef);
              } catch (e) {}
              showOnlineNotice(window.I18N.translateArgs("online.inviteInvalidated"));
              return;
            }
    
            try {
              this._presenceStatus = "inPvP";
              this._presenceRole = "player";
              this._presenceRoomId = gameId;
              await safePlayerWrite(
                this.statusRef,
                this.myUid,
                {
                  status: "inPvP",
                  role: "player",
                  roomId: gameId,
                  nickname: this.myNick,
                  icon: this.myIcon || getSavedIconOrDefault(),
                  updatedAt: nowTs(),
                },
                "players.enterPvP",
                () => {
                  try {
                    this._stopPresenceHeartbeat();
                  } catch (e) {}
                },
              );
            } catch (e) {}
    
            try {
              if (inviteRef && typeof inviteRef.remove === "function") await inviteRef.remove();
            } catch (e) {}
            try {
              await this._purgeInvitesOnEnterMatch();
            } catch (e) {}
    
            this._goToGameAsPlayer(gameId);
          } catch (err) {
            handleDbError(err, window.I18N.translateArgs("online.inviteInvalidated"), { ctx: "invite.join" });
          }
        },
  };

  window.Online = Online;

  window.__ZAMAT_ONLINE_SHARED__ = {
    formatTpl: formatTpl,
    tryFinalizeTrainingOnExit: tryFinalizeTrainingOnExit,
    normalizeSouflaFx: normalizeSouflaFx,
    buildSouflaFxFromDecisionAndPending: buildSouflaFxFromDecisionAndPending,
    isPermissionDenied: isPermissionDenied,
    _ctx: _ctx,
    _spectatorMayWrite: _spectatorMayWrite,
    _dbErrorMessage: _dbErrorMessage,
    handleDbError: handleDbError,
    _shouldLogDenied: _shouldLogDenied,
    guardOnlineWrite: guardOnlineWrite,
    getAuthDebug: getAuthDebug,
    requireAuthUid: requireAuthUid,
    refPathString: refPathString,
    logDeniedWrite: logDeniedWrite,
    safeDbWrite: safeDbWrite,
    safeDbWriteNoAwait: safeDbWriteNoAwait,
    safePlayerWrite: safePlayerWrite,
    safePlayerWriteNoAwait: safePlayerWriteNoAwait,
    isGamePage: isGamePage,
    escapeHtml: escapeHtml,
    encodeSharedLogText: encodeSharedLogText,
    decodeSharedLogText: decodeSharedLogText,
    normalizeLogArrayForWrite: normalizeLogArrayForWrite,
    showOnlineNotice: showOnlineNotice,
    ensureFirebase: ensureFirebase,
    initServerTimeOffset: initServerTimeOffset,
    nowTs: nowTs,
    localNow: localNow,
    ssGet: ssGet,
    ssSet: ssSet,
    ssRemove: ssRemove,
    lsGet: lsGet,
    lsSet: lsSet,
    chatLastReadKey: chatLastReadKey,
    defaultNick: defaultNick,
    readMigrationVersion: readMigrationVersion,
    writeMigrationVersion: writeMigrationVersion,
    runMigrationsOnline: runMigrationsOnline,
    isPresenceFresh: isPresenceFresh,
    normalizeRoomVisibility: normalizeRoomVisibility,
    playerAcceptsInvites: playerAcceptsInvites,
    localAcceptsInvitesPreference: localAcceptsInvitesPreference,
    formatPresenceDisconnectElapsed: formatPresenceDisconnectElapsed,
    getNickFromSessionUser: getNickFromSessionUser,
    getSavedNick: getSavedNick,
    saveNickSession: saveNickSession,
    ensureAuthReady: ensureAuthReady,
    getSavedNickOrDefault: getSavedNickOrDefault,
    allowedUserIcons: allowedUserIcons,
    sanitizeUserIcon: sanitizeUserIcon,
    iconSrcForPage: iconSrcForPage,
    getSavedIconOrDefault: getSavedIconOrDefault,
    currentSessionIsRegistered: currentSessionIsRegistered,
    guestListIconByIndex: guestListIconByIndex,
    openOnlineTextPrompt: openOnlineTextPrompt,
    askNickname: askNickname,
    stripUndefined: stripUndefined,
    askRoomName: askRoomName,
    hasExplicitNick: hasExplicitNick,
    souflaToPlain: souflaToPlain,
    plainToSoufla: plainToSoufla,
    Logger: Logger,
    DENIED_LOG_TTL_MS: DENIED_LOG_TTL_MS,
    DENIED_LOG_MAX_KEYS: DENIED_LOG_MAX_KEYS,
    _DENIED_LOG_LAST: _DENIED_LOG_LAST,
    LOG_ENC_PREFIX: LOG_ENC_PREFIX,
    firebaseConfig: firebaseConfig,
    PERSIST_GAME_ID_KEY: PERSIST_GAME_ID_KEY,
    PERSIST_GAME_TS_KEY: PERSIST_GAME_TS_KEY,
    NICK_KEY: NICK_KEY,
    NICK_EXPLICIT_KEY: NICK_EXPLICIT_KEY,
    MIGRATION_VERSION_KEY: MIGRATION_VERSION_KEY,
    PRESENCE_STABLE_TTL_MS: PRESENCE_STABLE_TTL_MS,
    PRESENCE_LIST_TTL_MS: PRESENCE_LIST_TTL_MS,
    PRESENCE_ONLINE_TTL_MS: PRESENCE_ONLINE_TTL_MS,
    PRESENCE_HEARTBEAT_MS: PRESENCE_HEARTBEAT_MS,
    GAME_PRESENCE_HEARTBEAT_MS: GAME_PRESENCE_HEARTBEAT_MS,
    GAME_PRESENCE_ONLINE_TTL_MS: GAME_PRESENCE_ONLINE_TTL_MS,
    SPECTATOR_COUNT_STALE_MS: SPECTATOR_COUNT_STALE_MS,
    ROOM_ABANDONED_CLEANUP_MS: ROOM_ABANDONED_CLEANUP_MS,
    ROOM_ENDED_PURGE_DELAY_MS: ROOM_ENDED_PURGE_DELAY_MS,
    ROOM_ACTIVITY_TOUCH_MS: ROOM_ACTIVITY_TOUCH_MS,
    INVITE_PREF_CACHE_KEY: INVITE_PREF_CACHE_KEY,
    ROOM_VISIBILITY_PUBLIC: ROOM_VISIBILITY_PUBLIC,
    ROOM_VISIBILITY_PRIVATE: ROOM_VISIBILITY_PRIVATE,
    INVITE_TTL_MS: INVITE_TTL_MS,
    INVITE_CLEANUP_INTERVAL_MS: INVITE_CLEANUP_INTERVAL_MS,
    OPPONENT_ABSENCE_MS: OPPONENT_ABSENCE_MS,
    OPPONENT_ABSENCE_CHECK_MS: OPPONENT_ABSENCE_CHECK_MS,
    MOVE_SYNC_STALL_MS: MOVE_SYNC_STALL_MS,
    MOVE_SYNC_WARN_AFTER_MS: MOVE_SYNC_WARN_AFTER_MS,
    MOVE_SYNC_WATCHDOG_MS: MOVE_SYNC_WATCHDOG_MS,
    RECOVERY_SIGNAL_MAX_AGE_MS: RECOVERY_SIGNAL_MAX_AGE_MS,
    MAX_SIMULTANEOUS_CONNECTIONS: MAX_SIMULTANEOUS_CONNECTIONS,
    ASSET_PREFIX: ASSET_PREFIX,
    getDb: function () { return db; },
    getAuth: function () { return auth; },
    setDb: function (v) { db = v; },
    setAuth: function (v) { auth = v; }
  };

  window.addEventListener("load", function () {
    if (window.__ZAMAT_ONLINE_FULL_LOADED__) return;
    try { Online._restoreInviteToggleFromCache(); } catch (_) {}
    try { Online.initInvitesPassive(); } catch (_) {}

    var modeLink = document.getElementById("goPvP");
    if (modeLink && !modeLink.__zModeLinkBound) {
      modeLink.__zModeLinkBound = true;
      modeLink.addEventListener("click", async function (ev) {
        ev.preventDefault();
        try {
          if (await ensureAuthReady() && auth && auth.currentUser && auth.currentUser.uid) {
            location.href = "./loby.html";
            return;
          }
          var msg = window.I18N.translateArgs("status.onlineInitFail", "تعذر تهيئة اللعب عبر الإنترنت.");
          var extra = window.I18N.translateArgs("status.onlineInitHelp", "يرجى تسجيل الدخول أو تفعيل المصادقة المجهولة (Anonymous) في Firebase.");
          if (window.Modal && typeof Modal.open === "function") {
            Modal.alert({
              title: window.I18N.translateArgs("modals.errorTitle", "خطأ"),
              body: "<div style='line-height:1.7'>" + msg + "<br/>" + extra + "</div>",
              okLabel: window.I18N.translateArgs("actions.ok", "موافق"),
              okClassName: "ok",
            });
          } else {
            alert(msg + "\n\n" + extra);
          }
        } catch (_) {}
      }, true);
      try { Online.initInvitesPassive(); } catch (_) {}
    }
  });
})();
