(function () {
  "use strict";

  const release = "__DHAMET_BUILD__";

  function t(key, vars) {
    try {
      if (window.I18N && typeof window.I18N.translateArgs === "function") {
        return window.I18N.translateArgs(key, vars || {});
      }
      if (window.I18N && typeof window.I18N.text === "function") {
        return window.I18N.text(key, vars || {});
      }
    } catch (_) {}
    return String(key || "");
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function installSettingsParity() {
    if (!window.UI || !window.Modal) return false;

    window.UI.showSettingsModal = function () {
      const wrap = document.createElement("div");
      wrap.className = "settings-general";

      const row = (label, control, hint) => `
        <div class="settings-row">
          <div class="settings-label"><b>${label}</b>${hint ? `<small>${hint}</small>` : ""}</div>
          <div class="settings-control">${control}</div>
        </div>
      `;

      const themeBefore = Game.settings && Game.settings.theme === "dark" ? "dark" : "light";
      const boardBefore = Game.settings && Game.settings.boardStyle === "3d" ? "3d" : "2d";
      const coordsBefore = !!(Game.settings && Game.settings.showCoords);

      wrap.innerHTML = `
        <div class="settings-list simple-settings">
          ${row(
            t("settings.theme"),
            `<select id="setTheme">
              <option value="light" ${themeBefore === "light" ? "selected" : ""}>${t("settings.light")}</option>
              <option value="dark" ${themeBefore === "dark" ? "selected" : ""}>${t("settings.dark")}</option>
            </select>`,
          )}
          ${row(
            t("settings.boardStyle"),
            `<select id="setBoardStyle">
              <option value="2d" ${boardBefore === "2d" ? "selected" : ""}>${t("settings.board2d")}</option>
              <option value="3d" ${boardBefore === "3d" ? "selected" : ""}>${t("settings.board3d")}</option>
            </select>`,
          )}
          ${row(
            t("settings.coords"),
            `<label class="checkline"><input id="setCoords" type="checkbox" ${coordsBefore ? "checked" : ""} /> <span>${t("settings.showCoords")}</span></label>`,
          )}
        </div>
      `;

      const dropdowns = [];
      try {
        qsa("select", wrap).forEach((selectEl) => {
          selectEl.addEventListener("change", () => {
            setTimeout(() => {
              try { selectEl.blur(); } catch (_) {}
            }, 0);
          });
          try {
            if (window.DhametDropdownView && typeof window.DhametDropdownView.enhance === "function") {
              window.DhametDropdownView.enhance(selectEl);
              dropdowns.push(selectEl);
            }
          } catch (_) {}
        });
      } catch (_) {}

      const themeLabel = (value) => value === "dark" ? t("settings.dark") : t("settings.light");
      const boardLabel = (value) => value === "3d" ? t("settings.board3d") : t("settings.board2d");
      const boolLabel = (value) => value ? t("settings.enabled") : t("settings.disabled");

      const renderResult = (changes) => {
        if (!changes.length) {
          return `<div class="settings-feedback warn"><p>${esc(t("modals.applySettings.noChanges"))}</p></div>`;
        }
        const rtl = document.documentElement && document.documentElement.dir === "rtl";
        const arrow = rtl ? "←" : "→";
        const items = changes.map((change) =>
          `<li><b>${esc(change.label)}:</b> <bdi>${esc(change.from)}</bdi> <span class="settings-change-arrow">${arrow}</span> <bdi>${esc(change.to)}</bdi></li>`,
        ).join("");
        return `<div class="settings-feedback ok"><p>${esc(t("modals.applySettings.applied"))}</p><div><b>${esc(t("modals.applySettings.changedTitle"))}</b></div><ul class="settings-change-list">${items}</ul></div>`;
      };

      const applyNow = () => {
        const changes = [];
        const nextTheme = qs("#setTheme", wrap)?.value === "dark" ? "dark" : "light";
        const nextBoard = qs("#setBoardStyle", wrap)?.value === "3d" ? "3d" : "2d";
        const nextCoords = !!qs("#setCoords", wrap)?.checked;

        if (nextTheme !== themeBefore) changes.push({ label: t("settings.theme"), from: themeLabel(themeBefore), to: themeLabel(nextTheme) });
        if (nextBoard !== boardBefore) changes.push({ label: t("settings.boardStyle"), from: boardLabel(boardBefore), to: boardLabel(nextBoard) });
        if (nextCoords !== coordsBefore) changes.push({ label: t("settings.coords"), from: boolLabel(coordsBefore), to: boolLabel(nextCoords) });

        try {
          Game.settings.theme = nextTheme;
          Game.settings.boardStyle = nextBoard;
          Game.settings.showCoords = nextCoords;
        } catch (_) {}
        try { if (typeof applyTheme === "function") applyTheme(nextTheme); } catch (_) {}
        try { if (typeof applyBoardStyle === "function") applyBoardStyle(nextBoard); } catch (_) {}
        try { if (window.Visual && typeof Visual.setShowCoords === "function") Visual.setShowCoords(nextCoords); } catch (_) {}
        try { if (window.Visual && typeof Visual.draw === "function") Visual.draw(); } catch (_) {}
        try { if (window.UI && typeof UI.updateAll === "function") UI.updateAll(); } catch (_) {}
        try { if (typeof saveSessionSettings === "function") saveSessionSettings(); } catch (_) {}

        try { Modal.close("action"); } catch (_) {}
        setTimeout(() => {
          try {
            Modal.alert({
              title: t("modals.applySettings.title"),
              body: renderResult(changes),
              okLabel: t("actions.ok"),
              okClassName: "primary",
            });
          } catch (_) {}
        }, 0);
      };

      const keyHandler = (event) => {
        if (!Modal.isOpen()) return;
        const body = Modal.getBody && Modal.getBody();
        if (!body || !body.querySelector(".settings-general")) return;
        if (event.key === "Escape") {
          event.preventDefault();
          Modal.close("escape");
        } else if (event.key === "Enter") {
          event.preventDefault();
          applyNow();
        }
      };
      document.addEventListener("keydown", keyHandler);

      return Modal.open({
        title: t("buttons.settings"),
        body: wrap,
        modalClassName: "z-apply-settings",
        onEnter: applyNow,
        onClose: () => {
          document.removeEventListener("keydown", keyHandler);
          try {
            if (window.DhametDropdownView && typeof window.DhametDropdownView.destroy === "function") {
              dropdowns.forEach((selectEl) => window.DhametDropdownView.destroy(selectEl));
            }
          } catch (_) {}
        },
        buttons: [
          { label: t("modals.apply"), className: "ok", onClick: applyNow },
          { label: t("actions.cancel"), className: "ghost", onClick: () => Modal.close("action") },
        ],
      });
    };

    return true;
  }

  function installSouflaParity() {
    if (!window.UI || !window.DhametSouflaView) return false;

    window.UI.showSouflaModal = function (pending) {
      return window.DhametSouflaView.showSouflaModal(pending, {
        game: Game,
        t,
        Modal: window.Modal,
        Visual: window.Visual,
        BOARD_N: typeof BOARD_N !== "undefined" ? BOARD_N : 9,
        idxToRC: typeof idxToRC === "function" ? idxToRC : null,
        toViewRC: typeof toViewRC === "function" ? toViewRC : null,
        valueAt: typeof valueAt === "function" ? valueAt : null,
        boardIdxFromClient: typeof boardIdxFromClient === "function" ? boardIdxFromClient : null,
        applySouflaDecision: typeof applySouflaDecision === "function" ? applySouflaDecision : null,
        UI: window.UI,
      });
    };

    window.UI.showSouflaAgainstHuman = function (decision, pending) {
      return window.DhametSouflaView.showSouflaAgainstHuman(decision, pending, {
        t,
        Modal: window.Modal,
        rcStr: typeof rcStr === "function" ? rcStr : null,
      });
    };

    return true;
  }

  function installGameOverParity() {
    if (!window.UI || !window.Modal) return false;

    window.UI.showOnlineGameOverModal = function (options) {
      const opts = options && typeof options === "object" ? options : {};
      const title = String(opts.title || t("modals.gameOver.title") || "").trim();
      const text = String(opts.text || opts.message || "").trim();
      if (!text) return false;

      let leaving = false;
      const leave = () => {
        if (leaving) return;
        leaving = true;
        try {
          if (window.Online && typeof window.Online.exitToMode === "function") {
            window.Online.exitToMode();
            return;
          }
        } catch (_) {}
        try {
          location.replace("https://ouglsoft.com/dhamet/pages/mode.html");
        } catch (_) {
          try { location.href = "https://ouglsoft.com/dhamet/pages/mode.html"; } catch (_) {}
        }
      };

      return Modal.open({
        title,
        text,
        allowSpectator: true,
        hideClose: true,
        allowEsc: false,
        modalClassName: "z-postmatch-confirm-only",
        buttons: [
          {
            label: t("actions.ok") || "موافق",
            className: "ok",
            onClick: () => {
              try { Modal.close("action"); } catch (_) {}
            },
          },
        ],
        priority: 100,
        blocking: true,
        forceReplace: true,
        onClose: (reason) => {
          if (reason !== "replaced" && reason !== "state-change") leave();
        },
      });
    };

    window.UI.showGameOverModal = function (winner) {
      let presentation = null;
      try {
        if (window.Online && typeof window.Online._buildOnlineEndPresentation === "function") {
          presentation = window.Online._buildOnlineEndPresentation({ winner });
        }
      } catch (_) {}
      if (!presentation || !presentation.text) {
        const player = winner === TOP ? (Game.names && Game.names.top) : winner === BOT ? (Game.names && Game.names.bot) : "";
        const line = winner === TOP || winner === BOT
          ? t("online.endPresentation.winner", { player: player || t("players.player") })
          : t("modals.gameOver.draw");
        presentation = { title: t("modals.gameOver.title"), text: line };
      }
      return window.UI.showOnlineGameOverModal(presentation);
    };

    return true;
  }

  function install() {
    const ok = installSettingsParity() && installSouflaParity() && installGameOverParity();
    try {
      document.documentElement.setAttribute("data-message-parity", release);
    } catch (_) {}
    return ok;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
