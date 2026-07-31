import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");

function extractFunction(source, name) {
  const fnAt = source.indexOf(`function ${name}(`);
  assert.ok(fnAt >= 0, `${name} missing`);
  const asyncAt = source.lastIndexOf("async ", fnAt);
  const at = asyncAt >= 0 && source.slice(asyncAt + 6, fnAt).trim() === "" ? asyncAt : fnAt;
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
    else if (ch === "}" && --depth === 0) return source.slice(at, i + 1);
  }
  throw new Error(`${name} not closed`);
}

const online = read("js/online.js");
const passive = read("js/online.passive.js");
const game = read("js/game.js");
const i18n = read("js/i18n.js");

const retryRuntime = vm.runInNewContext(
  `${extractFunction(online, "waitForOnlineRetry")}\n${extractFunction(online, "initPresenceWithRetry")}\n${extractFunction(online, "resolveActiveMatchWithRetry")}\n({initPresenceWithRetry,resolveActiveMatchWithRetry})`,
  { setTimeout: (fn) => fn(), Promise },
);

let presenceCalls = 0;
assert.equal(await retryRuntime.initPresenceWithRetry({
  async initPresence() {
    presenceCalls += 1;
    return presenceCalls === 2;
  },
}), true);
assert.equal(presenceCalls, 2);

let matchCalls = 0;
assert.deepEqual(await retryRuntime.resolveActiveMatchWithRetry({
  async _resolveActivePlayerMatch() {
    matchCalls += 1;
    return matchCalls === 1 ? { state: "unknown", gameId: "" } : { state: "none", gameId: "" };
  },
}), { state: "none", gameId: "" });
assert.equal(matchCalls, 2);

assert.match(game, /const newestFirst = events\.map\([\s\S]*?\.reverse\(\);/);
assert.match(online, /const slice = arr\.slice\(-80\)\.reverse\(\);/);
assert.match(read("js/ui/game-log-view.js"), /element\.scrollTop = 0/);

const hasExplicitInviteRejection = vm.runInNewContext(
  `${extractFunction(passive, "hasExplicitInviteRejection")}\nhasExplicitInviteRejection`,
);
assert.equal(hasExplicitInviteRejection({ log: [{ type: "invite_rejected" }] }), true);
assert.equal(hasExplicitInviteRejection({ log: [{ type: "invite_sent" }] }), false);
assert.match(passive, /hasExplicitInviteRejection\(g\)[\s\S]*?translateArgs\("online\.inviteRejected"\)/);

for (const expected of [
  '"home": "الرئيسية"',
  '"home": "Home"',
  '"home": "Accueil"',
  '"inviteRejected": "رفض اللاعب الآخر دعوتك."',
  '"inviteRejected": "The other player declined your invitation."',
  '"inviteRejected": "L’autre joueur a refusé votre invitation."',
  'تعذر فتح اللعب عبر الإنترنت الآن. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.',
  'Online play could not be opened right now. Check your internet connection and try again.',
  'Le jeu en ligne ne peut pas être ouvert pour le moment. Vérifiez votre connexion Internet et réessayez.',
]) assert.ok(i18n.includes(expected), `missing translation: ${expected}`);

console.log("V34 top-log, online retry, invite rejection, and Home translation tests passed");
