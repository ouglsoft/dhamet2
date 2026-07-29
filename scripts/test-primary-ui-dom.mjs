import fs from "node:fs";
import crypto from "node:crypto";

const signatures = JSON.parse(fs.readFileSync("scripts/ui-dom-signatures.json", "utf8"));

function parseAttrs(raw) {
  const attrs = {};
  const re = /([:\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(raw))) attrs[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
}

function tokenize(html) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<![^>]*>|<\/[^>]+>|<[^>]+>|[^<]+/g;
  let m;
  while ((m = re.exec(html))) out.push(m[0]);
  return out;
}

function findFragment(html, selector) {
  const tag = selector === ".app" ? "div" : "main";
  const startRe = selector === ".app" ? /<div\b[^>]*class="[^"]*\bapp\b[^"]*"[^>]*>/i : /<main\b[^>]*>/i;
  const start = html.search(startRe);
  if (start < 0) throw new Error(`Missing DOM selector ${selector}`);
  const tokens = tokenize(html.slice(start));
  let depth = 0, result = "";
  for (const token of tokens) {
    result += token;
    if (new RegExp(`^<${tag}\\b`, "i").test(token)) depth++;
    else if (new RegExp(`^</${tag}>`, "i").test(token)) {
      depth--;
      if (depth === 0) return result;
    }
  }
  throw new Error(`Unclosed DOM selector ${selector}`);
}

function canonicalize(fragment, { removeBoard3d = false } = {}) {
  fragment = fragment.replace(/\?v=[^"'#\s>]+/g, "?v=__BUILD__");
  const tokens = tokenize(fragment);
  const stack = [];
  let root = null;
  for (const token of tokens) {
    if (/^<!--|^<!/i.test(token)) continue;
    if (/^<\//.test(token)) { stack.pop(); continue; }
    if (/^</.test(token)) {
      const mm = token.match(/^<([\w-]+)\b([\s\S]*?)\/?\s*>$/);
      if (!mm) continue;
      const tag = mm[1].toLowerCase();
      const attrs = parseAttrs(mm[2]);
      if (String(attrs.class || "").split(/\s+/).includes("z-lobby-back")) attrs.href = "__MODE_URL__";
      const node = [tag, Object.entries(attrs).sort(([a],[b]) => a.localeCompare(b)), []];
      if (stack.length) stack[stack.length - 1][2].push(node); else root = node;
      if (!/\/$/.test(token.replace(/>$/, "")) && !["img","meta","link","input","br","hr","source"].includes(tag)) stack.push(node);
    } else {
      const text = token.replace(/\s+/g, " ").trim();
      if (text && stack.length) stack[stack.length - 1][2].push(["#text", text]);
    }
  }
  return root;
}

for (const [page, info] of Object.entries(signatures)) {
  const html = fs.readFileSync(`pages/${page}.html`, "utf8");
  const fragment = findFragment(html, info.selector);
  const canonical = canonicalize(fragment, { removeBoard3d: page === "game" });
  const actual = crypto.createHash("sha256").update(Buffer.from(JSON.stringify(canonical))).digest("hex");
  // Stored signature was generated from the same canonical JSON representation.
  if (actual !== info.jsonSha256) {
    throw new Error(`Visible ${page} DOM differs from approved online-only UI: expected ${info.jsonSha256}, actual ${actual}`);
  }
}
console.log("approved online-only lobby and game DOM structures match");
