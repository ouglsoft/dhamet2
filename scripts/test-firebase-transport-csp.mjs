import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const headers = read("_headers");
const lobbyPage = read("pages/loby.html");
const gamePage = read("pages/game.html");
const online = read("js/online.js");
const passive = read("js/online.passive.js");
const shell = read("js/emergency-shell.js");

const cspLine = headers.split(/\r?\n/).find((line) => line.includes("Content-Security-Policy:"));
assert.ok(cspLine, "Content-Security-Policy header is required");

function directive(name) {
  const body = cspLine.slice(cspLine.indexOf(":") + 1);
  const part = body.split(";").map((item) => item.trim()).find((item) => item.startsWith(name + " "));
  assert.ok(part, `${name} directive is required`);
  return part;
}

const scriptSrc = directive("script-src");
const connectSrc = directive("connect-src");
const frameSrc = directive("frame-src");
for (const origin of ["https://*.firebaseio.com", "https://*.firebasedatabase.app"]) {
  assert.ok(scriptSrc.includes(origin), `script-src must allow RTDB BrowserPoll scripts from ${origin}`);
  assert.ok(frameSrc.includes(origin), `frame-src must allow RTDB disconnect frames from ${origin}`);
  assert.ok(connectSrc.includes(origin), `connect-src must allow RTDB HTTPS traffic to ${origin}`);
}
for (const origin of ["wss://*.firebaseio.com", "wss://*.firebasedatabase.app"]) {
  assert.ok(connectSrc.includes(origin), `connect-src must allow RTDB WebSockets to ${origin}`);
}
assert.ok(frameSrc.includes("'self'"), "frame-src must allow the SDK's same-origin hidden holder frame");
assert.ok(!frameSrc.includes("'none'"), "frame-src 'none' breaks Firebase RTDB long polling");
assert.ok(scriptSrc.includes("https://www.gstatic.com"), "Firebase CDN scripts must remain allowed");

for (const page of [lobbyPage, gamePage]) {
  assert.match(page, /firebase-database-compat\.js/, "Realtime Database SDK must be loaded");
}

// One authoritative transport stack: Firebase SDK chooses WebSocket or BrowserPoll.
for (const source of [online, passive]) {
  assert.doesNotMatch(source, /firebaseRestRequest|readLobbyRest|readFirebaseRest|_firebaseTransportDegraded|_startInviteRestPolling|lobby_rest_fallback_applied/,
    "parallel REST transport must not return");
}
assert.doesNotMatch(shell, /FIREBASE_MIGRATION|prepareOneTimeFirebaseMigration|previous_websocket_failure|firebaseLocalStorageDb|deleteIndexedDb/,
  "storage deletion/migration is not a transport fix");
assert.doesNotMatch(online + passive + shell, /forceLongPolling|forceWebSockets/,
  "do not force one RTDB transport; both must remain available");

assert.match(online, /await db\.ref\(\)\.update\(updates\)/,
  "invite and game creation must remain one atomic SDK update");
assert.match(passive, /this\.invitesRef\.on\("child_added", handler, onInviteReadError\)/,
  "incoming invites must remain on the native realtime listener");

console.log("Firebase native transport and CSP regression tests passed");
