import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = join(root, "staging", "fixture.js");
const distRoot = join(root, "dist");
const fixture = await readFile(fixturePath, "utf8");
const manifest = JSON.parse(await readFile(join(distRoot, "manifest.json"), "utf8"));
assert.equal(manifest.name, "SEPHIA");
assert.equal(manifest.format, "browser-esm");
assert.ok(manifest.files.length > 0, "Build manifest must list modules.");

const imports = [...fixture.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)];
assert.ok(imports.length > 0, "Staging fixture must import built modules.");
for (const match of imports) {
  const target = resolve(dirname(fixturePath), match[1]);
  const rel = relative(distRoot, target);
  assert.ok(rel !== ".." && !rel.startsWith(".." + sep), "Fixture import must resolve inside dist: " + match[1]);
  await readFile(target);
}
const manifestPaths = new Set(manifest.files.map((file) => file.path));
for (const match of imports) {
  const target = resolve(dirname(fixturePath), match[1]);
  const rel = relative(distRoot, target).split(sep).join("/");
  assert.ok(manifestPaths.has(rel), "Fixture module must be listed in manifest: " + rel);
}
console.log("SEPHIA staging fixture resolves", imports.length, "built imports; manifest verified.");
