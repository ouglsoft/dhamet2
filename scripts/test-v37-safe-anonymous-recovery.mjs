import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("js/emergency-shell.js", "utf8");

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(String(key)); },
    dump() { return Object.fromEntries(data); },
  };
}

function sequence(values) {
  let index = 0;
  return async () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    if (value instanceof Error) throw value;
    return value;
  };
}

async function runScenario(options = {}) {
  const localStorage = storage(options.localStorage);
  const sessionStorage = storage(options.sessionStorage);
  let cookie = options.cookie || "dhamet2_browser_session=session-a";
  let signOutCalls = 0;
  let signInCalls = 0;
  let goOnlineCalls = 0;
  const replacements = [];
  const events = [];
  const oldUser = {
    uid: options.oldUid || "uid-old",
    isAnonymous: true,
    getIdToken: sequence(options.oldTokenSequence || ["token-old"]),
    reload: sequence(options.oldReloadSequence || [true]),
  };
  const newUser = {
    uid: options.newUid || "uid-new",
    isAnonymous: true,
    getIdToken: sequence(options.newTokenSequence || ["token-new"]),
    reload: sequence([true]),
  };
  const auth = {
    currentUser: options.noCurrentUser ? null : oldUser,
    async setPersistence() {},
    onAuthStateChanged(onValue) {
      queueMicrotask(() => onValue(this.currentUser));
      return () => {};
    },
    async signOut() {
      signOutCalls += 1;
      this.currentUser = null;
    },
    async signInAnonymously() {
      signInCalls += 1;
      this.currentUser = newUser;
      return { user: newUser };
    },
  };
  const firebase = {
    apps: [{}],
    auth() { return auth; },
    database() { return { goOnline() { goOnlineCalls += 1; } }; },
    initializeApp() {},
  };
  firebase.auth.Auth = { Persistence: { LOCAL: "local" } };
  const classSet = new Set();
  const document = {
    documentElement: {
      lang: "ar",
      dir: "rtl",
      classList: {
        add(...names) { names.forEach((name) => classSet.add(name)); },
        remove(...names) { names.forEach((name) => classSet.delete(name)); },
      },
    },
    getElementById() { return null; },
    get cookie() { return cookie; },
    set cookie(value) {
      const pair = String(value).split(";", 1)[0];
      const [name, val] = pair.split("=");
      const rows = cookie ? cookie.split(/;\s*/).filter(Boolean) : [];
      const filtered = rows.filter((row) => !row.startsWith(name + "="));
      filtered.push(name + "=" + val);
      cookie = filtered.join("; ");
    },
  };
  const timer = (fn, ms = 0) => {
    const handle = setTimeout(fn, ms);
    if (handle && typeof handle.unref === "function") handle.unref();
    return handle;
  };
  class TestCustomEvent {
    constructor(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    }
  }
  const context = {
    window: null,
    document,
    location: {
      pathname: options.pathname || "/pages/loby.html",
      protocol: "https:",
      replace(value) { replacements.push(value); },
    },
    localStorage,
    sessionStorage,
    firebase,
    firebaseConfig: { apiKey: "a", authDomain: "b", databaseURL: "https://c", projectId: "d", appId: "e" },
    setTimeout: timer,
    clearTimeout,
    queueMicrotask,
    Promise,
    Date,
    Math,
    JSON,
    String,
    Number,
    Array,
    Object,
    RegExp,
    Error,
    Uint8Array,
    CustomEvent: TestCustomEvent,
    crypto: globalThis.crypto,
    console: { info() {}, error() {}, warn() {} },
    navigator: { maxTouchPoints: 0, userAgent: "" },
  };
  context.window = context;
  context.dispatchEvent = (event) => { events.push(event); return true; };
  vm.runInNewContext(source, context, { filename: "emergency-shell.js" });
  await context.DhametEmergencyReady;
  return {
    context,
    auth,
    oldUser,
    newUser,
    localStorage,
    sessionStorage,
    stats: () => ({ signOutCalls, signInCalls, goOnlineCalls, replacements: replacements.slice(), events: events.slice() }),
  };
}

const marker = JSON.stringify({ sessionId: "session-a", uid: "uid-old", ts: Date.now() });

{
  const temporary = Object.assign(new Error("network"), { code: "auth/network-request-failed" });
  const run = await runScenario({
    localStorage: { "dhamet2.auth.browser.v4": marker },
    oldTokenSequence: [temporary],
    oldReloadSequence: [true],
  });
  assert.equal(run.auth.currentUser.uid, "uid-old");
  assert.equal(run.stats().signOutCalls, 0);
  assert.equal(run.stats().signInCalls, 0);
}

{
  const temporary = Object.assign(new Error("network"), { code: "auth/network-request-failed" });
  const run = await runScenario({
    localStorage: {
      "dhamet2.auth.browser.v4": marker,
      "zamat.activeGameId.uid-old": "game-a",
      "zamat.activeGameTs.uid-old": String(Date.now()),
      "zamat.online.outInvites.v1": JSON.stringify([{ gameId: "game-b", createdAt: Date.now(), expiresAt: Date.now() + 60000 }]),
    },
    sessionStorage: { "zamat.activeGameId": "game-a", "zamat.activeGameTs": String(Date.now()) },
    oldTokenSequence: ["token-old", temporary],
    oldReloadSequence: [true],
  });
  const result = await run.context.DhametEmergency.resetAnonymous(temporary);
  assert.equal(result.uid, "uid-old");
  assert.equal(run.stats().signOutCalls, 0);
  assert.equal(run.stats().signInCalls, 0);
  assert.equal(run.sessionStorage.getItem("zamat.activeGameId"), "game-a");
  assert.ok(run.localStorage.getItem("zamat.online.outInvites.v1"));
}

{
  const permanent = Object.assign(new Error("expired"), { code: "auth/user-token-expired" });
  const run = await runScenario({
    pathname: "/pages/game.html",
    localStorage: {
      "dhamet2.auth.browser.v4": marker,
      "zamat.activeGameId.uid-old": "game-a",
      "zamat.activeGameTs.uid-old": String(Date.now()),
      "zamat.online.outInvites.v1": JSON.stringify([{ gameId: "game-b", createdAt: Date.now(), expiresAt: Date.now() + 60000 }]),
    },
    sessionStorage: { "zamat.activeGameId": "game-a", "zamat.activeGameTs": String(Date.now()) },
    oldTokenSequence: ["token-old", permanent],
  });
  const result = await run.context.DhametEmergency.resetAnonymous(permanent);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(result.uid, "uid-new");
  assert.equal(run.stats().signOutCalls, 1);
  assert.equal(run.stats().signInCalls, 1);
  assert.equal(run.sessionStorage.getItem("zamat.activeGameId"), null);
  assert.equal(run.localStorage.getItem("zamat.activeGameId.uid-old"), null);
  assert.equal(run.localStorage.getItem("zamat.online.outInvites.v1"), null);
  assert.deepEqual(run.stats().replacements, ["loby.html"]);
  assert.equal(run.stats().events.length, 1);
  assert.equal(run.stats().events[0].detail.oldUid, "uid-old");
  assert.equal(run.stats().events[0].detail.newUid, "uid-new");
  assert.equal(run.stats().events[0].detail.hadAssociation, true);
}

{
  const run = await runScenario({
    cookie: "dhamet2_browser_session=session-new",
    localStorage: {
      "dhamet2.auth.browser.v4": marker,
      "zamat.activeGameId.uid-old": "game-a",
      "zamat.activeGameTs.uid-old": String(Date.now()),
    },
  });
  assert.equal(run.auth.currentUser.uid, "uid-new");
  assert.equal(run.stats().signOutCalls, 1);
  assert.equal(run.stats().signInCalls, 1);
  assert.equal(run.localStorage.getItem("zamat.activeGameId.uid-old"), null);
}

const passive = fs.readFileSync("js/online.passive.js", "utf8");
const online = fs.readFileSync("js/online.js", "utf8");
const rules = fs.readFileSync("database.rules.json", "utf8");
assert.match(passive, /resetAnonymous\(error\)/);
assert.match(passive, /resetAnonymous\(err\)/);
assert.match(online, /resetAnonymous\(tokenError\)/);
assert.match(passive, /_pendingIncomingInviteUntil/);
assert.match(rules, /games/);
assert.match(rules, /newData/);

console.log("V37 safe anonymous recovery tests passed");
