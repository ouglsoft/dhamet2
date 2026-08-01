(function () {
  "use strict";

  const OFFICIAL_APP_URL = "https://ouglsoft.com/dhamet";
  const ADMISSION_KEY = "dhamet2.backupAdmission.v1";
  const ADMISSION_TTL_MS = 12 * 60 * 60 * 1000;
  const ACTIVE_GAME_ID_KEY = "zamat.activeGameId";
  const ACTIVE_GAME_TS_KEY = "zamat.activeGameTs";
  const TOKEN_PATTERN = /^v1\.[A-Za-z0-9_-]{20,96}$/;
  const EMERGENCY_MODES = new Set(["1", "transient", "test"]);

  function readJson(storage, key) {
    try {
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function hasFreshAdmission(at) {
    const admission = readJson(sessionStorage, ADMISSION_KEY);
    return !!(admission && admission.version === 1 && Number(admission.expiresAt || 0) > at);
  }

  function writeAdmission(at) {
    try {
      sessionStorage.setItem(ADMISSION_KEY, JSON.stringify({
        version: 1,
        admittedAt: at,
        expiresAt: at + ADMISSION_TTL_MS,
      }));
    } catch (_) {}
  }

  function hasOfficialReferrer(url) {
    const mode = String(url.searchParams.get("emergency") || "").trim().toLowerCase();
    if (!EMERGENCY_MODES.has(mode)) return false;
    try { return new URL(document.referrer).origin === "https://ouglsoft.com"; } catch (_) { return false; }
  }

  function activePair(storage, idKey, tsKey, at, timestampOptional) {
    try {
      const gameId = String(storage.getItem(idKey) || "").trim();
      const timestamp = Number(storage.getItem(tsKey) || 0) || 0;
      return !!(gameId && ((timestampOptional && !timestamp) || (timestamp > 0 && at - timestamp <= ADMISSION_TTL_MS)));
    } catch (_) {
      return false;
    }
  }

  function hasActiveGameAssociation(at) {
    if (activePair(sessionStorage, ACTIVE_GAME_ID_KEY, ACTIVE_GAME_TS_KEY, at, true)) return true;
    try {
      for (let index = 0; index < localStorage.length; index += 1) {
        const idKey = String(localStorage.key(index) || "");
        if (!idKey.startsWith(ACTIVE_GAME_ID_KEY + ".")) continue;
        const suffix = idKey.slice(ACTIVE_GAME_ID_KEY.length);
        if (activePair(localStorage, idKey, ACTIVE_GAME_TS_KEY + suffix, at, false)) return true;
      }
    } catch (_) {}
    return false;
  }

  function acceptEntry(url, at) {
    const mode = String(url.searchParams.get("emergency") || "").trim().toLowerCase();
    const token = String(url.searchParams.get("entry") || "").trim();
    if (!EMERGENCY_MODES.has(mode) || !TOKEN_PATTERN.test(token)) return false;
    writeAdmission(at);
    url.searchParams.delete("entry");
    try { history.replaceState(history.state, "", url.pathname + url.search + url.hash); } catch (_) {}
    return true;
  }

  const at = Date.now();
  let currentUrl;
  try { currentUrl = new URL(location.href); } catch (_) { location.replace(OFFICIAL_APP_URL); return; }
  if (acceptEntry(currentUrl, at)) return;
  if (hasOfficialReferrer(currentUrl)) { writeAdmission(at); return; }
  if (hasFreshAdmission(at) || hasActiveGameAssociation(at)) return;
  location.replace(OFFICIAL_APP_URL);
})();
