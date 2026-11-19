import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Panitia UI exposes a status line and a user-initiated speaker test", async () => {
  const controls = await read("src/visual/mount-sephia-controls.js");
  assert.match(controls, /sephia-status/);
  assert.match(controls, /Uji suara SEPHIA/);
  assert.match(controls, /isSpeechReady/);
  assert.match(controls, /onTestSpeech/);
  assert.match(controls, /speaker dan volume Windows/);
});

test("Panitia host connects bridge readiness and local wake-word states to visible diagnostics", async () => {
  const host = await read("src/host/mount-panitia-sephia.js");
  assert.match(host, /onStatusChange/);
  assert.match(host, /bridge-waiting/);
  assert.match(host, /audio-unlock-failed/);
  assert.match(host, /wake word belum aktif/i);
  assert.match(host, /acknowledgeWakeWord/);
  assert.match(host, /Panggilan terdeteksi\. SEPHIA sedang merespons/);
  assert.match(host, /onTestSpeech: \(\) => speechController\.test\(\)/);
});

test("manual test uses only the fixed approved generic announcement", async () => {
  const controller = await read("src/audio/announcement.js");
  assert.match(controller, /test:\s*\(\)\s*=>\s*speakApprovedPhrase\(DEFAULT_ANNOUNCEMENT\)/);
  assert.match(controller, /speakApprovedPhrase\(DEFAULT_ANNOUNCEMENT\)/);
  assert.match(controller, /Ya, Panitia\. SEPHIA siap membantu\./);
  assert.doesNotMatch(controller, /studentName|className|event\.message/);
});

test("wake-word invocation triggers fixed spoken acknowledgement and visual speaking state", async () => {
  const host = await read("src/host/mount-panitia-sephia.js");
  const controller = await read("src/audio/announcement.js");
  assert.match(host, /acknowledgeWakeWord/);
  assert.match(host, /visualState\.setState\("listening"\)/);
  assert.match(controller, /acknowledgeWakeWord:\s*\(\)\s*=>\s*speakApprovedPhrase\(WAKE_WORD_ACKNOWLEDGEMENT\)/);
});
