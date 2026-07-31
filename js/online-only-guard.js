(function () {
  "use strict";

   
   
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
