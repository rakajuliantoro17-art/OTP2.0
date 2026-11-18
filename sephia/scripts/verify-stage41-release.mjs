import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const pkg = JSON.parse(await read("package.json"));
const build = JSON.parse(await read("dist/manifest.json"));
const extension = JSON.parse(await read("extension/manifest.json"));
const provenance = JSON.parse(await read("docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json"));
const workflow = await read("../.github/workflows/sephia-tests.yml");
const notices = await read("native-host/THIRD-PARTY-NOTICES.md");
const runbook = await read("docs/STAGE-36-PRODUCTION-CANDIDATE-RUNBOOK.md");

assert.equal(pkg.version, "0.41.0-stage.41", "Stage 41 package version mismatch.");
assert.equal(build.name, "SEPHIA");
assert.equal(build.version, pkg.version, "Build manifest version does not match package.");
assert.equal(build.format, "browser-esm");
assert.equal(build.entrypoint, "host/mount-panitia-sephia.js");
assert.ok(typeof build.buildId === "string" && build.buildId.length > 0);
if (process.env.GITHUB_SHA) assert.equal(build.buildId, process.env.GITHUB_SHA, "Build SHA differs from workflow commit.");
assert.match(extension.version, /^\\d+\\.\\d+\\.\\d+$/);
assert.ok(Array.isArray(build.files) && build.files.length > 0);

const listed = new Set();
for (const item of build.files) {
  assert.equal(typeof item.path, "string");
  assert.ok(!item.path.startsWith("/") && !item.path.includes("\\\\") &&
    !item.path.split("/").some((part) => part === ".." || part === ""), "Unsafe build path.");
  assert.ok(Number.isSafeInteger(item.bytes) && item.bytes >= 0);
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
  const absolute = resolve(join(root, "dist"), item.path);
  const rel = relative(join(root, "dist"), absolute);
  assert.ok(rel !== ".." && !rel.startsWith(".." + sep), "Build path escapes dist.");
  const bytes = await readFile(absolute);
  assert.equal(bytes.byteLength, item.bytes, "Build size mismatch: " + item.path);
  assert.equal(digest(bytes), item.sha256, "Build SHA-256 mismatch: " + item.path);
  listed.add(item.path);
}
const required = [
  "host/mount-panitia-sephia.js",
  "audio/announcement.js",
  "audio/chrome-native-messaging-tts.js",
  "audio/local-neural-tts.js",
  "audio/local-wake-word.js",
  "visual/mount-sephia-avatar.js",
];
for (const path of required) assert.ok(listed.has(path), "Required release module is missing: " + path);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path);
  }
  return files;
}
const sourceFiles = await walk(join(root, "src"));
assert.equal(sourceFiles.length, listed.size, "Build manifest must include every source JavaScript module exactly once.");
for (const path of sourceFiles) {
  const rel = relative(join(root, "src"), path).split(sep).join("/");
  assert.ok(listed.has(rel), "Source module is absent from release manifest: " + rel);
}

assert.equal(provenance.modelLicense, "CC-BY-4.0");
assert.match(provenance.modelRevision, /^[a-f0-9]{40}$/);
assert.match(provenance.runtimeRevision, /^[a-f0-9]{40}$/);
assert.match(provenance.modelBundleSha256, /^[a-f0-9]{64}$/);
assert.ok(Array.isArray(provenance.files) && provenance.files.length > 0);
const sorted = [...provenance.files].sort((a, b) => a.path.localeCompare(b.path, "en"));
const canonical = sorted.map((file) => {
  assert.ok(!file.path.startsWith("/") && !file.path.includes("\\\\") &&
    !file.path.split("/").some((part) => part === ".." || part === ""), "Unsafe model provenance path.");
  assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
  assert.match(file.sha256, /^[a-f0-9]{64}$/);
  return file.path + "|" + file.bytes + "|" + file.sha256;
}).join("\\n");
assert.equal(digest(canonical), provenance.modelBundleSha256, "Pinned model aggregate digest mismatch.");
assert.equal(provenance.files.reduce((sum, file) => sum + file.bytes, 0), provenance.modelBundleBytes);
assert.equal(provenance.voiceReference.included, false, "A user voice reference must never be bundled.");
assert.match(notices, /Pocket TTS Indonesian oleh anak10thn, CC-BY-4.0/);
assert.match(notices, new RegExp(provenance.runtimeRevision));
assert.match(runbook, /same commit/i);
assert.match(workflow, /Verify Stage 41 reproducible release integrity/);
assert.match(workflow, /STAGE-41-REPRODUCIBLE-RELEASE-INTEGRITY\\.md/);
assert.match(workflow, /sephia-stage41-panitia-bundle/);
assert.match(workflow, /sephia-native-host-windows-/);

console.log(JSON.stringify({
  stage: 41,
  status: "PASS",
  buildId: build.buildId,
  version: build.version,
  modules: build.files.length,
  modelFilesPinned: provenance.files.length,
  checks: [
    "source-to-dist module closure",
    "per-file byte count and SHA-256",
    "build commit provenance",
    "pinned model/runtime revisions and aggregate digest",
    "voice reference excluded from repository artifact",
    "license attribution and same-commit release workflow",
  ],
}, null, 2));
