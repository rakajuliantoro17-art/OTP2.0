import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Panitia host fixture imports the built host bridge", async () => {
  const fixture = await read("staging/panitia-host-fixture.js");
  assert.match(fixture, /\.\.\/dist\/host\/mount-panitia-sephia\.js/);
  assert.doesNotMatch(fixture, /\.\.\/src\//);
});

test("Panitia host fixture uses exact host mount IDs and synthetic-only alerts", async () => {
  const html = await read("staging/panitia-host.html");
  const fixture = await read("staging/panitia-host-fixture.js");
  assert.match(html, /id="sephiaControlMount"/);
  assert.match(html, /id="alertList"/);
  assert.match(html, /tidak terhubung ke OTP 2\.0, Firebase, API, Moodle/i);
  assert.match(fixture, /SIMULASI/);
  assert.match(fixture, /onNotification\(event\)/);
  assert.doesNotMatch(fixture, /firebase|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/i);
});

test("host callback remains optional and production default remains no-op", async () => {
  const bridge = await read("src/host/mount-panitia-sephia.js");
  assert.match(bridge, /onNotification = \(\) => \{\}/);
  assert.match(bridge, /onNotification\(event\)/);
  assert.match(bridge, /try \{ onNotification\(event\); \} catch \(error\) \{ report\(error\); \}/);
});

test("Stage 10 verifier checks both built fixtures and remains wired in current CI", async () => {
  const verifier = await read("scripts/verify-staging-build.mjs");
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  const pkg = JSON.parse(await read("package.json"));
  assert.match(pkg.version, /^0\.\d+\.0-stage\.\d+$/);
  assert.match(verifier, /staging\/fixture\.js/);
  assert.match(verifier, /staging\/panitia-host-fixture\.js/);
  assert.match(verifier, /manifestPaths\.has/);
  assert.match(workflow, /npm run verify:staging/);
  assert.match(workflow, /sephia-stage\d+-(?:host-trial-build|host-integration|local-indonesian-tts|local-wake-word|host-avatar-overlay|notification-speech-pipeline|local-voice-diagnostics)-/);
});
