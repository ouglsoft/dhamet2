import fs from "node:fs";

const ui = fs.readFileSync(new URL("../js/ui.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../pages/game.html", import.meta.url), "utf8");
const passive = fs.readFileSync(new URL("../js/online.passive.js", import.meta.url), "utf8");
const shell = fs.readFileSync(new URL("../js/emergency-shell.js", import.meta.url), "utf8");
const headers = fs.readFileSync(new URL("../_headers", import.meta.url), "utf8");

for (const id of ["btnNew", "btnSave", "btnResume"]) {
  if (game.includes(`id="${id}"`)) continue;
  const unsafe = new RegExp(`qs\(\"#${id}\"\)\.addEventListener`);
  if (unsafe.test(ui)) throw new Error(`${id} is absent from online game HTML but still bound unsafely`);
}
if (!shell.includes("waitForInitialAuthState")) throw new Error("auth persistence restoration is not awaited");
if (!shell.includes("resetAnonymous")) throw new Error("anonymous-session recovery is missing");
if (!passive.includes("Never mark the new session busy")) throw new Error("stale active-game recovery is missing");
if (!headers.includes("connect-src 'self' https://www.gstatic.com")) throw new Error("gstatic CSP connect allowance missing");
console.log("runtime contract tests passed");
