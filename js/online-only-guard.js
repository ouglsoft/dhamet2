(function () {
  "use strict";

  // This emergency application only opens authoritative online rooms. A direct
  // visit to game.html without a room must return to the official application.
  try {
    const params = new URLSearchParams(location.search || "");
    const online = ["room", "rid", "gid", "game", "id", "spectate", "spectator", "spec"]
      .some((key) => String(params.get(key) || "").trim()) ||
      ["1", "true", "yes"].includes(String(params.get("pvp") || "").trim().toLowerCase());
    if (!online) {
      location.replace("https://ouglsoft.com/dhamet/pages/mode.html");
    }
  } catch (_) {
    location.replace("https://ouglsoft.com/dhamet/pages/mode.html");
  }
})();
