import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publicFiles, stagePages } from "./build-pages.mjs";

const fixture = await mkdtemp(join(tmpdir(), "pages-boundary-"));
try {
  const source = join(fixture, "source");
  const destination = join(fixture, "output");
  await mkdir(source);
  for (const path of publicFiles) await writeFile(join(source, path), `Synthetic asset: ${path}`);
  for (const path of [".env", "private.json", "unreviewed.js", "README.md"]) await writeFile(join(source, path), "must not be published");
  await mkdir(join(source, ".git"));
  await writeFile(join(source, ".git", "config"), "must not be published");
  await stagePages(source, destination);
  assert.deepEqual((await readdir(destination)).sort(), [...publicFiles, ".nojekyll"].sort());
  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "Synthetic asset: index.html");
  await rm(join(source, "index.html"));
  await symlink(join(source, "private.json"), join(source, "index.html"));
  await assert.rejects(stagePages(source, join(fixture, "rejected")), /Non-regular public asset/);
  console.log("Pages boundary tests passed: exact public list; unreviewed files excluded; symlink rejected.");
} finally { await rm(fixture, { recursive: true, force: true }); }
