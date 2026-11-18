import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("manual activation dispatches audio unlock before asynchronous wake-word startup", async () => {
  const host = await read("src/host/mount-panitia-sephia.js");
  const prepare = host.indexOf("speechAdapter.prepare()");
  const wakeStart = host.indexOf("wakeRecognizer.start()", prepare);
  assert.ok(prepare >= 0 && wakeStart > prepare);
});

test("content script creates and resumes AudioContext only from the explicit unlock event", async () => {
  const content = await read("extension/content-script.js");
  assert.match(content, /UNLOCK_EVENT/);
  assert.match(content, /new AudioContextImpl\(\)/);
  assert.match(content, /audioContext\.resume\(\)/);
  assert.match(content, /UNLOCK_RESULT_EVENT/);
  assert.match(content, /audioContext\.state === "running"/);
  assert.match(content, /AudioContext belum dibuka/);
});

test("page adapter exposes prepare and does not report audio availability before unlock", async () => {
  const adapter = await read("src/audio/chrome-native-messaging-tts.js");
  assert.match(adapter, /NATIVE_TTS_UNLOCK_EVENT/);
  assert.match(adapter, /prepare\s*=\s*\(\)\s*=>/);
  assert.match(adapter, /audioUnlocked/);
  assert.match(adapter, /connected && audioUnlocked/);
  assert.match(adapter, /NATIVE_TTS_UNLOCK_RESULT_EVENT/);
});

test("audio unlock remains manual and pagehide releases the AudioContext", async () => {
  const content = await read("extension/content-script.js");
  const host = await read("src/host/mount-panitia-sephia.js");
  assert.match(host, /onActivated\(\)/);
  assert.match(content, /window\.addEventListener\("pagehide"/);
  assert.match(content, /audioContext\.close\(\)/);
  assert.doesNotMatch(content, /setInterval|setTimeout|autoplay/i);
});
