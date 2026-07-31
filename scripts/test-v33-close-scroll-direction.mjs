import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const passive = read("js/online.passive.js");
const online = read("js/online.js");
const style = read("css/style.css");
const logView = read("js/ui/game-log-view.js");

const start = passive.indexOf("    _teardownPageRuntime: function () {");
const end = passive.indexOf("\n\n    _bindLifecycleCleanup: function () {", start);
assert.ok(start >= 0 && end > start, "pagehide runtime block must exist");
const closeBlock = passive.slice(start, end);
assert.doesNotMatch(closeBlock, /_teardownOnlineSubscriptions|\.off\s*\(|\.remove\s*\(|signOut|goOffline/,
  "tab closing must not synchronously tear down Firebase or write remote state");
assert.match(closeBlock, /_stopPresenceHeartbeat/);
assert.match(closeBlock, /_stopGamePresenceHeartbeat/);
assert.match(closeBlock, /_stopMoveCommitWatchdog/);
assert.match(online, /_cleanupOnline: function \(\) \{[\s\S]*_teardownOnlineSubscriptions\(\)/,
  "explicit leave cleanup must retain the full teardown");
assert.match(style, /\.directional-exit-icon\s*\{\s*transform: scaleX\(-1\);/);
assert.match(style, /html\[dir="ltr"\] \.directional-exit-icon\s*\{\s*transform: none/);
assert.match(logView, /if \(!changed && !cfg\.forceLatest\)/);
assert.doesNotMatch(logView, /requestAnimationFrame\(applyPosition/);
