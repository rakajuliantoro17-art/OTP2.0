import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_ANNOUNCEMENT, WAKE_WORD_ACKNOWLEDGEMENT } from "../src/audio/announcement.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(join(root, path), "utf8");
const exists = async (path) => { try { await access(join(root, path)); return true; } catch { return false; } };
const actions = [
  "synthesize-approved-announcement",
  "synthesize-approved-wake-acknowledgement",
];

const [pkg, adapter, localTts, contentScript, worker, nativeMain, inference, workflow, manifest] =
  await Promise.all([
    read("package.json"),
    read("src/audio/chrome-native-messaging-tts.js"),
    read("src/audio/local-neural-tts.js"),
    read("extension/content-script.js"),
    read("extension/service-worker.js"),
    read("native-host/src/main.rs"),
    read("native-host/src/inference.rs"),
    read("../.github/workflows/sephia-tests.yml"),
    read("extension/manifest.json"),
  ]);

assert.equal(pkg.version, "0.40.0-stage.40", "Stage 40 package version must be pinned.");
assert.equal(DEFAULT_ANNOUNCEMENT,
  "Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.");
assert.equal(WAKE_WORD_ACKNOWLEDGEMENT, "Ya, Panitia. SEPHIA siap membantu.");

for (const action of actions) {
  for (const [name, source] of [
    ["page adapter", adapter],
    ["extension content script", contentScript],
    ["extension service worker", worker],
    ["Rust Native Host", nativeMain],
    ["Laras inference", inference],
  ]) {
    assert.ok(source.includes(action), name + " is missing approved action: " + action);
  }
}

assert.match(localTts, /APPROVED_NEURAL_TTS_TEXTS = Object\.freeze\(\[/);
assert.match(localTts, /APPROVED_NEURAL_TTS_TEXT,/);
assert.match(localTts, /APPROVED_WAKE_ACK_TEXT,/);
assert.match(adapter, /text === APPROVED_NEURAL_TTS_TEXT/);
assert.match(adapter, /text === APPROVED_WAKE_ACK_TEXT/);
assert.match(nativeMain, /APPROVED_ACTION/);
assert.match(nativeMain, /APPROVED_WAKE_ACTION/);
assert.match(inference, /"synthesize-approved-announcement" => APPROVED_PHRASE/);
assert.match(inference, /"synthesize-approved-wake-acknowledgement" => APPROVED_WAKE_ACK/);
assert.match(inference, /const APPROVED_PHRASE: &str = "Perhatian, Panitia/);
assert.match(inference, /const APPROVED_WAKE_ACK: &str = "Ya, Panitia\. SEPHIA siap membantu\."/);
assert.match(manifest, /"nativeMessaging"/);
assert.doesNotMatch(contentScript, /text:\s*detail\.text|studentName|className|violationCount/i);
assert.doesNotMatch(worker, /text:\s*message\.text|studentName|className|violationCount/i);

const lockExists = await exists("native-host/Cargo.lock");
assert.equal(lockExists, true, "Native Host Cargo.lock must be included.");
const stage40DocExists = await exists("docs/STAGE-40-NATIVE-CONTRACT-INTEGRITY.md");
assert.equal(stage40DocExists, true, "Stage 40 integrity runbook is missing.");
assert.match(workflow, /Verify Stage 40 native speech contract integrity/);
assert.match(workflow, /STAGE-40-NATIVE-CONTRACT-INTEGRITY\.md/);
assert.match(workflow, /native-host\/Cargo\.lock/);

console.log(JSON.stringify({
  stage: 40,
  status: "PASS",
  verified: [
    "fixed phrase constants",
    "two-action allowlist parity across page, extension, Rust host, and inference",
    "no free-form text or student metadata transport",
    "Native Messaging permission",
    "locked Cargo dependency graph",
    "CI verification and artifact documentation",
  ],
}, null, 2));
