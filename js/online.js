(function () {
  const S = window.__ZAMAT_ONLINE_SHARED__;
  const Online = window.Online;
  if (!S || !Online) {
    try { console.error("[ZAMAT] online.passive.js must be loaded before online.js"); } catch (e) {}
    return;
  }
  const Logger = S.Logger || window.Logger;
  const db = new Proxy({}, {
    get: function (_target, prop) {
      const d = S.getDb && S.getDb();
      const v = d && d[prop];
      return typeof v === "function" ? v.bind(d) : v;
    }
  });
  const auth = new Proxy({}, {
    get: function (_target, prop) {
      const a = S.getAuth && S.getAuth();
      const v = a && a[prop];
      return typeof v === "function" ? v.bind(a) : v;
    }
  });
  const {
    ASSET_PREFIX,
    DENIED_LOG_MAX_KEYS,
    DENIED_LOG_TTL_MS,
    GAME_PRESENCE_HEARTBEAT_MS,
    GAME_PRESENCE_ONLINE_TTL_MS,
    INVITE_CLEANUP_INTERVAL_MS,
    INVITE_PREF_CACHE_KEY,
    INVITE_TTL_MS,
    LOG_ENC_PREFIX,
    MAX_SIMULTANEOUS_CONNECTIONS,
    MIGRATION_VERSION_KEY,
    MOVE_SYNC_STALL_MS,
    MOVE_SYNC_WARN_AFTER_MS,
    MOVE_SYNC_WATCHDOG_MS,
    NICK_EXPLICIT_KEY,
    NICK_KEY,
    OPPONENT_ABSENCE_CHECK_MS,
    OPPONENT_ABSENCE_MS,
    PERSIST_GAME_ID_KEY,
    PERSIST_GAME_TS_KEY,
    PRESENCE_HEARTBEAT_MS,
    PRESENCE_LIST_TTL_MS,
    PRESENCE_ONLINE_TTL_MS,
    PRESENCE_STABLE_TTL_MS,
    RECOVERY_SIGNAL_MAX_AGE_MS,
    ROOM_ABANDONED_CLEANUP_MS,
    ROOM_ACTIVITY_TOUCH_MS,
    ROOM_ENDED_PURGE_DELAY_MS,
    ROOM_REJECTED_PURGE_DELAY_MS,
    ROOM_PENDING_PURGE_DELAY_MS,
    SPECTATOR_HEARTBEAT_MS,
    UNDO_REQUEST_TTL_MS,
    CHAT_READ_TTL_MS,
    RTC_ENTRY_TTL_MS,
    ROOM_VISIBILITY_PRIVATE,
    ROOM_VISIBILITY_PUBLIC,
    SPECTATOR_COUNT_STALE_MS,
    _DENIED_LOG_LAST,
    _ctx,
    _dbErrorMessage,
    _shouldLogDenied,
    _spectatorMayWrite,
    allowedUserIcons,
    askNickname,
    askRoomName,
    buildSouflaFxFromDecisionAndPending,
    chatLastReadKey,
    currentSessionIsRegistered,
    decodeSharedLogText,
    defaultNick,
    displayPlayerName,
    encodeSharedLogText,
    ensureAuthReady,
    ensureFirebase,
    escapeHtml,
    firebaseConfig,
    formatPresenceDisconnectElapsed,
    formatTpl,
    getAuthDebug,
    getNickFromSessionUser,
    getSavedIconOrDefault,
    getSavedNick,
    getSavedNickOrDefault,
    guardOnlineWrite,
    guestListIconByIndex,
    handleDbError,
    hasExplicitNick,
    iconSrcForPage,
    initServerTimeOffset,
    isGamePage,
    isPermissionDenied,
    isPresenceFresh,
    localAcceptsInvitesPreference,
    localNow,
    logDeniedWrite,
    lsGet,
    lsSet,
    normalizeLogArrayForWrite,
    normalizeRoomVisibility,
    normalizeSouflaFx,
    nowTs,
    openOnlineTextPrompt,
    plainToSoufla,
    playerAcceptsInvites,
    readMigrationVersion,
    readOnceWithOutcome,
    refPathString,
    requireAuthUid,
    runMigrationsOnline,
    safeDbWrite,
    safeDbWriteNoAwait,
    safePlayerWrite,
    safePlayerWriteNoAwait,
    sanitizeUserIcon,
    saveNickSession,
    showOnlineNotice,
    souflaToPlain,
    ssGet,
    ssRemove,
    ssSet,
    stripUndefined,
    writeMigrationVersion
  } = S;

  window.__ZAMAT_ONLINE_FULL_LOADED__ = true;

  function deferredPromotionQueue(stateRecord) {
    const source = stateRecord || {};
    const State = window.DhametState;
    let entries = [];

    // The lobby creates the pending Firebase game before loading the gameplay
    // engine. DhametState exists on game.html, but it is intentionally absent
    // from loby.html. Keep the shared normalizer when available and use the
    // same compact compatibility normalization in the lobby.
    if (State && typeof State.normalizeDeferredPromotions === "function") {
      entries = State.normalizeDeferredPromotions(source);
    } else if (Array.isArray(source.deferredPromotions)) {
      entries = source.deferredPromotions;
    } else if (source.deferredPromotion && typeof source.deferredPromotion === "object") {
      entries = [source.deferredPromotion];
    }

    return entries
      .map((entry) => ({
        idx: Number(entry && entry.idx),
        side: Number(entry && entry.side),
      }))
      .filter((entry) => Number.isFinite(entry.idx) && (entry.side === -1 || entry.side === 1));
  }

  function stateRecordWithPromotionQueue(snapshot, stateRecord) {
    const queue = deferredPromotionQueue(stateRecord || snapshot || {});
    return {
      snapshot: Object.assign({}, snapshot || {}, {
        deferredPromotions: queue,
        deferredPromotion: queue.length ? Object.assign({}, queue[0]) : null,
      }),
      deferredPromotions: queue,
      deferredPromotion: queue.length ? Object.assign({}, queue[0]) : null,
    };
  }

  Object.assign(Online, {
    _resolveSlotDisplayName: function (side, fallback) {
          try {
            if (window.ZGamePlayers && typeof window.ZGamePlayers.resolveSlot === "function") {
              const slot = window.ZGamePlayers.resolveSlot(side);
              const name = slot && slot.name ? String(slot.name || "").trim() : "";
              if (name) return name;
            }
          } catch (e) {}
          return String(fallback || "").trim();
        },

    _displayNameForGameUid: function (uid, fallback) {
          try {
            if (uid && this.myUid && String(uid) === String(this.myUid) && !this.isSpectator) {
              return window.I18N.translateArgs("players.you") || "You";
            }
          } catch (e) {}
          try {
            const want = String(uid || "").trim();
            const players = this._lastGameData && this._lastGameData.players ? this._lastGameData.players : null;
            if (want && players) {
              const whiteUid = players.white && players.white.uid ? String(players.white.uid) : "";
              const blackUid = players.black && players.black.uid ? String(players.black.uid) : "";
              if (want === blackUid) return this._resolveSlotDisplayName("top", fallback);
              if (want === whiteUid) return this._resolveSlotDisplayName("bot", fallback);
            }
          } catch (e) {}
          return String(fallback || "").trim();
        },

    _getGameSlotUid: function (side, data) {
          try {
            const g = data || this._lastGameData || null;
            const players = g && g.players ? g.players : null;
            if (!players) return "";
            if (side === "top") return players.black && players.black.uid ? String(players.black.uid) : "";
            if (side === "bot") return players.white && players.white.uid ? String(players.white.uid) : "";
          } catch (e) {}
          return "";
        },

    _getGameSlotPresence: function (side, data) {
          try {
            const g = data || this._lastGameData || null;
            const uid = this._getGameSlotUid(side, g);
            const presMap = g && g.presence ? g.presence : null;
            if (!uid) return { online: false, disconnectedSince: null };
    
            if (this.myUid && String(uid) === String(this.myUid)) {
              return {
                online: !!this._selfConnected,
                disconnectedSince: this._selfConnected ? null : this._selfOfflineSince || nowTs(),
              };
            }
    
            const pres = presMap && presMap[uid] ? presMap[uid] : null;
            const lastSeen = Number((pres && (pres.updatedAt || pres.joinedAt)) || 0) || 0;
            const online = !!(pres && isPresenceFresh(lastSeen, GAME_PRESENCE_ONLINE_TTL_MS));
            return {
              online,
              disconnectedSince: online ? null : this._oppOfflineSince || nowTs(),
            };
          } catch (e) {}
          return { online: false, disconnectedSince: null };
        },

    _opponentIsRealtimeAvailable: function () {
          try {
            return !!(this.isActive && !this.isSpectator && this._selfConnected && this._oppOnline);
          } catch (e) {}
          return false;
        },

    _installViewHooksOnce: function () {
          if (this._viewHooksInstalled) return;
          this._viewHooksInstalled = true;
    
          const N = 9;
          const self = this;
    
          try {
            if (!window.__zamat_orig_toViewRC) window.__zamat_orig_toViewRC = window.toViewRC;
            if (!window.__zamat_orig_fromViewRC) window.__zamat_orig_fromViewRC = window.fromViewRC;
            if (!window.__zamat_orig_drawCoords) window.__zamat_orig_drawCoords = window.drawCoords;
          } catch (e) {}
    
          window.toViewRC = function (r, c) {
            try {
              if (window.Online && window.Online.isActive && window.Online.mySide === +1) {
                return [N - 1 - r, N - 1 - c];
              }
            } catch (e) {}
            return [r, c];
          };
    
          window.fromViewRC = function (r, c) {
            try {
              if (window.Online && window.Online.isActive && window.Online.mySide === +1) {
                return [N - 1 - r, N - 1 - c];
              }
            } catch (e) {}
            return [r, c];
          };
    
          if (typeof window.drawCoords === "function") {
            window.drawCoords = function (ctx, W, H) {
              try {
                ctx.save();
                ctx.fillStyle =
                  getComputedStyle(document.documentElement).getPropertyValue("--muted").trim() ||
                  "#475569";
                ctx.font = "12px Calibri, Carlito, Segoe UI, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                const stepX = W / N;
                const stepY = H / N;
                for (let r0 = 0; r0 < N; r0++) {
                  for (let c0 = 0; c0 < N; c0++) {
                    const [vr, vc] = window.toViewRC(r0, c0);
                    const x = vc * stepX + stepX / 2;
                    const y = vr * stepY + stepY / 2;
                    ctx.fillText(`${vr}.${vc}`, x, y);
                  }
                }
                ctx.restore();
              } catch (e) {
                try {
                  (window.__zamat_orig_drawCoords || function () {})(ctx, W, H);
                } catch (e) {}
              }
            };
          }
        },

    start: function () {
          return this.startOnline();
        },

    _ensurePresenceUi: function () {
          if (this._presenceUiReady) return;
          try {
            const wrap = document.getElementById("onlinePresence");
            if (!wrap) return;
    
            wrap.innerHTML = "";
            this._presenceWrap = wrap;
    
            const mkChip = () => {
              const chip = document.createElement("span");
              chip.className = "presence-chip";
    
              const nm = document.createElement("span");
              nm.className = "presence-name";
              nm.setAttribute("data-presence-name", "1");
    
              const st = document.createElement("span");
              st.className = "presence-status";
              st.setAttribute("data-presence-status", "1");
    
              chip.appendChild(nm);
              chip.appendChild(st);
              return chip;
            };
    
            this._presenceChipTop = mkChip();
            this._presenceChipBot = mkChip();
            wrap.appendChild(this._presenceChipTop);
            wrap.appendChild(this._presenceChipBot);
    
            this._presenceUiReady = true;
            this._updatePresenceUi();
          } catch (e) {}
        },

    _clearPresenceUi: function () {
          try {
            const wrap = document.getElementById("onlinePresence");
            if (wrap) {
              wrap.innerHTML = "";
              wrap.style.display = "none";
            }
          } catch (e) {}
    
          this._presenceUiReady = false;
          try {
            if (this._presenceTicker) clearInterval(this._presenceTicker);
          } catch (e) {}
          this._presenceTicker = null;
          this._presenceWrap = null;
          this._presenceChipTop = null;
          this._presenceChipBot = null;
        },

    _syncPresenceTicker: function () {
          try {
            const needTicker = !!(!this._topPresenceOnline || !this._botPresenceOnline);
            if (needTicker && !this._presenceTicker) {
              this._presenceTicker = setInterval(() => {
                try {
                  this._updatePresenceUi();
                } catch (e) {}
              }, 1000);
            } else if (!needTicker && this._presenceTicker) {
              clearInterval(this._presenceTicker);
              this._presenceTicker = null;
            }
          } catch (e) {}
        },

    _updatePresenceUi: function () {
          try {
            const wrap = this._presenceWrap || document.getElementById("onlinePresence");
            if (wrap) wrap.style.display = this.isActive ? "flex" : "none";
          } catch (e) {}
    
          const topPresence = this._getGameSlotPresence("top");
          const botPresence = this._getGameSlotPresence("bot");
    
          try {
            this._topPresenceOnline = !!topPresence.online;
            this._botPresenceOnline = !!botPresence.online;
            this._topPresenceOfflineSince = topPresence.disconnectedSince || null;
            this._botPresenceOfflineSince = botPresence.disconnectedSince || null;
          } catch (e) {}
    
          try {
            this._syncPresenceTicker();
          } catch (e) {}
    
          if (!this._presenceUiReady) return;
    
          const setChip = (chipEl, nameText, online, disconnectedSince) => {
            try {
              if (!chipEl) return;
              const nm = chipEl.querySelector('[data-presence-name="1"]');
              const st = chipEl.querySelector('[data-presence-status="1"]');
              if (chipEl) chipEl.dir = document.documentElement.dir || "ltr";
              if (nm) nm.textContent = nameText || "";
              if (st) {
                if (online) {
                  st.textContent = `(${String(window.I18N.translateArgs("online.presence.online"))})`;
                } else {
                  const label = window.I18N.translateArgs("online.presence.disconnected");
                  const timer = formatPresenceDisconnectElapsed(disconnectedSince || nowTs());
                  st.textContent = `(${String(label)} ${timer})`;
                }
                try {
                  st.classList.toggle("z-presence-online", !!online);
                  st.classList.toggle("z-presence-offline", !online);
                } catch (e) {}
              }
            } catch (e) {}
          };
    
          setChip(this._presenceChipTop, this._topDisplayName || "", !!topPresence.online, topPresence.disconnectedSince);
          setChip(this._presenceChipBot, this._botDisplayName || "", !!botPresence.online, botPresence.disconnectedSince);
        },

    _ensureSyncIssueUi: function () {
          try {
            const notice = document.getElementById("syncIssueNotice");
            if (notice && !notice.textContent) {
              notice.textContent =
                window.I18N.translateArgs("online.syncIssueNotice") ||
                "يفضل تحديث الصفحة، توجد مشكلة في المزامنة";
            }
          } catch (e) {}
        },

    _setSyncIssueState: function (show) {
          try {
            this._ensureSyncIssueUi();
          } catch (e) {}
    
          const shouldShow = !!(
            show &&
            this.isActive &&
            !this.isSpectator &&
            this._opponentIsRealtimeAvailable()
          );
          this._syncIssueVisible = shouldShow;
    
          try {
            const notice = document.getElementById("syncIssueNotice");
            if (notice) {
              notice.hidden = !shouldShow;
              notice.classList.toggle("is-visible", shouldShow);
              if (shouldShow) {
                notice.textContent =
                  window.I18N.translateArgs("online.syncIssueNotice") ||
                  "يفضل تحديث الصفحة، توجد مشكلة في المزامنة";
              }
            }
          } catch (e) {}
    
          try {
            const btn = document.getElementById("btnSync");
            if (btn) btn.classList.toggle("z-sync-issue", shouldShow);
          } catch (e) {}
        },

    _startMoveCommitWatchdog: function () {
          try {
            if (!this.isActive) return;
            if (!this._moveCommitStartedAt) this._moveCommitStartedAt = nowTs();
            if (this._moveCommitWatchdogTimer) return;
            this._moveCommitWatchdogTimer = setInterval(() => {
              try {
                this._checkMoveCommitHealth();
              } catch (e) {}
            }, MOVE_SYNC_WATCHDOG_MS);
          } catch (e) {}
        },

    _stopMoveCommitWatchdog: function () {
          try {
            if (this._moveCommitWatchdogTimer) clearInterval(this._moveCommitWatchdogTimer);
          } catch (e) {}
          this._moveCommitWatchdogTimer = null;
          this._moveCommitStartedAt = 0;
          this._moveCommitEscalatedAt = 0;
          try {
            this._setSyncIssueState(false);
          } catch (e) {}
        },

    _checkMoveCommitHealth: function () {
          try {
            if (!this.isActive || !this._awaitingLocalCommit) {
              this._stopMoveCommitWatchdog();
              return;
            }
    
            const startedAt = Number(this._moveCommitStartedAt || 0) || 0;
            if (!startedAt) {
              this._moveCommitStartedAt = nowTs();
              return;
            }
    
            const now = nowTs();
            const elapsed = Math.max(0, now - startedAt);
            const opponentAvailable = this._opponentIsRealtimeAvailable();
    
            if (!this._moveCommitEscalatedAt && elapsed >= MOVE_SYNC_STALL_MS) {
              this._moveCommitEscalatedAt = now;
              try {
                this._forceResync();
              } catch (e) {}
              try {
                this.syncNow();
              } catch (e) {}
              try {
                if (
                  this._selfConnected &&
                  this._moveRetryArgs &&
                  this._moveRetryArgs.from != null &&
                  this._moveRetryArgs.to != null &&
                  typeof this._moveRetryArgs.nextTurn === "number" &&
                  !this._moveRetryTimer &&
                  !this._moveRetryGaveUp
                ) {
                  const at = (this._moveRetryAttempt || 0) + 1;
                  this.sendMoveToFirebase(
                    this._moveRetryArgs.from,
                    this._moveRetryArgs.to,
                    this._moveRetryArgs.nextTurn,
                    at,
                  );
                }
              } catch (e) {}
            }
    
            const shouldWarn = !!(
              opponentAvailable &&
              this._moveCommitEscalatedAt &&
              elapsed >= MOVE_SYNC_WARN_AFTER_MS
            );
            this._setSyncIssueState(shouldWarn);
          } catch (e) {}
        },

    _beginLocalCommitWait: function () {
          try {
            if (this._awaitingLocalCommit) return;
            this._awaitingLocalCommit = true;
            this._expectedMoveIndex = (this.moveIndex || 0) + 1;
            this._moveCommitStartedAt = nowTs();
            this._moveCommitEscalatedAt = 0;
            try {
              this._clearMoveRetry();
            } catch (e) {}
            try {
              this._setSyncIssueState(false);
            } catch (e) {}
            try {
              this._startMoveCommitWatchdog();
            } catch (e) {}
          } catch (e) {}
        },

    _markLocalCommitSettled: function () {
          try {
            this._awaitingLocalCommit = false;
            this._expectedMoveIndex = null;
          } catch (e) {}
          try {
            this._clearMoveRetry();
          } catch (e) {}
          try {
            this._stopMoveCommitWatchdog();
          } catch (e) {}
        },

    _resetRecoverySignalState: function () {
          try {
            this._lastRecoverySignalNonce = "";
            this._recoverySignalPrimed = false;
          } catch (e) {}
        },

    _handleRecoverySignal: function (data) {
          try {
            if (!this.isActive || !data) return;
            const sig = data.recoverySignal || null;
            const nonce = sig && sig.nonce ? String(sig.nonce) : "";
            if (!this._recoverySignalPrimed) {
              this._recoverySignalPrimed = true;
              this._lastRecoverySignalNonce = nonce || "";
              return;
            }
            if (!nonce || nonce === this._lastRecoverySignalNonce) return;
            this._lastRecoverySignalNonce = nonce;
    
            const ts = Number((sig && sig.ts) || 0) || 0;
            if (ts && nowTs() - ts > RECOVERY_SIGNAL_MAX_AGE_MS) return;

            // A refresh or repair belongs only to the browser that requested it.
            // Never reload or resync the opponent because a shared room field changed.
            const byUid = String((sig && sig.byUid) || "").trim();
            if (!byUid || byUid !== String(this.myUid || "")) return;
    
            const action = String((sig && sig.action) || "").trim();
            if (action === "sync") {
              try {
                this.syncNow();
              } catch (e) {}
              try {
                this._forceResync();
              } catch (e) {}
              return;
            }
    
            if (action === "reload") {
              try {
                sessionStorage.setItem("zamat.forceResyncOnLoad", "1");
              } catch (e) {}
              setTimeout(() => {
                try {
                  location.reload();
                } catch (e) {}
              }, 120);
            }
          } catch (e) {}
        },

    _endByAbsence: async function () {
          if (!this.gameRef) return false;

          try {
            const result = await this.gameRef.transaction((g) => {
              if (!g || g.status !== "active") return g;

              const ts = nowTs();
              const who = displayPlayerName(this.myUid, this.myNick);
              const MatchEnd = window.DhametMatchEnd;
              const policy = MatchEnd && typeof MatchEnd.policyForEnd === "function"
                ? MatchEnd.policyForEnd("opponent-absent", this.mySide, {
                    reason: "opponent_absent",
                    // The exceptional counted result is limited to genuinely late,
                    // low-material positions with a clear deterministic advantage.
                    policyProfile: "strict-low-material",
                  }, g)
                : { ok: true, reason: "opponent_absent", resultReason: "opponent_absent", winner: null, countsAsResult: false, neutralEnd: true, rejectionReason: "policy_unavailable" };

              const terminalResult = MatchEnd && typeof MatchEnd.createTerminalResult === "function"
                ? MatchEnd.createTerminalResult({
                    winner: policy.winner,
                    reason: policy.resultReason || policy.reason || "opponent_absent",
                    mode: "pvp",
                    moveIndex: Number(g.moveIndex || 0) || 0,
                    ply: Number(g.ply || 0) || 0,
                    endedAt: ts,
                    source: "firebase-opponent-absence-v1",
                    countsAsResult: policy.countsAsResult === true,
                    meta: {
                      kind: "opponent-absent",
                      countsAsResult: policy.countsAsResult === true,
                      neutralEnd: policy.neutralEnd !== false,
                      adjudicated: policy.adjudicated === true,
                      terminalConfidence: policy.terminalConfidence || null,
                      terminalTag: policy.terminalTag || null,
                      rejectionReason: policy.rejectionReason || null,
                      assessment: policy.assessment || null,
                    },
                  })
                : {
                    status: "ongoing",
                    terminal: false,
                    winner: 0,
                    reason: "opponent_absent",
                    meta: { kind: "opponent-absent", countsAsResult: false, neutralEnd: true },
                  };

              g.status = "ended";
              g.endedAt = ts;
              g.endedReason = policy.reason || "opponent_absent";
              g.endedBy = { uid: this.myUid, side: this.mySide, nickname: who };
              g.winner = policy.winner == null ? null : policy.winner;
              g.result = terminalResult;
              g.log = Array.isArray(g.log) ? g.log : [];
              normalizeLogArrayForWrite(g.log);
              g.log.push({
                ts,
                type: "ended_absent",
                byUid: this.myUid,
                byNick: who,
                text: encodeSharedLogText({
                  kind: "i18n",
                  key: "online.matchEndedByPlayer",
                  vars: { player: who, reason: "" },
                }),
              });
              if (g.log.length > 200) g.log = g.log.slice(-200);
              return g;
            });

            const finalData = result && result.snapshot && typeof result.snapshot.val === "function"
              ? result.snapshot.val()
              : null;
            const ended = !!(result && result.committed !== false && finalData && finalData.status === "ended");
            if (ended) {
              this._lastGameData = finalData;
              try { await this._removeRoomListEntry(this.gameId); } catch (_) {}
            }
            return ended;
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("online.endFail"), { ctx: "move.endByAbsence" });
            return false;
          }
        },

    _endByAbsenceAndEnterPostMatch: async function () {
          const ended = await this._endByAbsence();
          if (!ended) {
            try { await this.syncNow(); } catch (_) {}
            return false;
          }

          const finalData = this._lastGameData || {};
          const finalReason = finalData.endedReason || "opponent_absent";
          try { await this._notifyMatchEndWatchers(this.gameId, finalReason, this.myNick); } catch (_) {}
          try {
            if (this.gameId) this._schedulePurgeRoom(this.gameId, finalReason, ROOM_ENDED_PURGE_DELAY_MS);
          } catch (_) {}
          this._enterPostMatch({
            game: finalData,
            result: finalData.result || null,
            reason: finalReason,
            winner: finalData.winner == null ? null : finalData.winner,
            endedBy: finalData.endedBy || null,
          });
          return true;
        },

    refreshPresenceUi: function () {
          try {
            this._ensurePresenceUi();
            this._updatePresenceUi();
          } catch (e) {}
        },

    _buildGamePresencePayload: function () {
          const ts = nowTs();
          if (!this._gamePresenceJoinedAt) this._gamePresenceJoinedAt = ts;
          return {
            uid: this.myUid,
            nickname: this.myNick || "",
            side: Number.isFinite(this.mySide) ? this.mySide : 0,
            joinedAt: this._gamePresenceJoinedAt || ts,
            updatedAt: ts,
          };
        },

    _writeFullGamePresence: function (ctx) {
          try {
            if (!this.presenceRef || !this.myUid) return false;
            if (!requireAuthUid(this.myUid)) return false;
            return safeDbWriteNoAwait("set", this.presenceRef, this._buildGamePresencePayload(), {
              uid: this.myUid,
              path: "/games/" + (this.gameId || "") + "/presence/" + this.myUid,
              ctx: ctx || "gamePresence.set",
              onDenied: () => {
                this._gamePresenceDenied = true;
                this._stopGamePresenceHeartbeat();
              },
            });
          } catch (e) {
            return false;
          }
        },

    _startGamePresenceHeartbeat: function () {
          try {
            if (!this.presenceRef) return;
            if (this._gamePresenceHeartbeatTimer) return;
            const tick = () => {
              try {
                if (this._gamePresenceDenied) return;
                if (!requireAuthUid(this.myUid)) {
                  this._stopGamePresenceHeartbeat();
                  return;
                }
                this._writeFullGamePresence("gamePresence.heartbeat");
                this._touchRoomListActivity(this.gameId || this._presenceRoomId, false);
              } catch (e) {}
            };
            tick();
            this._gamePresenceHeartbeatTimer = setInterval(tick, GAME_PRESENCE_HEARTBEAT_MS);
          } catch (e) {}
        },

    _stopGamePresenceHeartbeat: function () {
          try {
            if (this._gamePresenceHeartbeatTimer) clearInterval(this._gamePresenceHeartbeatTimer);
          } catch (e) {}
          this._gamePresenceHeartbeatTimer = null;
        },

    _startOpponentAbsenceWatcher: function () {
          try {
            if (this.isSpectator) return;
            if (!this.isActive) return;
            if (this._oppAbsenceWatchTimer) return;
            const tick = () => {
              try {
                this._checkOpponentAbsence();
              } catch (e) {}
            };
            tick();
            this._oppAbsenceWatchTimer = setInterval(tick, OPPONENT_ABSENCE_CHECK_MS);
          } catch (e) {}
        },

    _stopOpponentAbsenceWatcher: function () {
          try {
            if (this._oppAbsenceWatchTimer) clearInterval(this._oppAbsenceWatchTimer);
          } catch (e) {}
          this._oppAbsenceWatchTimer = null;
          try {
            this._oppOfflineSince = null;
          } catch (e) {}
          try {
            this._oppLeftModalShown = false;
          } catch (e) {}
        },

    _checkOpponentAbsence: function () {
          try {
            if (this.isSpectator) return;
            if (!this.isActive || !this.gameRef) return;
    
            const g = this._lastGameData;
            try {
              if (g && g.status && g.status !== "active") return;
            } catch (e) {}
    
            try {
              if (this._localEndedOnline) return;
            } catch (e) {}
    
            const now = nowTs();
            const oppUid = g ? this._getOpponentInfoFromData(g).uid : null;
            const pres = oppUid && g && g.presence ? g.presence[oppUid] : null;
            const lastSeen = Number((pres && (pres.updatedAt || pres.joinedAt)) || 0) || 0;
            const oppOnline = !!(pres && isPresenceFresh(lastSeen, GAME_PRESENCE_ONLINE_TTL_MS));
    
            this._oppOnline = oppOnline;
            if (lastSeen) this._oppLastSeenAt = lastSeen;
    
            if (oppOnline) {
              this._oppOfflineSince = null;
              this._oppLeftModalShown = false;
              try {
                this._updatePresenceUi();
              } catch (e) {}
              return;
            }
    
            if (!this._oppOfflineSince) {
              this._oppOfflineSince = now;
            }
    
            try {
              this._updatePresenceUi();
            } catch (e) {}
    
            const dt = now - this._oppOfflineSince;
            if (dt >= OPPONENT_ABSENCE_MS && !this._oppLeftModalShown) {
              this._openOpponentAbsenceModal();
            }
          } catch (e) {}
        },

    _openOpponentAbsenceModal: function () {
          try {
            if (this._oppLeftModalShown) return;
            this._oppLeftModalShown = true;
    
            let opp = "";
            try {
              opp = String(this._oppName || "").trim();
            } catch (e) {}
            if (!opp) opp = window.I18N.translateArgs("online.opponent", "Opponent");
    
            const titleText = window.I18N.translateArgs("online.absenceTitle");
            const bodyText = formatTpl(
              window.I18N.translateArgs("online.absencePrompt"),
              { player: opp },
            );
    
            if (typeof Modal !== "undefined" && Modal && typeof Modal.open === "function") {
              const div = document.createElement("div");
              div.style.whiteSpace = "pre-wrap";
              div.textContent = bodyText;
    
              Modal.open({
                title: titleText,
                body: div,
                buttons: [
                  {
                    label: window.I18N.translateArgs("actions.wait"),
                    className: "primary",
                    onClick: () => {
                      try {
                        Modal.close();
                      } catch (e) {}
                      try {
                        this.syncNow();
                      } catch (e) {}
                    },
                  },
                  {
                    label: window.I18N.translateArgs("buttons.endMatch"),
                    className: "danger",
                    onClick: () => {
                      try {
                        Modal.close();
                      } catch (e) {}
                      try {
                        this._endByAbsenceAndEnterPostMatch();
                      } catch (e) {}
                    },
                  },
                ],
              });
              return;
            }
    
            const msg =
              titleText +
              "\n\n" +
              bodyText +
              "\n\n" +
              window.I18N.translateArgs("actions.wait") +
              " = OK\n" +
              window.I18N.translateArgs("buttons.endMatch") +
              " = Cancel";
    
            const ok = confirm(msg);
            if (ok) {
              try {
                this.syncNow();
              } catch (e) {}
            } else {
              try {
                this._endByAbsenceAndEnterPostMatch();
              } catch (e) {}
            }
          } catch (e) {}
        },

    _buildInitialSnapshot: function () {
          try {
            if (typeof createInitialBoard !== "function") return null;
            if (typeof BOT !== "number") return null;
    
            const board = createInitialBoard();
            const player = BOT;
    
            return {
              board,
              player,
              inChain: false,
              chainPos: null,
              lastMovedTo: null,
              lastMovedFrom: null,
              lastMoveFrom: null,
              lastMovePath: null,
              moveCount: 0,
              forcedEnabled: true,
              forcedPly: 0,
              openingPly: 0,
              openingStarter: BOT,
              forcedOpeningExchangeChoice: null,
              openingExchangeFourthChoice: null,
              opening: { starter: BOT },
              deferredPromotions: [],
              deferredPromotion: null,
            };
          } catch (e) {
            return null;
          }
        },

    _startInviterGame: async function (gameId) {
          this.mySide = -1;
          this.isActive = true;
          try {
            this._purgeInvitesOnEnterMatch();
          } catch (e) {}
    
          try {
            this._pendingSteps = [];
            this._cachedSouflaPlain = null;
            this._markLocalCommitSettled();
            this._resetRecoverySignalState();
          } catch (e) {}
    
          this._setOnlineButtonsState(true);
    
          try {
            this._presenceStatus = "inPvP";
            this._presenceRole = "player";
            this._presenceRoomId = gameId;
          } catch (e) {}
          try {
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
              "players.status",
            );
          } catch (e) {}
    
          try {
            Game.settings.starter = "white";
            setupInitialBoard();
            try {
              Turn.start();
            } catch (e) {}
          } catch (e) {}
    
          this.gameId = gameId;
          this.gameRef = db.ref("games").child(gameId);
    
          this._cleanupArmedFor = null;
          try {
            await this.syncNow({ repairPresence: true });
          } catch (e) {}
    
          try {
            db.ref("games").child(gameId).child("status").onDisconnect().cancel();
          } catch (e) {}
          try {
            db.ref("games").child(gameId).child("endedReason").onDisconnect().cancel();
          } catch (e) {}
          try {
            db.ref("games").child(gameId).child("endedAt").onDisconnect().cancel();
          } catch (e) {}
    
          try {
            this._bindInviteListener();
          } catch (e) {}
          try {
            const gv = await this.gameRef.once("value");
            const g = gv && typeof gv.val === "function" ? gv.val() : null;
            await this._publishRoomListEntry(gameId, g);
          } catch (e) {}
    
          this._bindGameListeners();
          try {
            await this._initRoomComms();
          } catch (e) {}
          try {
            this._persistActiveGame();
          } catch (e) {}
        },

    startOnline: async function () {
          const ok = await this.initPresence();
          if (!ok) {
            showOnlineNotice(window.I18N.translateArgs("status.onlineInitFail"));
            return;
          }
    
          this._lobbyOpenedAt = localNow();
    
          try {
            const picked = ((await askNickname()) || "").trim();
            if (picked) this.myNick = picked;
            if (!this.myNick) this.myNick = getSavedNickOrDefault(this.myUid);
          } catch (e) {}
    
          await this._setLobbyStatus("available");
    
          this._bindInviteListener();
          this._openLobbyModal();
        },

    _openLobbyModal: function () {
          const wrap = document.createElement("div");
          wrap.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:10px;">
              <div style="font-weight:700;">${window.I18N.translateArgs("lobby.playersTitle")}</div>
              <div id="playersList" style="display:flex; flex-direction:column; gap:8px;"></div>
            </div>
          `;
    
          Modal.open({
            title: window.I18N.translateArgs("lobby.playersTitle"),
            body: wrap,
            buttons: [
              {
                label: window.I18N.translateArgs("actions.close"),
                className: "ghost",
                onClick: () => {
                  Modal.close();
                },
              },
            ],
          });
    
          const listEl = wrap.querySelector("#playersList");
    
          const render = (players) => {
            listEl.innerHTML = "";
            let entries = Object.entries(players || {}).filter(([uid]) => uid !== this.myUid);
    
            const NOW = Date.now();
            const MAX_AGE_MS = PRESENCE_LIST_TTL_MS;
            entries = entries.filter(([uid, p]) => {
              const ts = p && typeof p.updatedAt === "number" ? p.updatedAt : 0;
              return ts && NOW - ts <= MAX_AGE_MS;
            });
    
            if (!entries.length) {
              listEl.innerHTML = `<div class="muted">${window.I18N.translateArgs("online.noPlayers")}</div>`;
              return;
            }
    
            entries.forEach(([uid, p]) => {
              const nick = p && p.nickname ? p.nickname : uid.slice(0, 6);
              const st = p && p.status ? p.status : "available";
              const acceptsInvites = playerAcceptsInvites(p);
    
              const stLabel =
                st === "available" || st === "lobby"
                  ? window.I18N.translateArgs("online.status.available")
                  : window.I18N.translateArgs("online.status.inPvP");
    
              const row = document.createElement("div");
              row.style.display = "flex";
              row.style.alignItems = "center";
              row.style.justifyContent = "space-between";
              row.style.gap = "10px";
              row.innerHTML = `
                <div style="display:flex; flex-direction:column;">
                  <div style="font-weight:700;">${nick}</div>
                  <div class="muted" style="font-size:var(--fs-body);">${stLabel}</div>
                </div>
                          <button class="btn ok" ${(() => {
                            const role =
                              p && p.role
                                ? String(p.role)
                                : st === "inPvP"
                                  ? "player"
                                  : st === "spectating"
                                    ? "spectator"
                                    : st === "available"
                                      ? "lobby"
                                      : "lobby";
                            const roomId = p && p.roomId ? String(p.roomId).trim() : "";
                            const inMatchAsPlayer = role === "player" && !!roomId;
                            return inMatchAsPlayer || !acceptsInvites ? "disabled" : "";
                          })()}>${window.I18N.translateArgs(acceptsInvites ? "actions.invite" : "online.invites.disabled")}</button>
    
              `;
    
              row.querySelector("button").onclick = async () => {
                Modal.close();
                await this._createGame(uid);
              };
    
              listEl.appendChild(row);
            });
          };
    
          this.playersRef.off();
    
          let gotFirst = false;
    
          const showLoadFail = () => {
            const msg = window.I18N.translateArgs("online.playersLoadFail");
            Modal.open({
              title: window.I18N.translateArgs("modals.errorTitle"),
              body: `<div>${msg}</div>`,
              buttons: [
                {
                  label: window.I18N.translateArgs("actions.close"),
                  className: "primary",
                  onClick: () => {
                    Modal.close();
                  },
                },
              ],
            });
          };
    
          const timer = setTimeout(() => {
            if (!gotFirst) showLoadFail();
          }, 8000);
    
          this.playersRef.on(
            "value",
            (snap) => {
              gotFirst = true;
              clearTimeout(timer);
              render(snap.val() || {});
            },
            (err) => {
              clearTimeout(timer);
              showLoadFail();
            },
          );
        },

    _returnToActiveMatch: async function (gameId) {
          const gid = String(gameId || this.gameId || this._presenceRoomId || "").trim();
          if (!gid) return false;
          try {
            const inPages = (location.pathname || "").includes("/pages/");
            location.href = (inPages ? "game.html" : "pages/game.html") + "?gid=" + encodeURIComponent(gid);
            return true;
          } catch (e) {
            return false;
          }
        },

    _leaveActiveMatchForInvite: async function (gameId) {
          const gid = String(gameId || this.gameId || this._presenceRoomId || "").trim();
          const uid = String(this.myUid || (auth && auth.currentUser && auth.currentUser.uid) || "").trim();
          if (!gid || !uid || !db || !db.ref) return true;
          const who = this.myNick || window.I18N.translateArgs("players.player");
          try {
            const gameRef = db.ref("games").child(gid);
            const result = await gameRef.transaction((g) => {
              if (!g || g.status !== "active") return g;
              const whiteUid = String(g.players && g.players.white && g.players.white.uid || "");
              const blackUid = String(g.players && g.players.black && g.players.black.uid || "");
              if (uid !== whiteUid && uid !== blackUid) return;
              g.status = "ended";
              g.endedAt = nowTs();
              g.endedReason = "ended_by_player";
              g.endedBy = { uid, nickname: who };
              return g;
            });
            if (!result || result.committed === false) {
              showOnlineNotice(window.I18N.translateArgs("online.endFail"));
              return false;
            }
            try { await this._removeRoomListEntry(gid); } catch (e) {}
            try { await this._notifyMatchEndWatchers(gid, "ended_by_player", who); } catch (e) {}
            try { this._schedulePurgeRoom(gid, "ended_by_player", ROOM_ENDED_PURGE_DELAY_MS); } catch (e) {}
            try { this._clearPersistedActiveGame(); } catch (e) {}
            if (String(this.gameId || "") === gid) {
              try { this._teardownRoomComms && this._teardownRoomComms(); } catch (e) {}
              try { this.gameRef && this.gameRef.off && this.gameRef.off(); } catch (e) {}
              this.isActive = false;
              this.isSpectator = false;
              this.gameId = null;
              this.gameRef = null;
              this.mySide = null;
            }
            this._presenceStatus = "available";
            this._presenceRole = "lobby";
            this._presenceRoomId = null;
            try { await this._setLobbyStatus("available"); } catch (e) {}
            return true;
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("online.endFail"), { ctx: "invite.leaveActiveMatch" });
            return false;
          }
        },

    _confirmLeaveActiveMatchBeforeInvite: function (gameId) {
          const gid = String(gameId || this.gameId || this._presenceRoomId || "").trim();
          return new Promise((resolve) => {
            let settled = false;
            const done = (value) => {
              if (settled) return;
              settled = true;
              resolve(!!value);
            };
            const text = window.I18N.translateArgs("online.invites.leaveActivePrompt");
            if (!(typeof Modal !== "undefined" && Modal && typeof Modal.open === "function")) {
              if (confirm(text)) this._leaveActiveMatchForInvite(gid).then(done).catch(() => done(false));
              else done(false);
              return;
            }
            const body = document.createElement("div");
            body.style.whiteSpace = "pre-wrap";
            body.textContent = text;
            Modal.open({
              title: window.I18N.translateArgs("online.invites.activeMatchTitle"),
              body,
              allowEsc: true,
              onClose: (reason) => { if (reason !== "action") done(false); },
              buttons: [
                {
                  label: window.I18N.translateArgs("online.invites.leaveAndSend"),
                  className: "danger",
                  onClick: async () => {
                    try { if (Modal.setButtonsDisabled) Modal.setButtonsDisabled(true); } catch (e) {}
                    const ok = await this._leaveActiveMatchForInvite(gid);
                    done(ok);
                    try { Modal.close("action"); } catch (e) {}
                  },
                },
                {
                  label: window.I18N.translateArgs("lobby.returnToMatch"),
                  className: "ok",
                  onClick: async () => {
                    done(false);
                    try { Modal.close("action"); } catch (e) {}
                    try { await this._returnToActiveMatch(gid); } catch (e) {}
                  },
                },
                {
                  label: window.I18N.translateArgs("actions.cancel"),
                  className: "ghost",
                  onClick: () => { done(false); try { Modal.close("action"); } catch (e) {} },
                },
              ],
            });
          });
        },

    _createGame: async function (opponentUid) {
          const ok = await this.initPresence();
          if (!ok) {
            showOnlineNotice(window.I18N.translateArgs("status.onlineInitFail"));
            return;
          }
    
          try {
            const activeRoomId = await this._getActivePlayerRoomId();
            if (activeRoomId) {
              const shouldContinue = await this._confirmLeaveActiveMatchBeforeInvite(activeRoomId);
              if (!shouldContinue) return;
            }
          } catch (e) {}
    
          try {
            this._clearPendingInviteWatcher && this._clearPendingInviteWatcher();
          } catch (e) {}
    
          let opponentNick = "";
          let opponentStatus = "";
          let opponentRole = "";
          let opponentUpdatedAt = 0;
          let opponentRoomId = "";
          let opponentAcceptsInvites = true;
          try {
            const ps = await this.playersRef.child(opponentUid).once("value");
            const pv = (ps && ps.val && ps.val()) || null;
            opponentNick = (pv && pv.nickname) || "";
            opponentStatus = (pv && pv.status) || "";
            opponentRole = (pv && pv.role) || "";
            opponentUpdatedAt = Number((pv && pv.updatedAt) || 0) || 0;
            opponentRoomId = (pv && pv.roomId) || "";
            opponentAcceptsInvites = playerAcceptsInvites(pv);
          } catch (e) {}
    
          try {
            const now = nowTs();
            const fresh = isPresenceFresh(opponentUpdatedAt, PRESENCE_LIST_TTL_MS);
            if (!fresh) {
              showOnlineNotice(window.I18N.translateArgs("online.inviteInvalidated"));
              return;
            }
            if (!opponentAcceptsInvites) {
              showOnlineNotice(window.I18N.translateArgs("online.invites.notAccepting"));
              return;
            }
            if ((opponentStatus === "inPvP" || opponentRole === "player") && opponentRoomId) {
              showOnlineNotice(window.I18N.translateArgs("online.inviteInvalidated"));
              return;
            }
            const opponentActiveRoom = await this._findActivePlayerRoomInRoomList(opponentUid);
            if (opponentActiveRoom) {
              showOnlineNotice(window.I18N.translateArgs("online.inviteInvalidated"));
              return;
            }
          } catch (e) {}
    
          const roomSetup = await askRoomName();
          const roomName = String((roomSetup && roomSetup.roomName) || "").trim();
          const visibility = normalizeRoomVisibility(roomSetup && roomSetup.visibility);
          if (!roomName) {
            return;
          }
    
          const initSnap =
            typeof this._buildInitialSnapshot === "function" ? this._buildInitialSnapshot() : null;
    
          const gameRef = db.ref("games").push();
          const gameId = gameRef.key;
    
          const gameObj = {
            roomName,
            visibility,
            status: "pending",
            acceptedAt: 0,
            createdAt: nowTs(),
            spectatorCount: 0,
            spectatorCountUpdatedAt: nowTs(),
            moveIndex: 0,
            ply: 0,
            turn: initSnap ? initSnap.player : -1,
            starter: "white",
            players: {
              white: { uid: this.myUid, nickname: this.myNick },
              black: { uid: opponentUid, nickname: opponentNick || "" },
            },
            state: stateRecordWithPromotionQueue(initSnap, initSnap),
            states: {
              0: stateRecordWithPromotionQueue(initSnap, initSnap),
            },
            lastMove: null,
            soufla: null,
            undoRequest: null,
            log: [
              {
                ts: nowTs(),
                type: "invite_sent",
                text: encodeSharedLogText({
                  kind: "i18n",
                  key: "online.log.inviteSent",
                  vars: { from: this.myNick || "", to: opponentNick || "" },
                }),
              },
            ],
          };
    
          const inviteKey = `${this.myUid}_${gameId}`;
          const createdAt = nowTs();
          const expiresAt = createdAt + INVITE_TTL_MS;
          const inviteObj = {
            type: "invite",
            fromUid: this.myUid,
            toUid: opponentUid,
            fromNick: this.myNick,
            roomName,
            visibility,
            gameId: gameId,
            createdAt,
            expiresAt,
            status: "pending",
          };
    
          try {
            if (await this._isPlayerBusyForInvite(opponentUid)) {
              showOnlineNotice(window.I18N.translateArgs("online.inviteInvalidated"));
              return;
            }
          } catch (e) {}
    
          const updates = {};
          updates[`games/${gameId}`] = gameObj;
          updates[`invites/${opponentUid}/${inviteKey}`] = inviteObj;
    
          try {
            await db.ref().update(updates);
          } catch (err) {
            // A transport interruption can happen after Firebase has committed the
            // atomic update. Never resend the invite here. Verify the exact invite
            // path once; show failure only when Firebase confirms it is absent or
            // explicitly rejects the write.
            if (isPermissionDenied(err)) {
              handleDbError(err, window.I18N.translateArgs("online.inviteSendFail"), { ctx: "invite.send" });
              return;
            }
            const verification = await readOnceWithOutcome(
              db.ref("invites").child(opponentUid).child(inviteKey),
              3000,
            );
            if (verification.state === "missing" || (verification.state === "error" && isPermissionDenied(verification.error))) {
              handleDbError(verification.error || err, window.I18N.translateArgs("online.inviteSendFail"), { ctx: "invite.send.confirmed-failed" });
              return;
            }
            try {
              Logger.warn("invite_delivery_unconfirmed", {
                gameId,
                opponentUid,
                state: verification.state,
                code: String((err && err.code) || ""),
              });
            } catch (_) {}
            // If the verification also timed out, keep one local watch for the
            // already-created id. It will reconcile or expire without another send.
          }
    
          try {
            this._trackOutgoingInvite({ gameId, toUid: opponentUid, inviteKey, createdAt, expiresAt });
          } catch (e) {}
    
          try {
            if (typeof this._startOutgoingInviteWatches === "function")
              this._startOutgoingInviteWatches();
          } catch (e) {}
          try {
            if (typeof this._refreshOutgoingInviteWatches === "function")
              this._refreshOutgoingInviteWatches();
          } catch (e) {}
    
          try {
            this._watchPendingInvite && this._watchPendingInvite(gameId);
          } catch (e) {}
        },

    _joinGame: async function (gameId) {
          this.mySide = +1;
          this.isActive = true;
          try {
            this._purgeInvitesOnEnterMatch();
          } catch (e) {}
    
          this._setOnlineButtonsState(true);
          await safePlayerWrite(
            this.statusRef,
            this.myUid,
            {
              status: "inPvP",
              role: "player",
              roomId: gameId,
              nickname: this.myNick,
              updatedAt: nowTs(),
            },
            "players.status",
          );
          try {
            this._presenceStatus = "inPvP";
            this._presenceRole = "player";
            this._presenceRoomId = gameId;
          } catch (e) {}
          try {
            this._pendingSteps = [];
            this._cachedSouflaPlain = null;
            this._markLocalCommitSettled();
            this._resetRecoverySignalState();
          } catch (e) {}
    
          try {
            Game.settings.starter = "white";
            setupInitialBoard();
            try {
              Visual?.clearCapturedOrder?.();
            } catch (e) {}
            try {
              Visual?.clearSouflaFX?.();
            } catch (e) {}
            try {
              Visual?.setHighlightCells?.([]);
            } catch (e) {}
            try {
              Visual?.setHintPath?.(null, null);
            } catch (e) {}
            try {
              Visual?.clearForcedOpeningArrow?.();
            } catch (e) {}
            try {
              Visual?.setLastMove?.(null, null);
            } catch (e) {}
            try {
              Visual?.setUndoMove?.(null, null);
            } catch (e) {}
            try {
              Visual?.draw?.();
            } catch (e) {}
            try {
              Turn.start();
            } catch (e) {}
          } catch (e) {}
    
          this.gameId = gameId;
          this.gameRef = db.ref("games").child(gameId);
    
          try {
            this._cleanupArmedFor = null;
          } catch (e) {}
    
          try {
            await this.gameRef.transaction((g) => {
              if (!g) return g;
              if (g.status === "ended" || g.status === "rejected") return g;
    
              g.players = g.players || {};
              g.players.white = g.players.white || {};
              g.players.black = g.players.black || {};
    
              if (g.players.black && g.players.black.uid && g.players.black.uid !== this.myUid) {
                return g;
              }
    
              g.players.black = { uid: this.myUid, nickname: this.myNick };
    
              if (g.status === "pending") {
                g.status = "active";
              }
    
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
          } catch (err) {
            handleDbError(err, window.I18N.translateArgs("online.errors.joinFailed"));
          }
    
          try {
            const gv = await this.gameRef.once("value");
            const g = gv && gv.val ? gv.val() : null;
            const blackUid = g && g.players && g.players.black && g.players.black.uid;
            const statusText = String((g && g.status) || "").trim();
            const okStatus = g && statusText === "active";
            if (!okStatus || (blackUid && blackUid !== this.myUid)) {
              try {
                this.gameRef.off();
              } catch (e) {}
              try {
                this._cleanupOnline();
              } catch (e) {}
              const invalidated = !g || statusText === "rejected" || statusText === "ended" || statusText === "pending";
              showOnlineNotice(window.I18N.translateArgs(invalidated ? "online.inviteInvalidated" : "online.errors.joinFailed"));
              return;
            }
          } catch (e) {}
    
          try {
            const gv = await this.gameRef.once("value");
            const activeGame = gv && typeof gv.val === "function" ? gv.val() : null;
            await this._publishRoomListEntry(gameId, activeGame);
          } catch (e) {}
          try {
            await this.syncNow({ repairPresence: true });
          } catch (e) {}
    
          this._bindGameListeners();
          try {
            await this._initRoomComms();
          } catch (e) {}
          try {
            this._persistActiveGame();
          } catch (e) {}
        },

    _applyUiHold: function (on) {
          try {
            var root = document.documentElement;
            if (!root || !root.classList) return;
            if (on) {
              root.classList.add("ui-hold");
              root.classList.add("role-pending");
            } else {
              root.classList.remove("ui-hold");
              root.classList.remove("role-pending");
              root.classList.add("ui-ready");
            }
          } catch (e) {}
        },

    _releaseUiHoldSoon: function () {
          try {
            var root = document.documentElement;
            if (!root || !root.classList) return;
            var done = function () {
              try {
                root.classList.remove("ui-hold");
                root.classList.remove("role-pending");
                root.classList.add("ui-ready");
              } catch (e) {}
            };
            if (window.requestAnimationFrame) {
              requestAnimationFrame(function () {
                requestAnimationFrame(done);
              });
            } else {
              setTimeout(done, 0);
            }
          } catch (e) {}
        },

    _setOnlineButtonsState: function (on) {
          try { if (document.body && document.body.classList) document.body.classList.toggle("z-online-active", !!on && !this.isSpectator); } catch (e) {}
          let initialUiHold = false;
          try {
            const root = document.documentElement;
            initialUiHold = !!(root && root.classList && root.classList.contains("ui-hold") && !root.classList.contains("ui-ready"));
            if (initialUiHold) this._applyUiHold(true);
          } catch (e) {}
          try {
          } catch (e) {}
          try {
            document.body.classList.toggle("mode-pvp", !!on);
            try {
              window.ZamatControls?.mount?.(!!on, !!this.isSpectator);
            } catch (_e) {}
          } catch (e) {}
    
          const btnEnd = document.getElementById("btnEndOnline");
    
          if (btnEnd) {
            const showEnd = !!on && !this.isSpectator;
            btnEnd.style.display = showEnd ? "block" : "none";
            if (showEnd) btnEnd.onclick = () => this.confirmLeaveRoom();
            else btnEnd.onclick = null;
          }
    
          ["btnEndKill", "btnUndo", "btnSoufla"].forEach((id) => {
            try {
              const el = document.getElementById(id);
              if (el && this.isSpectator) el.style.display = "none";
            } catch (e) {}
          });
          [".timer-row", ".soufla-row"].forEach((sel) => {
            try {
              const el = document.querySelector(sel);
              if (el) el.style.display = this.isSpectator ? "none" : "";
            } catch (e) {}
          });
    
          const syncWrap = document.getElementById("syncControlWrap");
          const btnSync = document.getElementById("btnSync");
          if (syncWrap) syncWrap.style.display = on && !this.isSpectator ? "flex" : "none";
          if (btnSync) {
            btnSync.style.display = on && !this.isSpectator ? "inline-flex" : "none";
          }
          try {
            this._setSyncIssueState(this._syncIssueVisible);
          } catch (e) {}
    
          const btnChat = document.getElementById("btnChat");
          if (btnChat) {
            btnChat.style.display = on ? "inline-flex" : "none";
            if (!on) {
              try { delete btnChat.dataset.badge; } catch (e) {}
            }
          }
    
          try {
            const pvpBar = document.getElementById("pvpVoiceBar");
            const specBar = document.getElementById("specBar");
            if (pvpBar) pvpBar.style.display = on && !this.isSpectator ? "grid" : "none";
            if (specBar) specBar.style.display = on && this.isSpectator ? "grid" : "none";
          } catch (e) {}
    
    
          if (on) {
            try {
              this.refreshPvpControls();
            } catch (e) {}
            try {
              if (on && !this.isSpectator) {
                const f = sessionStorage.getItem("zamat.forceResyncOnLoad");
                if (f) {
                  sessionStorage.removeItem("zamat.forceResyncOnLoad");
                  setTimeout(() => {
                    try {
                      this.syncNow();
                    } catch (_e) {}
                  }, 250);
                }
              }
            } catch (e) {}
          } else {
            try {
              if (typeof applyLanguage === "function") {
                applyLanguage(document.documentElement.lang || "ar");
              }
            } catch (e) {}
          }
          try { if (window.ZamatControls && typeof window.ZamatControls.mount === "function") window.ZamatControls.mount(!!on, !!this.isSpectator); } catch (e) {}
          if (initialUiHold) {
            try { this._releaseUiHoldSoon(); } catch (e) {}
            try { var self=this; setTimeout(function(){ try { if (self.isActive) { self._applyUiHold(false); if (document.body && document.body.classList && !self.isSpectator) document.body.classList.add("z-online-active"); if (window.ZamatControls && typeof window.ZamatControls.mount === "function") window.ZamatControls.mount(true, !!self.isSpectator); } } catch (_) {} },400); } catch (e) {}
          } else {
            try {
              const root = document.documentElement;
              if (root && root.classList) {
                root.classList.remove("ui-hold", "role-pending");
                root.classList.add("ui-ready");
              }
            } catch (e) {}
          }
        },

    _notifyMatchEndWatchers: async function (gameId, reason, fromNick) {
          try {
            if (!db || !gameId || !this.myUid) return;
            const ts = nowTs();
            const updates = {};
            const fromName = fromNick || this.myNick || window.I18N.translateArgs("players.player");
            let opponentUid = null;
            try {
              opponentUid = (await this._getOpponentInfo()).uid || null;
            } catch (e) {
              Logger.warn("match_end_opponent_lookup_failed", { gameId, err: String(e && (e.message || e)) });
            }
            const addEvent = (uid) => {
              try {
                const toUid = String(uid || "").trim();
                if (!toUid || toUid === String(this.myUid || "")) return;
                const key = `end_${this.myUid}_${gameId}_${toUid}_${ts}`;
                updates[`userEvents/${toUid}/${key}`] = {
                  type: "match_end",
                  fromUid: this.myUid,
                  toUid,
                  fromNick: fromName,
                  gameId,
                  createdAt: ts,
                  expiresAt: ts + 2 * 24 * 60 * 60 * 1000,
                  status: "unread",
                  reason: reason || "ended_by_player",
                };
              } catch (e) {
                Logger.warn("match_end_event_build_failed", { gameId, uid, err: String(e && (e.message || e)) });
              }
            };
            addEvent(opponentUid);
            try {
              const ss = await db.ref("spectators").child(gameId).once("value");
              const specs = ss && ss.val ? ss.val() : null;
              if (specs && typeof specs === "object") Object.keys(specs).forEach(addEvent);
            } catch (e) {
              Logger.warn("match_end_spectators_lookup_failed", { gameId, err: String(e && (e.message || e)) });
            }
            if (Object.keys(updates).length) await db.ref().update(updates);
          } catch (e) {
            Logger.warn("match_end_notify_failed", { gameId, reason, err: String(e && (e.message || e)) });
          }
        },

    endOnline: async function () {
          try {
            this._localEndedOnline = true;
          } catch (e) {}
    
          let wrote = false;
    
          const who = this.myNick || window.I18N.translateArgs("players.player");
          const payload = {
            status: "ended",
            endedAt: nowTs(),
            endedReason: "ended_by_player",
            endedBy: { uid: this.myUid, nickname: who },
          };
    
    
          try {
            if (this.gameRef) {
              const res = await this.gameRef.transaction((g) => {
                if (!g || g.status !== "active") return g;
                g.status = "ended";
                g.endedAt = payload.endedAt;
                g.endedReason = payload.endedReason;
                g.endedBy = payload.endedBy;
    
                g.log = Array.isArray(g.log) ? g.log : [];
    
                normalizeLogArrayForWrite(g.log);
                g.log.push({
                  ts: nowTs(),
                  type: "ended_by_player",
                  byUid: this.myUid,
                  byNick: who,
                  text: encodeSharedLogText({
                    kind: "i18n",
                    key: "online.matchEndedByPlayer",
                    vars: { player: who, reason: "" },
                  }),
                });
                if (g.log.length > 200) g.log = g.log.slice(-200);
                return g;
              });
              wrote = !!(res && res.committed);
            }
          } catch (e) {}
    
          if (!wrote) {
            try {
              if (this.gameRef) {
                await this.gameRef.update(payload);
                wrote = true;
              }
            } catch (e) {}
          }
    
          if (!wrote) {
            try {
              if (this.gameRef) {
                await this.gameRef.child("status").set("ended");
                wrote = true;
              }
            } catch (e) {}
          }
    
          if (!wrote) {
            try {
              showOnlineNotice(window.I18N.translateArgs("online.endFail"));
            } catch (e) {}
            return;
          }
    
          try {
            if (this.gameId) {
              this._lastGameData = Object.assign({}, this._lastGameData || {}, payload);
              await this._removeRoomListEntry(this.gameId);
              this._schedulePurgeRoom(this.gameId, "ended_by_player", ROOM_ENDED_PURGE_DELAY_MS);
            }
          } catch (e) {}
    
          try {
            await this._notifyMatchEndWatchers(this.gameId, "ended_by_player", who);
          } catch (e) {}
    
          try {
            this._enterPostMatch({ reason: "ended_by_player", byUid: this.myUid, byNick: who });
          } catch (e) {}
        },

    _clearPostMatchSession: function () {
          try {
            sessionStorage && sessionStorage.clear && sessionStorage.clear();
          } catch (e) {}
          try {
            localStorage.removeItem("zamat.activeGameId");
          } catch (e) {}
          try {
            localStorage.removeItem("zamat.activeGameTs");
          } catch (e) {}
        },

    _buildOnlineEndPresentation: function (meta) {
          const info = meta && typeof meta === "object" ? meta : {};
          const gameData = info.game && typeof info.game === "object"
            ? info.game
            : (this._lastGameData && typeof this._lastGameData === "object" ? this._lastGameData : {});
          const result = info.result && typeof info.result === "object"
            ? info.result
            : (gameData.result && typeof gameData.result === "object" ? gameData.result : {});
          const resultMeta = result.meta && typeof result.meta === "object" ? result.meta : {};
          const reason = String(result.reason || info.reason || info.endedReason || gameData.endedReason || "ended").trim();
          const winnerValue = info.winner != null ? info.winner : (gameData.winner != null ? gameData.winner : result.winner);
          const winner = Number(winnerValue) === TOP || Number(winnerValue) === BOT ? Number(winnerValue) : null;
          const players = info.players || gameData.players || {};
          const endedBy = info.endedBy || gameData.endedBy || null;
          const endedBySide = endedBy && (Number(endedBy.side) === TOP || Number(endedBy.side) === BOT)
            ? Number(endedBy.side)
            : null;
          const actionKind = String(resultMeta.kind || (gameData.lastMove && gameData.lastMove.action) || info.kind || "").trim();
          const resultStatus = String(result.status || "").toLowerCase();
          const countsAsResult = resultMeta.countsAsResult !== false;
          const rejectionReason = String(resultMeta.rejectionReason || "").trim();
          const missingOfficial = info.missingOfficial === true || reason === "room_unavailable";
          const isSpectator = !!this.isSpectator;
          const mySide = !isSpectator && (Number(this.mySide) === TOP || Number(this.mySide) === BOT)
            ? Number(this.mySide)
            : null;
          const isSelfSide = (side) => mySide != null && Number(side) === mySide;
          const isSelfUid = (uid) => !isSpectator && !!uid && !!this.myUid && String(uid) === String(this.myUid);

          const rowForSide = (side) => side === BOT ? players.white : side === TOP ? players.black : null;
          const actualNameForSide = (side) => {
            const row = rowForSide(side);
            let name = "";
            try {
              if (row && typeof displayPlayerName === "function") name = displayPlayerName(row.uid, row.nickname);
            } catch (e) {}
            if (!name && row) name = String(row.nickname || "").trim();
            if (name) return name;
            try {
              if (typeof Game !== "undefined" && Game && Game.names) {
                const fallback = side === BOT ? Game.names.bot : side === TOP ? Game.names.top : "";
                if (String(fallback || "").trim()) return String(fallback).trim();
              }
            } catch (e) {}
            return window.I18N.translateArgs("players.player");
          };
          const actorActualName = (() => {
            if (endedBy) {
              try {
                if (typeof displayPlayerName === "function") {
                  const direct = displayPlayerName(endedBy.uid, endedBy.nickname);
                  if (direct) return direct;
                }
              } catch (e) {}
              if (String(endedBy.nickname || "").trim()) return String(endedBy.nickname).trim();
            }
            if (endedBySide != null) return actualNameForSide(endedBySide);
            try {
              if (typeof displayPlayerName === "function") {
                const direct = displayPlayerName(info.byUid, info.byNick);
                if (direct) return direct;
              }
            } catch (e) {}
            return String(info.byNick || "").trim();
          })();
          const actorIsSelf = !isSpectator && (
            (endedBySide != null && isSelfSide(endedBySide)) ||
            (endedBy && isSelfUid(endedBy.uid)) ||
            isSelfUid(info.byUid)
          );
          const otherSide = endedBySide === TOP ? BOT : endedBySide === BOT ? TOP : null;
          const otherName = otherSide != null ? actualNameForSide(otherSide) : window.I18N.translateArgs("online.opponent");
          const winnerName = winner != null ? actualNameForSide(winner) : "";
          const loserSide = winner === TOP ? BOT : winner === BOT ? TOP : null;
          const loserName = loserSide != null ? actualNameForSide(loserSide) : window.I18N.translateArgs("players.player");
          const isDraw = resultStatus === "draw" || reason === "draw" || reason === "one_king_each";
          const isAbsence = reason === "opponent_absent" || reason === "opponent_absent_late" || actionKind === "opponent-absent";
          const isManual = isAbsence || reason === "ended_by_player" || reason === "late_exit" || ["leave", "resign"].includes(actionKind);
          const adminCounted = countsAsResult && (reason === "late_exit" || reason === "opponent_absent_late" || resultMeta.adjudicated === true);

          const lines = [];
          const add = (text) => {
            const clean = String(text || "").trim();
            if (clean && !lines.includes(clean)) lines.push(clean);
          };

          if (missingOfficial) {
            add(window.I18N.translateArgs("online.endPresentation.roomUnavailable"));
          } else if (winner != null) {
            if (isSelfSide(winner)) add(window.I18N.translateArgs("online.endPresentation.selfWinner"));
            else if (mySide != null) add(window.I18N.translateArgs("online.endPresentation.selfLoser"));
            else add(formatTpl(window.I18N.translateArgs("online.endPresentation.winner"), { player: winnerName }));
          } else if (isDraw) {
            add(window.I18N.translateArgs("modals.gameOver.draw"));
          } else if (isManual && actorActualName) {
            if (actorIsSelf) {
              add(isAbsence
                ? formatTpl(window.I18N.translateArgs("online.endPresentation.selfEndedByAbsence"), { opponent: otherName })
                : window.I18N.translateArgs("online.endPresentation.selfEndedBy"));
            } else {
              add(isAbsence
                ? formatTpl(window.I18N.translateArgs("online.endPresentation.endedByAbsence"), { player: actorActualName, opponent: otherName })
                : formatTpl(window.I18N.translateArgs("online.endPresentation.endedBy"), { player: actorActualName }));
            }
          } else {
            add(window.I18N.translateArgs("online.endPresentation.noRecordedResult"));
          }

          if (!missingOfficial) {
            if (reason === "no_pieces") {
              add(isSelfSide(loserSide)
                ? window.I18N.translateArgs("online.endPresentation.reason.selfNoPieces")
                : formatTpl(window.I18N.translateArgs("modals.gameOver.reason.noPieces"), { player: loserName }));
            } else if (reason === "no_legal_moves") {
              add(isSelfSide(loserSide)
                ? window.I18N.translateArgs("online.endPresentation.reason.selfNoLegalMoves")
                : formatTpl(window.I18N.translateArgs("online.endPresentation.reason.noLegalMoves"), { player: loserName }));
            } else if (reason === "one_king_each") {
              add(window.I18N.translateArgs("online.endPresentation.reason.oneKingEach"));
            }

            if (winner != null && isManual) {
              if (actorIsSelf) {
                add(isAbsence
                  ? formatTpl(window.I18N.translateArgs("online.endPresentation.selfEndedByAbsence"), { opponent: otherName })
                  : window.I18N.translateArgs("online.endPresentation.selfEndedBy"));
              } else {
                add(isAbsence
                  ? formatTpl(window.I18N.translateArgs("online.endPresentation.endedByAbsence"), { player: actorActualName || window.I18N.translateArgs("players.player"), opponent: otherName })
                  : formatTpl(window.I18N.translateArgs("online.endPresentation.endedBy"), { player: actorActualName || window.I18N.translateArgs("players.player") }));
              }
            }

            if (countsAsResult === false) {
              const key = rejectionReason === "administrative_early_or_midgame"
                ? "online.resultNotCounted.early"
                : rejectionReason === "administrative_position_not_clear"
                  ? "online.resultNotCounted.unclear"
                  : "online.resultNotCounted.generic";
              add(window.I18N.translateArgs(key));
            } else if (adminCounted) {
              add(window.I18N.translateArgs("online.endPresentation.reason.positionDecisive"));
            }
          }

          const primary = lines[0] || window.I18N.translateArgs("online.endPresentation.noRecordedResult");
          const namesToEmphasize = [
            actorActualName, otherName, winnerName, loserName,
            actualNameForSide(TOP), actualNameForSide(BOT),
          ].map((name) => String(name || "").trim()).filter((name, index, all) => name && all.indexOf(name) === index)
            .sort((a, b) => b.length - a.length);
          const decorateLine = (line) => {
            let html = escapeHtml(String(line || ""));
            namesToEmphasize.forEach((name) => {
              const encoded = escapeHtml(name);
              if (encoded) html = html.split(encoded).join(`<span class="z-player-name">${encoded}</span>`);
            });
            return html;
          };
          return {
            title: window.I18N.translateArgs("modals.gameOver.title"),
            primary,
            details: lines.slice(1),
            text: lines.join("\n\n"),
            html: lines.map(decorateLine).join("<br><br>"),
            reason,
            winner,
            countsAsResult,
          };
        },

    _enterPostMatch: function (meta) {
          const info = meta && typeof meta === "object" ? meta : {};
          const presentation = this._buildOnlineEndPresentation(info);
          const winner = presentation.winner;
          try { this._clearPostMatchSession(); } catch (e) {}
          this._inPostMatch = true;
          if (this._postMatchShown) return true;
          this._postMatchShown = true;
          try {
            const gid = this.gameId;
            const gd = this._lastGameData || null;
            if (gid && gd && gd.status && gd.status !== "active") this._armRoomCleanupAfterEnd(gid, presentation.reason || gd.endedReason || gd.status, gd);
          } catch (e) {}
          try { this._stopOpponentAbsenceWatcher && this._stopOpponentAbsenceWatcher(); } catch (e) {}
          try { this._teardownRoomComms && this._teardownRoomComms(); } catch (e) {}
          try {
            if (typeof Game !== "undefined" && Game) {
              Game.gameOver = true;
              Game.winner = winner === TOP || winner === BOT ? winner : null;
              Game.terminationReason = presentation.reason;
              Game.endStatusText = presentation.primary;
              Game.inChain = false;
              Game.chainPos = null;
              Game.awaitingPenalty = false;
              Game.souflaPending = null;
              Game.availableSouflaForLocalPlayer = null;
              Game.killTimer && Game.killTimer.hardStop && Game.killTimer.hardStop();
            }
          } catch (e) {}
          try { if (typeof Input !== "undefined" && Input) Input.selected = null; } catch (e) {}
          try { if (typeof UI !== "undefined" && UI && typeof UI.updateStatus === "function") UI.updateStatus(); } catch (e) {}
          try { this.refreshPvpControls && this.refreshPvpControls(); } catch (e) {}
          try {
            if (typeof UI !== "undefined" && UI && typeof UI.showOnlineGameOverModal === "function") {
              const opened = UI.showOnlineGameOverModal(presentation);
              if (opened !== false) return true;
            }
          } catch (e) {}
          try { showOnlineNotice(presentation.text, { allowSpectator: true }); } catch (e) {}
          return true;
        },

    _getOpponentInfoFromData: function (data) {
          try {
            const players = data && data.players ? data.players : data;
            if (!players) return { uid: null, nick: "" };
            const w = players.white || {};
            const b = players.black || {};
            if (this.myUid) {
              if (w.uid === this.myUid) return { uid: b.uid || null, nick: b.nickname || "" };
              if (b.uid === this.myUid) return { uid: w.uid || null, nick: w.nickname || "" };
            }
            if (this.mySide === -1) return { uid: b.uid || null, nick: b.nickname || "" };
            if (this.mySide === +1) return { uid: w.uid || null, nick: w.nickname || "" };
            if (w.uid) return { uid: w.uid || null, nick: w.nickname || "" };
            if (b.uid) return { uid: b.uid || null, nick: b.nickname || "" };
          } catch (e) {}
          return { uid: null, nick: "" };
        },

    _getOpponentInfo: async function () {
          let opp = { uid: null, nick: "" };
          try {
            opp = this._getOpponentInfoFromData(this._lastGameData);
          } catch (e) {}
          if (!opp.uid && this.gameRef) {
            try {
              const ps = await this.gameRef.child("players").once("value");
              const pl = ps && ps.val ? ps.val() : null;
              opp = this._getOpponentInfoFromData(pl);
            } catch (e) {}
          }
          return opp;
        },

    exitToMode: async function () {
          try {
            this._clearPostMatchSession();
          } catch (e) {}
    
          const gid = this.gameId || this._presenceRoomId;
          const uid = this.myUid;
          if (this.isSpectator) this._spectatorLeaving = true;
    
          try {
            if (gid && uid && this.isSpectator) {
              await this._removeSpectatorRegistration(gid, uid);
            }
          } catch (e) {}
    
          try {
            this._teardownRoomComms && this._teardownRoomComms();
          } catch (e) {}
          try {
            this.gameRef && this.gameRef.off && this.gameRef.off();
          } catch (e) {}
    
          try {
            this._clearPersistedActiveGame && this._clearPersistedActiveGame();
          } catch (e) {}
    
          this.isActive = false;
          this.isSpectator = false;
          this.gameId = null;
          this.gameRef = null;
          this.mySide = null;
    
          try {
            document.body.classList.remove("z-spectator");
          } catch (e) {}
    
          try {
            setupInitialBoard();
            try {
              Turn.start();
            } catch (e) {}
          } catch (e) {}
    
          try {
            await this._setLobbyStatus("available");
          } catch (e) {}
    
          try {
            const inPages = (location.pathname || "").includes("/pages/");
            location.replace("https://ouglsoft.com/dhamet/pages/mode.html");
          } catch (e) {}
        },

    confirmLeaveRoom: async function () {
          try {
            if (!this.isActive || this.isSpectator) {
              try {
                await this.leaveRoom();
              } catch (e) {}
              return;
            }
    
            if (window.UI && typeof window.UI.confirmMatchExit === "function") {
              await window.UI.confirmMatchExit(async () => {
                await this.leaveRoom();
              });
              return;
            }
    
            const msg =
              (window.I18N && typeof window.I18N.text === "function" ? window.I18N.text("modals.endMatch.confirm") || "" : "") ||
              "هل تريد إنهاء المباراة؟";
            if (confirm(msg)) {
              await this.leaveRoom();
            }
          } catch (e) {
            try {
              await this.leaveRoom();
            } catch (e) {}
          }
        },

    leaveRoom: async function () {
          try {
            const gid = this.gameId || this._presenceRoomId;
            const uid = this.myUid;
    
            if (!gid || !uid) {
              try {
                const back = (location.pathname || "").includes("/pages/")
                  ? "./loby.html"
                  : "pages/loby.html";
                try {
                  setupInitialBoard();
                  try {
                    Turn.start();
                  } catch (e) {}
                } catch (e) {}
                location.href = back;
              } catch (e) {}
              return;
            }
    
            if (this.isSpectator) {
              this._spectatorLeaving = true;
              try {
                await this._removeSpectatorRegistration(gid, uid);
              } catch (e) {}
            } else {
              try {
                await this.endOnline();
              } catch (e) {}
              try {
                await this.exitToMode();
              } catch (e) {}
              return;
            }
    
            try {
              this._teardownRoomComms();
            } catch (e) {}
            try {
              this.gameRef && this.gameRef.off();
            } catch (e) {}
    
            try {
              this._clearPersistedActiveGame();
            } catch (e) {}
            this.isActive = false;
            this.isSpectator = false;
            this.gameId = null;
            this.gameRef = null;
            this.mySide = null;
    
            try {
              document.body.classList.remove("z-spectator");
            } catch (e) {}
            try {
              this._setOnlineButtonsState(false);
            } catch (e) {}
    
            try {
              this._presenceStatus = "available";
              this._presenceRole = "lobby";
              this._presenceRoomId = null;
            } catch (e) {}
            try {
              if (this.statusRef) {
                await safePlayerWrite(
                  this.statusRef,
                  this.myUid,
                  {
                    status: "available",
                    role: "lobby",
                    roomId: null,
                    nickname: this.myNick,
                    icon: this.myIcon || getSavedIconOrDefault(),
                    updatedAt: nowTs(),
                  },
                  "players.leaveToLobby",
                  () => {
                    try {
                      this._stopPresenceHeartbeat();
                    } catch (e) {}
                  },
                );
              }
            } catch (e) {}
    
            try {
              const back = (location.pathname || "").includes("/pages/")
                ? "./loby.html"
                : "pages/loby.html";
              try {
                setupInitialBoard();
                try {
                  Turn.start();
                } catch (e) {}
              } catch (e) {}
              location.href = back;
            } catch (e) {}
          } catch (e) {}
        },

    _teardownOnlineSubscriptions: function (options) {
          const localOnly = !!(options && options.localOnly);
          try { this._teardownRoomComms({ localOnly }); } catch (e) {}
          try { this._stopOpponentAbsenceWatcher(); } catch (e) {}
          try { this.gameRef && this.gameRef.off(); } catch (e) {}
          try { this.playersRef && this.playersRef.off(); } catch (e) {}
          try { this.invitesRef && this.invitesRef.off(); } catch (e) {}
          try { this._unbindUserEventsListener(); } catch (e) {}
          try { this._unbindInvitePreferenceListener(); } catch (e) {}
          try { this._lobbyPlayersRef && this._lobbyPlayersCb && this._lobbyPlayersRef.off("value", this._lobbyPlayersCb); } catch (e) {}
          try { this._lobbyRoomsRef && this._lobbyRoomsCb && this._lobbyRoomsRef.off("value", this._lobbyRoomsCb); } catch (e) {}
          this._lobbyPlayersRef = null;
          this._lobbyPlayersCb = null;
          this._lobbyRoomsRef = null;
          this._lobbyRoomsCb = null;
          try { this._stopInviteCleanup(); } catch (e) {}
          try { this._stopOutgoingInviteWatches(); } catch (e) {}
          try { this._teardownGamePresence({ localOnly }); } catch (e) {}
        },

    _resetOnlineRuntimeState: function () {
          this._spectatorLeaving = false;
          this._localEndedOnline = false;
          this._selfConnected = true;
          this._oppOnline = true;
          this.isActive = false;
          this.gameId = null;
          this.gameRef = null;
          this.mySide = null;
          this._pendingSteps = [];
          this._cachedSouflaPlain = null;
          this._isApplyingRemote = false;
          try { this._clearPersistedActiveGame(); } catch (e) {}
          try { this._clearPresenceUi(); } catch (e) {}
          try { this._markLocalCommitSettled(); } catch (e) {}
          try { this._resetRecoverySignalState(); } catch (e) {}
          this._setOnlineButtonsState(false);
        },

    _resetBoardAfterOnline: function () {
          try {
            setupInitialBoard();
            Turn.start();
          } catch (e) {}
        },

    _setPresenceMode: function (status, role, roomId, ctx) {
          this._presenceStatus = status || "available";
          this._presenceRole = role || null;
          this._presenceRoomId = roomId || null;
    
          if (!this.statusRef || !this.myUid) return;
          safePlayerWriteNoAwait(
            this.statusRef,
            this.myUid,
            {
              status: this._presenceStatus,
              role: this._presenceRole,
              roomId: this._presenceRoomId,
              nickname: this.myNick,
              icon: this.myIcon || getSavedIconOrDefault(),
              updatedAt: nowTs(),
            },
            ctx || "players.status",
          );
        },

    _cleanupOnline: function () {
          this._teardownOnlineSubscriptions();
          this._resetOnlineRuntimeState();
          this._resetBoardAfterOnline();
          this._setPresenceMode("available", null, null, "players.status");
        },

    _schedulePurgeRoom: function (gameId, reason, delayMs) {
          const gid = String(gameId || "").trim();
          if (!gid || this.isSpectator) return;
          if (!this._purgeTimers) this._purgeTimers = {};
          if (this._purgeTimers[gid]) return;
    
          const d = typeof delayMs === "number" && delayMs >= 0 ? delayMs : 1500;
          this._purgeTimers[gid] = setTimeout(() => {
            if (this._purgeTimers) delete this._purgeTimers[gid];
            Promise.resolve(this._purgeRoomData(gid, reason)).catch((e) => {
              Logger.warn("room_purge_failed", { gameId: gid, reason, err: String(e && (e.message || e)) });
            });
          }, d);
        },

    _armRoomCleanupAfterEnd: function (gameId, reason, gData) {
          const gid = String(gameId || "").trim();
          if (!gid || this.isSpectator) return;
          if (this._cleanupArmedFor === gid) return;
          this._cleanupArmedFor = gid;
          if (gData && typeof gData === "object") this._lastGameData = gData;
    
          const reasonText = String(reason || "");
          const purgeDelay = reasonText === "disconnect_wait"
            ? ROOM_ABANDONED_CLEANUP_MS
            : reasonText === "rejected" || reasonText === "invite_rejected"
              ? ROOM_REJECTED_PURGE_DELAY_MS
              : reasonText === "pending" || reasonText === "invite_expired"
                ? ROOM_PENDING_PURGE_DELAY_MS
                : ROOM_ENDED_PURGE_DELAY_MS;
          this._schedulePurgeRoom(gid, reason || "postmatch", purgeDelay);
        },

    _bindGameListeners: function () {
          if (!this.gameRef) return;
          this.gameRef.off();
          try {
            this._setupGamePresence();
          } catch (e) {}
          try {
            this._startOpponentAbsenceWatcher();
          } catch (e) {}
          this.gameRef.on("value", (snap) => {
            const data = snap.val();
            try {
              this._lastGameData = data;
            } catch (e) {}

            try {
              this._handleRecoverySignal(data);
            } catch (e) {}
    
            if (!data) {
              try {
                if (this.isActive) {
                  try { this._enterPostMatch({ reason: "room_unavailable", missingOfficial: true }); } catch (e) {}
                }
              } catch (e) {}
              return;
            }
    
            if (data.status && data.status !== "active") {
              try {
                this._enterPostMatch({
                  reason: data.endedReason || data.status,
                  endedBy: data.endedBy || null,
                });
              } catch (e) {}
              return;
            }
            let __skipApply = false;
            try {
              const remoteMi = Number(data.moveIndex || 0);
              if (this._awaitingLocalCommit && Number.isFinite(this._expectedMoveIndex)) {
                if (remoteMi < this._expectedMoveIndex) {
                  __skipApply = true;
                } else {
                  this._markLocalCommitSettled();
                }
              }
            } catch (e) {}
            try {
              const w = data.players && data.players.white ? data.players.white.nickname || "" : "";
              const b = data.players && data.players.black ? data.players.black.nickname || "" : "";
    
              Game.names.bot = w || "";
              Game.names.top = b || "";
    
              try {
                if (window.ZGamePlayers && typeof window.ZGamePlayers.refresh === "function") {
                  window.ZGamePlayers.refresh();
                }
              } catch (e) {}
              try {
                this._topDisplayName = this._resolveSlotDisplayName("top", Game.names.top || window.I18N.translateArgs("players.player"));
                this._botDisplayName = this._resolveSlotDisplayName("bot", Game.names.bot || window.I18N.translateArgs("players.player"));
                this._ensurePresenceUi();
                this._updatePresenceUi();
              } catch (e) {}
            } catch (e) {}
    
            this.moveIndex = data.moveIndex || 0;
            this.ply = data.ply || 0;
    
            try {
              this._renderSharedLog(data.log || []);
            } catch (e) {}
            try {
              this._handlePresence(data);
            } catch (e) {}
    
            try {
              if (data.soufla && data.soufla.availableFor === this.mySide) {
                Game.availableSouflaForLocalPlayer = plainToSoufla(data.soufla.pending);
              } else {
                Game.availableSouflaForLocalPlayer = null;
              }
            } catch (e) {}
    
            this._handleUndoRequest(data);
    
            if (!__skipApply) {
              const stateSnap =
                (data.state && data.state.snapshot) ||
                (data.states &&
                  data.ply != null &&
                  data.states[data.ply] &&
                  data.states[data.ply].snapshot) ||
                null;
    
              if (stateSnap) {
                const stateRecord =

                  (data.state && typeof data.state === "object" && data.state) ||

                  (data.states && data.ply != null && data.states[data.ply]) ||

                  {};

                const normalizedState = stateRecordWithPromotionQueue(stateSnap, stateRecord);


                const patched = Object.assign({}, data, {

                  state: Object.assign({}, stateRecord, normalizedState),

                });
                this._applyRemoteState(patched);
              } else if (typeof data.turn === "number") {
                try {
                  Game.player = data.turn;
                  Turn.ctx = null;
                  Turn.start();
                  UI.updateAll();
                } catch (e) {}
              }
            }
          });
    
          try {
            this._installViewHooksOnce();
          } catch (e) {}
        },

    _applyRemoteState: function (data, applyOptions) {
          const skipFx = !!(applyOptions && applyOptions.skipFx);
          try {
            this._isApplyingRemote = true;
    
            try {
              const remoteMI = Number(
                (data && (data.moveIndex ?? (data.lastMove && data.lastMove.moveIndex))) ?? 0,
              );
              if (this._awaitingLocalCommit && Number.isFinite(this._expectedMoveIndex)) {
                if (remoteMI < this._expectedMoveIndex) {
                  return;
                }
                this._markLocalCommitSettled();
              }
            } catch (e) {}
            const snap = data && data.state ? data.state.snapshot : null;
            if (!snap) return;
    
    
            restoreSnapshot(snap, { redraw: false, visual: false });
    
            try {
              const lm = data && data.lastMove ? data.lastMove : null;
                const curSide =
                  snap && typeof snap.player === "number"
                    ? snap.player
                    : typeof data.turn === "number"
                      ? data.turn
                      : null;
                const lastSide =
                  curSide != null ? -curSide : lm && typeof lm.by === "number" ? lm.by : null;
    
                if (lm && lm.kind === "undo" && typeof Visual !== "undefined" && Visual) {
                  const fr = lm.undoneFrom != null ? lm.undoneFrom : null;
                  const p = Array.isArray(lm.undonePath) ? lm.undonePath : null;
                  if (fr != null && p && p.length && typeof Visual.setUndoMovePath === "function") {
                    Visual.setUndoMovePath(fr, p, true);
                  } else if (fr != null && p && p.length && typeof Visual.setUndoMove === "function") {
                    Visual.setUndoMove(fr, p[p.length - 1], true);
                  } else {
                    try {
                      Visual.setUndoMove && Visual.setUndoMove(null, null, true);
                    } catch (e) {}
                  }
                  try {
                    if (typeof Visual.markTurnBoundary === "function") Visual.markTurnBoundary();
                  } catch (e) {}
                } else {
                  try {
                    if (lastSide != null) Game.lastMoveSide = lastSide;
                  } catch (e) {}
                  try {
                    let fr = null;
                    let p = null;
    
                    if (lm && lm.from != null && Array.isArray(lm.path) && lm.path.length) {
                      fr = lm.from;
                      p = lm.path;
                    } else {
                      fr =
                        snap.lastMoveFrom != null
                          ? snap.lastMoveFrom
                          : snap.lastMovedFrom != null
                            ? snap.lastMovedFrom
                            : null;
                      p =
                        Array.isArray(snap.lastMovePath) && snap.lastMovePath.length
                          ? snap.lastMovePath
                          : snap.lastMovedTo != null
                            ? [snap.lastMovedTo]
                            : null;
                    }
    
                    if (fr != null && p && p.length && typeof Visual !== "undefined" && Visual) {
                      if (typeof Visual.setLastMovePath === "function")
                        Visual.setLastMovePath(fr, p, lastSide);
                      else if (typeof Visual.setLastMove === "function")
                        Visual.setLastMove(fr, p[p.length - 1], lastSide);
                      try {
                        if (typeof Visual.markTurnBoundary === "function") Visual.markTurnBoundary();
                      } catch (e) {}
                    } else {
                      try {
                        Visual && Visual.setLastMove && Visual.setLastMove(null, null);
                      } catch (e) {}
                    }
                  } catch (e) {}
                }
            } catch (e) {}
    
            try {
              if (
                typeof UI !== "undefined" &&
                UI &&
                typeof UI.updateCounts === "function" &&
                Game &&
                Array.isArray(Game.board)
              ) {
                let top = 0,
                  bot = 0,
                  tKings = 0,
                  bKings = 0;
                for (let r = 0; r < Game.board.length; r++) {
                  const row = Game.board[r];
                  if (!Array.isArray(row)) continue;
                  for (let c = 0; c < row.length; c++) {
                    const v = row[c];
                    if (!v) continue;
                    if (v > 0) {
                      top++;
                      if (Math.abs(v) === 2) tKings++;
                    } else if (v < 0) {
                      bot++;
                      if (Math.abs(v) === 2) bKings++;
                    }
                  }
                }
                UI.updateCounts({ top, bot, tKings, bKings });
              }
            } catch (e) {}
    
            try {
              const queue = deferredPromotionQueue(data.state || {});
              Game.deferredPromotions = queue;
              Game.deferredPromotion = queue.length ? Object.assign({}, queue[0]) : null;
            } catch (e) {}
    
            try {
              if (!skipFx && data.state && Array.isArray(data.state.capturedOrder)) {
                try {
                  if (
                    typeof Visual !== "undefined" &&
                    Visual &&
                    typeof Visual.setCapturedOrder === "function"
                  )
                    Visual.setCapturedOrder(data.state.capturedOrder, true);
                } catch (e) {}
              }
            } catch (e) {}
            try {
              Turn.ctx = null;
            } catch (e) {}
            try {
              Turn.start();
            } catch (e) {}
    
            try {
              if (typeof UI !== "undefined" && UI && typeof UI.updateAll === "function") UI.updateAll();
              if (
                typeof UI !== "undefined" &&
                UI &&
                typeof UI.restoreCaptureContinuationVisualState === "function" &&
                Game &&
                Game.inChain &&
                Game.chainPos != null &&
                Number(Game.player) === Number(this.mySide)
              ) {
                UI.restoreCaptureContinuationVisualState();
              }
            } catch (e) {}
    
            try {
              const lm = data.lastMove;
              const mi = lm && typeof lm.moveIndex === "number" ? lm.moveIndex : 0;
              if (mi && mi > (this._lastSeenMoveModal || 0)) {
                this._lastSeenMoveModal = mi;
                if (lm.kind === "soufla" && lm.decision) {
                  this._showSouflaModalFromLastMove(lm);
                } else if (lm.kind === "undo") {
                  const gameData = this._lastGameData || data || {};
                  const players = gameData.players || {};
                  const nameForUid = (uid, fallbackNick) => {
                    const want = String(uid || "");
                    const rows = [players.white || {}, players.black || {}];
                    const row = rows.find((item) => want && String(item.uid || "") === want) || {};
                    const nickname = String(row.nickname || fallbackNick || "").trim();
                    try { return displayPlayerName(row.uid || want, nickname) || window.I18N.translateArgs("players.player"); }
                    catch (_) { return nickname || window.I18N.translateArgs("players.player"); }
                  };
                  if (!this.isSpectator && lm.requesterUid && String(lm.requesterUid) === String(this.myUid || "")) {
                    const responder = nameForUid(lm.responderUid, lm.responderNick);
                    showOnlineNotice(formatTpl(window.I18N.translateArgs("undo.requesterAccepted"), { responder }), {
                      title: window.I18N.translateArgs("modals.undo.title"),
                      playerNames: [responder],
                    });
                  } else if (this.isSpectator) {
                    const responder = nameForUid(lm.responderUid, lm.responderNick);
                    const requester = nameForUid(lm.requesterUid, lm.requesterNick);
                    showOnlineNotice(formatTpl(window.I18N.translateArgs("undo.spectatorAccepted"), {
                      responder,
                      requester,
                    }), { allowSpectator: true, title: window.I18N.translateArgs("modals.undo.title"), playerNames: [responder, requester] });
                  }
                }
              }
    
              try {
                const lm2 = data.lastMove;
                const mi2 = lm2 && typeof lm2.moveIndex === "number" ? lm2.moveIndex : 0;
    
                if (lm2 && lm2.kind === "soufla" && lm2.souflaMeta && lm2.souflaMeta.fx) {
                  const fx = lm2.souflaMeta.fx;
                  this._lastSouflaFXMoveIndex = mi2 || this._lastSouflaFXMoveIndex;
    
                  try {
                    if (typeof Visual !== "undefined" && Visual && Visual.clearSouflaFX) {
                      Visual.clearSouflaFX();
                    }
                  } catch (e) {}
    
                  try {
                    if (fx && Array.isArray(fx.redPaths) && fx.redPaths.length) {
                      Visual.setSouflaIgnoredPaths && Visual.setSouflaIgnoredPaths(fx.redPaths);
                    } else if (fx && fx.red && fx.red.from != null) {
                      Visual.setSouflaIgnoredPaths &&
                        Visual.setSouflaIgnoredPaths([
                          { from: fx.red.from, path: [fx.red.to], jumps: [] },
                        ]);
                    }
                  } catch (e) {}
    
                  try {
                    if (fx && fx.undoArrow && fx.undoArrow.from != null) {
                      if (Array.isArray(fx.undoArrow.path) && fx.undoArrow.path.length) {
                        Visual.setSouflaUndoArrow &&
                          Visual.setSouflaUndoArrow(fx.undoArrow.from, fx.undoArrow.path);
                      } else if (fx.undoArrow.to != null) {
                        Visual.setSouflaUndoArrow &&
                          Visual.setSouflaUndoArrow(fx.undoArrow.from, fx.undoArrow.to);
                      }
                    }
                  } catch (e) {}
    
                  try {
                    if (fx && fx.removeIdx != null) {
                      Visual.setSouflaRemove && Visual.setSouflaRemove(fx.removeIdx);
                    }
                  } catch (e) {}
    
                  try {
                    if (fx && Array.isArray(fx.forcePath) && fx.forcePath.length) {
                      Visual.setSouflaForcePath && Visual.setSouflaForcePath(fx.forcePath);
                    }
                  } catch (e) {}
                } else if (
                  this._lastSouflaFXMoveIndex != null &&
                  mi2 &&
                  mi2 > this._lastSouflaFXMoveIndex
                ) {
                  try {
                    if (typeof Visual !== "undefined" && Visual && Visual.clearSouflaFX) {
                      Visual.clearSouflaFX();
                    }
                  } catch (e) {}
                  this._lastSouflaFXMoveIndex = null;
                }
              } catch (e) {}
            } catch (e) {}
          } catch (e) {
          } finally {
            this._isApplyingRemote = false;
          }
        },

    syncNow: async function (opts) {
          if (!this.isActive || !this.gameRef) return false;
          const cfg = opts && typeof opts === "object" ? opts : {};
          try {
            const snap = await this.gameRef.once("value");
            const data = snap && snap.val ? snap.val() : null;
            if (!data) {
              await this._showUnavailableGameAndLeave();
              return false;
            }
            if (data.status && data.status !== "active") {
              try { this._lastGameData = data; } catch (e) {}
              try {
                this._enterPostMatch({
                  reason: data.endedReason || data.status,
                  endedBy: data.endedBy || null,
                });
              } catch (e) {}
              return false;
            }
            if (!this._isCurrentUserPlayerInGame(data) && !this.isSpectator) {
              await this._showUnavailableGameAndLeave();
              return false;
            }
    
            try { this._lastGameData = data; } catch (e) {}
            try { this.moveIndex = data.moveIndex || 0; } catch (e) {}
            try { this.ply = data.ply || 0; } catch (e) {}
            try {
              this._renderSharedLog(data.log || []);
            } catch (e) {}
            try {
              this._handlePresence(data);
            } catch (e) {}
            try {
              if (cfg.repairPresence !== false && !this.isSpectator) {
                this._writeFullGamePresence("gamePresence.syncNow");
                this._touchRoomListActivity(this.gameId || this._presenceRoomId, true);
              }
            } catch (e) {}
    
            const stateSnap =
              (data.state && data.state.snapshot) ||
              (data.states &&
                data.ply != null &&
                data.states[data.ply] &&
                data.states[data.ply].snapshot) ||
              null;
    
            if (cfg.force || cfg.emitSignal) {
              try { this._pendingSteps = []; } catch (e) {}
              try { this._cachedSouflaPlain = null; } catch (e) {}
              try { this._clearMoveRetry(); } catch (e) {}
              try { this._markLocalCommitSettled(); } catch (e) {}
            }
    
            if (stateSnap) {
              const stateRecord =

                (data.state && typeof data.state === "object" && data.state) ||

                (data.states && data.ply != null && data.states[data.ply]) ||

                {};

              const normalizedState = stateRecordWithPromotionQueue(stateSnap, stateRecord);


              const patched = Object.assign({}, data, {

                state: Object.assign({}, stateRecord, normalizedState),

              });
              this._applyRemoteState(patched);
            } else if (typeof data.turn === "number") {
              try {
                Game.player = data.turn;
                Turn.ctx = null;
                Turn.start();
                UI.updateAll();
              } catch (e) {}
            }
            try {
              if (cfg.force || cfg.emitSignal) {
                this._clearMoveRetry();
                this._markLocalCommitSettled();
              }
            } catch (e) {}
            // Synchronization is intentionally local. Writing a recoverySignal
            // here would make the opponent react to this browser's refresh.
            return true;
          } catch (e) {
            showOnlineNotice(window.I18N.translateArgs("online.syncFail"));
            return false;
          }
        },

    _removeSpectatorRegistration: async function (gameId, uid) {
          try {
            if (this._spectatorHeartbeatTimer) clearInterval(this._spectatorHeartbeatTimer);
          } catch (e) {}
          this._spectatorHeartbeatTimer = null;
          const gid = String(gameId || "").trim();
          const userId = String(uid || this.myUid || "").trim();
          if (!gid || !userId || !db || !db.ref) return false;
    
          const roomRef = db.ref("spectators").child(gid);
          try {
            const specsSnap = await roomRef.once("value");
            const specs = specsSnap && specsSnap.val ? specsSnap.val() : null;
            const after = specs && typeof specs === "object" ? Object.assign({}, specs) : {};
            delete after[userId];
            const count = this._countSpectatorsFromValue(after);
            const ts = nowTs();
            const n = Math.max(0, Math.min(3, count));
            const updates = {
              ["spectators/" + gid + "/" + userId]: null,
              ["games/" + gid + "/spectatorCount"]: n,
              ["games/" + gid + "/spectatorCountUpdatedAt"]: ts,
            };
            try {
              const roomListSnap = await db.ref("roomList").child(gid).once("value");
              if (roomListSnap && roomListSnap.exists && roomListSnap.exists()) {
                updates["roomList/" + gid + "/spectatorCount"] = n;
                updates["roomList/" + gid + "/spectatorCountUpdatedAt"] = ts;
              }
            } catch (listErr) {
              Logger.warn("room_list_count_probe_failed", { gameId: gid, err: String(listErr && (listErr.message || listErr)) });
            }
            await db.ref().update(updates);
            return true;
          } catch (e) {
            handleDbError(e, "", { ctx: "spectator.leave" });
            return false;
          }
        },

    _publishSpectatorCount: async function (gameId, count) {
          const gid = String(gameId || "").trim();
          if (!gid || !db || !db.ref) return false;
    
          const n = Math.max(0, Math.min(3, Number(count || 0) || 0));
          const ts = nowTs();
          try {
            const updates = {
              ["games/" + gid + "/spectatorCount"]: n,
              ["games/" + gid + "/spectatorCountUpdatedAt"]: ts,
            };
            try {
              const roomListSnap = await db.ref("roomList").child(gid).once("value");
              if (roomListSnap && roomListSnap.exists && roomListSnap.exists()) {
                updates["roomList/" + gid + "/spectatorCount"] = n;
                updates["roomList/" + gid + "/spectatorCountUpdatedAt"] = ts;
              }
            } catch (listErr) {
              Logger.warn("room_list_count_probe_failed", { gameId: gid, err: String(listErr && (listErr.message || listErr)) });
            }
            await db.ref().update(updates);
            return true;
          } catch (e) {
            Logger.warn("spectator_count_update_failed", { gameId: gid, err: String(e && (e.message || e)) });
            return false;
          }
        },

    _countSpectatorsFromValue: function (value) {
          if (!value || typeof value !== "object") return 0;
          const now = nowTs();
          return Object.keys(value).filter((k) => {
            const item = value[k];
            if (!item || typeof item !== "object") return false;
            const ts = Number(item.updatedAt || item.joinedAt || 0) || 0;
            return !!(ts && now - ts <= SPECTATOR_COUNT_STALE_MS);
          }).length;
        },

    _registerSpectatorInRoom: async function (gameId) {
          const gid = String(gameId || this.gameId || this._presenceRoomId || "").trim();
          const uid = String(this.myUid || "").trim();
          if (!gid || !uid || !db || !db.ref) return { ok: false, reason: "invalid" };
    
          const roomRef = db.ref("spectators").child(gid);
          const nick = this.myNick || window.I18N.translateArgs("players.player");
          const fallbackJoinedAt = Number(this._spectatorJoinedAt || 0) || nowTs();
    
          try {
            const txn = await roomRef.transaction((cur) => {
              cur = cur && typeof cur === "object" ? cur : {};
              const cutoff = nowTs() - SPECTATOR_COUNT_STALE_MS;
              Object.keys(cur).forEach((key) => {
                const item = cur[key];
                const ts = Number(item && (item.updatedAt || item.joinedAt) || 0) || 0;
                if (!ts || ts < cutoff) delete cur[key];
              });
              const existing = cur[uid] && typeof cur[uid] === "object" ? cur[uid] : null;
              if (!existing && this._countSpectatorsFromValue(cur) >= 3) return;
    
              cur[uid] = {
                uid,
                nickname: nick,
                joinedAt: Number((existing && existing.joinedAt) || fallbackJoinedAt) || nowTs(),
                updatedAt: nowTs(),
              };
              return cur;
            });
    
            if (!txn || txn.committed === false) return { ok: false, reason: "full" };
    
            const specs = txn && txn.snapshot && typeof txn.snapshot.val === "function" ? txn.snapshot.val() : null;
            const own = specs && specs[uid] && typeof specs[uid] === "object" ? specs[uid] : null;
            if (!own) return { ok: false, reason: "not_registered" };
    
            this._spectatorJoinedAt = Number(own.joinedAt || 0) || fallbackJoinedAt;
            this._spectatorRef = roomRef.child(uid);
    
            try {
              if (this._spectatorHeartbeatTimer) clearInterval(this._spectatorHeartbeatTimer);
              this._spectatorHeartbeatTimer = setInterval(() => {
                try {
                  if (!this._spectatorRef || !this.isSpectator) return;
                  this._spectatorRef.update({ updatedAt: nowTs() }).catch(() => {});
                } catch (e) {}
              }, SPECTATOR_HEARTBEAT_MS);
            } catch (disconnectErr) {
              Logger.warn("spectator_heartbeat_failed", { gameId: gid, err: String(disconnectErr && (disconnectErr.message || disconnectErr)) });
            }
    
            try {
              await this._publishSpectatorCount(gid, this._countSpectatorsFromValue(specs));
            } catch (countErr) {
              Logger.warn("spectator_count_refresh_failed", { gameId: gid, err: String(countErr && (countErr.message || countErr)) });
            }
    
            return { ok: true, gameId: gid, uid, ref: this._spectatorRef, count: this._countSpectatorsFromValue(specs) };
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("online.errors.spectatorJoinFailed"), { ctx: "spectator.join" });
            return { ok: false, reason: "error", error: e };
          }
        },

    _ensureSpectatorRegistration: async function (gameId) {
          if (!this.isSpectator) return false;
          const result = await this._registerSpectatorInRoom(gameId);
          return !!(result && result.ok);
        },

    _setupGamePresence: function () {
          if (!this.isActive || !this.gameRef) return;
          if (this.presenceRef) return;
    
          try {
            this._gameConnInfoRef = firebase.database().ref(".info/connected");
          } catch (e) {}
    
          this.presenceRef = this.gameRef.child("presence").child(this.myUid);
    
          this._gamePresenceDenied = false;
          if (!this._gamePresenceJoinedAt) this._gamePresenceJoinedAt = nowTs();
    
          const write = () => {
            try {
              if (this._gamePresenceDenied) return;
              this._writeFullGamePresence("gamePresence.set");
            } catch (e) {}
          };
    
          try {
            this.presenceRef.onDisconnect().remove();
          } catch (e) {
            Logger.warn("game_presence_ondisconnect_failed", { gameId: this.gameId || this._presenceRoomId || "", err: String(e && (e.message || e)) });
          }
          write();
          try { this._touchRoomListActivity(this.gameId || this._presenceRoomId, true); } catch (e) {}
    
          try {
            this._startGamePresenceHeartbeat();
          } catch (e) {}
    
          if (this._gameConnInfoRef) {
            this._gameConnInfoHandler = (s) => {
              const connected = !!(s && s.val && s.val());
              if (connected) {
                const hadRealtimeDisconnect = this._gameWasConnected === false;
                let reconnectAction = "none";
                if (hadRealtimeDisconnect) {
                  this._gameWasConnected = true;
                }
                try {
                  if (hadRealtimeDisconnect) {
                    reconnectAction = this._handleReconnectRecovery();
                  }
                } catch (e) {}
                try {
                  if (hadRealtimeDisconnect && reconnectAction === "none") {
                    this.syncNow({ force: true, repairPresence: true });
                  }
                } catch (e) {}
                try {
                  this._forceResync();
                } catch (e) {}
                try {
                  if (
                    this._awaitingLocalCommit &&
                    this._moveRetryArgs &&
                    this._moveRetryArgs.from != null &&
                    this._moveRetryArgs.to != null &&
                    typeof this._moveRetryArgs.nextTurn === "number"
                  ) {
                    const at = (this._moveRetryAttempt || 0) + 1;
                    try {
                      this.sendMoveToFirebase(
                        this._moveRetryArgs.from,
                        this._moveRetryArgs.to,
                        this._moveRetryArgs.nextTurn,
                        at,
                      );
                    } catch (e) {}
                  }
                } catch (e) {}
                try {
                  this._selfConnected = true;
                  this._selfOfflineSince = null;
                  this._updatePresenceUi();
                } catch (e) {}
                try {
                  this._checkMoveCommitHealth();
                } catch (e) {}
                try {
                  if (this.isSpectator) {
                    this._ensureSpectatorRegistration(this.gameId);
                  }
                } catch (e) {}
                try {
                  this.presenceRef.onDisconnect().remove();
                } catch (e) {
                  Logger.warn("game_presence_ondisconnect_failed", { gameId: this.gameId || this._presenceRoomId || "", err: String(e && (e.message || e)) });
                }
                write();
              } else {
                this._gameWasConnected = false;
                try {
                  this._noteReconnectLoss("game");
                } catch (e) {}
                try {
                  this._selfConnected = false;
                  this._selfOfflineSince = nowTs();
                  this._updatePresenceUi();
                } catch (e) {}
                try {
                  this._checkMoveCommitHealth();
                } catch (e) {}
                try {
                  UI.status(window.I18N.translateArgs("status.reconnecting"));
                } catch (e) {}
              }
            };
            try {
              this._gameConnInfoRef.on("value", this._gameConnInfoHandler);
            } catch (e) {}
          }
        },

    _teardownGamePresence: function (options) {
          const localOnly = !!(options && options.localOnly);
          try {
            this._stopGamePresenceHeartbeat();
          } catch (e) {}
          try {
            if (this._gameConnInfoRef && this._gameConnInfoHandler) {
              this._gameConnInfoRef.off("value", this._gameConnInfoHandler);
            }
          } catch (e) {}
          this._gameConnInfoRef = null;
          this._gameConnInfoHandler = null;
    
          if (!localOnly) {
            try {
              if (this.presenceRef) this.presenceRef.remove();
            } catch (e) {}
          }
          this.presenceRef = null;
          this._gamePresenceJoinedAt = 0;
          try {
            this._stopMoveCommitWatchdog();
          } catch (e) {}
    
          this._oppOfflineSince = null;
          this._selfOfflineSince = null;
          this._oppLeftModalShown = false;
          if (localOnly) {
            // Do not create a new one-second presence ticker while the page is
            // being hidden or closed. The visible UI remains untouched for BFCache.
            try { if (this._presenceTicker) clearInterval(this._presenceTicker); } catch (_) {}
            this._presenceTicker = null;
          } else {
            try {
              this._oppOnline = false;
              this._selfConnected = true;
              this._updatePresenceUi();
            } catch (e) {}
          }
          this._spectatorRef = null;
          this._spectatorJoinedAt = 0;
        },

    refreshPvpControls: function () {
          if (!this.isActive) return;
    
          const btnSpk = document.getElementById("btnSpk");
          const btnMic = document.getElementById("btnMic");
          const btnChat = document.getElementById("btnChat");
          const spectatorHiddenIds = ["btnEndKill", "btnUndo", "btnSoufla", "btnSync", "btnEndOnline", "btnSpk", "btnMic"];
          spectatorHiddenIds.forEach((id) => {
            try {
              const el = document.getElementById(id);
              if (el && this.isSpectator) el.style.display = "none";
            } catch (e) {}
          });
          [".timer-row", ".soufla-row"].forEach((sel) => {
            try {
              const el = document.querySelector(sel);
              if (el) el.style.display = this.isSpectator ? "none" : "";
            } catch (e) {}
          });
          try {
            const leaveRoom = document.getElementById("btnLeaveRoom");
            if (leaveRoom) leaveRoom.style.display = this.isSpectator ? "inline-flex" : leaveRoom.style.display;
          } catch (e) {}
    
    
          const v = this._voice || {};
          const micMuted = !!v.micMuted;
          const spkMuted = !!v.speakerMuted;
    
          const setBtn = (btn, iconFile, label) => {
            if (!btn) return;
            try {
              const img = btn.querySelector("img.btn-ico");
              if (img && iconFile) img.setAttribute("src", "../assets/icons/" + iconFile);
            } catch (e) {}
            try {
              const tEl = btn.querySelector(".btn-text");
              if (tEl) tEl.textContent = String(label || "");
            } catch (e) {}
            try {
              const sr = btn.querySelector(".sr-only");
              if (sr) sr.textContent = String(label || "");
            } catch (e) {}
            try {
              btn.setAttribute("aria-label", String(label || ""));
            } catch (e) {}
          };
    
          if (btnChat) {
            setBtn(btnChat, "chat.svg", window.I18N.translateArgs("pvp.chat.title"));
          }
          setBtn(
            btnSpk,
            spkMuted ? "volume-off.svg" : "volume-on.svg",
            spkMuted ? window.I18N.translateArgs("pvp.voice.spkOff") : window.I18N.translateArgs("pvp.voice.spkOn"),
          );
    
          setBtn(
            btnMic,
            micMuted ? "mic-off.svg" : "mic-on.svg",
            micMuted ? window.I18N.translateArgs("pvp.voice.micOff") : window.I18N.translateArgs("pvp.voice.micOn"),
          );
    
        },

    toggleSpeaker: async function () {
          try {
            if (this.isSpectator) return;
            this._voice = this._voice || {
              enabled: false,
              speakerMuted: false,
              micMuted: true,
              peers: new Map(),
              remoteAudioEls: new Map(),
              callIds: new Map(),
              reconnectTimers: new Map(),
            };
    
            let ready = !!this._voice.enabled;
            if (!ready) {
              try {
                ready = !!(await this._voiceJoin({ noMicPrompt: true }));
              } catch (e) {
                ready = false;
              }
            }
            if (!ready) {
              try {
                this.refreshPvpControls();
              } catch (e) {}
              return;
            }
    
            this._voice.speakerMuted = !this._voice.speakerMuted;
    
            try {
              if (this._voice.remoteAudioEls && this._voice.remoteAudioEls.forEach) {
                this._voice.remoteAudioEls.forEach((el) => {
                  try {
                    el.muted = !!this._voice.speakerMuted;
                  } catch (e) {}
                });
              }
            } catch (e) {}
    
            try {
              this._voiceKickAudio();
            } catch (e) {}
            try {
              this.refreshPvpControls();
            } catch (e) {}
          } catch (e) {}
        },

    toggleMic: async function () {
          try {
            if (this.isSpectator) return;
            this._voice = this._voice || {
              enabled: false,
              speakerMuted: false,
              micMuted: true,
              peers: new Map(),
              remoteAudioEls: new Map(),
              callIds: new Map(),
              reconnectTimers: new Map(),
              role: this.isSpectator ? "spectator" : "player",
            };
    
            const wantUnmute = !!this._voice.micMuted;
            let ready = !!this._voice.enabled;
    
            if (wantUnmute && ready && !this._voice.localStream) {
              try {
                this._voiceLeave();
              } catch (e) {}
              ready = false;
            }
    
            if (!ready) {
              try {
                ready = !!(
                  await this._voiceJoin({
                    noMicPrompt: !wantUnmute,
                    allowSpectatorMic: false,
                  })
                );
              } catch (e) {
                ready = false;
              }
              if (!ready || (wantUnmute && !this._voice.localStream)) {
                try {
                  this._voice.micMuted = true;
                } catch (e) {}
                try {
                  this.refreshPvpControls();
                } catch (e) {}
                return;
              }
            }
    
            this._voice.micMuted = !wantUnmute;
    
            try {
              const s = this._voice.localStream;
              if (s) {
                s.getAudioTracks().forEach((t) => {
                  t.enabled = !this._voice.micMuted;
                });
              }
            } catch (e) {}
    
            try {
              if (
                this._voiceParticipantsRef &&
                this.myUid &&
                requireAuthUid(this.myUid) &&
                this._voice &&
                !this._voice.writeDenied
              ) {
                safeDbWriteNoAwait(
                  "update",
                  this._voiceParticipantsRef.child(this.myUid),
                  { micMuted: !!this._voice.micMuted, lastSeen: nowTs() },
                  {
                    uid: this.myUid,
                    path: "/rtc/" + (this.gameId || "") + "/participants/" + this.myUid,
                    ctx: "rtc.participant.update",
                    suppressGlobalDenied: true,
                    onDenied: () => {
                      try {
                        if (this._voice) this._voice.writeDenied = true;
                      } catch (e) {}
                    },
                  },
                );
              }
            } catch (e) {}
            try {
              this._voiceKickAudio();
            } catch (e) {}
            try {
              this.refreshPvpControls();
            } catch (e) {}
          } catch (e) {}
        },

    _voiceKickAudio: function () {
          try {
            try {
              if (!this._voice) return;
              if (!this._voice._audioCtx && (window.AudioContext || window.webkitAudioContext)) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                this._voice._audioCtx = new Ctx();
              }
              if (this._voice._audioCtx && this._voice._audioCtx.state === "suspended") {
                this._voice._audioCtx.resume().catch(() => {});
              }
            } catch (e) {}
    
            if (this._voice && this._voice.remoteAudioEls && this._voice.remoteAudioEls.forEach) {
              this._voice.remoteAudioEls.forEach((el) => {
                try {
                  el.muted = !!this._voice.speakerMuted;
                  el.volume = 1;
                  const p = el.play && el.play();
                  if (p && p.catch) p.catch(() => {});
                } catch (e) {}
              });
            }
          } catch (e) {}
        },

    openChatModal: async function () {
          try {
            if (!this.isActive) return;
    
            this._chat = this._chat || {
              messages: [],
              unread: 0,
              isOpen: false,
              lastSendAt: 0,
              _myLastReadTs: 0,
              _otherLastReadTs: 0,
            };
    
            try {
              if (!this._chatRef && typeof db !== "undefined" && db && db.ref && this.gameId) {
                this._chatRef = db.ref("chats").child(this.gameId);
                this._chatMessagesRef = this._chatRef.child("messages");
                this._chatReadsRef = this._chatRef.child("reads");
                this._chatMyReadRef = this._chatReadsRef.child(this.myUid);
              }
            } catch (e) {}
    
            try {
              if ((!this._chatMsgHandler || !this._chatMessagesRef) && typeof this._initRoomComms === "function") {
                await this._initRoomComms();
              }
            } catch (e) {}
    
            const _chatRoleLabel = (role) => {
              try {
                const lang = document.documentElement.lang || "ar";
                if (role === "spectator") return lang === "fr" ? "spectateur" : lang === "en" ? "spectator" : "مشاهد";
                return lang === "fr" ? "joueur" : lang === "en" ? "player" : "لاعب";
              } catch (e) {
                return role === "spectator" ? "spectator" : "player";
              }
            };
    
            const _chatMessageRole = (m) => {
              try {
                const role = String((m && m.role) || "").trim();
                if (role === "player" || role === "spectator") return role;
                const uid = String((m && m.fromUid) || "").trim();
                const g = this._lastGameData && this._lastGameData.players ? this._lastGameData.players : null;
                const wuid = g && g.white && g.white.uid ? String(g.white.uid) : "";
                const buid = g && g.black && g.black.uid ? String(g.black.uid) : "";
                if (uid && (uid === wuid || uid === buid)) return "player";
              } catch (e) {}
              return "spectator";
            };
    
            const _chatDisplayName = (m) => {
              try {
                const fallback = String((m && m.fromNick) || "").trim() || window.I18N.translateArgs("players.player");
                const base = this._displayNameForGameUid(m && m.fromUid, fallback) || fallback;
                return `${base} (${_chatRoleLabel(_chatMessageRole(m))})`;
              } catch (e) {
                return String((m && m.fromNick) || "").trim() || window.I18N.translateArgs("players.player");
              }
            };
            const _chatDir = () => {
              try {
                return ((document.documentElement && document.documentElement.dir) || "rtl").toLowerCase() === "rtl" ? "rtl" : "ltr";
              } catch (e) {
                return "rtl";
              }
            };
    
            try {
            const btn = document.getElementById("btnChat");
            if (btn) delete btn.dataset.badge;
            } catch (e) {}
            this._chat.unread = 0;
            this._chat.isOpen = true;
    
            const wName =
              (this._lastGameData &&
                this._lastGameData.players &&
                this._lastGameData.players.white &&
                this._lastGameData.players.white.nickname) ||
              "";
            const bName =
              (this._lastGameData &&
                this._lastGameData.players &&
                this._lastGameData.players.black &&
                this._lastGameData.players.black.nickname) ||
              "";
            const oppName = this._getOpponentInfoFromData(this._lastGameData).nick || window.I18N.translateArgs("online.opponent");
            const roomLabel = wName && bName ? wName + " × " + bName : oppName;
            const title = `${window.I18N.translateArgs("pvp.chat.title")} — ${roomLabel}`;
    
            const wrap = document.createElement("div");
            wrap.className = "pvp-chat";
            const chatDir = _chatDir();
            wrap.setAttribute("dir", chatDir);
    
            const list = document.createElement("div");
            list.className = "pvp-chat-list";
            list.setAttribute("dir", chatDir);
    
            let stickToBottom = true;
            try {
              list.addEventListener("scroll", () => {
                try {
                  const gap = list.scrollHeight - list.scrollTop - list.clientHeight;
                  stickToBottom = gap < 80;
                } catch (e) {}
              });
            } catch (e) {}
    
            const form = document.createElement("div");
            form.className = "pvp-chat-form";
            form.setAttribute("dir", chatDir);
    
            const input = document.createElement("input");
            input.type = "text";
            input.maxLength = 200;
            input.placeholder = window.I18N.translateArgs("pvp.chat.placeholder");
            input.className = "pvp-chat-input";
            input.setAttribute("dir", chatDir);
    
            const send = document.createElement("button");
            send.className = "btn primary pvp-chat-send";
            send.textContent = window.I18N.translateArgs("actions.send");
            send.type = "button";
    
            form.appendChild(input);
            form.appendChild(send);
    
            wrap.appendChild(list);
            wrap.appendChild(form);
    
            const render = () => {
              try {
                const prevBottomGap = (() => {
                  try {
                    return list.scrollHeight - list.scrollTop - list.clientHeight;
                  } catch (e) {
                    return 0;
                  }
                })();
                const keepScroll = !stickToBottom;
                list.innerHTML = "";
                const arr = this._chat && Array.isArray(this._chat.messages) ? this._chat.messages : [];
                const last = arr.slice(-250);
                if (!last.length) {
                  const empty = document.createElement("div");
                  empty.className = "pvp-chat-empty";
                  empty.style.textAlign = "center";
                  empty.style.opacity = "0.7";
                  empty.style.padding = "18px 8px";
                  empty.textContent = window.I18N.translateArgs("pvp.chat.empty");
                  list.appendChild(empty);
                  return;
                }
    
                const otherReadTs =
                  this._chat && typeof this._chat._otherLastReadTs === "number"
                    ? this._chat._otherLastReadTs
                    : 0;
    
                last.forEach((m) => {
                  const row = document.createElement("div");
                  const mine = m.fromUid === this.myUid;
                  row.className = "pvp-msg " + (mine ? "me" : "them");
    
                  const bubble = document.createElement("div");
                  bubble.className = "pvp-bubble";
    
                  const from = document.createElement("div");
                  from.className = "pvp-from";
                  from.textContent = `${_chatDisplayName(m)}:`;
                  from.title = _chatDisplayName(m);
    
                  const body = document.createElement("div");
                  body.className = "pvp-text";
                  body.textContent = m.text || "";
    
                  bubble.appendChild(from);
                  bubble.appendChild(body);
    
                  row.appendChild(bubble);
                  list.appendChild(row);
                });
    
                if (stickToBottom) {
                  list.scrollTop = list.scrollHeight + 9999;
                } else if (keepScroll) {
                  try {
                    list.scrollTop = Math.max(0, list.scrollHeight - list.clientHeight - prevBottomGap);
                  } catch (e) {}
                }
              } catch (e) {}
            };
    
            const markReadToLatest = () => {
              try {
                const arr = this._chat && Array.isArray(this._chat.messages) ? this._chat.messages : [];
                let latest = 0;
                for (const m of arr) {
                  const ts = m && typeof m.ts === "number" ? m.ts : 0;
                  if (ts > latest) latest = ts;
                }
                if (latest > 0) this._chatMarkRead(latest);
              } catch (e) {}
            };
    
            const trySend = async () => {
              try {
                const txt = (input.value || "").trim();
                if (!txt) return;
                if (txt.length > 200) {
                  showOnlineNotice(window.I18N.translateArgs("pvp.chat.tooLong"), { allowSpectator: true });
                  return;
                }
                const now = Date.now();
                if (now - (this._chat.lastSendAt || 0) < 1200) {
                  showOnlineNotice(window.I18N.translateArgs("pvp.chat.rateLimit"), { allowSpectator: true });
                  return;
                }
                this._chat.lastSendAt = now;
                input.value = "";
    
                if (!this._chatMessagesRef && typeof this._initRoomComms === "function") {
                  try {
                    await this._initRoomComms();
                  } catch (e) {}
                }
                if (!this._chatMessagesRef && typeof db !== "undefined" && db && db.ref && this.gameId) {
                  this._chatRef = db.ref("chats").child(this.gameId);
                  this._chatMessagesRef = this._chatRef.child("messages");
                }
    
                if (this.isSpectator) {
                  try {
                    await this._ensureSpectatorRegistration(this.gameId);
                  } catch (e) {}
                }
    
                const msg = {
                  fromUid: this.myUid,
                  fromNick: this.myNick || "",
                  role: this.isSpectator ? "spectator" : "player",
                  text: txt,
                  ts: nowTs(),
                };
    
                if (!this._chatMessagesRef || !this.myUid) throw new Error("chat_ref_unavailable");
                await this._chatMessagesRef.push(msg);
    
                // Firebase has no per-request quota in this deployment path;
                // keep the chat bounded immediately after each successful send.
                this._chat.lastPruneAt = Date.now();
                this._pruneChatMessages(200);
              } catch (e) {
                showOnlineNotice(window.I18N.translateArgs("pvp.chat.failed"), { allowSpectator: true });
              }
            };
    
            send.addEventListener("click", trySend);
            input.addEventListener("keydown", (ev) => {
              if (ev.key === "Enter") {
                ev.preventDefault();
                trySend();
              }
            });
    
            render();
            this._chat._render = render;
    
            markReadToLatest();
    
            Modal.open({
              title,
              body: wrap,
              buttons: [],
              allowSpectator: true,
              modalClassName: "z-chat-modal",
              focusSelector: ".pvp-chat-input",
              onClose: () => {
                try {
                  this._chat.isOpen = false;
                  markReadToLatest();
                } catch (e) {}
              },
            });
          } catch (e) {}
        },

    _chatMarkRead: async function (ts) {
          try {
            if (!this.myUid) return;
            ts = Number(ts) || 0;
            if (!ts) return;
            this._chat = this._chat || {
              messages: [],
              unread: 0,
              isOpen: false,
              lastSendAt: 0,
              _myLastReadTs: 0,
              _otherLastReadTs: 0,
            };
            const cur = Number(this._chat._myLastReadTs || 0);
            if (ts <= cur) return;
            this._chat._myLastReadTs = ts;
            try {
              lsSet(chatLastReadKey(this.gameId, this.myUid), String(ts));
            } catch (e) {}
            if (!this._chatMyReadRef) return;
            const writeNow = async () => {
              try {
                const latestTs = Number(this._chat && this._chat._pendingReadTs || ts) || ts;
                this._chat._pendingReadTs = 0;
                this._chat._lastReadWriteAt = nowTs();
                await this._chatMyReadRef.set({ lastReadTs: latestTs, updatedAt: nowTs() });
              } catch (e) {}
            };
            const since = nowTs() - Number(this._chat._lastReadWriteAt || 0);
            this._chat._pendingReadTs = Math.max(Number(this._chat._pendingReadTs || 0), ts);
            if (since >= 15 * 1000) {
              if (this._chat._readWriteTimer) clearTimeout(this._chat._readWriteTimer);
              this._chat._readWriteTimer = null;
              await writeNow();
            } else if (!this._chat._readWriteTimer) {
              this._chat._readWriteTimer = setTimeout(() => {
                this._chat._readWriteTimer = null;
                writeNow();
              }, Math.max(50, 15 * 1000 - since));
            }
          } catch (e) {}
        },

    _pruneChatMessages: async function (limit) {
          try {
            limit = Number(limit) || 50;
            if (!this._chatMessagesRef || limit < 1) return;
    
            const keepSnap = await this._chatMessagesRef.orderByKey().limitToLast(limit).once("value");
            const keepVal = keepSnap && keepSnap.val ? keepSnap.val() : null;
            if (!keepVal || typeof keepVal !== "object") return;
            const keepKeys = Object.keys(keepVal).filter(Boolean).sort();
            if (keepKeys.length < limit) return;
    
            const oldestKeepKey = keepKeys[0];
            if (!oldestKeepKey) return;
    
            for (let i = 0; i < 12; i++) {
              const snap = await this._chatMessagesRef
                .orderByKey()
                .endAt(oldestKeepKey)
                .limitToFirst(400)
                .once("value");
    
              const v = snap && snap.val ? snap.val() : null;
              if (!v || typeof v !== "object") break;
              const keys = Object.keys(v).filter(Boolean).sort();
              if (keys.length <= 1) break;
    
              const updates = {};
              for (const k of keys) {
                if (k !== oldestKeepKey) updates[k] = null;
              }
              if (!Object.keys(updates).length) break;
              await this._chatMessagesRef.update(updates);
            }
          } catch (e) {}
        },

    _initRoomComms: async function () {
          try {
            if (!this.isActive || !this.gameId || !db) return;
            if (this.isSpectator) {
              try {
                await this._ensureSpectatorRegistration(this.gameId);
              } catch (e) {}
            }
            this._chat = this._chat || {
              messages: [],
              unread: 0,
              isOpen: false,
              lastSendAt: 0,
              _myLastReadTs: 0,
              _otherLastReadTs: 0,
            };
    
            this._chatRef = db.ref("chats").child(this.gameId);
            this._chatMessagesRef = this._chatRef.child("messages");
            this._chatReadsRef = this._chatRef.child("reads");
            this._chatMyReadRef = this._chatReadsRef.child(this.myUid);
    
            try {
              const rs = await this._chatMyReadRef.once("value");
              const rv = rs && rs.val ? rs.val() : null;
              const ts = rv && typeof rv.lastReadTs === "number" ? rv.lastReadTs : 0;
              this._chat._myLastReadTs = ts || 0;
            } catch (e) {}
    
            try {
              const lts = Number(lsGet(chatLastReadKey(this.gameId, this.myUid)) || 0) || 0;
              if (lts) this._chat._myLastReadTs = Math.max(Number(this._chat._myLastReadTs || 0), lts);
            } catch (e) {}
    
            try {
              this._chat._readMap = this._chat._readMap || Object.create(null);
            } catch (e) {}
            if (!this._chatReadsHandler) {
              this._chatReadsHandler = (snap) => {
                try {
                  const uid = snap.key || "";
                  const v = snap.val ? snap.val() : null;
                  const ts = v && typeof v.lastReadTs === "number" ? v.lastReadTs : 0;
                  if (uid) {
                    try {
                      this._chat._readMap[uid] = ts;
                    } catch (e) {}
                  }
                  if (uid === this.myUid) {
                    this._chat._myLastReadTs = Math.max(
                      Number(this._chat._myLastReadTs || 0),
                      Number(ts || 0),
                    );
                  } else {
                    this._chat._otherLastReadTs = Math.max(
                      Number(this._chat._otherLastReadTs || 0),
                      Number(ts || 0),
                    );
                  }
                  if (this._chat.isOpen && this._chat._render) this._chat._render();
                } catch (e) {}
              };
            }
            try {
              this._chatReadsRef.off("child_added");
              this._chatReadsRef.off("child_changed");
              this._chatReadsRef.on("child_added", this._chatReadsHandler);
              this._chatReadsRef.on("child_changed", this._chatReadsHandler);
            } catch (e) {}
    
            try {
              if (this._chat._gameId !== this.gameId) {
                this._chat.messages = [];
                this._chat.unread = 0;
                this._chat._seenIds = new Set();
                this._chat._gameId = this.gameId;
              } else {
                this._chat._seenIds = this._chat._seenIds || new Set();
              }
            } catch (e) {}
    
            try {
              const seedSnap = await this._chatMessagesRef.limitToLast(200).once("value");
              const seedVal = seedSnap && seedSnap.val ? seedSnap.val() : null;
              const seen = new Set();
              const seeded = [];
              if (seedVal && typeof seedVal === "object") {
                Object.keys(seedVal).forEach((id) => {
                  try {
                    const m = seedVal[id] || {};
                    const msgTs = typeof m.ts === "number" ? m.ts : nowTs();
                    seeded.push({
                      id,
                      fromUid: m.fromUid || "",
                      fromNick: m.fromNick || "",
                      role: (m && (m.role === "player" || m.role === "spectator")) ? m.role : "",
                      text: typeof m.text === "string" ? m.text : String(m.text || ""),
                      ts: msgTs,
                    });
                    seen.add(id);
                  } catch (e) {}
                });
                seeded.sort((a, b) => Number(a.ts || 0) - Number(b.ts || 0));
              }
              this._chat.messages = seeded;
              this._chat._seenIds = seen;
              if (this._chat.isOpen && this._chat._render) this._chat._render();
            } catch (e) {}
    
            if (!this._chatMsgHandler) {
              this._chatMsgHandler = (snap) => {
                try {
                  const m = snap.val();
                  if (!m) return;
    
                  const id = snap.key || "";
                  if (!id) return;
    
                  try {
                    const seen = this._chat._seenIds;
                    if (seen && typeof seen.has === "function" && seen.has(id)) return;
                    if (seen && typeof seen.add === "function") seen.add(id);
                  } catch (e) {}
    
                  this._chat.messages = Array.isArray(this._chat.messages) ? this._chat.messages : [];
                  const msgTs = typeof m.ts === "number" ? m.ts : nowTs();
                  const fromUid = m.fromUid || "";
    
                  this._chat.messages.push({
                    id,
                    fromUid,
                    fromNick: m.fromNick || "",
                    role: (m && (m.role === "player" || m.role === "spectator")) ? m.role : "",
                    text: typeof m.text === "string" ? m.text : String(m.text || ""),
                    ts: msgTs,
                  });
    
                  if (this._chat.messages.length > 600) {
                    this._chat.messages = this._chat.messages.slice(-500);
                    try {
                      const s = new Set();
                      this._chat.messages.forEach((x) => {
                        try {
                          if (x && x.id) s.add(x.id);
                        } catch (e) {}
                      });
                      this._chat._seenIds = s;
                    } catch (e) {}
                  }
    
                  if (this._chat.isOpen && this._chat._render) {
                    this._chat._render();
                    if (fromUid && fromUid !== this.myUid) {
                      this._chatMarkRead(msgTs);
                    }
                    return;
                  }
    
                  if (fromUid && fromUid !== this.myUid) {
                    const lastRead = Number(this._chat._myLastReadTs || 0);
                    if (msgTs > lastRead) {
                      this._chat.unread = (this._chat.unread || 0) + 1;
                      const btnChat = document.getElementById("btnChat");
                      const n = this._chat.unread || 0;
                      const badge = n > 99 ? "99+" : String(n);
                      if (btnChat) btnChat.dataset.badge = badge;
                    }
                  }
                } catch (e) {}
              };
            }
    
            const onMsg = this._chatMsgHandler;
    
            try {
              if (this._chatMessagesQuery && this._chatMsgHandler) {
                this._chatMessagesQuery.off("child_added", this._chatMsgHandler);
              }
            } catch (e) {}
            try {
              this._chatMessagesQuery = this._chatMessagesRef.limitToLast(200);
              this._chatMessagesQuery.on("child_added", onMsg);
            } catch (e) {}
    
            if (typeof RTCPeerConnection !== "undefined") {
              try {
                this._voice = this._voice || {
                  enabled: false,
                  speakerMuted: false,
                  micMuted: true,
                  peers: new Map(),
                  remoteAudioEls: new Map(),
                  callIds: new Map(),
                  reconnectTimers: new Map(),
                  role: this.isSpectator ? "spectator" : "player",
                };
                if (!this.isSpectator) {
                  await this._voiceJoin({ noMicPrompt: true });
                }
              } catch (e) {}
            }
    
            try {
              this.refreshPvpControls();
            } catch (e) {}
          } catch (e) {}
        },

    _teardownRoomComms: function (options) {
          const localOnly = !!(options && options.localOnly);
          try {
            if (this._chatMessagesQuery && this._chatMsgHandler) {
              this._chatMessagesQuery.off("child_added", this._chatMsgHandler);
            } else if (this._chatMessagesRef && this._chatMsgHandler) {
              this._chatMessagesRef.off("child_added", this._chatMsgHandler);
            }
          } catch (e) {}
    
          try {
            if (this._chatReadsRef && this._chatReadsHandler) {
              this._chatReadsRef.off("child_added", this._chatReadsHandler);
              this._chatReadsRef.off("child_changed", this._chatReadsHandler);
            }
          } catch (e) {}
          this._chatMsgHandler = null;
          this._chatRef = null;
          this._chatMessagesRef = null;
          this._chatMessagesQuery = null;
          this._chatReadsRef = null;
          this._chatMyReadRef = null;
          this._chatReadsHandler = null;
    
          try {
            this._voiceLeave({ localOnly });
          } catch (e) {}
    
          try {
            const btn = document.getElementById("btnChat");
            if (btn) delete btn.dataset.badge;
          } catch (e) {}
        },

    _voiceReleaseLocalStream: function () {
          try {
            if (this._voice && this._voice.localStream) {
              this._voice.localStream.getTracks().forEach((t) => {
                try {
                  t.stop();
                } catch (e) {}
              });
            }
          } catch (e) {}
          try {
            if (this._voice) this._voice.localStream = null;
          } catch (e) {}
        },

    _voiceShowFailureNotice: function (kind, error) {
          try {
            const rawKind = String(kind || "generic").trim().toLowerCase();
            const keyByKind = {
              permission: "pvp.voice.failure.permission",
              "no-device": "pvp.voice.failure.noDevice",
              busy: "pvp.voice.failure.busy",
              unsupported: "pvp.voice.failure.unsupported",
              session: "pvp.voice.failure.session",
              service: "pvp.voice.failure.service",
              generic: "pvp.voice.failure.generic",
            };
            const resolvedKind = keyByKind[rawKind] ? rawKind : "generic";
            try {
              Logger.warn("voice_start_failed", {
                kind: resolvedKind,
                name: String(error && error.name || ""),
                code: String(error && error.code || ""),
                status: Number(error && error.status || 0) || 0,
              });
            } catch (_) {}
            showOnlineNotice(window.I18N.translateArgs(keyByKind[resolvedKind]), {
              title: window.I18N.translateArgs("pvp.voice.failedTitle"),
              allowSpectator: true,
            });
          } catch (e) {}
        },

    _voiceJoin: async function (opts) {
          opts = opts || {};
          if (!this.isActive || !this.gameId || !db || this.isSpectator) return false;
    
          this._voice = this._voice || {
            enabled: false,
            speakerMuted: false,
            micMuted: true,
            peers: new Map(),
            remoteAudioEls: new Map(),
            callIds: new Map(),
            reconnectTimers: new Map(),
            role: this.isSpectator ? "spectator" : "player",
          };
          this._voice.peers = this._voice.peers || new Map();
          this._voice.remoteAudioEls = this._voice.remoteAudioEls || new Map();
          this._voice.callIds = this._voice.callIds || new Map();
          this._voice.reconnectTimers = this._voice.reconnectTimers || new Map();
          this._voice.reconnectAttempts = this._voice.reconnectAttempts || new Map();
          if (this._voice.enabled) return true;
    
          let authReady = false;
          try {
            authReady = await ensureAuthReady();
          } catch (e) {}
          if (!authReady || !requireAuthUid(this.myUid)) {
            this._voiceShowFailureNotice("session");
            return false;
          }
    
          let acquiredLocalStream = false;
          if (!opts.noMicPrompt) {
            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
              this._voiceShowFailureNotice("unsupported");
              return false;
            }
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
              this._voice.localStream = stream;
              acquiredLocalStream = true;
    
              try {
                stream.getAudioTracks().forEach((t) => {
                  t.enabled = !this._voice.micMuted;
                });
              } catch (e) {}
            } catch (e) {
              this._voice.localStream = null;
              this._voice.micMuted = true;
              const mediaErrorName = String(e && e.name || "");
              const kind = /^(NotAllowedError|SecurityError)$/.test(mediaErrorName)
                ? "permission"
                : /^(NotFoundError|DevicesNotFoundError)$/.test(mediaErrorName)
                  ? "no-device"
                  : /^(NotReadableError|TrackStartError|AbortError)$/.test(mediaErrorName)
                    ? "busy"
                    : /^(NotSupportedError|TypeError)$/.test(mediaErrorName)
                      ? "unsupported"
                      : "generic";
              this._voiceShowFailureNotice(kind, e);
              return false;
            }
          }
    
          try {
            if (this._voice) this._voice.writeDenied = false;
          } catch (e) {}
    
          try {
            this._voice.iceServers = await this._voiceFetchIceServers();
          } catch (e) {
            this._voice.iceServers = this._voiceDefaultIceServers();
          }
          this._voice.joinedAt = Date.now();
    
          this._rtcRef = db.ref("rtc").child(this.gameId);
          this._voiceParticipantsRef = this._rtcRef.child("participants");
          this._voiceSignalsToMeRef = this._rtcRef.child("signals").child(this.myUid);
          this._voiceKnownParticipants = new Set();
          try {
            if (this.myUid) this._voiceKnownParticipants.add(this.myUid);
          } catch (e) {}
    
          this._voiceParticipantsReady = false;
          try {
            const okP = await safeDbWrite(
              "set",
              this._voiceParticipantsRef.child(this.myUid),
              {
                uid: this.myUid,
                nickname: this.myNick || "",
                role: "player",
                micMuted: !!this._voice.micMuted,
                joinedAt: nowTs(),
                lastSeen: nowTs(),
              },
              {
                uid: this.myUid,
                path: "/rtc/" + this.gameId + "/participants/" + this.myUid,
                ctx: "rtc.participant",
                suppressGlobalDenied: true,
              },
            );
            if (okP) {
              this._voiceParticipantsReady = true;
              try {
                this._voiceParticipantsRef.child(this.myUid).onDisconnect().remove();
              } catch (e) {}
              try {
                if (this._voice.participantHeartbeatTimer) clearInterval(this._voice.participantHeartbeatTimer);
                this._voice.participantHeartbeatTimer = setInterval(() => {
                  try {
                    if (!this._voice || !this._voice.enabled || !this._voiceParticipantsRef || !this.myUid) return;
                    this._voiceParticipantsRef.child(this.myUid).update({ lastSeen: nowTs() }).catch(() => {});
                  } catch (e) {}
                }, Math.min(25 * 1000, Math.max(10 * 1000, Math.floor(RTC_ENTRY_TTL_MS / 4))));
              } catch (e) {}
            } else {
              try {
                if (this._voice) this._voice.writeDenied = true;
              } catch (e) {}
              if (acquiredLocalStream) this._voiceReleaseLocalStream();
              this._voiceShowFailureNotice("service");
              return false;
            }
          } catch (e) {
            if (isPermissionDenied(e)) {
              logDeniedWrite(
                {
                  op: "set",
                  path: "/rtc/" + this.gameId + "/participants/" + this.myUid,
                  uid: this.myUid,
                  ctx: "rtc.participant",
                },
                e,
              );
              try {
                if (this._voice) this._voice.writeDenied = true;
              } catch (e) {}
              handleDbError(e);
            }
            if (acquiredLocalStream) this._voiceReleaseLocalStream();
            this._voiceShowFailureNotice("service", e);
            return false;
          }
    
          try {
            if (!document.getElementById("pvpAudio")) {
              const c = document.createElement("div");
              c.id = "pvpAudio";
              c.style.display = "none";
              document.body.appendChild(c);
            }
          } catch (e) {}
    
          const onPart = (snap) => {
            try {
              const other = snap.val();
              if (!other || !other.uid || other.uid === this.myUid) return;
              if (String(other.role || "") !== "player") return;
              const otherUid = String(other.uid);
              try {
                this._voiceKnownParticipants && this._voiceKnownParticipants.add(otherUid);
              } catch (e) {}
              this._voiceConnectTo(otherUid);
            } catch (e) {}
          };
          const onPartRemoved = (snap) => {
            try {
              const other = snap.key;
              if (!other) return;
              try {
                this._voiceKnownParticipants && this._voiceKnownParticipants.delete(String(other));
              } catch (e) {}
              this._voiceDropPeer(other);
            } catch (e) {}
          };
          try {
            this._voiceParticipantsRef.off();
            this._voiceParticipantsRef.on("child_added", onPart);
            this._voiceParticipantsRef.on("child_removed", onPartRemoved);
            this._voiceParticipantsHandler = onPart;
            this._voiceParticipantsRemovedHandler = onPartRemoved;
          } catch (e) {}
    
          const attachFromUid = (fromUid) => {
            const ref = this._voiceSignalsToMeRef.child(fromUid);
            const onSig = async (s) => {
              try {
                const msg = s.val();
                if (!msg) return;
                await this._voiceHandleSignal(fromUid, msg);
                try {
                  s.ref.remove();
                } catch (e) {}
              } catch (e) {}
            };
            try {
              ref.off();
              ref.on("child_added", onSig);
              this._voiceSignalHandlers = this._voiceSignalHandlers || new Map();
              this._voiceSignalHandlers.set(fromUid, { ref, onSig });
            } catch (e) {}
          };
    
          const onFromUid = (snap) => {
            try {
              const fromUid = snap.key;
              if (!fromUid) return;
              attachFromUid(fromUid);
            } catch (e) {}
          };
    
          try {
            this._voiceSignalsToMeRef.off();
            this._voiceSignalsToMeRef.on("child_added", onFromUid);
            this._voiceSignalsRootHandler = onFromUid;
          } catch (e) {}
    
          this._voice.enabled = true;
          try {
            this.refreshPvpControls();
          } catch (e) {}
          return true;
        },

    _voiceLeave: function (options) {
          const localOnly = !!(options && options.localOnly);
          try {
            if (!this._voice) return;
            this._voice.enabled = false;
            try {
              if (this._voice.participantHeartbeatTimer) clearInterval(this._voice.participantHeartbeatTimer);
            } catch (e) {}
            this._voice.participantHeartbeatTimer = null;
    
            try {
              if (this._voiceParticipantsRef && this._voiceParticipantsHandler) {
                this._voiceParticipantsRef.off("child_added", this._voiceParticipantsHandler);
              }
              if (this._voiceParticipantsRef && this._voiceParticipantsRemovedHandler) {
                this._voiceParticipantsRef.off("child_removed", this._voiceParticipantsRemovedHandler);
              }
            } catch (e) {}
            this._voiceParticipantsHandler = null;
            this._voiceParticipantsRemovedHandler = null;
    
            try {
              if (this._voiceSignalsToMeRef && this._voiceSignalsRootHandler) {
                this._voiceSignalsToMeRef.off("child_added", this._voiceSignalsRootHandler);
              }
            } catch (e) {}
            this._voiceSignalsRootHandler = null;
    
            try {
              if (this._voiceSignalHandlers && this._voiceSignalHandlers.forEach) {
                this._voiceSignalHandlers.forEach((h) => {
                  try {
                    h.ref.off("child_added", h.onSig);
                  } catch (e) {}
                });
              }
            } catch (e) {}
            this._voiceSignalHandlers = null;
    
            try {
              if (this._voice.reconnectTimers && this._voice.reconnectTimers.forEach) {
                this._voice.reconnectTimers.forEach((timer) => {
                  try {
                    clearTimeout(timer);
                  } catch (e) {}
                });
              }
            } catch (e) {}
            this._voice.reconnectTimers = new Map();
    
            try {
              if (this._voice.peers && this._voice.peers.forEach) {
                this._voice.peers.forEach((pc) => {
                  try {
                    pc.close();
                  } catch (e) {}
                });
              }
            } catch (e) {}
            try {
              if (this._voice.peers) this._voice.peers.clear();
            } catch (e) {}
    
            try {
              if (this._voice.remoteAudioEls && this._voice.remoteAudioEls.forEach) {
                this._voice.remoteAudioEls.forEach((el) => {
                  try {
                    el.remove();
                  } catch (e) {}
                });
              }
            } catch (e) {}
            try {
              if (this._voice.remoteAudioEls) this._voice.remoteAudioEls.clear();
            } catch (e) {}
    
            try {
              this._voiceReleaseLocalStream();
            } catch (e) {}
            this._voice.callIds = new Map();
    
            if (!localOnly) {
              try {
                this._voiceParticipantsRef && this._voiceParticipantsRef.child(this.myUid).remove();
              } catch (e) {}
            }
          } catch (e) {}
        },

    _voiceDefaultIceServers: function () {
          return [
            {
              urls: [
                "stun:stun.cloudflare.com:3478",
                "stun:stun.l.google.com:19302",
                "stun:stun1.l.google.com:19302",
              ],
            },
          ];
        },

    _voiceFilterIceServers: function (iceServers) {
          const fallback = this._voiceDefaultIceServers();
          try {
            if (!Array.isArray(iceServers) || !iceServers.length) return fallback;
            const filtered = iceServers
              .map((server) => {
                if (!server) return null;
                let urls = [];
                if (Array.isArray(server.urls)) urls = server.urls.slice();
                else if (server.urls) urls = [server.urls];
                urls = urls.filter(
                  (url) => typeof url === "string" && !/^(turn|turns):[^?]*:53(?:\?|$)/i.test(url),
                );
                if (!urls.length) return null;
                const out = { urls: urls.length === 1 ? urls[0] : urls };
                if (typeof server.username === "string") out.username = server.username;
                if (typeof server.credential === "string") out.credential = server.credential;
                return out;
              })
              .filter(Boolean);
            return filtered.length ? filtered : fallback;
          } catch (e) {
            return fallback;
          }
        },

    _voiceFetchIceServers: async function () {
          const fallback = this._voiceDefaultIceServers();
          try {
            const url = String((window.ZAMAT_TURN_URL || window.ZAMAT_TURN_ENDPOINT || "") || "").trim();
            if (!url) return fallback;
            const res = await fetch(url, {
              method: "GET",
              headers: { Accept: "application/json" },
              credentials: "same-origin",
              cache: "no-store",
            });
            if (!res || !res.ok) return fallback;
            const data = await res.json().catch(() => null);
            const iceServers = this._voiceFilterIceServers(data && data.iceServers);
            return iceServers;
          } catch (e) {
            return fallback;
          }
        },

    _voiceNewCallId: function (otherUid) {
          try {
            if (window.crypto && typeof window.crypto.randomUUID === "function") {
              return String(window.crypto.randomUUID()) + ":" + String(otherUid || "");
            }
          } catch (e) {}
          return [Date.now(), String(this.myUid || ""), String(otherUid || ""), Math.random().toString(36).slice(2)].join(":");
        },

    _voiceClearReconnect: function (otherUid, resetAttempts) {
          try {
            if (!this._voice || !this._voice.reconnectTimers) return;
            const timer = this._voice.reconnectTimers.get(otherUid);
            if (timer) clearTimeout(timer);
          } catch (e) {}
          try {
            if (this._voice && this._voice.reconnectTimers) this._voice.reconnectTimers.delete(otherUid);
            if (resetAttempts !== false && this._voice && this._voice.reconnectAttempts) this._voice.reconnectAttempts.delete(otherUid);
          } catch (e) {}
        },

    _voiceScheduleReconnect: function (otherUid, reason) {
          try {
            if (!otherUid || !this._voice || !this._voice.enabled || this.isSpectator) return;
            this._voice.reconnectTimers = this._voice.reconnectTimers || new Map();
            this._voice.reconnectAttempts = this._voice.reconnectAttempts || new Map();
            if (this._voice.reconnectTimers.has(otherUid)) return;
            const failed = reason === "failed";
            const delays = failed ? [1500, 5000, 12000] : [4000, 8000, 15000];
            const attempt = Number(this._voice.reconnectAttempts.get(otherUid) || 0);
            if (attempt >= delays.length) return;
            const delay = delays[attempt];
            this._voice.reconnectAttempts.set(otherUid, attempt + 1);
            const timer = setTimeout(async () => {
              try {
                this._voiceClearReconnect(otherUid, false);
                await this._voiceRestartPeer(otherUid, reason);
              } catch (e) {}
            }, delay);
            this._voice.reconnectTimers.set(otherUid, timer);
          } catch (e) {}
        },

    _voiceRestartPeer: async function (otherUid, reason) {
          try {
            if (!otherUid || !this._voice || !this._voice.enabled) return;
            const iOffer = String(this.myUid || "") < String(otherUid || "");
            const current = this._voice.peers && this._voice.peers.get(otherUid);
            if (current && (current.connectionState === "connected" || current.connectionState === "completed")) {
              return;
            }
            if (!iOffer) {
              if (current && typeof current.restartIce === "function") {
                try {
                  current.restartIce();
                } catch (e) {}
              }
              return;
            }
    
            let pc = current;
            if (!pc || pc.signalingState === "closed") {
              pc = this._voiceEnsurePeer(otherUid, { forceNew: true });
            }
            if (pc && pc.signalingState !== "stable") {
              try {
                this._voiceDropPeer(otherUid, { preserveCallId: false });
              } catch (e) {}
              pc = this._voiceEnsurePeer(otherUid, { forceNew: true });
            }
            if (!pc) return;
    
            const callId = this._voiceNewCallId(otherUid);
            try {
              this._voice.callIds.set(otherUid, callId);
            } catch (e) {}
    
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            this._voiceSendSignal(otherUid, { type: "offer", sdp: offer.sdp, callId: callId, restart: !!reason });
          } catch (e) {}
        },

    _voiceSendSignal: function (toUid, payload) {
          try {
            if (!this._rtcRef || !this.gameId) return;
            if (!toUid || !this.myUid) return;
            if (this._voice && this._voice.writeDenied) return;
    
            if (!requireAuthUid(this.myUid)) return;
            if (!this._voiceParticipantsReady) return;
            try {
              if (this._voiceKnownParticipants && !this._voiceKnownParticipants.has(String(toUid)))
                return;
            } catch (e) {}
    
            const ref = this._rtcRef.child("signals").child(toUid).child(this.myUid);
            const msg = Object.assign({ ts: Date.now() }, payload || {});
            try {
              const currentCallId = msg.callId || (this._voice && this._voice.callIds && this._voice.callIds.get(String(toUid)));
              if (currentCallId) msg.callId = currentCallId;
            } catch (e) {}
    
            try {
              if (msg && typeof msg.sdp === "string" && msg.sdp.length > 4900) {
                const sdp = msg.sdp;
                try {
                  delete msg.sdp;
                } catch (e) {
                  msg.sdp = null;
                }
                const parts = [];
                const CHUNK = 4000;
                for (let i = 0; i < sdp.length; i += CHUNK) parts.push(sdp.slice(i, i + CHUNK));
                msg.sdpParts = parts;
                msg.sdpChunked = true;
              }
            } catch (e) {}
            safeDbWriteNoAwait("push", ref, msg, {
              uid: this.myUid,
              path: "/rtc/" + this.gameId + "/signals/" + String(toUid) + "/" + this.myUid,
              ctx: "rtc.signal",
              suppressGlobalDenied: true,
              onDenied: () => {
                try {
                  if (this._voice) this._voice.writeDenied = true;
                } catch (e) {}
              },
            });
          } catch (e) {}
        },

    _voiceEnsurePeer: function (otherUid, opts) {
          opts = opts || {};
          this._voice = this._voice || {
            enabled: false,
            speakerMuted: false,
            micMuted: true,
            peers: new Map(),
            remoteAudioEls: new Map(),
            callIds: new Map(),
            reconnectTimers: new Map(),
            role: this.isSpectator ? "spectator" : "player",
          };
          this._voice.peers = this._voice.peers || new Map();
          this._voice.remoteAudioEls = this._voice.remoteAudioEls || new Map();
          this._voice.callIds = this._voice.callIds || new Map();
          this._voice.reconnectTimers = this._voice.reconnectTimers || new Map();
          if (!opts.forceNew && this._voice.peers && this._voice.peers.has(otherUid))
            return this._voice.peers.get(otherUid);
    
          if (opts.forceNew) {
            try {
              this._voiceDropPeer(otherUid, { preserveCallId: true });
            } catch (e) {}
          }
    
          const pc = new RTCPeerConnection({
            iceServers: this._voiceFilterIceServers(this._voice.iceServers),
          });
    
          try {
            if (this._voice.localStream) {
              this._voice.localStream
                .getTracks()
                .forEach((track) => pc.addTrack(track, this._voice.localStream));
            } else {
              try {
                pc.addTransceiver("audio", { direction: "recvonly" });
              } catch (e) {}
            }
          } catch (e) {}
    
          pc.onicecandidate = (ev) => {
            if (ev.candidate) this._voiceSendSignal(otherUid, { type: "ice", candidate: ev.candidate });
          };
    
          pc.ontrack = (ev) => {
            try {
              const stream = ev.streams && ev.streams[0] ? ev.streams[0] : null;
              if (!stream) return;
    
              let el = this._voice.remoteAudioEls.get(otherUid);
              if (!el) {
                el = document.createElement("audio");
                el.autoplay = true;
                el.playsInline = true;
                el.muted = !!this._voice.speakerMuted;
                this._voice.remoteAudioEls.set(otherUid, el);
                const holder = document.getElementById("pvpAudio") || document.body;
                holder.appendChild(el);
              }
              el.srcObject = stream;
              try {
                el.volume = 1;
                const p = el.play && el.play();
                if (p && p.catch) p.catch(() => {});
              } catch (e) {}
              try {
                this._voiceKickAudio();
              } catch (e) {}
            } catch (e) {}
          };
    
          pc.onconnectionstatechange = () => {
            try {
              const state = pc.connectionState;
              if (state === "connected") {
                this._voiceClearReconnect(otherUid);
              } else if (state === "failed" || state === "disconnected") {
                this._voiceScheduleReconnect(otherUid, state);
              } else if (state === "closed") {
                this._voiceClearReconnect(otherUid);
              }
            } catch (e) {}
            try {
              this.refreshPvpControls();
            } catch (e) {}
          };
    
          this._voice.peers.set(otherUid, pc);
          return pc;
        },

    _voiceConnectTo: async function (otherUid) {
          try {
            if (!this._voice || !this._voice.enabled || this.isSpectator) return;
            const pc = this._voiceEnsurePeer(otherUid);
    
            const iOffer = String(this.myUid || "") < String(otherUid || "");
            if (!iOffer) return;
    
            if (pc.signalingState !== "stable") return;
    
            const callId = this._voiceNewCallId(otherUid);
            try {
              this._voice.callIds.set(otherUid, callId);
            } catch (e) {}
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            this._voiceSendSignal(otherUid, { type: "offer", sdp: offer.sdp, callId: callId });
          } catch (e) {}
        },

    _voiceDropPeer: function (uid, opts) {
          opts = opts || {};
          try {
            if (!this._voice) return;
            try {
              this._voiceClearReconnect(uid);
            } catch (e) {}
            const pc = this._voice.peers && this._voice.peers.get(uid);
            if (pc) {
              try {
                pc.close();
              } catch (e) {}
            }
            try {
              this._voice.peers && this._voice.peers.delete(uid);
            } catch (e) {}
            const el = this._voice.remoteAudioEls && this._voice.remoteAudioEls.get(uid);
            if (el) {
              try {
                el.remove();
              } catch (e) {}
            }
            try {
              this._voice.remoteAudioEls && this._voice.remoteAudioEls.delete(uid);
            } catch (e) {}
            if (!opts.preserveCallId) {
              try {
                this._voice.callIds && this._voice.callIds.delete(uid);
              } catch (e) {}
            }
          } catch (e) {}
        },

    _voiceHandleSignal: async function (fromUid, msg) {
          if (!msg || !fromUid || !this._voice || !this._voice.enabled || this.isSpectator) return;
    
          try {
            if (!msg.sdp && msg.sdpParts && Array.isArray(msg.sdpParts)) {
              msg.sdp = msg.sdpParts.join("");
            }
          } catch (e) {}
    
          try {
            const incomingCallId = msg.callId ? String(msg.callId) : "";
            const knownCallId = this._voice.callIds && this._voice.callIds.get(fromUid);
    
            if (msg.type === "offer" && msg.sdp) {
              if (incomingCallId && knownCallId && knownCallId !== incomingCallId) {
                try {
                  this._voiceDropPeer(fromUid, { preserveCallId: true });
                } catch (e) {}
              }
              try {
                this._voice.callIds.set(fromUid, incomingCallId || knownCallId || this._voiceNewCallId(fromUid));
              } catch (e) {}
    
              const pc = this._voiceEnsurePeer(fromUid);
              const iOffer = String(this.myUid || "") < String(fromUid || "");
              if (iOffer && pc.signalingState !== "stable") return;
    
              await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
              const ans = await pc.createAnswer();
              await pc.setLocalDescription(ans);
              this._voiceSendSignal(fromUid, {
                type: "answer",
                sdp: ans.sdp,
                callId: this._voice.callIds.get(fromUid),
              });
              return;
            }
    
            if (incomingCallId && knownCallId && incomingCallId !== knownCallId) {
              return;
            }
    
            const pc = this._voiceEnsurePeer(fromUid);
    
            if (msg.type === "answer" && msg.sdp) {
              await pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
              return;
            }
    
            if (msg.type === "ice" && msg.candidate) {
              try {
                await pc.addIceCandidate(msg.candidate);
              } catch (e) {}
              return;
            }
          } catch (e) {}
        },

    _handlePresence: function (data) {
          if (!data) return;
          const oppUid = this._getOpponentInfoFromData(data).uid;
          if (!oppUid) return;
    
          const pres = data.presence ? data.presence[oppUid] : null;
          const now = nowTs();
          const tsRaw = pres && (pres.updatedAt || pres.joinedAt);
          const lastSeen = Number(tsRaw || 0) || 0;
          const online = !!(pres && isPresenceFresh(lastSeen, GAME_PRESENCE_ONLINE_TTL_MS));
    
          try {
            this._oppOnline = online;
            this._oppLastSeenAt = lastSeen || this._oppLastSeenAt || 0;
            if (pres && pres.nickname) this._oppName = String(pres.nickname);
            try {
              if (online) {
                this._oppOfflineSince = null;
                this._oppLeftModalShown = false;
              } else {
                if (!this._oppOfflineSince) this._oppOfflineSince = now;
              }
            } catch (e) {}
            this._updatePresenceUi();
            try {
              this._checkMoveCommitHealth();
            } catch (e) {}
          } catch (e) {}
        },

    _renderSharedLog: function (logArr) {
          try {
            const rawArr = Array.isArray(logArr) ? logArr : [];
            const arr = rawArr.filter((it) => {
              const type = String(it && it.type || "");
              return type !== "invite_sent" && type !== "invite_accepted" && type !== "invite_rejected";
            });
            const last = arr.length ? arr[arr.length - 1] : null;
            const key = `${arr.length}:${last && last.ts ? last.ts : ""}`;
            if (key === this._lastRenderedLogKey) return;
            this._lastRenderedLogKey = key;
    
            if (window.LogMgr && typeof window.LogMgr.setEvents === "function") {
              const slice = arr.slice(-80);
    
              const inferLegacy = (o) => {
                try {
                  if (!o || typeof o !== "object") return null;
                  const pick = (a, b) => (a !== undefined && a !== null ? a : b);
                  const k = String(o.kind || o.type || "");
    
                  const side = pick(o.side, pick(o.by, o.s));
                  const from = pick(o.from, o.f);
                  const to = pick(o.to, o.t);
                  const captures = pick(o.captures, o.c);
    
                  if (
                    k === "turn" ||
                    (from != null && to != null && side != null && (k === "" || k === "move"))
                  ) {
                    return { kind: "turn", side: side, from: from, to: to, captures: captures | 0 };
                  }
                  if (k === "undo" && (from != null || to != null)) {
                    return { kind: "undo", from: from, to: to };
                  }
                  if (k === "promote" && o.idx != null) {
                    return { kind: "promote", side: side, idx: o.idx };
                  }
                  if (k === "soufla_remove" && o.idx != null) {
                    return { kind: "soufla_remove", idx: o.idx };
                  }
                  if (k === "soufla_force" && from != null) {
                    return { kind: "soufla_force", from: from, path: o.path };
                  }
                  if (k === "actor_i18n" || o.actor) {
                    return { kind: "actor_i18n", actor: o.actor, key: o.key, vars: o.vars };
                  }
                  if (k === "i18n" || o.key) {
                    return { kind: "i18n", key: o.key, vars: o.vars };
                  }
                } catch (e) {}
                return null;
              };
    
              const evs = slice.map((it) => {
                if (!it || typeof it !== "object") {
                  return { kind: "raw", text: String(it ?? ""), ts: nowTs() };
                }
    
                if (it.kind) {
                  if (it.ts == null) it.ts = nowTs();
                  return it;
                }
    
                if (it.key) {
                  if (it.actor)
                    return {
                      kind: "actor_i18n",
                      actor: it.actor,
                      key: it.key,
                      vars: it.vars,
                      ts: it.ts,
                    };
                  return { kind: "i18n", key: it.key, vars: it.vars, ts: it.ts };
                }
    
                if (typeof it.text === "string") {
                  const dec = decodeSharedLogText(it.text);
                  if (dec) {
                    dec.ts = it.ts;
                    return dec;
                  }
    
                  const legacy = inferLegacy(it);
                  if (legacy) {
                    legacy.ts = it.ts;
                    return legacy;
                  }
    
                  return { kind: "raw", text: it.text, ts: it.ts };
                }
    
                const legacy = inferLegacy(it);
                if (legacy) {
                  legacy.ts = it.ts;
                  return legacy;
                }
    
                return { kind: "raw", text: "", ts: it.ts };
              });
    
              window.LogMgr.setEvents(evs);
              return;
            }
    
            const logEl = document.getElementById("log");
            if (!logEl) return;
    
            const slice = arr.slice(-80).reverse();
    
            logEl.innerHTML = "";
            slice.forEach((it) => {
              const row = document.createElement("div");
              row.className = "log-item";
    
              const timeEl = document.createElement("span");
              timeEl.className = "time";
              const ts = it && typeof it.ts === "number" ? it.ts : null;
              timeEl.textContent =
                ts != null ? new Date(ts).toLocaleTimeString("en-GB", { hour12: false }) : "";
    
              const msgEl = document.createElement("span");
              msgEl.className = "msg";
              const rawText = it && typeof it.text === "string" ? it.text : "";
              const dec = decodeSharedLogText(rawText);
              if (dec && dec.kind === "i18n") {
                msgEl.textContent = window.I18N.translateArgs(
                  dec.key,
                  dec.vars && typeof dec.vars === "object" ? dec.vars : {},
                );
              } else if (dec && dec.kind === "actor_i18n") {
                const actorEl = document.createElement("span");
                actorEl.className = "actor-word";
                actorEl.textContent = dec.actor ? String(dec.actor) : window.I18N.translateArgs("players.player");
                msgEl.appendChild(actorEl);
                msgEl.appendChild(document.createTextNode(`: ${window.I18N.translateArgs(dec.key, dec.vars && typeof dec.vars === "object" ? dec.vars : {})}`));
              } else {
                msgEl.textContent = rawText ? String(rawText) : "";
              }
    
              row.appendChild(timeEl);
              row.appendChild(document.createTextNode(" "));
              row.appendChild(msgEl);
    
              logEl.appendChild(row);
            });
          } catch (e) {}
        },

    _showSouflaModalFromLastMove: function (lastMove) {
          try {
            if (!window.DhametSouflaView || typeof DhametSouflaView.showAppliedSummary !== "function") {
              throw new Error("shared-soufla-summary-missing");
            }
            return DhametSouflaView.showAppliedSummary(lastMove, {
              mySide: this.mySide,
              isSpectator: !!this.isSpectator,
              t: (key, vars) => window.I18N.translateArgs(key, vars && typeof vars === "object" ? vars : {}),
              rcStr: typeof rcStr === "function" ? rcStr : undefined,
              Modal: typeof Modal !== "undefined" ? Modal : null,
              actorName: (() => {
                const players = (this._lastGameData && this._lastGameData.players) || {};
                const row = Number(lastMove.by) === -1 ? players.white : players.black;
                try { return row ? displayPlayerName(row.uid, row.nickname) : window.I18N.translateArgs("players.player"); } catch (_) { return row && row.nickname || window.I18N.translateArgs("players.player"); }
              })(),
              victimName: (() => {
                const players = (this._lastGameData && this._lastGameData.players) || {};
                const row = Number(lastMove.by) === -1 ? players.black : players.white;
                try { return row ? displayPlayerName(row.uid, row.nickname) : window.I18N.translateArgs("players.player"); } catch (_) { return row && row.nickname || window.I18N.translateArgs("players.player"); }
              })(),
            });
          } catch (e) {
            try { Logger.warn("shared_soufla_summary_failed", { err: String(e && (e.message || e)) }); } catch (_) {}
            return false;
          }
        },

    recordLocalStep: function (fromIdx, toIdx, isCapture, jumpedIdx) {
          if (!this.isActive || this._isApplyingRemote) return;
    
          try {
            if (!this._awaitingLocalCommit) {
              this._beginLocalCommitWait();
            }
          } catch (e) {}
    
          if (!this._pendingSteps) this._pendingSteps = [];
          this._pendingSteps.push({
            from: fromIdx,
            to: toIdx,
            capture: !!isCapture,
            jumped: jumpedIdx != null ? jumpedIdx : null,
          });
        },

    clearPendingLocalMove: function () {
          this._pendingSteps = [];
          this._cachedSouflaPlain = null;
          try {
            this._markLocalCommitSettled();
          } catch (e) {}
        },

    _clearMoveRetry: function () {
          try {
            if (this._moveRetryTimer) clearTimeout(this._moveRetryTimer);
          } catch (e) {}
          this._moveRetryTimer = null;
          this._moveRetryAttempt = 0;
          this._moveRetryArgs = null;
          this._moveRetryNotified = false;
          this._moveRetryWarned = false;
          this._moveRetryGaveUp = false;
          this._moveRetryDidResync = false;
        },

    _forceResync: function () {
          if (!this.isActive || !this.gameRef) return;
          try {
            if (this._resyncInFlight) return;
            this._resyncInFlight = true;
            this.gameRef
              .once("value")
              .then((snap) => {
                const data = snap && typeof snap.val === "function" ? snap.val() : null;
                if (data) {
                  try {
                    this._applyRemoteState(data);
                  } catch (e) {}
                }
              })
              .catch(() => {})
              .finally(() => {
                try {
                  this._resyncInFlight = false;
                } catch (e) {}
              });
          } catch (e) {
            try {
              this._resyncInFlight = false;
            } catch (e) {}
          }
        },

    _scheduleMoveRetry: function (from, to, nextTurn) {
          if (!this.isActive || !this.gameRef) return;
    
          this._moveRetryArgs = { from: from, to: to, nextTurn: nextTurn };
    
          try {
            if (this._moveRetryTimer) clearTimeout(this._moveRetryTimer);
          } catch (e) {}
    
          const MAX_MOVE_SEND_RETRIES = 12;
          if (this._moveRetryGaveUp) return;
    
          const attempt = (this._moveRetryAttempt || 0) + 1;
          this._moveRetryAttempt = attempt;
          if (attempt > MAX_MOVE_SEND_RETRIES) {
            this._moveRetryGaveUp = true;
            return;
          }
    
          const delay = Math.min(15000, 250 * Math.pow(2, Math.min(6, attempt - 1)));
    
          this._moveRetryTimer = setTimeout(() => {
            try {
              this._moveRetryTimer = null;
            } catch (e) {}
            if (!this.isActive) return;
            if (!this._awaitingLocalCommit) return;
            if (this._moveRetryGaveUp) return;
            try {
              this.sendMoveToFirebase(from, to, nextTurn, attempt);
            } catch (e) {}
          }, delay);
        },

    cacheSouflaPending: function (pending) {
          this._cachedSouflaPlain = pending ? souflaToPlain(pending) : null;
        },

    logSouflaPressedToFirebase: function () {
          if (!this.isActive || !this.gameRef) return;
          if (!guardOnlineWrite()) return;
    
          const who = this.myNick || window.I18N.translateArgs("players.player");
          const msg = window.I18N.translateArgs("log.soufla.pressed", { who: who });
    
          try {
            this.gameRef.transaction(
              (g) => {
                if (!g || g.status !== "active") return g;
    
                g.log = g.log || [];
    
                normalizeLogArrayForWrite(g.log);
                g.log.push({
                  ts: nowTs(),
                  type: "soufla_pressed",
                  text: encodeSharedLogText({
                    kind: "actor_i18n",
                    actor: who,
                    key: "log.soufla.pressed",
                    vars: {},
                  }),
                });
                if (g.log.length > 50) g.log = g.log.slice(-50);
    
                return g;
              },
              (err) => {
                if (err) handleDbError(err, window.I18N.translateArgs("online.syncFail"), { ctx: "log.soufla" });
              },
            );
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("online.syncFail"), { ctx: "log.soufla" });
          }
        },

    sendMoveToFirebase: function (_from, _to, nextTurn, _attempt) {
          if (!guardOnlineWrite()) return;
          if (!this.isActive || !this.gameRef) return;
          if (!requireAuthUid(this.myUid)) {
            try { this.syncNow({ force: true, repairPresence: true }); } catch (e) {}
            try { showOnlineNotice(window.I18N.translateArgs("status.moveSendFail")); } catch (e) {}
            return;
          }
          const attempt = Number.isFinite(_attempt) ? _attempt : 0;
          try {
            if (!this._awaitingLocalCommit) {
              this._beginLocalCommitWait();
            }
          } catch (e) {}
          let steps = Array.isArray(this._pendingSteps) ? this._pendingSteps.slice() : [];
          if (!steps.length) {
            const fr = Number.isFinite(_from) ? _from : null;
            const to = Number.isFinite(_to) ? _to : null;
            if (fr == null || to == null) return;
            steps = [{ from: fr, to: to, capture: false, jumped: null }];
          }
          this._pendingSteps = [];
    
          const move = {
            kind: "move",
            by: -nextTurn,
            from: steps[0].from,
            to: steps[steps.length - 1].to,
            path: steps.map((s) => s.to),
            jumps: steps.filter((s) => s.jumped != null).map((s) => s.jumped),
            ts: nowTs(),
          };
    
          const capOrder =
            typeof Visual !== "undefined" && Visual && typeof Visual.getCapturedOrder === "function"
              ? Visual.getCapturedOrder()
              : [];
    
          const stateSnapshot = typeof snapshotState === "function" ? snapshotState() : null;
          const statePayload = Object.assign(
            stateRecordWithPromotionQueue(stateSnapshot, {
              deferredPromotions: Array.isArray(Game.deferredPromotions) ? Game.deferredPromotions : undefined,
              deferredPromotion: Game.deferredPromotion || null,
            }),
            { capturedOrder: capOrder },
          );
    
          const souflaPlain = this._cachedSouflaPlain;
          this._cachedSouflaPlain = null;
    
          this.gameRef.transaction(
            (g) => {
              if (!g || g.status !== "active") return;
              if (!this._isCurrentAuthPlayerInGame(g)) return;
    
              if (typeof g.turn === "number" && g.turn !== move.by) return;
    
              const mi = (g.moveIndex || 0) + 1;
    
              const ply = (g.ply || 0) + 1;
    
              g.moveIndex = mi;
              g.ply = ply;
              g.turn = nextTurn;
    
              g.lastMove = Object.assign({ moveIndex: mi, ply }, move);
              g.state = statePayload;
    
              g.states = g.states || {};
              g.states[ply] = statePayload;
    
              try {
                const KEEP_STATES = 40;
                const keys = Object.keys(g.states)
                  .map((k) => parseInt(k, 10))
                  .filter((n) => Number.isFinite(n))
                  .sort((a, b) => a - b);
                if (keys.length > KEEP_STATES) {
                  const cutoff = keys[keys.length - KEEP_STATES];
                  keys.forEach((k) => {
                    if (k < cutoff) delete g.states[k];
                  });
                }
              } catch (e) {}
    
              if (souflaPlain && souflaPlain.penalizer != null) {
                g.soufla = {
                  availableFor: souflaPlain.penalizer,
                  pending: souflaPlain,
                };
              } else {
                g.soufla = null;
              }
    
              g.log = g.log || [];
    
              normalizeLogArrayForWrite(g.log);
              const moverName =
                (move.by === -1
                  ? g.players && g.players.white && g.players.white.nickname
                  : g.players && g.players.black && g.players.black.nickname) || "";
              g.log.push({
                ts: nowTs(),
                type: "turn",
                text: encodeSharedLogText({
                  kind: "turn",
                  side: move.by,
                  from: move.from,
                  to: move.to,
                  captures: move.jumps && move.jumps.length ? move.jumps.length : 0,
                }),
              });
              if (g.log.length > 50) g.log = g.log.slice(-50);
    
              return g;
            },
            (err, committed, snap) => {
              try {
                if (!err && !committed && snap && typeof snap.val === "function") {
                  const cur = snap.val();
                  const remoteMi = Number((cur && cur.moveIndex) || 0);
                  if (
                    this._awaitingLocalCommit &&
                    Number.isFinite(this._expectedMoveIndex) &&
                    remoteMi >= this._expectedMoveIndex
                  ) {
                    try {
                      this._markLocalCommitSettled();
                    } catch (e) {}
                    return;
                  }
                }
              } catch (e) {}
    
              try {
                if (!err && !committed && snap && typeof snap.val === "function") {
                  const cur = snap.val();
                  if (cur && typeof cur.turn === "number" && cur.turn !== move.by) {
                    try {
                      this._markLocalCommitSettled();
                    } catch (e) {}
                    try {
                      this._forceResync();
                    } catch (e) {}
                    return;
                  }
                }
              } catch (e) {}
    
              if (err || !committed) {
                this._pendingSteps = steps.concat(this._pendingSteps || []);
                try {
                  this._cachedSouflaPlain = souflaPlain || this._cachedSouflaPlain;
                } catch (e) {}
    
                try {
                  const RESYNC_AFTER = 2;
                  if (!this._moveRetryDidResync && attempt >= RESYNC_AFTER) {
                    this._moveRetryDidResync = true;
                    try {
                      this._forceResync();
                    } catch (e) {}
                  }
                } catch (e) {}
    
                const MAX_MOVE_SEND_RETRIES = 12;
    
                try {
                  if (err) handleDbError(err, null, { ctx: "move.send" });
                } catch (e) {}
    
                try {
                  if (!this._moveRetryWarned) {
                    this._moveRetryWarned = true;
                  }
                } catch (e) {}
    
                if (attempt >= MAX_MOVE_SEND_RETRIES || (err && isPermissionDenied(err))) {
                  this._moveRetryGaveUp = true;
                  this._pendingSteps = [];
                  this._cachedSouflaPlain = null;
                  try {
                    this._markLocalCommitSettled();
                  } catch (e) {}
                  try {
                    showOnlineNotice(window.I18N.translateArgs("status.moveSendFail"));
                  } catch (e) {}
                  try {
                    this._forceResync();
                  } catch (e) {}
                  try {
                    this.syncNow();
                  } catch (e) {}
                  return;
                }
    
                try {
                  if (!this._moveRetryNotified) {
                    this._moveRetryNotified = true;
                    showOnlineNotice(window.I18N.translateArgs("status.moveSendFail"));
                  }
                } catch (e) {}
    
                try {
                  this._scheduleMoveRetry(_from, _to, nextTurn);
                } catch (e) {}
                return;
              }
    
              try {
                this._markLocalCommitSettled();
              } catch (e) {}
              try {
                this._touchRoomListActivity(this.gameId, true);
              } catch (e) {}
            },
          );
        },

    sendSouflaDecisionToFirebase: function (decision, pending, nextTurn) {
          if (!guardOnlineWrite()) return;
          if (!this.isActive || !this.gameRef) return;
          if (!decision || !pending) return;
    
          const move = {
            kind: "soufla",
            by: pending.penalizer,
            decision: decision,
            ts: nowTs(),
          };
    
          const capOrder =
            typeof Visual !== "undefined" && Visual && typeof Visual.getCapturedOrder === "function"
              ? Visual.getCapturedOrder()
              : [];
          const rawFx =
            decision && (decision.__souflaFX || decision.fx)
              ? decision.__souflaFX || decision.fx
              : null;
          const computedFx = buildSouflaFxFromDecisionAndPending(decision, pending);
    
          const souflaMeta = {
            offenderIdx: decision.offenderIdx != null ? decision.offenderIdx : null,
            startedFrom: pending.startedFrom != null ? pending.startedFrom : null,
            lastPieceIdx: pending.lastPieceIdx != null ? pending.lastPieceIdx : null,
            longestGlobal: pending.longestGlobal != null ? pending.longestGlobal : 0,
            fx: normalizeSouflaFx(rawFx) || normalizeSouflaFx(computedFx),
          };
    
          move.souflaMeta = souflaMeta;
    
          const stateSnapshot = typeof snapshotState === "function" ? snapshotState() : null;
          const statePayload = Object.assign(
            stateRecordWithPromotionQueue(stateSnapshot, {
              deferredPromotions: Array.isArray(Game.deferredPromotions) ? Game.deferredPromotions : undefined,
              deferredPromotion: Game.deferredPromotion || null,
            }),
            { capturedOrder: capOrder },
          );
    
          this._cachedSouflaPlain = null;
    
          const runTx = () =>
            this.gameRef.transaction(
              (g) => {
                if (!g || g.status !== "active") return g;
                if (g.turn !== move.by) return g;
    
                const mi = (g.moveIndex || 0) + 1;
    
                const ply = (g.ply || 0) + 1;
    
                g.moveIndex = mi;
                g.ply = ply;
                g.turn = nextTurn;
                g.lastMove = Object.assign({ moveIndex: mi, ply }, move);
                g.state = statePayload;
                g.states = g.states || {};
                g.states[ply] = statePayload;
    
                try {
                  const KEEP_STATES = 40;
                  const keys = Object.keys(g.states)
                    .map((k) => parseInt(k, 10))
                    .filter((n) => Number.isFinite(n))
                    .sort((a, b) => a - b);
                  if (keys.length > KEEP_STATES) {
                    const cutoff = keys[keys.length - KEEP_STATES];
                    keys.forEach((k) => {
                      if (k < cutoff) delete g.states[k];
                    });
                  }
                } catch (e) {}
    
                g.soufla = null;
                g.undoRequest = null;
    
                g.log = g.log || [];
    
                normalizeLogArrayForWrite(g.log);
                const penName =
                  (move.by === -1
                    ? g.players && g.players.white && g.players.white.nickname
                    : g.players && g.players.black && g.players.black.nickname) || "";
    
                const cell =
                  souflaMeta.offenderIdx != null
                    ? typeof rcStr === "function"
                      ? rcStr(souflaMeta.offenderIdx)
                      : ""
                    : "";
                const key = decision.kind === "remove" ? "log.soufla.remove" : "log.soufla.force";
                const vars =
                  decision.kind === "remove"
                    ? { cell }
                    : { from: cell, path: souflaMeta.forcePathStr || "" };
                g.log.push({
                  ts: nowTs(),
                  type: "soufla",
                  text: encodeSharedLogText({
                    kind: "actor_i18n",
                    actor: penName || "",
                    key: key,
                    vars: vars,
                  }),
                });
                if (g.log.length > 50) g.log = g.log.slice(-50);
    
                return g;
              },
              (err, committed) => {
                if (err) {
                  handleDbError(err, window.I18N.translateArgs("soufla.sendFailed"), { ctx: "soufla.send" });
                  return;
                }
                if (committed === false) {
                  showOnlineNotice(window.I18N.translateArgs("soufla.sendFailed"));
                } else {
                  try { this._touchRoomListActivity(this.gameId, true); } catch (e) {}
                }
              },
            );
    
          try {
            const r = runTx();
            if (r && typeof r.catch === "function") {
              r.catch((e) => handleDbError(e, window.I18N.translateArgs("soufla.sendFailed")));
            }
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("soufla.sendFailed"), { ctx: "soufla.send" });
          }
        },

    _undoWaitKeyOf: function (ur) {
          try {
            if (!ur) return null;
            const a = ur.requesterUid != null ? String(ur.requesterUid) : "";
            let b = ur.requestedAt;
            if (b != null && typeof b === "object") {
              try {
                b = JSON.stringify(b);
              } catch (e) {
                b = String(b);
              }
            }
            b = b != null ? String(b) : "";
            const c = ur.ply != null ? String(ur.ply) : "";
            if (!a && !b && !c) return null;
            return `${a}|${b}|${c}`;
          } catch (e) {
            return null;
          }
        },

    _openUndoWaitModal: function (ur) {
          try {
            if (!ur) return;
            if (ur.status !== "pending" && ur.status !== "active") return;
            if (!ur.requesterUid || ur.requesterUid !== this.myUid) return;
    
            const key = this._undoWaitKeyOf(ur);
            if (!key) return;
    
            if (this._undoWaitOpen) return;
            if (this._undoWaitDismissedKey && this._undoWaitDismissedKey === key) return;
    
            this._undoWaitOpen = true;
            this._undoWaitKey = key;
    
            showOnlineNotice(window.I18N.translateArgs("undo.wait.body"), {
              title: window.I18N.translateArgs("modals.undo.title"),
              onClose: (reason) => {
                const k = this._undoWaitKey;
                this._undoWaitOpen = false;
                this._undoWaitKey = null;
    
                if (this._undoWaitAutoClose) {
                  this._undoWaitAutoClose = false;
                } else if (k && reason !== "replaced" && reason !== "state-change") {
                  this._undoWaitDismissedKey = k;
                }
    
                try {
                  Modal.clearBackdropTag();
                } catch (e) {}
              },
            });
    
            try {
              Modal.setBackdropTag("undo-wait");
            } catch (e) {}
          } catch (e) {}
        },

    _closeUndoWaitModal: function () {
          try {
            if (!this._undoWaitOpen) {
              this._undoWaitKey = null;
              return;
            }
    
            if (Modal.isOpen() && Modal.getBackdropTag() === "undo-wait") {
              this._undoWaitAutoClose = true;
              Modal.close();
              return;
            }
    
            this._undoWaitOpen = false;
            this._undoWaitKey = null;
            this._undoWaitAutoClose = false;
          } catch (e) {
            this._undoWaitOpen = false;
            this._undoWaitKey = null;
            this._undoWaitAutoClose = false;
          }
        },

    requestUndo: function () {
          if (!guardOnlineWrite()) return;
          if (!this.isActive || !this.gameRef || this.isSpectator) return;

          const Control = window.DhametControl;
          let undoCheck = null;
          try {
            undoCheck = Control && typeof Control.canRequestUndo === "function"
              ? Control.canRequestUndo(this._lastGameData, this.mySide)
              : null;
          } catch (e) {
            undoCheck = null;
          }
          if (!undoCheck || !undoCheck.ok) {
            const error = undoCheck && undoCheck.error;
            const openingError = error === "control/opening-undo-disabled";
            const ownMoveError = error === "control/not-last-mover";
            showOnlineNotice(
              window.I18N.translateArgs(
                openingError
                  ? "modals.undo.notAllowedBody"
                  : ownMoveError
                    ? "ui.undoOwnLastOnly"
                    : "ui.noUndo",
              ),
              { title: window.I18N.translateArgs(openingError ? "modals.undo.notAllowedTitle" : "modals.undo.title") },
            );
            return;
          }

          const clientActionId = `undo:req:${this.myUid || "anon"}:${this.gameId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
          let tx = null;
          try {
            tx = this.gameRef.transaction((g) => {
              if (!g || g.status !== "active") return;
              if (!this._isCurrentAuthPlayerInGame(g)) return;
              const check = Control && typeof Control.canRequestUndo === "function"
                ? Control.canRequestUndo(g, this.mySide)
                : null;
              if (!check || !check.ok) return;
              const created = Control.createUndoRequest({
                requesterUid: this.myUid,
                requesterSide: this.mySide,
                requesterNick: this.myNick,
                requestedAt: nowTs(),
                ply: g.ply,
                moveIndex: g.moveIndex,
                clientActionId,
              });
              // Keep the Firebase record within the published RTDB schema. The
              // side and move index are derived from the immutable players and
              // current game record whenever the request is validated.
              g.undoRequest = {
                status: created.status,
                acceptedAt: 0,
                requesterUid: created.requesterUid,
                requesterNick: created.requesterNick,
                requestedAt: created.requestedAt,
                ply: created.ply,
              };
              return g;
            });
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("undo.requestFailed"), { ctx: "undo.request" });
            return;
          }

          try {
            if (tx && typeof tx.then === "function") {
              tx.then((res) => {
                const committed = !!(res && res.committed);
                const snap = res && res.snapshot ? res.snapshot : null;
                const game = snap && typeof snap.val === "function" ? snap.val() : null;
                if (!committed || !game || !game.undoRequest) {
                  showOnlineNotice(window.I18N.translateArgs("undo.requestFailed"), { title: window.I18N.translateArgs("modals.undo.title") });
                  return;
                }
                this._lastGameData = game;
                this._openUndoWaitModal(game.undoRequest);
              }).catch((e) => handleDbError(e, window.I18N.translateArgs("undo.requestFailed"), { ctx: "undo.request" }));
            }
          } catch (e) {}
        },

    _handleUndoRequest: function (data) {
          const ur = data && data.undoRequest ? data.undoRequest : null;
          if (!ur) {
            this._closeUndoWaitModal();
            return;
          }

          const undoState = String(ur.status || "").toLowerCase();
          const undoRequestedAt = Number(ur.requestedAt || 0) || 0;
          if ((undoState === "pending" || undoState === "active") && undoRequestedAt && nowTs() - undoRequestedAt >= UNDO_REQUEST_TTL_MS) {
            this._closeUndoWaitModal();
            if (!this.isSpectator && this.gameRef) {
              try {
                this.gameRef.child("undoRequest").transaction((current) => {
                  if (!current) return null;
                  const state = String(current.status || "").toLowerCase();
                  const requestedAt = Number(current.requestedAt || 0) || 0;
                  if ((state === "pending" || state === "active") && requestedAt && nowTs() - requestedAt >= UNDO_REQUEST_TTL_MS) return null;
                  return;
                });
              } catch (e) {}
            }
            return;
          }

          // A spectator follows every match event, but never receives player
          // controls or wording that makes the spectator a party to the request.
          if (this.isSpectator) {
            const state = String(ur.status || "").toLowerCase();
            // Do not expose the pending request to spectators. They receive only
            // the final accepted or rejected result.
            if (state === "rejected") {
              const noticeKey = [state, ur.requesterUid || "", ur.responderUid || "", ur.respondedAt || ur.requestedAt || ""].join("|");
              if (noticeKey && noticeKey !== this._lastSpectatorUndoNoticeKey) {
                this._lastSpectatorUndoNoticeKey = noticeKey;
                const requester = String(ur.requesterNick || "").trim() || window.I18N.translateArgs("players.player");
                const responder = String(ur.responderNick || "").trim() || window.I18N.translateArgs("players.player");
                showOnlineNotice(formatTpl(window.I18N.translateArgs("undo.spectatorRejected"), { requester, responder }), {
                  allowSpectator: true,
                  title: window.I18N.translateArgs("modals.undo.title"),
                  playerNames: [requester, responder],
                });
              }
            }
            return;
          }
    
          if ((ur.status === "pending" || ur.status === "active") && ur.requesterUid === this.myUid) {
            this._openUndoWaitModal(ur);
            return;
          }
    
          if (
            (ur.status === "pending" || ur.status === "active") &&
            ur.requesterUid &&
            ur.requesterUid !== this.myUid
          ) {
            const name = ur.requesterNick || window.I18N.translateArgs("online.opponent");
            Modal.twoAction({
              title: window.I18N.translateArgs("undo.request.title"),
              body: `<div>${formatTpl(window.I18N.translateArgs("undo.request.body"), { name: `<span class="z-player-name">${escapeHtml(name)}</span>` })}</div>`,
              firstLabel: window.I18N.translateArgs("actions.accept"),
              firstClassName: "ok",
              onFirst: () => {
                this._respondUndo(true);
              },
              secondLabel: window.I18N.translateArgs("actions.reject"),
              secondClassName: "ghost",
              onSecond: () => {
                this._respondUndo(false);
              },
            });
            return;
          }
    
          if (ur.status === "accepted") {
            if (ur.requesterUid === this.myUid) this._closeUndoWaitModal();
            this._performUndoTransaction();
            return;
          }
    
          if (ur.status === "rejected" && ur.requesterUid === this.myUid) {
            this._closeUndoWaitModal();
            const key = this._undoWaitKeyOf(ur) || [ur.requesterUid || "", ur.respondedAt || ur.requestedAt || "", "rejected"].join("|");
            if (!this._lastUndoRejectedKey || this._lastUndoRejectedKey !== key) {
              this._lastUndoRejectedKey = key;
              const responder = (() => {
                const direct = String(ur.responderNick || "").trim();
                if (direct) return direct;
                const players = (this._lastGameData && this._lastGameData.players) || {};
                const rows = [players.white || {}, players.black || {}];
                const row = rows.find((item) => ur.responderUid && String(item.uid || "") === String(ur.responderUid)) || {};
                try { return displayPlayerName(row.uid || ur.responderUid, row.nickname) || window.I18N.translateArgs("players.player"); }
                catch (_) { return String(row.nickname || "").trim() || window.I18N.translateArgs("players.player"); }
              })();
              showOnlineNotice(formatTpl(window.I18N.translateArgs("undo.requesterRejected"), { responder }), {
                title: window.I18N.translateArgs("undo.rejectedTitle"),
                playerNames: [responder],
              });
            }
            try {
              this.gameRef.child("undoRequest").remove();
            } catch (e) {}
          }
        },

    _respondUndo: function (accept) {
          if (!this.gameRef || !this.myUid || this.isSpectator) return;
          const Control = window.DhametControl;
          this.gameRef.transaction((g) => {
            if (!g || g.status !== "active") return;
            if (!this._isCurrentAuthPlayerInGame(g)) return;
            const current = Control && typeof Control.normalizeUndoRequest === "function"
              ? Control.normalizeUndoRequest(g.undoRequest)
              : g.undoRequest;
            if (!current || (current.status !== "pending" && current.status !== "active")) return;
            if (current.requesterUid === this.myUid) return;
            const requesterSide = g.players && g.players.white && g.players.white.uid === current.requesterUid
              ? -1
              : g.players && g.players.black && g.players.black.uid === current.requesterUid
                ? 1
                : null;
            if (requesterSide == null || Number(requesterSide) === Number(this.mySide)) return;
            g.undoRequest = {
              status: accept ? "accepted" : "rejected",
              acceptedAt: accept ? nowTs() : 0,
              requesterUid: current.requesterUid,
              requesterNick: current.requesterNick || "",
              requestedAt: current.requestedAt || nowTs(),
              ply: Number(current.ply || g.ply || 0),
              respondedAt: nowTs(),
              responderUid: this.myUid,
              responderNick: this.myNick,
            };
            return g;
          }, (err, committed) => {
            if (err) handleDbError(err, window.I18N.translateArgs("undo.failed"), { ctx: "undo.respond" });
            else if (!committed) showOnlineNotice(window.I18N.translateArgs("undo.notCommitted"));
          });
        },

    _performUndoTransaction: function () {
          if (this._undoTxnInFlight) return;
          this._undoTxnInFlight = true;
          const Control = window.DhametControl;

          this.gameRef.transaction(
            (g) => {
              if (!g || g.status !== "active") return;
              if (!this._isCurrentAuthPlayerInGame(g)) return;
              const ur = Control && typeof Control.normalizeUndoRequest === "function"
                ? Control.normalizeUndoRequest(g.undoRequest)
                : g.undoRequest;
              if (!ur || ur.status !== "accepted") return;

              const requesterSide = g.players && g.players.white && g.players.white.uid === ur.requesterUid
                ? -1
                : g.players && g.players.black && g.players.black.uid === ur.requesterUid
                  ? 1
                  : null;
              const check = Control && typeof Control.canRequestUndo === "function"
                ? Control.canRequestUndo(g, requesterSide, { ignorePending: true })
                : null;
              if (!check || !check.ok) {
                g.undoRequest = null;
                return g;
              }
              const previous = Control.previousStateForUndo(g);
              if (!previous || !previous.state || !previous.state.snapshot) {
                g.undoRequest = null;
                return g;
              }

              const fx = check.undoFx || Control.undoFxFromSnapshot(check.snapshot);
              const responderSide = requesterSide == null ? null : -Number(requesterSide);
              const moveIndex = Number(g.moveIndex || 0) + 1;
              const previousPly = Number(previous.ply || 0);

              g.moveIndex = moveIndex;
              g.ply = previousPly;
              g.state = previous.state;
              g.turn = Number(previous.state.snapshot.player);
              g.soufla = null;
              g.undoRequest = null;
              // Assigning null removes a possible winner child without adding
              // fields that are outside the published Firebase game schema.
              g.winner = null;
              g.status = "active";
              g.lastMove = {
                kind: "undo",
                by: responderSide,
                requesterUid: ur.requesterUid || null,
                responderUid: ur.responderUid || this.myUid || null,
                undoneFrom: fx && fx.undoneFrom != null ? fx.undoneFrom : null,
                undonePath: fx && Array.isArray(fx.undonePath) ? fx.undonePath.slice() : null,
                undoneTo: fx && fx.undoneTo != null ? fx.undoneTo : null,
                ply: previousPly,
                moveIndex,
                ts: nowTs(),
              };

              g.log = Array.isArray(g.log) ? g.log : [];
              normalizeLogArrayForWrite(g.log);
              g.log.push({
                ts: nowTs(),
                type: "undo",
                text: encodeSharedLogText({
                  kind: "undo",
                  from: fx && fx.undoneFrom != null ? fx.undoneFrom : null,
                  to: fx && fx.undoneTo != null ? fx.undoneTo : null,
                }),
              });
              if (g.log.length > 50) g.log = g.log.slice(-50);
              return g;
            },
            (err, committed, snap) => {
              this._undoTxnInFlight = false;
              if (err) {
                handleDbError(err, window.I18N.translateArgs("undo.failed"), { ctx: "undo" });
                return;
              }
              if (!committed) {
                showOnlineNotice(window.I18N.translateArgs("undo.notCommitted"));
                return;
              }
              try {
                const data = snap && typeof snap.val === "function" ? snap.val() : null;
                if (data) this._lastGameData = data;
              } catch (e) {}
            },
          );
        },

    _goToGameAsSpectator: function (gameId) {
          try {
            const inPages = (location.pathname || "").includes("/pages/");
            const base = inPages ? "./game.html" : "pages/game.html";
            const url = `${base}?spectate=${encodeURIComponent(String(gameId || ""))}`;
            location.href = url;
          } catch (e) {}
        },

    initLobbyPage: async function (opts) {
          opts = opts || {};
          const roomsEl = document.getElementById(opts.roomsListId || "roomsList");
          const playersEl = document.getElementById(opts.playersListId || "playersList");
          const recoveryAttempt = Math.max(0, Number(opts.__recoveryAttempt || 0) || 0);
          const generation = Number(this._lobbyInitGeneration || 0) + 1;
          this._lobbyInitGeneration = generation;
          this._lobbyInitOptions = {
            roomsListId: opts.roomsListId || "roomsList",
            playersListId: opts.playersListId || "playersList",
          };
          this._lobbyLastAttemptAt = Date.now();
          const isCurrent = () => generation === Number(this._lobbyInitGeneration || 0);

          // A restored mobile tab can retain dead Firebase listeners. Always detach the
          // previous generation before binding a new one.
          try {
            if (this._lobbyPlayersRef && this._lobbyPlayersCb) this._lobbyPlayersRef.off("value", this._lobbyPlayersCb);
          } catch (_) {}
          try {
            if (this._lobbyRoomsRef && this._lobbyRoomsCb) this._lobbyRoomsRef.off("value", this._lobbyRoomsCb);
          } catch (_) {}
          this._lobbyPlayersRef = null;
          this._lobbyPlayersCb = null;
          this._lobbyRoomsRef = null;
          this._lobbyRoomsCb = null;

          let playersLoaded = false;
          let roomsLoaded = false;
          let lobbyLoadTimer = null;
          let recoveryInFlight = false;
          const clearLoadTimer = () => {
            if (lobbyLoadTimer) clearTimeout(lobbyLoadTimer);
            if (this._lobbyLoadTimer && this._lobbyLoadTimer !== lobbyLoadTimer) clearTimeout(this._lobbyLoadTimer);
            lobbyLoadTimer = null;
            this._lobbyLoadTimer = null;
          };
          const markDataReceived = () => {
            if (!isCurrent()) return;
            this._lobbyLastDataAt = Date.now();
            if (playersLoaded && roomsLoaded) clearLoadTimer();
          };
          const showLobbyFailure = () => {
            if (!isCurrent()) return;
            clearLoadTimer();
            const msg = window.I18N.translateArgs("status.onlineInitFail", "تعذر تشغيل اللعب عبر الإنترنت الآن.");
            if (!playersLoaded && playersEl) playersEl.innerHTML = `<div class="z-empty z-load-error">${escapeHtml(msg)}</div>`;
            if (!roomsLoaded && roomsEl) roomsEl.innerHTML = `<div class="z-empty z-load-error">${escapeHtml(msg)}</div>`;
          };
          const resetPresenceBindings = () => {
            try { this._stopPresenceHeartbeat && this._stopPresenceHeartbeat(); } catch (_) {}
            try {
              if (this._presenceConnInfoRef && this._presenceConnInfoHandler) {
                this._presenceConnInfoRef.off("value", this._presenceConnInfoHandler);
              }
            } catch (_) {}
            this._presenceConnInfoRef = null;
            this._presenceConnInfoHandler = null;
            try { if (this._inviteQuery) this._inviteQuery.off(); } catch (_) {}
            try { this._unbindUserEventsListener && this._unbindUserEventsListener(); } catch (_) {}
            this._inviteQuery = null;
            this._presenceInited = false;
            this.statusRef = null;
            this.playersRef = null;
            this.invitesRef = null;
            this.userEventsRef = null;
            this._invitesPassiveOn = false;
            this._boundInviteUid = "";
          };
          const restartLobbyInPlace = async (reason, forceFreshAuth) => {
            if (!isCurrent() || recoveryInFlight) return false;
            if (recoveryAttempt >= 1) {
              showLobbyFailure();
              return false;
            }
            recoveryInFlight = true;
            clearLoadTimer();
            try {
              try { if (db && typeof db.goOffline === "function") db.goOffline(); } catch (_) {}
              await new Promise((resolve) => setTimeout(resolve, 120));
              try { if (db && typeof db.goOnline === "function") db.goOnline(); } catch (_) {}

              let user = auth && auth.currentUser ? auth.currentUser : null;
              let tokenReady = false;
              if (!forceFreshAuth && user && user.isAnonymous) {
                try {
                  tokenReady = !!(await S.settleWithin(user.getIdToken(true), 6000, false));
                } catch (_) { tokenReady = false; }
              }
              if (!tokenReady && window.DhametEmergency && typeof window.DhametEmergency.resetAnonymous === "function") {
                try {
                  user = await S.settleWithin(window.DhametEmergency.resetAnonymous(), 10000, null);
                  tokenReady = !!(user && user.isAnonymous);
                } catch (_) { tokenReady = false; }
              }
              resetPresenceBindings();
              // Invalidate callbacks from the broken listener generation before the
              // replacement generation is installed.
              this._lobbyInitGeneration = generation + 1;
              try {
                Logger.info("lobby_session_recovered", { reason: String(reason || "unknown"), freshAuth: !!forceFreshAuth });
              } catch (_) {}
              setTimeout(() => {
                try {
                  this.initLobbyPage(Object.assign({}, this._lobbyInitOptions || {}, { __recoveryAttempt: recoveryAttempt + 1 }));
                } catch (_) { showLobbyFailure(); }
              }, 40);
              return true;
            } catch (_) {
              showLobbyFailure();
              return false;
            } finally {
              recoveryInFlight = false;
            }
          };
          const recoverPermissionSession = async (err) => {
            if (!isPermissionDenied(err)) return false;
            return await restartLobbyInPlace("permission-denied", true);
          };
          const lobbyLoadFailed = () => {
            if (!isCurrent()) return;
            if (recoveryAttempt < 1) {
              restartLobbyInPlace("load-timeout", false);
              return;
            }
            showLobbyFailure();
          };
    
          try {
            // Start the watchdog before auth/presence recovery. Previously it started
            // after reads that could hang, leaving the loading text forever.
            lobbyLoadTimer = setTimeout(lobbyLoadFailed, 12000);
            this._lobbyLoadTimer = lobbyLoadTimer;
          } catch (e) {}

          try {
            const setLoading = (el, msg) => {
              if (!el) return;
              el.innerHTML = `<div class="z-empty z-loading">${msg || ""}</div>`;
            };
            setLoading(playersEl, window.I18N.translateArgs("lobby.loadingPlayers"));
            setLoading(roomsEl, window.I18N.translateArgs("lobby.loadingRooms"));
          } catch (e) {}
    
          const ok = await S.settleWithin(this.initPresence(), 10000, false);
          if (!ok) {
            await restartLobbyInPlace("presence-init-failed", false);
            return;
          }
    
          try {
            const uid = this.myUid || (auth && auth.currentUser && auth.currentUser.uid) || "";
            if (!hasExplicitNick(uid)) {
              const picked = ((await askNickname()) || "").trim();
              if (picked) this.myNick = picked;
              if (!this.myNick) this.myNick = getSavedNickOrDefault(uid);
            } else {
              const saved = (getSavedNick() || "").trim();
              if (saved) this.myNick = saved;
              if (!this.myNick) this.myNick = getSavedNickOrDefault(uid);
            }
          } catch (e) {}
    
          // Recover active-room state in the background. Player/room listeners must
          // never wait for a stale private game id stored by a restored browser tab.
          try { S.settleWithin(this._syncLobbyAvailabilityFromActiveGame(), 6000, false); } catch (e) {}
    
          try {
            this._bindInviteListener();
          } catch (e) {}
    
          try {
            const ref = db.ref("players");
            if (this._lobbyPlayersRef && this._lobbyPlayersCb) {
              try {
                this._lobbyPlayersRef.off("value", this._lobbyPlayersCb);
              } catch (e) {}
            }
            this._lobbyPlayersRef = ref;
    
            const cb = (snap) => {
              if (!isCurrent()) return;
              try {
              playersLoaded = true;
              markDataReceived();
              this._lobbyPlayersLastSnap = snap || null;
              const all = snap && snap.val ? snap.val() : null;
              const rows = [];
    
              const now = nowTs();
    
              if (all) {
                for (const [uid, p] of Object.entries(all)) {
                  if (!p) continue;
                  const isSelf = uid === this.myUid;
                  const ts = Number(p.updatedAt || 0);
                  if (!isPresenceFresh(ts, PRESENCE_LIST_TTL_MS)) {
                    if (!isSelf) continue;
                  }
    
                  const nick = (p.nickname || "").trim() || defaultNick(uid);
                  const st = p.status || "available";
                  const role = (p.role || "").trim();
                  const effectiveRole =
                    role || (st === "inPvP" ? "player" : st === "spectating" ? "spectator" : "");
    
                  const stLabel =
                    st === "available"
                      ? window.I18N.translateArgs("online.status.available")
                      : st === "inPvP" || st === "spectating"
                        ? window.I18N.translateArgs("online.status.inPvP")
                        : st;
    
                  const roomId = (p.roomId || "").trim();
                  const roomListRoomId = this._lobbyActivePlayerRooms && this._lobbyActivePlayerRooms[uid]
                    ? String(this._lobbyActivePlayerRooms[uid])
                    : "";
                  const inMatchAsPlayer =
                    (effectiveRole === "player" && !!roomId) ||
                    (st === "inPvP" && effectiveRole === "player") ||
                    !!roomListRoomId;
                  const acceptsInvites = playerAcceptsInvites(p);
                  const canInvite = !inMatchAsPlayer && !isSelf && acceptsInvites;
                  const displayStatus = inMatchAsPlayer ? "inPvP" : st;
                  const displayStatusLabel = inMatchAsPlayer ? window.I18N.translateArgs("online.status.inPvP") : stLabel;
    
                  rows.push({ uid, nick, st: displayStatus, stLabel: displayStatusLabel, canInvite, acceptsInvites, icon: p.icon, registered: p.registered !== false, isSelf });
                }
              }
    
              rows.sort((a, b) => a.nick.localeCompare(b.nick));
              let guestIndex = 0;
              rows.forEach((r) => {
                if (r.registered === false) {
                  r.icon = guestListIconByIndex(guestIndex);
                  guestIndex += 1;
                } else {
                  r.icon = iconSrcForPage(r.icon);
                }
              });
    
              if (!playersEl) return;
              if (!rows.length) {
                playersEl.innerHTML = `<div class="z-empty">${window.I18N.translateArgs("lobby.emptyPlayers")}</div>`;
                return;
              }
    
              playersEl.innerHTML = rows
                .map((r) => {
                  const playerStatusClass = r.st === "available"
                    ? "is-available"
                    : (r.st === "inPvP" ? "is-online" : "is-no-invites");
                  const statusMarkup = `<span class="z-player-status ${playerStatusClass}">${escapeHtml(r.stLabel)}</span>`;
                  if (r.isSelf) {
                    return `
                      <div class="z-row z-player-row ${playerStatusClass} is-self" data-uid="${r.uid}">
                        <div class="z-row-main">
                          <div class="z-row-title"><img class="z-avatar" src="${r.icon}" alt="" /><span class="z-player-name">${escapeHtml(r.nick)}</span>${statusMarkup}</div>
                        </div>
                        <div class="z-row-actions">
                          <span class="z-self">${window.I18N.translateArgs("players.you")}</span>
                        </div>
                      </div>
                    `;
                  }

                  const dis = r.canInvite ? "" : 'disabled aria-disabled="true"';
                  const inviteButtonClass = r.canInvite
                    ? "btn small ok z-invite-btn is-invite-active"
                    : "btn small z-invite-btn is-invite-disabled";
                  const title = r.canInvite ? "" : `title="${window.I18N.translateArgs(r.st === "inPvP" ? "lobby.inviteDisabled" : "lobby.invitesDisabled")}"`;
                  const inviteLabel = window.I18N.translateArgs("actions.invite");
                  return `
                    <div class="z-row z-player-row ${playerStatusClass}" data-uid="${r.uid}">
                      <div class="z-row-main">
                        <div class="z-row-title"><img class="z-avatar" src="${r.icon}" alt="" /><span class="z-player-name">${escapeHtml(r.nick)}</span>${statusMarkup}</div>
                      </div>
                      <div class="z-row-actions">
                        <button class="${inviteButtonClass}" data-action="invite" ${dis} ${title}>
                          <span>${inviteLabel}</span>
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join("");
    
              Array.from(playersEl.querySelectorAll("button[data-action='invite']")).forEach((btn) => {
                btn.addEventListener("click", async (ev) => {
                  const row = ev.currentTarget.closest(".z-row");
                  const uid = row ? row.getAttribute("data-uid") : "";
                  if (!uid) return;
                  try {
                    await this._createGame(uid);
                  } catch (e) {
                    try { Logger.capture(e, { ctx: "invite.create.click", opponentUid: uid }); } catch (_) {}
                    try { showOnlineNotice(window.I18N.translateArgs("online.inviteSendFail")); } catch (_) {}
                  }
                });
              });
              } catch (err) {
                playersLoaded = false;
                try { Logger.capture(err, { ctx: "lobby.players.callback" }); } catch (_) {}
                showLobbyFailure();
              }
            };

            this._lobbyPlayersCb = cb;
            ref.on("value", cb, async (err) => {
              if (!isCurrent()) return;
              playersLoaded = false;
              try { Logger.warn("lobby_players_read_failed", { code: String((err && err.code) || ""), message: String((err && err.message) || "") }); } catch (e) {}
              if (await recoverPermissionSession(err)) return;
              lobbyLoadFailed();
            });
          } catch (e) {
            lobbyLoadFailed();
          }
    
          try {
            const refG = db.ref("roomList").orderByChild("status").equalTo("active").limitToLast(50);
            if (this._lobbyRoomsRef && this._lobbyRoomsCb) {
              try {
                this._lobbyRoomsRef.off("value", this._lobbyRoomsCb);
              } catch (e) {}
            }
            this._lobbyRoomsRef = refG;
    
            const cbG = (snap) => {
              if (!isCurrent()) return;
              try {
              roomsLoaded = true;
              markDataReceived();
              const all = snap && snap.val ? snap.val() : null;
              const rooms = [];
    
              const activePlayerRooms = {};
              if (all) {
                for (const [gid, g] of Object.entries(all)) {
                  if (!g || g.status !== "active") continue;
                  if (this._isLobbyRoomStale(g)) {
                    try { this._sweepStaleLobbyRoom(gid, g); } catch (e) {}
                    continue;
                  }
                  const wuid = g.players && g.players.white ? g.players.white.uid || "" : "";
                  const buid = g.players && g.players.black ? g.players.black.uid || "" : "";
                  if (!wuid || !buid) continue;
                  activePlayerRooms[String(wuid)] = String(gid);
                  activePlayerRooms[String(buid)] = String(gid);
    
                  const name = (g.roomName || g.name || "").trim() || window.I18N.translateArgs("lobby.roomDefault");
                  const w = g.players && g.players.white ? displayPlayerName(g.players.white.uid, g.players.white.nickname) : "";
                  const b = g.players && g.players.black ? displayPlayerName(g.players.black.uid, g.players.black.nickname) : "";
                  const spectatorCount = Math.max(0, Math.min(3, Number(g.spectatorCount || 0) || 0));
                  const spectatorCountUpdatedAt = Number(g.spectatorCountUpdatedAt || 0) || 0;
                  const spectatorCountFresh = isPresenceFresh(spectatorCountUpdatedAt, SPECTATOR_COUNT_STALE_MS);
                  const visibility = normalizeRoomVisibility(g.visibility);
                  const reconnectGraceUntil = Number(g.reconnectGraceUntil || 0) || 0;
                  const reconnecting = g.reconnecting === true && reconnectGraceUntil > nowTs();
                  rooms.push({
                    gid, name, w, b, wuid, buid, visibility,
                    ownerOnly: g.ownerOnly === true || g.listed === false,
                    reconnecting,
                    reconnectGraceUntil,
                    createdAt: g.createdAt || g.acceptedAt || 0,
                    spectatorCount, spectatorCountUpdatedAt, spectatorCountFresh
                  });
                }
              }
              this._lobbyActivePlayerRooms = activePlayerRooms;
              try {
                if (this._lobbyPlayersLastSnap && this._lobbyPlayersCb) this._lobbyPlayersCb(this._lobbyPlayersLastSnap);
              } catch (e) {}
              rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    
              if (!roomsEl) return;
              if (!rooms.length) {
                roomsEl.innerHTML = `<div class="z-empty">${window.I18N.translateArgs("lobby.emptyRooms")}</div>`;
                return;
              }
    
              roomsEl.innerHTML = rooms
                .map((r) => {
                  const isMePlayer = this.myUid && (this.myUid === r.wuid || this.myUid === r.buid);
                  const joinBtn = isMePlayer
                    ? `<button class="btn small primary" data-action="join" data-gid="${r.gid}">
                         <img class="btn-ico" src="${ASSET_PREFIX}assets/icons/play.svg" alt="" aria-hidden="true" />
                         <span>${window.I18N.translateArgs("lobby.returnToMatch")}</span>
                       </button>`
                    : "";
                  const isPrivateRoom = r.visibility === ROOM_VISIBILITY_PRIVATE;
                  const spectatorFull = !isMePlayer && !isPrivateRoom && !!r.spectatorCountFresh && Number(r.spectatorCount || 0) >= 3;
                  const spectatorDisabled = spectatorFull || isPrivateRoom ? 'disabled aria-disabled="true"' : "";
                  const spectatorTitle = spectatorFull ? `title="${window.I18N.translateArgs("lobby.spectatorFull")}"` : isPrivateRoom ? `title="${window.I18N.translateArgs("lobby.privateRoom")}"` : "";
                  const spectatorLabel = isPrivateRoom ? window.I18N.translateArgs("lobby.privateRoom") : window.I18N.translateArgs("lobby.spectate");
                  const spectateBtn = !isMePlayer
                    ? `<button class="btn small secondary" data-action="spectate" data-gid="${r.gid}" ${spectatorDisabled} ${spectatorTitle}>
                         <img class="btn-ico" src="${ASSET_PREFIX}assets/icons/watch.svg" alt="" aria-hidden="true" />
                         <span>${spectatorLabel}${!isPrivateRoom ? ` (${Number(r.spectatorCount || 0)})` : ""}</span>
                       </button>`
                    : "";
                  const roomStateClass = r.reconnecting
                    ? "is-reconnecting"
                    : (r.ownerOnly ? "is-private" : "is-live");
                  const roomPlayers = [r.w, r.b]
                    .filter(Boolean)
                    .map((name) => escapeHtml(name))
                    .join(" · ");
                  const roomInline = roomPlayers
                    ? `<span class="z-row-inline-sub">• ${roomPlayers}</span>`
                    : "";
                  return `
                    <div class="z-row z-room-row ${roomStateClass}${r.ownerOnly ? " z-room-owner-only" : ""}${r.reconnecting ? " z-room-reconnecting" : ""}" data-gid="${r.gid}">
                      <div class="z-row-main">
                        <div class="z-row-title z-room-title"><span class="z-row-status-dot ${roomStateClass}" aria-hidden="true"></span><span>${window.I18N.translateArgs("lobby.roomLabel")} : </span><span>${escapeHtml(r.name)}</span>${roomInline}</div>
                      </div>
                      <div class="z-row-actions">
                        ${joinBtn || spectateBtn}
                      </div>
                    </div>
                  `;
                })
                .join("");
    
              Array.from(roomsEl.querySelectorAll("button[data-action='join']")).forEach((btn) => {
                btn.addEventListener("click", (ev) => {
                  const gid = ev.currentTarget.getAttribute("data-gid");
                  if (gid) this._goToGameAsPlayer(gid);
                });
              });
              Array.from(roomsEl.querySelectorAll("button[data-action='spectate']")).forEach((btn) => {
                btn.addEventListener("click", (ev) => {
                  if (ev.currentTarget.disabled) return;
                  const gid = ev.currentTarget.getAttribute("data-gid");
                  if (gid) this._goToGameAsSpectator(gid);
                });
              });
              } catch (err) {
                roomsLoaded = false;
                try { Logger.capture(err, { ctx: "lobby.rooms.callback" }); } catch (_) {}
                showLobbyFailure();
              }
            };

            this._lobbyRoomsCb = cbG;
            refG.on("value", cbG, async (err) => {
              if (!isCurrent()) return;
              roomsLoaded = false;
              try { Logger.warn("lobby_rooms_read_failed", { code: String((err && err.code) || ""), message: String((err && err.message) || "") }); } catch (e) {}
              if (await recoverPermissionSession(err)) return;
              lobbyLoadFailed();
            });
    
          } catch (e) {
            lobbyLoadFailed();
          }
        },

    _isCurrentUserPlayerInGame: function (g) {
          try {
            const uid = String(this.myUid || (auth && auth.currentUser && auth.currentUser.uid) || "").trim();
            if (!uid || !g || !g.players) return false;
            const wuid = String((g.players.white && g.players.white.uid) || "").trim();
            const buid = String((g.players.black && g.players.black.uid) || "").trim();
            return uid === wuid || uid === buid;
          } catch (e) {
            return false;
          }
        },

    _isCurrentAuthPlayerInGame: function (g) {
          try {
            const uid = requireAuthUid(this.myUid);
            if (!uid || !g || !g.players) return false;
            const wuid = String((g.players.white && g.players.white.uid) || "").trim();
            const buid = String((g.players.black && g.players.black.uid) || "").trim();
            return uid === wuid || uid === buid;
          } catch (e) {
            return false;
          }
        },

    _showUnavailableGameAndLeave: async function () {
          const silentSpectatorLeave = !!this._spectatorLeaving;
          try { this._clearPersistedActiveGame(); } catch (e) {}
          try { await this._setLobbyStatus("available"); } catch (e) {}
          if (!silentSpectatorLeave) {
            try { showOnlineNotice(window.I18N.translateArgs("online.errors.noGame")); } catch (e) {}
          }
          try {
            if (typeof location !== "undefined" && isGamePage()) {
              const back = (location.pathname || "").includes("/pages/") ? "./loby.html" : "pages/loby.html";
              location.href = back;
            }
          } catch (e) {}
        },

    _refreshStaleRoomBeforeEntry: async function (gameId) {
          const gid = String(gameId || "").trim();
          if (!gid || !db || !db.ref) return null;
          try {
            const roomSnap = await db.ref("roomList").child(gid).once("value");
            const room = roomSnap && roomSnap.val ? roomSnap.val() : null;
            if (room && this._isLobbyRoomStale && this._isLobbyRoomStale(room)) {
              try { await this._sweepStaleLobbyRoom(gid, room); } catch (e) {}
            }
          } catch (e) {}
          try {
            const s = await db.ref("games").child(gid).once("value");
            return s && s.val ? s.val() : null;
          } catch (e) {
            return null;
          }
        },

    _autoEnterFromUrl: async function () {
          if (!isGamePage()) return;
          try {
            const p = new URLSearchParams(location.search || "");
            const spectateId = (p.get("spectate") || "").trim();
            const gid = (p.get("gid") || "").trim();
            const gameId = spectateId || gid;
            if (!gameId) return;
            await this._enterGameFromId(gameId, !!spectateId);
          } catch (e) {}
        },

    _enterGameFromId: async function (gameId, forceSpectator) {
          const ok = await this.initPresence();
          if (!ok) {
            showOnlineNotice(window.I18N.translateArgs("status.onlineInitFail"));
            return;
          }
    
          let g = await this._refreshStaleRoomBeforeEntry(gameId);
          if (!g) {
            await this._showUnavailableGameAndLeave();
            return;
          }
    
          const statusText = String((g && g.status) || "").trim();
          if (statusText && statusText !== "active" && statusText !== "pending") {
            await this._showUnavailableGameAndLeave();
            return;
          }
    
          const wuid = g.players && g.players.white && g.players.white.uid ? String(g.players.white.uid) : "";
          const buid = g.players && g.players.black && g.players.black.uid ? String(g.players.black.uid) : "";
    
          const amPlayer = this.myUid && (String(this.myUid) === wuid || String(this.myUid) === buid);
          const asSpectator = !amPlayer;
    
          if (asSpectator) {
            if (statusText !== "active") {
              await this._showUnavailableGameAndLeave();
              return;
            }
            await this._startSpectator(gameId);
            return;
          }
    
          if (!g.acceptedAt || statusText !== "active") {
            showOnlineNotice(window.I18N.translateArgs("online.waitingAcceptance"));
            return;
          }
    
          if (String(this.myUid) === wuid) {
            await this._startInviterGame(gameId);
          } else {
            await this._joinGame(gameId);
          }
        },

    _startSpectator: async function (gameId) {
          const ok = await this.initPresence();
          if (!ok) return false;
    
          const registration = await this._registerSpectatorInRoom(gameId);
          if (!registration || !registration.ok) {
            const msg = registration && registration.reason === "full"
              ? window.I18N.translateArgs("lobby.spectatorFull")
              : window.I18N.translateArgs("online.errors.spectatorJoinFailed");
            showOnlineNotice(msg, { allowSpectator: true });
            this.isSpectator = false;
            this.isActive = false;
            this.mySide = null;
            this.gameId = null;
            this.gameRef = null;
            if (typeof document !== "undefined" && document.body) document.body.classList.remove("z-spectator");
            this._setOnlineButtonsState(false);
            if (typeof location !== "undefined" && isGamePage()) {
              const back = (location.pathname || "").includes("/pages/") ? "./loby.html" : "pages/loby.html";
              location.href = back;
            }
            return false;
          }
    
          this.isSpectator = true;
          this.isActive = true;
          this.mySide = 0;
          this.gameId = gameId;
          this.gameRef = db.ref("games").child(gameId);
    
          if (typeof document !== "undefined" && document.body) document.body.classList.add("z-spectator");
          this._setOnlineButtonsState(true);
    
          try {
            this._presenceStatus = "spectating";
            this._presenceRole = "spectator";
            this._presenceRoomId = gameId;
            await safePlayerWrite(this.statusRef, this.myUid, {
              status: "spectating",
              role: "spectator",
              roomId: gameId,
              nickname: this.myNick,
              updatedAt: nowTs(),
            });
          } catch (e) {
            handleDbError(e, "", { ctx: "presence.spectatorStatus" });
          }
    
          try {
            Game.settings.starter = "white";
            setupInitialBoard();
            try {
              Turn.start();
            } catch (e) {}
          } catch (e) {
            Logger.warn("spectator_board_setup_failed", { gameId, err: String(e && (e.message || e)) });
          }
    
          try {
            this._cleanupArmedFor = null;
          } catch (e) {}
          try {
            this._bindInviteListener();
          } catch (e) {}
          this._bindGameListeners();
          try {
            await this._initRoomComms();
          } catch (e) {
            handleDbError(e, "", { ctx: "rtc.initSpectator" });
          }
          try {
            this._persistActiveGame();
          } catch (e) {}
          return true;
        },
  });

  window.addEventListener("load", function () {
    try { Online._restoreInviteToggleFromCache(); } catch (_) {}
    try { Online._autoEnterFromUrl(); } catch (_) {}
    try { Online.initInvitesPassive(); } catch (_) {}
    if (isGamePage()) return;

    if (document.getElementById("roomsList") && document.getElementById("playersList")) {
      Online.initLobbyPage({ roomsListId: "roomsList", playersListId: "playersList" }).catch(function () {
        var msg = window.I18N.translateArgs("status.onlineInitFail", "تعذر تشغيل اللعب عبر الإنترنت الآن.");
        var playersEl = document.getElementById("playersList");
        var roomsEl = document.getElementById("roomsList");
        if (playersEl) playersEl.innerHTML = '<div class="z-empty">' + msg + '</div>';
        if (roomsEl) roomsEl.innerHTML = '<div class="z-empty">' + msg + '</div>';
      });
      return;
    }
  });

  // Mobile browsers frequently restore normal tabs from the back-forward cache while
  // private tabs start clean. Rebind Firebase only in the restored/stale normal tab.
  window.addEventListener("pageshow", function (event) {
    try {
      if (!event || !event.persisted) return;
      if (!document.getElementById("roomsList") || !document.getElementById("playersList")) return;
      try { if (firebase && firebase.database) firebase.database().goOnline(); } catch (_) {}
      setTimeout(function () {
        try { Online.initLobbyPage({ roomsListId: "roomsList", playersListId: "playersList" }); } catch (_) {}
      }, 80);
    } catch (_) {}
  }, { passive: true });

  document.addEventListener("visibilitychange", function () {
    try {
      if (document.visibilityState !== "visible") return;
      if (!document.getElementById("roomsList") || !document.getElementById("playersList")) return;
      const last = Number(Online._lobbyLastDataAt || 0);
      const stale = last > 0 && Date.now() - last > 90 * 1000;
      const failed = !!document.querySelector("#roomsList .z-load-error, #playersList .z-load-error");
      if (!stale && !failed) return;
      try { if (firebase && firebase.database) firebase.database().goOnline(); } catch (_) {}
      setTimeout(function () {
        try { Online.initLobbyPage({ roomsListId: "roomsList", playersListId: "playersList" }); } catch (_) {}
      }, 80);
    } catch (_) {}
  }, { passive: true });
})();
