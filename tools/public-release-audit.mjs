import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const forbiddenPath = /(^|\/)(?:rooster|roster|traffic|auth|permission|credential|secret|wfm|agenda|planner)/i;
const allowExternal = new Set(["https://api.open-meteo.com"]);
const files = [];
function walk(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) walk(full); else files.push(path.relative(root, full).replaceAll(path.sep, "/"));
  }
}
walk(root);
const failures = files.filter((file) => forbiddenPath.test(file));
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
if (!index.includes("Content-Security-Policy") || !index.includes("script-src 'self'")) failures.push("index.html mist verplichte CSP voor scripts");
for (const match of app.matchAll(/https:\/\/[^"'`\s]+/g)) {
  const origin = new URL(match[0]).origin;
  if (!allowExternal.has(origin)) failures.push(`niet-toegestane externe verbinding: ${origin}`);
}
if (failures.length) {
  console.error("Public release audit FAILED");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log("Public release audit OK.");
