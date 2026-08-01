import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");

function extractObjectFunction(source, name) {
  const marker = `${name}:`;
  const at = source.indexOf(marker);
  assert.ok(at >= 0, `${name} missing`);
  const fnAt = source.indexOf("function", at + marker.length);
  assert.ok(fnAt >= 0, `${name} function missing`);
  const asyncAt = source.lastIndexOf("async", fnAt);
  const start = asyncAt >= at && source.slice(asyncAt + 5, fnAt).trim() === "" ? asyncAt : fnAt;
  const brace = source.indexOf("{", fnAt);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = "";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth += 1;
    else if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`${name} not closed`);
}

const online = read("js/online.js");
const passive = read("js/online.passive.js");

const notices = [];
const context = {
  Promise,
  String,
  showOnlineNotice: (message) => notices.push(message),
  window: { I18N: { translateArgs: (key) => key } },
  initPresenceWithRetry: async () => true,
  isGamePage: () => false,
};

const enterGameFromId = vm.runInNewContext(`(${extractObjectFunction(online, "_enterGameFromId")})`, context);

const game = {
  status: "active",
  acceptedAt: 1,
  players: {
    white: { uid: "inviter" },
    black: { uid: "invitee" },
  },
};

let spectatorStarts = 0;
let inviterStarts = 0;
let joinStarts = 0;
const leaves = [];
const entryOwner = {
  myUid: "new-session",
  async _refreshStaleRoomBeforeEntry() { return game; },
  async _showUnavailableGameAndLeave(key) { leaves.push(key || "online.errors.noGame"); },
  async _startSpectator() { spectatorStarts += 1; },
  async _startInviterGame() { inviterStarts += 1; },
  async _joinGame() { joinStarts += 1; },
};

await enterGameFromId.call(entryOwner, "g1", false);
assert.deepEqual(leaves, ["online.errors.authRequired"]);
assert.equal(spectatorStarts, 0);
assert.equal(inviterStarts, 0);
assert.equal(joinStarts, 0);

leaves.length = 0;
await enterGameFromId.call(entryOwner, "g1", true);
assert.equal(spectatorStarts, 1);
assert.equal(leaves.length, 0);

entryOwner.myUid = "inviter";
await enterGameFromId.call(entryOwner, "g1", false);
assert.equal(inviterStarts, 1);
assert.equal(spectatorStarts, 1);

entryOwner.myUid = "invitee";
await enterGameFromId.call(entryOwner, "g1", false);
assert.equal(joinStarts, 1);

const handleAccepted = vm.runInNewContext(`(${extractObjectFunction(passive, "_handleOutgoingInviteAccepted")})`, context);

let offCalls = 0;
let untracked = 0;
let pendingClears = 0;
let purges = 0;
let navigations = 0;
const watchMap = {
  g2: {
    ref: { off() { offCalls += 1; } },
    cb() {},
  },
};
const inviteOwner = {
  myUid: "new-session",
  isActive: false,
  gameId: null,
  _presenceStatus: "available",
  _presenceRole: "",
  _outInviteWatchMap: watchMap,
  _clearPendingInviteWatcher() { pendingClears += 1; },
  _untrackOutgoingInviteByGame() { untracked += 1; },
  async _purgeInvitesOnEnterMatch() { purges += 1; },
  _goToGameAsPlayer() { navigations += 1; },
};

notices.length = 0;
await handleAccepted.call(inviteOwner, "g2", {
  players: { white: { uid: "old-session" }, black: { uid: "invitee" } },
});
assert.equal(offCalls, 1);
assert.equal(untracked, 1);
assert.equal(pendingClears, 1);
assert.equal(purges, 0);
assert.equal(navigations, 0);
assert.deepEqual(notices, ["online.errors.authRequired"]);
assert.equal(Object.hasOwn(inviteOwner._outInviteWatchMap, "g2"), false);

inviteOwner.myUid = "old-session";
inviteOwner._outInviteWatchMap.g3 = {
  ref: { off() { offCalls += 1; } },
  cb() {},
};
await handleAccepted.call(inviteOwner, "g3", {
  players: { white: { uid: "old-session" }, black: { uid: "invitee" } },
});
assert.equal(purges, 1);
assert.equal(navigations, 1);
assert.equal(untracked, 1);
assert.equal(notices.length, 1);

assert.match(passive, /_handleOutgoingInviteAccepted\(gid, g\)/);
assert.doesNotMatch(passive, /players\.white\.uid\s*=/);
assert.match(online, /_showUnavailableGameAndLeave\("online\.errors\.authRequired"\)/);

console.log("V36 player-entry identity guard tests passed");
