import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 8 exposes dependency-free check and build commands", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.scripts.check, "node ./scripts/check.mjs");
  assert.equal(pkg.scripts.build, "node ./scripts/build.mjs");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.private, true);
});

test("Stage 8 build is a browser ES module package and records hashes", async () => {
  const source = await read("scripts/build.mjs");
  assert.match(source, /createHash\("sha256"\)/);
  assert.match(source, /format:\s*"browser-esm"/);
  assert.match(source, /entrypoint:\s*"host\/mount-panitia-sephia\.js"/);
  assert.match(source, /import\s*\{\s*cp/);
  assert.doesNotMatch(source, /child_process|execSync|spawnSync/);
});

test("Stage 8 security check blocks network, persistence, eval, and microphone APIs", async () => {
  const source = await read("scripts/check.mjs");
  for (const pattern of [
    /network fetch/, /persistent browser storage/, /dynamic code evaluation/,
    /microphone access/, /source boundary/,
  ]) assert.match(source, pattern);
});

test("build workflow runs tests, static checks, build, and publishes a versioned CI artifact", async () => {
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run check/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /sephia-stage\d+-(?:host-trial-build|host-integration|local-indonesian-tts|local-wake-word|host-avatar-overlay|notification-speech-pipeline|local-voice-diagnostics)-/);
});
