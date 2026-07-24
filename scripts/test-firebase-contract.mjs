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
assert.match(passive, /await window\.DhametEmergencyReady/,
  "online auth must await the shared anonymous-auth promise");
assert.match(passive, /const initialPresenceOk = await safePlayerWrite\(/,
  "initial presence must be confirmed before lobby listeners start");
assert.doesNotMatch(passive, /const snap = await this\.playersRef\.once\("value"\);\s*const players/s,
  "lobby startup must not block on a full players read before presence registration");
assert.match(online, /ref\.on\("value", cb, \(err\) =>/,
  "players listener must expose read failures instead of loading forever");
assert.match(online, /refG\.on\("value", cbG, \(err\) =>/,
  "rooms listener must expose read failures instead of loading forever");

console.log("Firebase contract regression tests passed");
