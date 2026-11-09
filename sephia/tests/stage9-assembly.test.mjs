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
  assert.match(html, /tidak terhubung ke OTP 2\.0, Firebase, API, Moodle/);
  assert.match(fixture, /SIMULASI/);
  assert.doesNotMatch(fixture, /firebase|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource/i);
});

test("Chrome runbook builds dist before serving fixture on loopback", async () => {
  const runbook = await read("docs/STAGE-6-CHROME-TEST-RUNBOOK.md");
  assert.match(runbook, /npm run build/);
  assert.match(runbook, /127\.0\.0\.1:4173\/staging/);
  assert.match(runbook, /mock/i);
});
