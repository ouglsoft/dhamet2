import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const passive = fs.readFileSync("js/online.passive.js", "utf8");
const online = fs.readFileSync("js/online.js", "utf8");

assert.match(passive, /_boundInviteUid:\s*""/,
  "the invite listener must track the Firebase UID it is bound to");
assert.match(passive, /uidChanged\s*=\s*!!\(this\._boundInviteUid\s*&&\s*this\._boundInviteUid\s*!==\s*liveUid\)/,
  "anonymous UID rotation must be detected before reusing the invite listener");
assert.match(passive, /this\._invitesPassiveOn\s*=\s*false;[\s\S]*this\._inviteListenerGeneration/s,
  "UID rotation must invalidate the old passive invite listener");
assert.match(passive, /this\.invitesRef\s*=\s*db\.ref\("invites"\)\.child\(liveUid\)/,
  "incoming invitations must always listen under the current authenticated UID");
assert.match(passive, /localGamePageActive[\s\S]*settleWithin\(this\._getActivePlayerRoomId\(\),\s*6000,\s*""\)/s,
  "stale local game markers must be verified against an authoritative active room");
assert.doesNotMatch(passive, /let inMatch = !!\([\s\S]{0,220}this\.gameId[\s\S]{0,220}snap\.ref\.remove\(\)/s,
  "a stale local gameId must not silently delete a valid incoming invitation");
assert.match(passive, /this\.invitesRef\.on\("child_added",\s*handler,\s*onInviteReadError\)/,
  "the invite listener must expose Firebase read failures and recover");
assert.match(online, /Logger\.capture\(e,\s*\{\s*ctx:\s*"invite\.create\.click"/,
  "unexpected invitation creation errors must not be swallowed silently");
assert.match(online, /updates\[`invites\/\$\{opponentUid\}\/\$\{inviteKey\}`\]\s*=\s*inviteObj/,
  "the invitation must be written atomically under the recipient UID");

assert.match(passive, /function readOnceWithOutcome\(ref, timeoutMs\)/,
  "ambiguous Firebase writes must have an outcome-preserving verification helper");
assert.match(online, /readOnceWithOutcome\([\s\S]*verification\.state === "missing"[\s\S]*invite\.send\.confirmed-failed/,
  "an ambiguous Firebase response must be verified before showing send failure");
assert.doesNotMatch(online, /deliverySnapshot/,
  "verification must not collapse Firebase read errors into a missing snapshot");
const createGameStart = online.indexOf("    _createGame: async function (opponentUid) {");
const createGameEnd = online.indexOf("    _joinGame: async function (gameId) {", createGameStart);
const createGameBlock = createGameStart >= 0 && createGameEnd > createGameStart
  ? online.slice(createGameStart, createGameEnd)
  : "";
assert.equal((createGameBlock.match(/await db\.ref\(\)\.update\(updates\);/g) || []).length, 1,
  "invite recovery must reconcile the original atomic write without a second send");


assert.doesNotMatch(online, /requires DhametState\.normalizeDeferredPromotions/,
  "creating an invitation from the lobby must not require the gameplay-only DhametState runtime");
assert.match(online, /if \(State && typeof State\.normalizeDeferredPromotions === "function"\)/,
  "the game page should still use the shared promotion normalizer when it is loaded");
assert.match(online, /else if \(Array\.isArray\(source\.deferredPromotions\)\)/,
  "the lobby must have a safe promotion-queue fallback before writing the pending Firebase game");

const helperStart = online.indexOf("  function deferredPromotionQueue(stateRecord) {");
const helperEnd = online.indexOf("\n\n  Object.assign(Online, {", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart,
  "the invitation state helper must remain extractable for the lobby regression test");
const helperSource = online.slice(helperStart, helperEnd) +
  "\nresult = stateRecordWithPromotionQueue({ player: -1 }, { player: -1 });";
const lobbyContext = { window: {}, Number, Array, Object, result: null };
vm.runInNewContext(helperSource, lobbyContext);
assert.equal(lobbyContext.result.snapshot.player, -1,
  "the lobby must build the initial pending-game state without loading DhametState");
assert.deepEqual(Array.from(lobbyContext.result.deferredPromotions), [],
  "the lobby fallback must produce an empty deferred-promotion queue for a new match");

console.log("Invite delivery regression tests passed");
