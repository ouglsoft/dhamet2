import assert from "node:assert/strict";
import fs from "node:fs";

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

console.log("Invite delivery regression tests passed");
