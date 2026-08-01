import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../js/access-gate.js", import.meta.url), "utf8");
const NOW = 1_800_000_000_000;

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    get length() { return values.size; },
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    values,
  };
}

function execute(url, { session = {}, local = {}, referrer = "" } = {}) {
  let redirected = "";
  let replacedHistory = "";
  const sessionStore = storage(session);
  const localStore = storage(local);
  const context = {
    URL,
    URLSearchParams,
    Date: { now: () => NOW },
    Set,
    JSON,
    sessionStorage: sessionStore,
    localStorage: localStore,
    location: { href: url, replace(value) { redirected = value; } },
    document: { referrer },
    history: { state: null, replaceState(_state, _title, value) { replacedHistory = value; } },
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return { redirected, replacedHistory, sessionStore, localStore };
}

test("direct backup lobby access returns to the canonical app", () => {
  const result = execute("https://dhamet2.ouglsoft.com/pages/loby.html");
  assert.equal(result.redirected, "https://ouglsoft.com/dhamet");
});

test("existing emergency flag alone is not an admission", () => {
  const result = execute("https://dhamet2.ouglsoft.com/pages/loby.html?emergency=1");
  assert.equal(result.redirected, "https://ouglsoft.com/dhamet");
});

test("entry produced by the original route is admitted and scrubbed", () => {
  const token = "v1." + "a".repeat(36);
  const result = execute(`https://dhamet2.ouglsoft.com/pages/loby.html?emergency=transient&entry=${token}`);
  assert.equal(result.redirected, "");
  assert.equal(result.replacedHistory, "/pages/loby.html?emergency=transient");
  const admission = JSON.parse(result.sessionStore.getItem("dhamet2.backupAdmission.v1"));
  assert.equal(admission.version, 1);
  assert.equal(admission.expiresAt, NOW + 12 * 60 * 60 * 1000);
});

test("the previous original release remains compatible through its official referrer", () => {
  const result = execute("https://dhamet2.ouglsoft.com/pages/loby.html?emergency=1", {
    referrer: "https://ouglsoft.com/dhamet/pages/mode.html",
  });
  assert.equal(result.redirected, "");
  assert.equal(JSON.parse(result.sessionStore.getItem("dhamet2.backupAdmission.v1")).version, 1);
});

test("an admitted browser session can move from lobby to game", () => {
  const admission = JSON.stringify({ version: 1, expiresAt: NOW + 60_000 });
  const result = execute("https://dhamet2.ouglsoft.com/pages/game.html?pvp=1&gid=g1", {
    session: { "dhamet2.backupAdmission.v1": admission },
  });
  assert.equal(result.redirected, "");
});

test("expired admission is rejected when no match is active", () => {
  const admission = JSON.stringify({ version: 1, expiresAt: NOW - 1 });
  const result = execute("https://dhamet2.ouglsoft.com/pages/loby.html", {
    session: { "dhamet2.backupAdmission.v1": admission },
  });
  assert.equal(result.redirected, "https://ouglsoft.com/dhamet");
});

test("an active local match remains recoverable after admission expiry", () => {
  const result = execute("https://dhamet2.ouglsoft.com/pages/game.html?pvp=1&gid=g1", {
    local: {
      "zamat.activeGameId.uid-1": "g1",
      "zamat.activeGameTs.uid-1": String(NOW - 60_000),
    },
  });
  assert.equal(result.redirected, "");
});

test("a fabricated token without a supported route mode is rejected", () => {
  const token = "v1." + "b".repeat(36);
  const result = execute(`https://dhamet2.ouglsoft.com/pages/loby.html?entry=${token}`);
  assert.equal(result.redirected, "https://ouglsoft.com/dhamet");
});

test("backup root and index redirect to the canonical app", () => {
  const redirects = fs.readFileSync(new URL("../_redirects", import.meta.url), "utf8");
  assert.match(redirects, /^\/ https:\/\/ouglsoft\.com\/dhamet 302$/m);
  assert.match(redirects, /^\/index\.html https:\/\/ouglsoft\.com\/dhamet 302$/m);
});
