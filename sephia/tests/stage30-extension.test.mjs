import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateNativeResponse,
  MAX_NATIVE_AUDIO_BYTES,
  MAX_NATIVE_AUDIO_BASE64_LENGTH,
} from "../extension/protocol.js";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Chrome extension uses only activeTab, scripting, and Native Messaging permissions", async () => {
  const manifest = JSON.parse(await read("extension/manifest.json"));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ["activeTab", "nativeMessaging", "scripting"]);
  assert.equal("host_permissions" in manifest, false);
  assert.equal("storage" in manifest.permissions, false);
  assert.equal("externally_connectable" in manifest, false);
});

test("extension pairing requires a user click and the HTTPS Panitia tab identity", async () => {
  const popup = await read("extension/popup.js");
  const worker = await read("extension/service-worker.js");
  assert.match(popup, /button\.addEventListener\("click"/);
  assert.match(popup, /url\.protocol !== "https:"/);
  assert.match(popup, /\/panitia/);
  assert.match(popup, /SMANSASOO CBT LOCK 2\.0/);
  assert.match(worker, /activeTab|SEPHIA_PAIR_ACTIVE_TAB/);
  assert.match(worker, /sender\.tab\?\.id !== pairedTab\.tabId/);
  assert.match(worker, /pairedTab\.origin/);
});

test("native bridge forwards only fixed action and never sends arbitrary text or identity", async () => {
  const worker = await read("extension/service-worker.js");
  const content = await read("extension/content-script.js");
  assert.match(worker, /nativePort\.postMessage\(\{ version: 1, action: "synthesize-approved-announcement" \}\)/);
  assert.doesNotMatch(worker, /studentName|className|violationCount|eventId|text:/i);
  assert.doesNotMatch(content, /fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB/);
  assert.match(content, /createBuffer\(1, pcm\.length, 24000\)/);
  assert.match(content, /pagehide/);
});

test("native response validator rejects malformed, oversized, or extensible payloads", () => {
  const success = {
    version: 1,
    ok: true,
    format: "pcm_s16le",
    sampleRate: 24000,
    channels: 1,
    durationMs: 2400,
    audioBase64: "AQIDBA==",
  };
  assert.equal(validateNativeResponse(success), true);
  assert.equal(validateNativeResponse({ ...success, studentName: "not allowed" }), false);
  assert.equal(validateNativeResponse({ ...success, sampleRate: 16000 }), false);
  assert.equal(validateNativeResponse({ ...success, audioBase64: "A".repeat(MAX_NATIVE_AUDIO_BASE64_LENGTH + 4) }), false);
  assert.equal(validateNativeResponse({
    version: 1, ok: false, code: "ENGINE_UNAVAILABLE",
  }), true);
  assert.equal(validateNativeResponse({
    version: 1, ok: false, code: "UNKNOWN",
  }), false);
  assert.equal(MAX_NATIVE_AUDIO_BYTES, 716800);
});

test("extension remains a bridge only; it cannot change OTP or access school backends", async () => {
  const popup = await read("extension/popup.js");
  const worker = await read("extension/service-worker.js");
  const content = await read("extension/content-script.js");
  for (const source of [popup, worker, content]) {
    assert.doesNotMatch(source, /firebase|moodle|generateOTP|validateOTP|resetOTP|unlockStudent/i);
  }
});
