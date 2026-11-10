import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 16 diagnostic page is included in the package and CI", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  assert.equal(pkg.version, "0.16.0-stage.16");
  assert.equal(pkg.scripts["verify:diagnostics"], "node --test ./tests/stage16-voice-diagnostics.test.mjs");
  assert.match(workflow, /npm run verify:diagnostics/);
  assert.match(workflow, /sephia-stage16-local-voice-diagnostics-/);
});

test("diagnostic page loads local modules only and does not auto-start microphone", async () => {
  const html = await read("staging/voice-diagnostics.html");
  const script = await read("staging/voice-diagnostics.js");
  assert.match(html, /lang="id"/);
  assert.match(html, /voice-diagnostics\.js/);
  assert.match(script, /dist\/audio\/browser-local-tts\.js/);
  assert.match(script, /dist\/audio\/local-wake-word\.js/);
  assert.match(script, /wakeStart\.addEventListener\("click"/);
  assert.doesNotMatch(script, /wake\.start\(\)\s*;/);
});

test("diagnostics use fixed synthetic phrase and dispose speech resources on pagehide", async () => {
  const script = await read("staging/voice-diagnostics.js");
  assert.match(script, /Uji suara SEPHIA/);
  assert.match(script, /Ucapkan|SEPHIA/);
  assert.match(script, /window\.addEventListener\("pagehide"/);
  assert.match(script, /wake\?\.dispose\(\)/);
  assert.match(script, /tts\.dispose\(\)/);
  assert.doesNotMatch(script, /firebase|moodle|student|nama siswa|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB/i);
});

test("Stage 16 documentation keeps actual workstation checks separate from production release", async () => {
  const report = await read("docs/STAGE-16-VOICE-DIAGNOSTICS.md");
  assert.match(report, /loopback/);
  assert.match(report, /BLOCKED/);
  assert.match(report, /Actual workstation acceptance remains required|workstation acceptance remains required/i);
});
