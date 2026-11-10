import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 13 package and CI expose the on-device wake-word gate", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  assert.match(pkg.version, /^0\.\d+\.0-stage\.\d+$/);
  assert.equal(pkg.scripts["verify:wakeword"], "node --test ./tests/local-wake-word.test.mjs ./tests/panitia-wake-word-wiring.test.mjs");
  assert.match(workflow, /npm run verify:wakeword/);
  assert.match(workflow, /sephia-stage\d+-(?:local-wake-word|host-avatar-overlay|notification-speech-pipeline|local-voice-diagnostics)-/);
});

test("recognizer requires local Indonesian processing and never uses cloud fallback", async () => {
  const source = await read("src/audio/local-wake-word.js");
  assert.match(source, /processLocally: true/);
  assert.match(source, /instance\.processLocally = true/);
  assert.match(source, /langs: \["id-ID"\]/);
  assert.match(source, /transcript !== WAKE_WORD/);
  assert.doesNotMatch(source, /webkitSpeechRecognition|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB/);
});

test("Panitia manual controls arm and stop the local recognizer", async () => {
  const bridge = await read("src/host/mount-panitia-sephia.js");
  const controls = await read("src/visual/mount-sephia-controls.js");
  assert.match(bridge, /createLocalWakeWordRecognizer/);
  assert.match(bridge, /onActivated\(\)/);
  assert.match(bridge, /wakeRecognizer\.start\(\)/);
  assert.match(bridge, /wakeRecognizer\.stop\(\)/);
  assert.match(controls, /onActivated/);
  assert.match(controls, /onDeactivated/);
});

test("Stage 13 documentation states language-pack and workstation acceptance requirements", async () => {
  const report = await read("docs/STAGE-13-LOCAL-WAKE-WORD.md");
  assert.match(report, /processLocally/);
  assert.match(report, /id-ID/);
  assert.match(report, /secure context/);
  assert.match(report, /Panitia workstation/);
});


test("same-origin wake-word microphone is permitted while camera and geolocation remain blocked", async () => {
  const policy = JSON.parse(await read("../vercel.json"));
  const header = policy.headers.find((entry) => entry.source === "/(.*)");
  const permissions = header.headers.find((entry) => entry.key === "Permissions-Policy").value;
  assert.match(permissions, /microphone=\(self\)/);
  assert.match(permissions, /on-device-speech-recognition=\(self\)/);
  assert.match(permissions, /camera=\(\)/);
  assert.match(permissions, /geolocation=\(\)/);
});
