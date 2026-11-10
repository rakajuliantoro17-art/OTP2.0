import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const read = (path) => readFile(join(repoRoot, path), "utf8");
const manifest = JSON.parse(await readFile(join(root, "dist/manifest.json"), "utf8"));

assert.equal(manifest.name, "SEPHIA");
assert.equal(manifest.format, "browser-esm");
assert.equal(manifest.entrypoint, "host/mount-panitia-sephia.js");

const hostPage = await read("panitia/index.html");
const topbar = await read("panitia/components/topbar.html");
const alertComponent = await read("panitia/components/alert.html");
const bridge = await read("sephia/src/host/mount-panitia-sephia.js");

assert.match(hostPage, /loadComponent\("alertMount", "\.\/components\/alert\.html"\)/);
assert.match(hostPage, /import\("\.\.\/sephia\/src\/host\/mount-panitia-sephia\.js"\)/);
assert.match(hostPage, /SEPHIA.*dashboard tetap berjalan|dashboard tetap berjalan.*SEPHIA/i);
assert.match(topbar, /id="sephiaControlMount"/);
assert.match(alertComponent, /id="alertList"/);
assert.match(bridge, /getElementById\("alertList"\)/);
assert.match(bridge, /getElementById\("sephiaControlMount"\)/);

const paths = new Set(manifest.files.map((item) => item.path));
assert.ok(paths.has("host/mount-panitia-sephia.js"));
for (const path of [
  "runtime/create-sephia-runtime.js",
  "runtime/bind-page-lifecycle.js",
  "visual/visual-state.js",
  "visual/mount-sephia-controls.js",
  "adapters/dom-alert-observer.js",
]) assert.ok(paths.has(path), "Built integration dependency missing from manifest: " + path);

const imports = [...bridge.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)];
for (const match of imports) {
  const target = resolve(join(root, "src/host"), match[1]);
  const rel = relative(join(root, "src"), target);
  assert.ok(rel !== ".." && !rel.startsWith(".." + sep), "Host bridge import escapes src.");
  assert.ok(paths.has(rel.split(sep).join("/")), "Host bridge dependency missing from build manifest: " + rel);
}

assert.doesNotMatch(bridge, /firebase|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage/i);
console.log("SEPHIA host integration contract verified: Panitia mount points, fail-open loader boundary, and built host dependency closure.");
