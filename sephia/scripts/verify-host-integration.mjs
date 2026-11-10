import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const read = (path) => readFile(join(repoRoot, path), "utf8");
const distRoot = join(root, "dist");
const manifest = JSON.parse(await readFile(join(distRoot, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

assert.equal(manifest.name, "SEPHIA");
assert.equal(manifest.version, packageJson.version);
assert.equal(manifest.format, "browser-esm");
assert.equal(manifest.entrypoint, "host/mount-panitia-sephia.js");
assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);

const hostPage = await read("panitia/index.html");
const topbar = await read("panitia/components/topbar.html");
const alertComponent = await read("panitia/components/alert.html");
const sourceBridge = await read("sephia/src/host/mount-panitia-sephia.js");
const builtBridge = await readFile(join(distRoot, "host/mount-panitia-sephia.js"), "utf8");

const topbarLoad = hostPage.indexOf('loadComponent("topbarMount", "./components/topbar.html")');
const alertLoad = hostPage.indexOf('loadComponent("alertMount", "./components/alert.html")');
const bridgeLoad = hostPage.indexOf('import("../sephia/src/host/mount-panitia-sephia.js")');
assert.ok(topbarLoad >= 0, "Panitia must load the topbar component.");
assert.ok(alertLoad > topbarLoad, "Panitia must load alert component after topbar.");
assert.ok(bridgeLoad > alertLoad, "SEPHIA must mount only after the alert component is loaded.");
assert.match(hostPage, /SEPHIA.*dashboard tetap berjalan|dashboard tetap berjalan.*SEPHIA/i);
assert.match(topbar, /id="sephiaControlMount"/);
assert.match(topbar, /id="sephiaAvatarMount"/);
assert.match(alertComponent, /id="alertList"/);
assert.match(sourceBridge, /getElementById\("alertList"\)/);
assert.match(sourceBridge, /getElementById\("sephiaControlMount"\)/);
assert.match(sourceBridge, /getElementById\("sephiaAvatarMount"\)/);
assert.match(sourceBridge, /mountSephiaAvatar/);
assert.equal(builtBridge, sourceBridge, "Built host bridge must exactly match the reviewed source bridge.");

const manifestPaths = new Set();
for (const item of manifest.files) {
  assert.equal(typeof item.path, "string");
  assert.equal(typeof item.bytes, "number");
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
  const absolute = resolve(distRoot, item.path);
  const rel = relative(distRoot, absolute);
  assert.ok(rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel), "Manifest path escapes dist: " + item.path);
  const bytes = await readFile(absolute);
  assert.equal(bytes.byteLength, item.bytes, "Built module byte size mismatch: " + item.path);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), item.sha256, "Built module hash mismatch: " + item.path);
  manifestPaths.add(item.path);
}

for (const path of [
  "host/mount-panitia-sephia.js",
  "runtime/create-sephia-runtime.js",
  "runtime/bind-page-lifecycle.js",
  "visual/visual-state.js",
  "visual/mount-sephia-controls.js",
  "visual/mount-sephia-avatar.js",
  "audio/announcement.js",
  "audio/browser-local-tts.js",
  "audio/local-wake-word.js",
  "adapters/dom-alert-observer.js",
]) assert.ok(manifestPaths.has(path), "Built integration dependency missing from manifest: " + path);

const imports = [...builtBridge.matchAll(/(?:from\s*|import\s*)["'](\.{1,2}\/[^"']+)["']/g)];
for (const match of imports) {
  const target = resolve(join(distRoot, "host"), match[1]);
  const rel = relative(distRoot, target);
  assert.ok(rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel), "Built host bridge import escapes dist.");
  await readFile(target);
  assert.ok(manifestPaths.has(rel.split(sep).join("/")), "Built host bridge dependency missing from manifest: " + rel);
}

assert.doesNotMatch(sourceBridge, /firebase|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB/i);
console.log("SEPHIA host integration verified: Panitia load order, source/dist parity, manifest hashes, dependency closure, and isolated host bridge.");
