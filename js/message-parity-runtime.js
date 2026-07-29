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

  function installGameOverParity() {
    if (!window.UI || !window.Modal) return false;

    window.UI.showOnlineGameOverModal = function (options) {
      const opts = options && typeof options === "object" ? options : {};
      const title = String(opts.title || t("modals.gameOver.title") || "").trim();
      const text = String(opts.text || opts.message || "").trim();
      const html = String(opts.html || "").trim();
      if (!text && !html) return false;

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

      const body = html ? (() => {
        const div = document.createElement("div");
        div.style.whiteSpace = "pre-wrap";
        div.innerHTML = html;
        return div;
      })() : null;

      return Modal.open({
        title,
        body: body || undefined,
        text: body ? undefined : text,
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
    const ok = installGameOverParity();
    try {
      document.documentElement.setAttribute("data-message-parity", release);
    } catch (_) {}
    return ok;
  }

  if (!install()) {
    window.addEventListener("DOMContentLoaded", install, { once: true });
  }
})();
