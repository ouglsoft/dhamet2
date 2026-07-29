import assert from "node:assert/strict";
import fs from "node:fs";

const rules = fs.readFileSync("database.rules.json", "utf8");
const passive = fs.readFileSync("js/online.passive.js", "utf8");
const online = fs.readFileSync("js/online.js", "utf8");

assert.match(rules, /registered'\)\.exists\(\).*registered'\)\.isBoolean\(\)/s,
  "players rules must explicitly accept the anonymous registered flag");
const parsedRules = JSON.parse(rules);
const gameLogValidation = parsedRules.rules.games.$gameId.log.$i[".validate"];
assert.match(gameLogValidation, /newData\.child\('type'\)\.val\(\)\.length <= 32/,
  "game log rules must accept the real online log event names");
assert.doesNotMatch(gameLogValidation, /=== 'invite'/,
  "game log rules must not restrict every event to type=invite");
assert.match(online, /type:\s*"invite_sent"/,
  "invitation creation must retain its real event type");
assert.match(passive, /settleWithin\(\s*window\.DhametEmergencyReady\s*,\s*9000/,
  "online.passive.js must await the shared anonymous-auth promise with a 9-second deadline");
assert.match(passive, /let initialPresenceOk = await settleWithin\(\s*safePlayerWrite\(/s,
  "initial SDK presence write must have a short deadline");
assert.match(passive, /writeFirebaseRest\(`players\/\$\{encodeURIComponent\(this\.myUid\)\}`/,
  "a stalled SDK presence write must fall back to authenticated REST on every load");
assert.match(passive, /presence_rest_fallback_applied/,
  "REST presence recovery must be observable");
assert.doesNotMatch(passive, /const snap = await this\.playersRef\.once\("value"\);\s*const players/s,
  "lobby startup must not block on a full players read before presence registration");
assert.match(online, /ref\.on\("value", livePlayersCb, (?:async )?\(err\) =>/,
  "players listener must expose read failures instead of loading forever");
assert.match(online, /refG\.on\("value", liveRoomsCb, (?:async )?\(err\) =>/,
  "rooms listener must expose read failures instead of loading forever");

assert.match(online, /lobbyLoadTimer = setTimeout\(lobbyLoadFailed, 12000\)/,
  "lobby watchdog must start before Firebase initialization can block");
assert.match(online, /S\.settleWithin\(this\.initPresence\(\), 10000, false\)/,
  "lobby presence initialization must have a deadline");
assert.match(passive, /async function firebaseRestRequest\(path, options\)/,
  "authenticated REST transport must be shared by presence and lobby snapshots");

assert.match(online, /async function readLobbyRest\(path, query, timeoutMs\)/,
  "normal-browser lobby must have an independent REST fallback");
assert.match(online, /runRestFallback\("initial"\)/,
  "REST fallback must start when Firebase listeners do not deliver data");
assert.match(online, /setTimeout\(async \(\) =>[\s\S]*30000\)/,
  "broken live listeners must be refreshed by a bounded REST poll");
assert.match(online, /document\.visibilityState === "hidden"/,
  "REST polling must pause while the page is hidden");

console.log("Firebase contract regression tests passed");
