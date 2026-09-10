import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "node_modules"]);
const WEB_ASSET_EXT = "(?:html|js|css|json|png|jpg|jpeg|gif|webp|svg|mp4|webm|ico)";
const HTML_CSS_REF_RE = new RegExp(`(?:src|href)\\s*=\\s*["']([^"']+\\.${WEB_ASSET_EXT})(?:\\?[^"']*)?["']|url\\(\\s*["']?([^"')]+\\.${WEB_ASSET_EXT})(?:\\?[^"')]+)?["']?\\s*\\)`, "gi");
const JS_CODE_REF_RE = /["'`]([^"'`\r\n]+?\.(?:js|css))(?:\?[^"'`\r\n]*)?["'`]/gi;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function cleanRef(ref) {
  if (!ref || ref.includes("${") || /^(?:https?:|data:|blob:|mailto:|tel:|#|javascript:)/i.test(ref)) return "";
  return decodeURIComponent(ref.split("#")[0].split("?")[0]);
}

function existsAsRuntimeRef(sourceFile, ref) {
  if (!ref) return true;
  if (ref.startsWith("/")) return fs.existsSync(path.join(ROOT, ref.replace(/^\/+/, "")));
  // Hoofdportal laadt veel modules document-root-relatief; extension- en mapcode
  // kan juist bestand-relatief laden. Accepteer daarom beide geldige vormen.
  return fs.existsSync(path.join(ROOT, ref)) || fs.existsSync(path.resolve(path.dirname(sourceFile), ref));
}

const files = walk(ROOT);
const missing = new Set();
const syntaxErrors = [];

for (const file of files) {
  const ext = path.extname(file).toLowerCase();
  const relative = path.relative(ROOT, file);

  if (ext === ".html" || ext === ".css") {
    const text = fs.readFileSync(file, "utf8");
    HTML_CSS_REF_RE.lastIndex = 0;
    let match;
    while ((match = HTML_CSS_REF_RE.exec(text))) {
      const ref = cleanRef(match[1] || match[2]);
      if (ref && !existsAsRuntimeRef(file, ref)) missing.add(`${relative} -> ${ref}`);
    }
  }

  if (ext === ".js") {
    const text = fs.readFileSync(file, "utf8");
    JS_CODE_REF_RE.lastIndex = 0;
    let match;
    while ((match = JS_CODE_REF_RE.exec(text))) {
      const ref = cleanRef(match[1]);
      if (ref && !existsAsRuntimeRef(file, ref)) missing.add(`${relative} -> ${ref}`);
    }
  }
}

for (const file of files.filter((item) => [".js", ".mjs"].includes(path.extname(item).toLowerCase()))) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) {
    syntaxErrors.push(`${path.relative(ROOT, file)}: ${(check.stderr || check.stdout || "syntax error").trim()}`);
  }
}

console.log(`Repo health: ${files.length} bestanden gecontroleerd.`);
if (missing.size) {
  console.error("\nOntbrekende runtime JS/CSS/HTML-verwijzingen:");
  for (const item of [...missing].sort()) console.error(`- ${item}`);
}
if (syntaxErrors.length) {
  console.error("\nJavaScript syntaxproblemen:");
  for (const item of syntaxErrors) console.error(`- ${item}`);
}
if (missing.size || syntaxErrors.length) process.exit(1);
console.log("Repo health OK.");
