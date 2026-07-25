import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const banned=["index.html","pages/mode.html","pages/dashboard.html","js/dashboard.js","js/leaderboard.js","js/ai.worker.js","training","functions"];
for(const p of banned){if(fs.existsSync(path.join(root,p)))throw new Error(`Forbidden path remains: ${p}`)}
const required=["pages/loby.html","pages/game.html","js/online.js","js/online.passive.js","shared/dhamet-rules.js","shared/dhamet-state.js","shared/dhamet-turn-resolution.js","shared/dhamet-move.js","shared/dhamet-soufla.js","shared/dhamet-control.js","shared/dhamet-result.js","shared/dhamet-match-end.js","js/rules-parity-runtime.js","database.rules.json"];
for(const p of required){if(!fs.existsSync(path.join(root,p)))throw new Error(`Missing online path: ${p}`)}
console.log("online-only check passed");
