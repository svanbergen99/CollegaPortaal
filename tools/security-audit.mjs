import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative } from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage"]);
const TEXT_EXTENSIONS = new Set([
  ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".html", ".css",
  ".md", ".yml", ".yaml", ".txt", ".env", ".ini", ".toml", ".xml", ".sh", ".ps1"
]);
const MAX_BYTES = 2 * 1024 * 1024;
const SELF = "tools/security-audit.mjs";

const retiredArtifacts = new Set([
  "break-calculator.js"
]);

const retiredCodePatterns = [
  ["legacy roster DOM id", /\brosterResult\b/],
  ["legacy roster CSS state", /\bhas-(?:month-)?roster\b/],
  ["legacy today-workers component", /\btoday-workers(?:-[a-z-]+)?\b/]
];

const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ["hard-coded bearer token", /\bBearer\s+[A-Za-z0-9._~+\/-]{20,}\b/i],
  ["hard-coded secret assignment", /\b(?:password|passwd|secret|token|api[_-]?key)\b\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/i]
];

const sensitiveFilePattern = /(^|\/)(?:\.env(?:\..+)?|id_rsa|id_ed25519|[^/]+\.(?:pem|key)|credentials?\.json|secrets?\.(?:json|ya?ml|txt))$/i;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) files.push(...await walk(`${dir}/${entry.name}`));
      continue;
    }
    if (entry.isFile()) files.push(`${dir}/${entry.name}`);
  }
  return files;
}

function isTextCandidate(path) {
  const name = path.split("/").pop() || "";
  return TEXT_EXTENSIONS.has(extname(name).toLowerCase()) || name.startsWith(".env");
}

const findings = [];
const files = await walk(ROOT);

for (const absolutePath of files) {
  const path = relative(ROOT, absolutePath).replaceAll("\\", "/");
  if (path === SELF) continue;

  if (retiredArtifacts.has(path)) {
    findings.push(`${path}: retired legacy artifact is still present`);
  }
  if (sensitiveFilePattern.test(path)) {
    findings.push(`${path}: sensitive filename should not be committed`);
  }

  if (!isTextCandidate(path)) continue;
  const info = await stat(absolutePath);
  if (info.size > MAX_BYTES) continue;

  const buffer = await readFile(absolutePath);
  if (buffer.includes(0)) continue;
  const text = buffer.toString("utf8");

  for (const [label, pattern] of secretPatterns) {
    if (pattern.test(text)) findings.push(`${path}: possible ${label}`);
  }
  for (const [label, pattern] of retiredCodePatterns) {
    if (pattern.test(text)) findings.push(`${path}: ${label} remains`);
  }
}

if (findings.length) {
  console.error("Security audit failed:\n");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Security audit passed: scanned ${files.length} repository files.`);
