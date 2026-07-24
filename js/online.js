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
    tryFinalizeTrainingOnExit,
    writeMigrationVersion
  } = S;

  window.__ZAMAT_ONLINE_FULL_LOADED__ = true;

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
            const want = String(uid || "").trim();
            const players = this._lastGameData && this._lastGameData.players ? this._lastGameData.players : null;
            if (want && players) {
              const whiteUid = players.white && players.white.uid ? String(players.white.uid) : "";
              const blackUid = players.black && players.black.uid ? String(players.black.uid) : "";
              if (want === blackUid) return this._resolveSlotDisplayName("top", fallback);
              if (want === whiteUid) return this._resolveSlotDisplayName("bot", fallback);
            }
          } catch (e) {}
          try {
            if (uid && this.myUid && String(uid) === String(this.myUid)) {
              return window.I18N.translateArgs("players.you") || "You";
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

    _setButtonsVisualDisabled: function (on) {
          const disableIds = ["btnHint", "btnExportHuman"];
          disableIds.forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (on) {
              if (el.dataset._oldDisplay == null) el.dataset._oldDisplay = el.style.display || "";
              el.style.display = "none";
            } else {
              el.style.display = el.dataset._oldDisplay || "";
            }
          });
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

    _emitRecoverySignal: function (action, reason) {
          try {
            if (!this.isActive || !this.gameRef) return false;
            const now = nowTs();
            const payload = {
              nonce: `${String(this.myUid || "anon")}:${now}:${Math.random().toString(36).slice(2, 8)}`,
              action: String(action || "sync"),
              reason: String(reason || "manual"),
              byUid: this.myUid || null,
              ts: now,
            };
            return safeDbWriteNoAwait("set", this.gameRef.child("recoverySignal"), payload, {
              uid: this.myUid,
              path: "/games/" + (this.gameId || "") + "/recoverySignal",
              ctx: "game.recoverySignal",
              suppressGlobalDenied: true,
            });
          } catch (e) {}
          return false;
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
              g.status = "ended";
              g.endedAt = ts;
              g.endedReason = "opponent_absent";
              g.winner = this.mySide;
    
              g.log = Array.isArray(g.log) ? g.log : [];
              normalizeLogArrayForWrite(g.log);
    
              const who = this.myNick || window.I18N.translateArgs("players.player");
              g.log.push({
                ts,
                type: "ended_absent",
                text: encodeSharedLogText({
                  kind: "i18n",
                  key: "online.matchEndedByPlayer",
                  vars: { player: who, reason: window.I18N.translateArgs("online.matchEndedReason.absent") },
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
              try {
                await this._removeRoomListEntry(this.gameId);
              } catch (e) {}
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
            try {
              await this.syncNow();
            } catch (e) {}
            return false;
          }
    
          try {
            await this._notifyMatchEndWatchers(this.gameId, "opponent_absent", this.myNick);
          } catch (e) {}
          try {
            if (this.gameId) this._schedulePurgeRoom(this.gameId, "opponent_absent", ROOM_ENDED_PURGE_DELAY_MS);
          } catch (e) {}
          this._enterPostMatch({ reason: "opponent_absent", winner: this.mySide });
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
              openingExchangeFourthChoice: null,
              opening: { starter: BOT, exchangeFourthChoice: null },
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
            this._lastTrainLoggedMoveIndex = 0;
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
            this._cancelRoomPurgeOnDisconnect();
          } catch (e) {}
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
              <div style="font-weight:700;">${window.I18N.translateArgs("online.playersTitle")}</div>
              <div id="playersList" style="display:flex; flex-direction:column; gap:8px;"></div>
            </div>
          `;
    
          Modal.open({
            title: window.I18N.translateArgs("online.playersTitle"),
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
                  : st === "available"
                    ? window.I18N.translateArgs("online.status.vsComputer")
                    : st === "spectating"
                      ? window.I18N.translateArgs("online.status.spectating")
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
                                      : "pvc";
                            const roomId = p && p.roomId ? String(p.roomId).trim() : "";
                            const inMatchAsPlayer = role === "player" && !!roomId;
                            return inMatchAsPlayer || !acceptsInvites ? "disabled" : "";
                          })()}>${window.I18N.translateArgs(acceptsInvites ? "actions.invite" : "lobby.noInvites")}</button>
    
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

    _createGame: async function (opponentUid) {
          const ok = await this.initPresence();
          if (!ok) {
            showOnlineNotice(window.I18N.translateArgs("status.onlineInitFail"));
            return;
          }
    
          try {
            const activeRoomId = await this._getActivePlayerRoomId();
            if (activeRoomId) {
              showOnlineNotice(window.I18N.translateArgs("online.invites.inActiveMatch"));
              return;
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
            state: {
              snapshot: initSnap,
              deferredPromotion: null,
            },
            states: {
              0: { snapshot: initSnap, deferredPromotion: null },
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
            handleDbError(err, window.I18N.translateArgs("online.inviteSendFail"), { ctx: "invite.send" });
            return;
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
            this._cancelRoomPurgeOnDisconnect();
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
          try {
            this._applyUiHold(true);
          } catch (e) {}
          try {
          } catch (e) {}
          try {
            this._setButtonsVisualDisabled(!!on);
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
    
          ["btnEndKill", "btnUndo", "btnSoufla", "btnEndLocalMatch"].forEach((id) => {
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
          const btnResume = document.getElementById("btnResume");
          const btnNew = document.getElementById("btnNew");
          const btnSave = document.getElementById("btnSave");
    
          if (on) {
            if (btnResume) btnResume.style.display = "none";
            if (btnChat) btnChat.style.display = "inline-flex";
    
            if (btnNew) btnNew.style.display = "none";
            if (btnSave) btnSave.style.display = "none";
          } else {
            if (btnChat) {
              btnChat.style.display = "none";
              try {
                delete btnChat.dataset.badge;
              } catch (e) {}
            }
            if (btnResume) btnResume.style.display = "";
    
            if (btnNew) btnNew.style.display = "";
            if (btnSave) btnSave.style.display = "";
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
          try {
            this._releaseUiHoldSoon();
          } catch (e) {}
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
    
          try {
            await tryFinalizeTrainingOnExit("abort", 900);
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
          showOnlineNotice(window.I18N.translateArgs("buttons.endOnline"));
        },

    _clearPostMatchSession: function () {
          try {
            SessionGame && SessionGame.clear && SessionGame.clear();
          } catch (e) {}
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

    _enterPostMatch: function (meta) {
          try {
            this._clearPostMatchSession();
          } catch (e) {}
          this._inPostMatch = true;
    
          if (this._postMatchShown) return;
          this._postMatchShown = true;
    
          const reason = (meta && (meta.reason || meta.endedReason)) || null;
          const endedBy = (meta && (meta.endedBy || meta.ended_by)) || null;
    
          try {
            const gid = this.gameId;
            const gd = this._lastGameData || null;
            if (gid && gd && gd.status && gd.status !== "active") {
              try {
                this._armRoomCleanupAfterEnd(gid, reason || gd.endedReason || gd.status, gd);
              } catch (e) {}
            }
          } catch (e) {}
          const byUid = (meta && meta.byUid) || (endedBy && endedBy.uid) || null;
          let byNick = (meta && meta.byNick) || (endedBy && endedBy.nickname) || "";
          try {
            byNick = String(byNick || "").trim();
          } catch (e) {}
          if (!byNick) byNick = window.I18N.translateArgs("online.opponent", "Opponent");
    
          let winner = null;
          try {
            const g = this._lastGameData;
            if (g && typeof g.winner !== "undefined") winner = g.winner;
          } catch (e) {}
          try {
            if (winner == null && typeof Game !== "undefined" && typeof Game.winner !== "undefined")
              winner = Game.winner;
          } catch (e) {}
          try {
            if (winner === 0) winner = null;
          } catch (e) {}
    
          try {
            const rr = String(reason || "").trim();
            if (rr === "ended_by_player") {
              try {
                tryFinalizeTrainingOnExit("abort", 900);
              } catch (e) {}
            } else if (rr === "opponent_absent") {
              try {
                tryFinalizeTrainingOnExit("disconnect", 900);
              } catch (e) {}
            }
          } catch (e) {}
    
          if (reason === "ended_by_player") {
            if (byUid && this.myUid && byUid === this.myUid) {
              try {
                showOnlineNotice(window.I18N.translateArgs("buttons.endOnline"));
              } catch (e) {}
              return;
            }
    
            const title = window.I18N.translateArgs("online.pvpEndTitle", window.I18N.translateArgs("modals.gameOver.drawTitle"));
            const body = formatTpl(window.I18N.translateArgs("online.matchEndedByPlayer", "Player {player} ended the match{reason}."), {
              player: byNick,
              reason: "",
            });
    
            const go = async () => {
              try {
                await this.exitToMode();
              } catch (e) {}
            };
    
            try {
              if (typeof Modal !== "undefined" && Modal && typeof Modal.alert === "function") {
                Modal.alert({
                  title,
                  text: body,
                  okLabel: window.I18N.translateArgs("actions.ok", "OK"),
                  okClassName: "ok",
                  allowSpectator: true,
                  onClick: go,
                  onClose: () => {
                    go();
                  },
                });
                return;
              }
            } catch (e) {}
    
            try {
              showOnlineNotice(body);
            } catch (e) {}
            try {
              go();
            } catch (e) {}
            return;
          }
    
          if (!this._isNaturalOnlineEndReason(reason)) {
            try {
              const msg = reason === "opponent_absent"
                ? formatTpl(window.I18N.translateArgs("online.matchEndedByPlayer"), {
                    player: byNick || this.myNick || window.I18N.translateArgs("players.player"),
                    reason: window.I18N.translateArgs("online.matchEndedReason.absent"),
                  })
                : window.I18N.translateArgs("online.errors.noGame");
              showOnlineNotice(msg, { allowSpectator: true });
            } catch (e) {}
            try {
              setTimeout(() => {
                try { this.exitToMode(); } catch (e) {}
              }, 900);
            } catch (e) {}
            return;
          }
    
          try {
            if (typeof UI !== "undefined" && UI && typeof UI.showGameOverModal === "function") {
              UI.showGameOverModal(winner == null ? null : winner);
              return;
            }
          } catch (e) {}
    
          try {
            showOnlineNotice(window.I18N.translateArgs("modals.gameOver.drawTitle"));
          } catch (e) {}
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

    _teardownOnlineSubscriptions: function () {
          try { this._teardownRoomComms(); } catch (e) {}
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
          try { this._teardownGamePresence(); } catch (e) {}
        },

    _resetOnlineRuntimeState: function () {
          this._lastTrainLoggedMoveIndex = 0;
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
    
          this._armRoomPurgeOnDisconnect(gid, reason);
          const purgeDelay = String(reason || "") === "disconnect_wait" ? ROOM_ABANDONED_CLEANUP_MS : ROOM_ENDED_PURGE_DELAY_MS;
          this._schedulePurgeRoom(gid, reason || "postmatch", purgeDelay);
        },

    _armRoomPurgeOnDisconnect: function (gameId, reason) {
          const gid = String(gameId || "").trim();
          if (!gid || this.isSpectator) return;
          if (typeof firebase === "undefined" || !firebase || !firebase.database) return;
          if (this._purgeOnDisconnectGameId === gid) return;
    
          try {
            const rootRef = firebase.database().ref();
            rootRef.onDisconnect().update(this._buildRoomDeleteUpdates(gid));
            this._purgeOnDisconnectGameId = gid;
          } catch (e) {
            Logger.warn("room_purge_ondisconnect_failed", { gameId: gid, reason, err: String(e && (e.message || e)) });
          }
        },

    _cancelRoomPurgeOnDisconnect: function () {
          if (typeof firebase === "undefined" || !firebase || !firebase.database) {
            this._purgeOnDisconnectGameId = null;
            return;
          }
          try {
            const cancel = firebase.database().ref().onDisconnect().cancel();
            if (cancel && typeof cancel.catch === "function") {
              cancel.catch((e) => Logger.warn("room_purge_ondisconnect_cancel_failed", { err: String(e && (e.message || e)) }));
            }
          } catch (e) {
            Logger.warn("room_purge_ondisconnect_cancel_failed", { err: String(e && (e.message || e)) });
          }
          this._purgeOnDisconnectGameId = null;
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
                  try {
                    tryFinalizeTrainingOnExit("disconnect", 900);
                  } catch (e) {}
                  const title = window.I18N.translateArgs("online.pvpEndTitle");
                  const body = window.I18N.translateArgs("online.ended.remoteOrCleaned");
    
                  const go = async () => {
                    try {
                      this._clearPersistedActiveGame();
                    } catch (e) {}
                    try {
                      await this.exitToMode();
                    } catch (e) {
                      try {
                        const inPages = (location.pathname || "").includes("/pages/");
                        location.replace("https://ouglsoft.com/dhamet/pages/mode.html");
                      } catch (_) {}
                    }
                  };
    
                  if (typeof Modal !== "undefined" && Modal && typeof Modal.alert === "function") {
                    try { setTimeout(go, 1800); } catch (e) {}
                    Modal.alert({
                      title,
                      body: `<div>${body}</div>`,
                      okLabel: window.I18N.translateArgs("buttons.home"),
                      okClassName: "ok",
                      allowSpectator: true,
                      onClick: go,
                      onClose: () => {
                        go();
                      },
                    });
                  } else {
                    try {
                      showOnlineNotice(body);
                    } catch (e) {}
                    go();
                  }
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
                Game.availableSouflaForHuman = plainToSoufla(data.soufla.pending);
              } else {
                Game.availableSouflaForHuman = null;
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
                const dp =
                  (data.state && data.state.deferredPromotion) ||
                  (data.states &&
                    data.ply != null &&
                    data.states[data.ply] &&
                    data.states[data.ply].deferredPromotion) ||
                  null;
    
                const patched = Object.assign({}, data, {
                  state: Object.assign({}, data.state || {}, {
                    snapshot: stateSnap,
                    deferredPromotion: dp,
                  }),
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

    _applyRemoteState: function (data) {
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
    
            try {
              this._maybeRecordOpponentMoveForTraining(data);
            } catch (e) {}
    
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
                    Visual.setUndoMovePath(fr, p);
                  } else if (fr != null && p && p.length && typeof Visual.setUndoMove === "function") {
                    Visual.setUndoMove(fr, p[p.length - 1]);
                  } else {
                    try {
                      Visual.setUndoMove && Visual.setUndoMove(null, null);
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
              Game.deferredPromotion = (data.state && data.state.deferredPromotion) || null;
            } catch (e) {}
    
            try {
              if (!__skipFx && data.state && Array.isArray(data.state.capturedOrder)) {
                try {
                  if (
                    typeof Visual !== "undefined" &&
                    Visual &&
                    typeof Visual.setCapturedOrder === "function"
                  )
                    Visual.setCapturedOrder(data.state.capturedOrder);
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
            } catch (e) {}
    
            try {
              const lm = data.lastMove;
              const mi = lm && typeof lm.moveIndex === "number" ? lm.moveIndex : 0;
              if (mi && mi > (this._lastSeenMoveModal || 0)) {
                this._lastSeenMoveModal = mi;
                if (lm.kind === "soufla" && lm.decision) {
                  try {
                    if (
                      typeof TrainRecorder !== "undefined" &&
                      TrainRecorder &&
                      typeof TrainRecorder.rollbackLastMoveBoundary === "function"
                    ) {
                      if (mi && mi > 0 && !this._lastTrainRollbackEventMI_sf)
                        this._lastTrainRollbackEventMI_sf = 0;
                      if (!mi || mi <= (this._lastTrainRollbackEventMI_sf || 0)) {
                      } else {
                        this._lastTrainRollbackEventMI_sf = mi;
                        const undoneMI = (mi | 0) - 1;
                        try {
                          TrainRecorder.rollbackLastMoveBoundary({
                            type: "ext_move",
                            moveIndex: undoneMI,
                          });
                        } catch (e) {}
                      }
                    }
                  } catch (e) {}
                  this._showSouflaModalFromLastMove(lm);
                } else if (lm.kind === "undo") {
                  try {
                    if (
                      typeof TrainRecorder !== "undefined" &&
                      TrainRecorder &&
                      typeof TrainRecorder.rollbackLastMoveBoundary === "function"
                    ) {
                      if (mi && mi > 0 && !this._lastTrainRollbackEventMI_undo)
                        this._lastTrainRollbackEventMI_undo = 0;
                      if (!mi || mi <= (this._lastTrainRollbackEventMI_undo || 0)) {
                      } else {
                        this._lastTrainRollbackEventMI_undo = mi;
                        const undoneMI = (mi | 0) - 1;
                        let ok = false;
                        try {
                          ok = TrainRecorder.rollbackLastMoveBoundary({
                            type: "ext_move",
                            moveIndex: undoneMI,
                          });
                        } catch (e) {}
                        if (!ok) {
                          try {
                            TrainRecorder.rollbackLastMoveBoundary();
                          } catch (e) {}
                        }
                      }
                    }
                  } catch (e) {}
                  showOnlineNotice(window.I18N.translateArgs("undo.applied"));
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
              const dp =
                (data.state && data.state.deferredPromotion) ||
                (data.states &&
                  data.ply != null &&
                  data.states[data.ply] &&
                  data.states[data.ply].deferredPromotion) ||
                null;
    
              const patched = Object.assign({}, data, {
                state: Object.assign({}, data.state || {}, {
                  snapshot: stateSnap,
                  deferredPromotion: dp,
                }),
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
            try {
              if (cfg.emitSignal) this._emitRecoverySignal("sync", "manual");
            } catch (e) {}
            return true;
          } catch (e) {
            showOnlineNotice(window.I18N.translateArgs("online.syncFail"));
            return false;
          }
        },

    _removeSpectatorRegistration: async function (gameId, uid) {
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
          return Object.keys(value).filter((k) => value[k]).length;
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
              const existing = cur[uid] && typeof cur[uid] === "object" ? cur[uid] : null;
              if (!existing && this._countSpectatorsFromValue(cur) >= 3) return;
    
              cur[uid] = {
                uid,
                nickname: nick,
                joinedAt: Number((existing && existing.joinedAt) || fallbackJoinedAt) || nowTs(),
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
              this._spectatorRef.onDisconnect().remove();
            } catch (disconnectErr) {
              Logger.warn("spectator_ondisconnect_failed", { gameId: gid, err: String(disconnectErr && (disconnectErr.message || disconnectErr)) });
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
                  UI.status(window.I18N.translateArgs("online.offline"));
                } catch (e) {}
              }
            };
            try {
              this._gameConnInfoRef.on("value", this._gameConnInfoHandler);
            } catch (e) {}
          }
        },

    _teardownGamePresence: function () {
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
    
          try {
            if (this.presenceRef) this.presenceRef.remove();
          } catch (e) {}
          this.presenceRef = null;
          this._gamePresenceJoinedAt = 0;
          try {
            this._stopMoveCommitWatchdog();
          } catch (e) {}
    
          this._oppOfflineSince = null;
          this._selfOfflineSince = null;
          this._oppLeftModalShown = false;
          try {
            this._oppOnline = false;
            this._selfConnected = true;
            this._updatePresenceUi();
          } catch (e) {}
          this._spectatorRef = null;
          this._spectatorJoinedAt = 0;
        },

    refreshPvpControls: function () {
          if (!this.isActive) return;
    
          const btnSpk = document.getElementById("btnSpk");
          const btnMic = document.getElementById("btnMic");
          const btnChat = document.getElementById("btnChat");
          const spectatorHiddenIds = ["btnEndKill", "btnUndo", "btnSoufla", "btnSync", "btnEndOnline", "btnEndLocalMatch", "btnNew", "btnSave", "btnResume", "btnSpk", "btnMic"];
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
            setBtn(btnChat, "chat.svg", window.I18N.translateArgs("pvp.chat.open"));
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
                const fallback = String((m && m.fromNick) || "").trim() || window.I18N.translateArgs("online.player");
                const base = this._displayNameForGameUid(m && m.fromUid, fallback) || fallback;
                return `${base} (${_chatRoleLabel(_chatMessageRole(m))})`;
              } catch (e) {
                return String((m && m.fromNick) || "").trim() || window.I18N.translateArgs("online.player");
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
            send.textContent = window.I18N.translateArgs("pvp.chat.send");
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
    
                const pruneAt = Date.now();
                if (!this._chat.lastPruneAt || pruneAt - this._chat.lastPruneAt > 30000) {
                  this._chat.lastPruneAt = pruneAt;
                  this._pruneChatMessages(200);
                }
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
            try {
              await this._chatMyReadRef.set({
                lastReadTs: ts,
                updatedAt: nowTs(),
              });
            } catch (e) {}
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

    _teardownRoomComms: function () {
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
            this._voiceLeave();
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

    _voiceShowFailureNotice: function () {
          try {
            showOnlineNotice(
              window.I18N.translateArgs(
                "pvp.voice.failedBody",
                "تعذر تشغيل الدردشة الصوتية. تحقق من إذن الميكروفون ثم أعد المحاولة.",
              ),
              {
                title: window.I18N.translateArgs("pvp.voice.failedTitle", "فشل الدردشة الصوتية"),
                allowSpectator: true,
              },
            );
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
          if (this._voice.enabled) return true;
    
          let authReady = false;
          try {
            authReady = await ensureAuthReady();
          } catch (e) {}
          if (!authReady || !requireAuthUid(this.myUid)) {
            this._voiceShowFailureNotice();
            return false;
          }
    
          let acquiredLocalStream = false;
          if (!opts.noMicPrompt) {
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
              this._voiceShowFailureNotice();
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
            } else {
              try {
                if (this._voice) this._voice.writeDenied = true;
              } catch (e) {}
              if (acquiredLocalStream) this._voiceReleaseLocalStream();
              this._voiceShowFailureNotice();
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
            this._voiceShowFailureNotice();
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

    _voiceLeave: function () {
          try {
            if (!this._voice) return;
            this._voice.enabled = false;
    
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
    
            try {
              this._voiceParticipantsRef && this._voiceParticipantsRef.child(this.myUid).remove();
            } catch (e) {}
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

    _voiceClearReconnect: function (otherUid) {
          try {
            if (!this._voice || !this._voice.reconnectTimers) return;
            const timer = this._voice.reconnectTimers.get(otherUid);
            if (timer) clearTimeout(timer);
          } catch (e) {}
          try {
            if (this._voice && this._voice.reconnectTimers) this._voice.reconnectTimers.delete(otherUid);
          } catch (e) {}
        },

    _voiceScheduleReconnect: function (otherUid, reason) {
          try {
            if (!otherUid || !this._voice || !this._voice.enabled || this.isSpectator) return;
            this._voice.reconnectTimers = this._voice.reconnectTimers || new Map();
            if (this._voice.reconnectTimers.has(otherUid)) return;
            const delay = reason === "failed" ? 350 : 1500;
            const timer = setTimeout(async () => {
              try {
                this._voiceClearReconnect(otherUid);
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
            const arr = Array.isArray(logArr) ? logArr : [];
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
                const msg = window.I18N.translateArgs(dec.key, dec.vars && typeof dec.vars === "object" ? dec.vars : {});
                msgEl.textContent = (dec.actor ? String(dec.actor) : window.I18N.translateArgs("players.player")) + ": " + msg;
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

    _showSouflaModalFromLastMove: function (lm) {
          try {
            const mySide = this.mySide;
            const by = lm.by;
            const decision = lm.decision;
            const meta = lm.souflaMeta || {};
            const offenderIdx = decision.offenderIdx != null ? decision.offenderIdx : meta.offenderIdx;
    
            const Lmax = meta.longestGlobal != null ? meta.longestGlobal : 0;
            const startedFrom = meta.startedFrom != null ? meta.startedFrom : null;
            const lastPieceIdx = meta.lastPieceIdx != null ? meta.lastPieceIdx : null;
    
            const title = window.I18N.translateArgs("modals.soufla.header");
    
            if (mySide === by) {
              const body = document.createElement("div");
              body.innerHTML = `
                <div style="font-weight:700;margin-bottom:6px;">${window.I18N.translateArgs("soufla.applied.self")}</div>
                <div class="muted">${
                  decision.kind === "remove" ? window.I18N.translateArgs("soufla.applied.remove") : window.I18N.translateArgs("soufla.applied.force")
                }</div>
              `;
              Modal.alert({
                title,
                body,
                okLabel: window.I18N.translateArgs("actions.close"),
              });
              return;
            }
    
            const body = document.createElement("div");
            body.className = "soufla-summary";
    
            const fmtCell = (idx) =>
              idx != null ? (typeof rcStr === "function" ? rcStr(idx) : "?") : "?";
    
            const offenderCell = fmtCell(offenderIdx);
            const undoFrom =
              lastPieceIdx != null && startedFrom != null && lastPieceIdx !== startedFrom
                ? fmtCell(lastPieceIdx)
                : null;
            const undoTo =
              lastPieceIdx != null && startedFrom != null && lastPieceIdx !== startedFrom
                ? fmtCell(startedFrom)
                : null;
    
            const parts = [];
            parts.push(
              `<div style="font-weight:900;margin-bottom:6px;">${window.I18N.translateArgs("soufla.summary.title")}</div>`,
            );
            parts.push(`<div>${window.I18N.translateArgs("soufla.summary.reason")}</div>`);
            parts.push(
              `<div style="margin-top:10px;font-weight:800;">${window.I18N.translateArgs("soufla.summary.penaltyTitle")}</div>`,
            );
    
            if (decision.kind === "force") {
              const p = Array.isArray(decision.path) ? decision.path.slice() : [];
              const toIdx = p.length ? p[p.length - 1] : offenderIdx;
              const len = p.length || 0;
    
              parts.push(
                `<div>${window.I18N.translateArgs("soufla.summary.force", { from: offenderCell, to: fmtCell(toIdx), len })}</div>`,
              );
    
              if (undoFrom && undoTo) {
                parts.push(
                  `<div class="muted" style="margin-top:8px;">${window.I18N.translateArgs("soufla.summary.undo", { from: undoFrom, to: undoTo })}</div>`,
                );
              }
            } else {
              parts.push(`<div>${window.I18N.translateArgs("soufla.summary.remove", { cell: offenderCell })}</div>`);
    
              if (undoFrom && undoTo) {
                parts.push(
                  `<div class="muted" style="margin-top:8px;">${window.I18N.translateArgs("soufla.summary.undo", { from: undoFrom, to: undoTo })}</div>`,
                );
              }
            }
    
            body.innerHTML = parts.join("");
    
            Modal.alert({
              title,
              body,
              okLabel: window.I18N.translateArgs("actions.close"),
            });
          } catch (e) {}
        },

    _maybeRecordOpponentMoveForTraining: function (data) {
          try {
            if (typeof TrainRecorder === "undefined" || !TrainRecorder) return;
            if (typeof TrainRecorder.recordExternalDecision !== "function") return;
            if (typeof TrainRecorder.captureStateForTraining !== "function") return;
    
            if (typeof Game === "undefined" || !Game) return;
            if (typeof cloneBoard !== "function") return;
            if (typeof applyMoveSim !== "function") return;
            if (typeof isSquareCapturableBy !== "function") return;
            if (typeof valueAt !== "function" || typeof pieceKind !== "function") return;
            if (typeof rcStr !== "function") return;
            if (typeof N_CELLS !== "number" || typeof ACTION_ENDCHAIN !== "number") return;
            if (typeof MAN !== "number" || typeof KING !== "number") return;
    
            const lm = data && data.lastMove ? data.lastMove : null;
            if (!lm || lm.kind !== "move") return;
    
            try {
              if (data && data.soufla && data.soufla.pending) return;
            } catch (e) {}
    
            const mi = Number(lm.moveIndex ?? data.moveIndex ?? 0) || 0;
            if (!mi) return;
    
            const by = typeof lm.by === "number" ? lm.by | 0 : 0;
            if (!by || (this.mySide != null && by === (this.mySide | 0))) return;
            if (mi <= (this._lastTrainLoggedMoveIndex || 0)) return;
    
            const ply = (lm.ply != null ? Number(lm.ply) : Number(data.ply)) || 0;
            const prePly = ply - 1;
            if (prePly < 0) return;
    
            const states = data.states || null;
            const preState = states && states[String(prePly)] ? states[String(prePly)] : null;
            const preSnap = preState && preState.snapshot ? preState.snapshot : null;
            if (!preSnap || !preSnap.board) return;
    
            const from0 = Number(lm.from);
            if (!Number.isFinite(from0)) return;
    
            let path = [];
            if (Array.isArray(lm.path) && lm.path.length) path = lm.path.slice();
            else if (Number.isFinite(lm.to)) path = [Number(lm.to)];
            if (!path.length) return;
    
            const simBoard = cloneBoard(preSnap.board);
    
            try {
              if (TrainRecorder && typeof TrainRecorder.beginMoveBoundary === "function")
                TrainRecorder.beginMoveBoundary({ type: "ext_move", moveIndex: mi, by });
            } catch (e) {}
    
            const savedBoard = Game.board;
            const savedPlayer = Game.player;
            const savedInChain = Game.inChain;
            const savedChainPos = Game.chainPos;
    
            let anyCap = false;
    
            try {
              for (let i = 0; i < path.length; i++) {
                const stepFrom = i === 0 ? from0 : Number(path[i - 1]);
                const stepTo = Number(path[i]);
                if (!Number.isFinite(stepFrom) || !Number.isFinite(stepTo)) continue;
    
                const preChainPosRaw = Number(preSnap.chainPos);
                const preChainPos =
                  Number.isFinite(preChainPosRaw) && preChainPosRaw >= 0 ? preChainPosRaw | 0 : null;
    
                Game.board = simBoard;
                Game.player = by;
                Game.inChain = i > 0 ? true : !!preSnap.inChain;
                Game.chainPos = i > 0 ? stepFrom | 0 : preChainPos;
    
                const st = TrainRecorder.captureStateForTraining();
                if (!st) break;
    
                const action = (stepFrom | 0) * N_CELLS + (stepTo | 0);
    
                const beforeV = valueAt(stepFrom | 0);
                const beforeKind = pieceKind(beforeV);
                const res = applyMoveSim(stepFrom | 0, stepTo | 0);
                const cap = res && res.isCap ? 1 : 0;
                if (cap) anyCap = true;
    
                const afterV = valueAt(stepTo | 0);
                const afterKind = pieceKind(afterV);
                const crown = beforeKind === MAN && afterKind === KING ? 1 : 0;
    
                let trap = 0;
                try {
                  trap = isSquareCapturableBy(-by, stepTo | 0) ? 1 : 0;
                } catch (e) {}
    
                try {
                  TrainRecorder.recordExternalDecision({
                    state: st,
                    action,
                    actor: by,
                    cap,
                    crown,
                    trap,
                    fromStr: rcStr(stepFrom | 0),
                    toStr: rcStr(stepTo | 0),
                  });
                } catch (e) {}
              }
    
              if (anyCap) {
                const lastTo = Number(path[path.length - 1]);
                if (Number.isFinite(lastTo)) {
                  Game.board = simBoard;
                  Game.player = by;
                  Game.inChain = true;
                  Game.chainPos = lastTo | 0;
    
                  const endState = TrainRecorder.captureStateForTraining();
                  if (endState) {
                    let trapEnd = 0;
                    try {
                      trapEnd = isSquareCapturableBy(-by, lastTo | 0) ? 1 : 0;
                    } catch (e) {}
                    try {
                      TrainRecorder.recordExternalDecision({
                        state: endState,
                        action: ACTION_ENDCHAIN,
                        actor: by,
                        cap: 0,
                        crown: 0,
                        trap: trapEnd,
                        fromStr: rcStr(lastTo | 0),
                        toStr: "END",
                      });
                    } catch (e) {}
                  }
                }
              }
            } finally {
              Game.board = savedBoard;
              Game.player = savedPlayer;
              Game.inChain = savedInChain;
              Game.chainPos = savedChainPos;
            }
    
            this._lastTrainLoggedMoveIndex = mi;
          } catch (e) {}
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
                if (err) handleDbError(err, window.I18N.translateArgs("online.logFailed"), { ctx: "log.soufla" });
              },
            );
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("online.logFailed"), { ctx: "log.soufla" });
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
    
          const statePayload = {
            snapshot: typeof snapshotState === "function" ? snapshotState() : null,
            deferredPromotion: Game.deferredPromotion || null,
            capturedOrder: capOrder,
          };
    
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
    
          const statePayload = {
            snapshot: typeof snapshotState === "function" ? snapshotState() : null,
            deferredPromotion: Game.deferredPromotion || null,
            capturedOrder: capOrder,
          };
    
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
                  showOnlineNotice(window.I18N.translateArgs("soufla.notCommitted"));
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
              onClose: () => {
                const k = this._undoWaitKey;
                this._undoWaitOpen = false;
                this._undoWaitKey = null;
    
                if (this._undoWaitAutoClose) {
                  this._undoWaitAutoClose = false;
                } else if (k) {
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
          if (!this.isActive || !this.gameRef) return;
    
          try {
            if (Game && Game.forcedEnabled && Game.forcedPly < 10) {
              showOnlineNotice(window.I18N.translateArgs("modals.undo.notAllowedBody"), { title: window.I18N.translateArgs("modals.undo.notAllowedTitle") });
              return;
            }
          } catch (e) {}
    
          try {
            if (Game && (Game.inChain || Game.awaitingPenalty)) {
              showOnlineNotice(window.I18N.translateArgs("ui.noUndo"), { title: window.I18N.translateArgs("modals.undo.title") });
              return;
            }
          } catch (e) {}
    
          if ((this.ply || 0) <= 0) {
            showOnlineNotice(window.I18N.translateArgs("ui.noUndo"), { title: window.I18N.translateArgs("modals.undo.title") });
            return;
          }
    
          const undoRef = this.gameRef.child("undoRequest");
          let tx = null;
    
          try {
            tx = undoRef.transaction((cur) => {
              if (cur && (cur.status === "pending" || cur.status === "active")) return cur;
              return {
                status: "pending",
                acceptedAt: 0,
                requesterUid: this.myUid,
                requesterNick: this.myNick,
                requestedAt: nowTs(),
                ply: this.ply,
              };
            });
          } catch (e) {
            handleDbError(e, window.I18N.translateArgs("undo.requestFailed"), { ctx: "undo.request" });
            return;
          }
    
          try {
            if (tx && typeof tx.then === "function") {
              tx.then((res) => {
                try {
                  const snap = res && res.snapshot ? res.snapshot : null;
                  const ur = snap && typeof snap.val === "function" ? snap.val() : null;
                  this._openUndoWaitModal(ur);
                } catch (e) {}
              }).catch((e) => handleDbError(e, window.I18N.translateArgs("undo.requestFailed")));
            }
          } catch (e) {}
        },

    _handleUndoRequest: function (data) {
          const ur = data && data.undoRequest ? data.undoRequest : null;
          if (!ur) {
            this._closeUndoWaitModal();
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
              body: `<div>${formatTpl(window.I18N.translateArgs("undo.request.body"), { name })}</div>`,
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
            showOnlineNotice(window.I18N.translateArgs("undo.rejected"), { title: window.I18N.translateArgs("undo.rejectedTitle") });
            try {
              this.gameRef.child("undoRequest").remove();
            } catch (e) {}
          }
        },

    _respondUndo: function (accept) {
          this.gameRef.child("undoRequest").transaction((cur) => {
            if (!cur || (cur.status !== "pending" && cur.status !== "active")) return cur;
            cur.status = accept ? "accepted" : "rejected";
            cur.respondedAt = nowTs();
            cur.responderUid = this.myUid;
            cur.responderNick = this.myNick;
            return cur;
          });
        },

    _performUndoTransaction: function () {
          if (this._undoTxnInFlight) return;
          this._undoTxnInFlight = true;
    
          this.gameRef.transaction(
            (g) => {
              if (!g || g.status !== "active") return g;
              if (!g.undoRequest || g.undoRequest.status !== "accepted") return g;
    
              const undoneMove = g.lastMove && g.lastMove.kind === "move" ? g.lastMove : null;
    
              const undoneFrom = undoneMove && undoneMove.from != null ? undoneMove.from : null;
              const undonePath =
                undoneMove && Array.isArray(undoneMove.path) && undoneMove.path.length
                  ? undoneMove.path.slice()
                  : undoneMove && undoneMove.to != null
                    ? [undoneMove.to]
                    : null;
    
              try {
                const curSnap = g.state && g.state.snapshot ? g.state.snapshot : null;
                if (curSnap && curSnap.forcedEnabled && curSnap.forcedPly < 10) {
                  g.undoRequest = null;
                  return g;
                }
              } catch (e) {}
    
              const curPly = g.ply || 0;
              const prevPly = curPly - 1;
              if (prevPly < 0) {
                g.undoRequest = null;
                return g;
              }
    
              const prevState = g.states && g.states[prevPly];
              if (!prevState || !prevState.snapshot) {
                g.undoRequest = null;
                return g;
              }
    
              g.moveIndex = (g.moveIndex || 0) + 1;
              g.ply = prevPly;
    
              g.state = prevState;
              g.turn = prevState.snapshot.player;
    
              g.lastMove = {
                kind: "undo",
                by: g.turn,
                ts: nowTs(),
                undoneFrom: undoneFrom,
                undonePath: undonePath,
                ply: prevPly,
                moveIndex: g.moveIndex,
              };
    
              g.undoRequest = null;
              g.soufla = null;
    
              g.log = g.log || [];
    
              normalizeLogArrayForWrite(g.log);
              const from =
                undoneMove && undoneMove.from != null
                  ? typeof rcStr === "function"
                    ? rcStr(undoneMove.from)
                    : ""
                  : "";
              const to =
                undoneMove && undoneMove.to != null
                  ? typeof rcStr === "function"
                    ? rcStr(undoneMove.to)
                    : ""
                  : "";
              g.log.push({
                ts: nowTs(),
                type: "undo",
                text: encodeSharedLogText({
                  kind: "undo",
                  from: undoneMove && undoneMove.from != null ? undoneMove.from : null,
                  to: undoneMove && undoneMove.to != null ? undoneMove.to : null,
                }),
              });
              if (g.log.length > 50) g.log = g.log.slice(-50);
    
              return g;
            },
            (err, committed) => {
              this._undoTxnInFlight = false;
              if (err) {
                handleDbError(err, window.I18N.translateArgs("undo.failed"), { ctx: "undo" });
                return;
              }
              if (committed === false) {
                showOnlineNotice(window.I18N.translateArgs("undo.notCommitted"));
              }
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
          let playersLoaded = false;
          let roomsLoaded = false;
          let lobbyLoadTimer = null;
          const lobbyLoadFailed = () => {
            if (lobbyLoadTimer) {
              clearTimeout(lobbyLoadTimer);
              lobbyLoadTimer = null;
            }
            const msg = window.I18N.translateArgs("status.onlineInitFail", "تعذر تشغيل اللعب عبر الإنترنت الآن.");
            if (!playersLoaded && playersEl) playersEl.innerHTML = `<div class="z-empty">${escapeHtml(msg)}</div>`;
            if (!roomsLoaded && roomsEl) roomsEl.innerHTML = `<div class="z-empty">${escapeHtml(msg)}</div>`;
          };
    
          try {
            const setLoading = (el, msg) => {
              if (!el) return;
              el.innerHTML = `<div class="z-empty z-loading">${msg || ""}</div>`;
            };
            setLoading(playersEl, window.I18N.translateArgs("lobby.loadingPlayers"));
            setLoading(roomsEl, window.I18N.translateArgs("lobby.loadingRooms"));
          } catch (e) {}
    
          const ok = await this.initPresence();
          if (!ok) {
            try {
              if (playersEl)
                playersEl.innerHTML = `<div class="z-empty">${window.I18N.translateArgs("status.onlineInitFail")}</div>`;
            } catch (e) {}
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
    
          await this._syncLobbyAvailabilityFromActiveGame();

          try {
            lobbyLoadTimer = setTimeout(lobbyLoadFailed, 10000);
          } catch (e) {}
    
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
              playersLoaded = true;
              if (playersLoaded && roomsLoaded && lobbyLoadTimer) {
                clearTimeout(lobbyLoadTimer);
                lobbyLoadTimer = null;
              }
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
                      : st === "available"
                        ? window.I18N.translateArgs("online.status.vsComputer")
                        : st === "inPvP"
                          ? window.I18N.translateArgs("online.status.inPvP")
                          : st === "spectating"
                            ? window.I18N.translateArgs("online.status.spectating")
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
                  if (r.isSelf) {
                    return `
                      <div class="z-row" data-uid="${r.uid}">
                        <div class="z-row-main">
                          <div class="z-row-title"><img class="z-avatar" src="${r.icon}" alt="" />${escapeHtml(r.nick)}</div>
                          <div class="z-row-sub">${escapeHtml(r.stLabel)}</div>
                        </div>
                        <div class="z-row-actions">
                          <span class="z-self">${window.I18N.translateArgs("players.you")}</span>
                        </div>
                      </div>
                    `;
                  }
    
                  const dis = r.canInvite ? "" : 'disabled aria-disabled="true"';
                  const title = r.canInvite ? "" : `title=\"${window.I18N.translateArgs(r.acceptsInvites ? "lobby.inviteDisabled" : "lobby.noInvites")}\"`;
                  const inviteLabel = r.acceptsInvites ? window.I18N.translateArgs("actions.invite") : window.I18N.translateArgs("lobby.noInvites");
                  return `
                    <div class="z-row" data-uid="${r.uid}">
                      <div class="z-row-main">
                        <div class="z-row-title"><img class="z-avatar" src="${r.icon}" alt="" />${escapeHtml(r.nick)}</div>
                        <div class="z-row-sub">${escapeHtml(r.stLabel)}</div>
                      </div>
                      <div class="z-row-actions">
                        <button class="btn small ok" data-action="invite" ${dis} ${title}>
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
                  } catch (e) {}
                });
              });
            };
    
            this._lobbyPlayersCb = cb;
            ref.on("value", cb, (err) => {
              playersLoaded = false;
              try { Logger.warn("lobby_players_read_failed", { code: String((err && err.code) || ""), message: String((err && err.message) || "") }); } catch (e) {}
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
              roomsLoaded = true;
              if (playersLoaded && roomsLoaded && lobbyLoadTimer) {
                clearTimeout(lobbyLoadTimer);
                lobbyLoadTimer = null;
              }
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
                  const w = g.players && g.players.white ? g.players.white.nickname || "" : "";
                  const b = g.players && g.players.black ? g.players.black.nickname || "" : "";
                  const spectatorCount = Math.max(0, Math.min(3, Number(g.spectatorCount || 0) || 0));
                  const spectatorCountUpdatedAt = Number(g.spectatorCountUpdatedAt || 0) || 0;
                  const spectatorCountFresh = isPresenceFresh(spectatorCountUpdatedAt, SPECTATOR_COUNT_STALE_MS);
                  const visibility = normalizeRoomVisibility(g.visibility);
                  rooms.push({ gid, name, w, b, wuid, buid, visibility, createdAt: g.createdAt || g.acceptedAt || 0, spectatorCount, spectatorCountUpdatedAt, spectatorCountFresh });
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
                         <span>${spectatorLabel}</span>
                       </button>`
                    : "";
                  return `
                    <div class="z-row z-room-row" data-gid="${r.gid}">
                      <div class="z-row-main">
                        <div class="z-row-title z-room-title"><span>${window.I18N.translateArgs("lobby.roomLabel")} : </span><span>${escapeHtml(r.name)}</span></div>
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
            };
    
            this._lobbyRoomsCb = cbG;
            refG.on("value", cbG, (err) => {
              roomsLoaded = false;
              try { Logger.warn("lobby_rooms_read_failed", { code: String((err && err.code) || ""), message: String((err && err.message) || "") }); } catch (e) {}
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
          try { this._clearPersistedActiveGame(); } catch (e) {}
          try { await this._setLobbyStatus("available"); } catch (e) {}
          try { showOnlineNotice(window.I18N.translateArgs("online.errors.noGame")); } catch (e) {}
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

    _isNaturalOnlineEndReason: function (reason) {
          const r = String(reason || "").trim();
          return r === "natural_win" || r === "draw" || r === "no_legal_moves";
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
            this._cancelRoomPurgeOnDisconnect();
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
})();
