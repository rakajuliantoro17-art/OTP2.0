import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 12 package metadata and CI include the local Indonesian TTS gate", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const workflow = await read("../.github/workflows/sephia-tests.yml");
  assert.match(pkg.version, /^0\.\d+\.0-stage\.\d+$/);
  assert.equal(pkg.scripts["verify:tts"], "node --test ./tests/browser-local-tts.test.mjs ./tests/panitia-local-tts-wiring.test.mjs");
  assert.match(workflow, /npm run verify:tts/);
  assert.match(workflow, /sephia-stage\d+-(?:local-indonesian-tts|local-wake-word)-/);
});

test("browser TTS is wired through the Panitia host bridge and runtime", async () => {
  const bridge = await read("src/host/mount-panitia-sephia.js");
  const runtime = await read("src/runtime/create-sephia-runtime.js");
  assert.match(bridge, /createBrowserLocalIndonesianTts/);
  assert.match(bridge, /createNotificationSpeechController/);
  assert.match(bridge, /speechController,/);
  assert.match(runtime, /speechController\?\.announce\(event\)/);
});

test("local Indonesian voice policy rejects cloud and non-Indonesian voices", async () => {
  const adapter = await read("src/audio/browser-local-tts.js");
  assert.match(adapter, /voice\.localService === true/);
  assert.match(adapter, /\^id\(\?:-\|\$\)/i);
  assert.match(adapter, /utterance\.lang = "id-ID"/);
  assert.doesNotMatch(adapter, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB/);
});

test("Stage 12 documentation states the real workstation acceptance limits", async () => {
  const report = await read("docs/STAGE-12-LOCAL-INDONESIAN-TTS.md");
  assert.match(report, /English/);
  assert.match(report, /localService=true/);
  assert.match(report, /cannot guarantee|cannot.*guarantee/i);
  assert.match(report, /Panitia PC acceptance/);
});
