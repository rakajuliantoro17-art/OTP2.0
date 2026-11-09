import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(root, "dist");
const manifest = JSON.parse(await readFile(join(distRoot, "manifest.json"), "utf8"));
assert.equal(manifest.name, "SEPHIA");
assert.equal(manifest.format, "browser-esm");
assert.ok(manifest.files.length > 0, "Build manifest must list modules.");

const fixtures = ["staging/fixture.js", "staging/panitia-host-fixture.js"];
const manifestPaths = new Set(manifest.files.map((file) => file.path));
let verifiedImports = 0;

for (const relativeFixture of fixtures) {
  const fixturePath = join(root, relativeFixture);
  const fixture = await readFile(fixturePath, "utf8");
  const imports = [...fixture.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)];
  assert.ok(imports.length > 0, relativeFixture + " must import built modules.");

  for (const match of imports) {
    const target = resolve(dirname(fixturePath), match[1]);
    const rel = relative(distRoot, target);
    assert.ok(rel !== ".." && !rel.startsWith(".." + sep), "Fixture import must resolve inside dist: " + match[1]);
    await readFile(target);
    const manifestPath = rel.split(sep).join("/");
    assert.ok(manifestPaths.has(manifestPath), "Fixture module must be listed in manifest: " + manifestPath);
    verifiedImports += 1;
  }
}

assert.ok(
  (await readFile(join(root, "staging/panitia-host-fixture.js"), "utf8")).includes("../dist/host/mount-panitia-sephia.js"),
  "Panitia host fixture must import the built host bridge."
);
console.log("SEPHIA staging fixtures resolve", verifiedImports, "built imports; manifest verified.");
