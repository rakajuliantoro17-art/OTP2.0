import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("staging fixture imports only the built dist modules", async () => {
  const fixture = await read("staging/fixture.js");
  assert.match(fixture, /\.\.\/dist\/runtime\/create-sephia-runtime\.js/);
  assert.match(fixture, /\.\.\/dist\/audio\/announcement\.js/);
  assert.match(fixture, /\.\.\/dist\/visual\/mount-sephia-avatar\.js/);
  assert.doesNotMatch(fixture, /\.\.\/src\//);
});

test("staging fixture remains synthetic and does not connect to host services", async () => {
  const html = await read("staging/index.html");
  const fixture = await read("staging/fixture.js");
  assert.match(html, /Lingkungan simulasi terisolasi/);
  assert.match(html, /tidak terhubung ke OTP 2\.0, Firebase, API, Moodle/i);
  assert.match(fixture, /SIMULASI/);
  assert.doesNotMatch(fixture, /firebase|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/i);
});

test("Chrome runbook builds dist before serving fixture on loopback", async () => {
  const runbook = await read("docs/STAGE-6-CHROME-TEST-RUNBOOK.md");
  assert.match(runbook, /npm run build/);
  assert.match(runbook, /127\.0\.0\.1:4173\/staging/);
  assert.match(runbook, /mock/i);
  assert.match(runbook, /panitia-host\.html/);
});

test("Stage 10 package verifies both built fixtures before artifact upload", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  const verifier = await read("scripts/verify-staging-build.mjs");
  assert.equal(pkg.scripts["verify:staging"], "node ./scripts/verify-staging-build.mjs");
  assert.equal(pkg.version, "0.10.0-stage.10");
  assert.match(verifier, /manifest\.json/);
  assert.match(verifier, /manifestPaths\.has/);
  assert.match(verifier, /panitia-host-fixture\.js/);
  assert.match(workflow, /npm run verify:staging/);
  assert.match(workflow, /sephia-stage10-host-trial-build-/);
});
