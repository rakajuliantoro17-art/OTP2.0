import test from "node:test";
import assert from "node:assert/strict";
import {
  createQualifiedLocalNeuralEngine,
  MAX_NEURAL_AUDIO_BYTES,
} from "../src/audio/qualified-local-neural-engine.js";
import { APPROVED_NEURAL_TTS_TEXT } from "../src/audio/local-neural-tts.js";

const modelHash = "a".repeat(64);
const voiceHash = "b".repeat(64);
const manifest = () => ({
  schemaVersion: 1,
  engineId: "laras-pocket-tts",
  execution: "local-only",
  runtimeVersion: "prototype-0.1.0",
  model: { sha256: modelHash, bytes: 160000000, license: "Apache-2.0", licenseEvidence: "MODEL-LICENSE-REVIEW-01" },
  voice: {
    profile: "adult-feminine-indonesian",
    referenceSha256: voiceHash,
    consent: { granted: true, scope: "SEPHIA local announcement synthesis", evidenceRef: "VOICE-CONSENT-REVIEW-01" },
  },
});
const pins = { modelSha256: modelHash, voiceReferenceSha256: voiceHash };

test("qualifies only a pinned local-only engine with license and consent evidence", async () => {
  const engine = createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins,
    createEngine: () => ({
      localOnly: true, available: true,
      async synthesize(text) {
        assert.equal(text, APPROVED_NEURAL_TTS_TEXT);
        return { audio: new Uint8Array([1, 2, 3]), sampleRate: 24000, durationMs: 2400 };
      },
    }),
  });
  const result = await engine.synthesize(APPROVED_NEURAL_TTS_TEXT);
  assert.equal(result.byteLength, 3);
  assert.equal(result.sampleRate, 24000);
  engine.dispose();
  assert.equal(engine.available, false);
});

test("rejects mismatched model and voice hashes before loading runtime", () => {
  let loaded = false;
  assert.throws(() => createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins: { ...pins, modelSha256: "c".repeat(64) },
    createEngine: () => { loaded = true; return {}; },
  }), /checksum/);
  assert.equal(loaded, false);
});

test("rejects missing consent and non-local runtime", () => {
  const noConsent = manifest();
  noConsent.voice.consent.granted = false;
  assert.throws(() => createQualifiedLocalNeuralEngine({
    manifest: noConsent, pins, createEngine: () => ({}),
  }), /consent/);
  const remote = manifest();
  remote.execution = "remote";
  assert.throws(() => createQualifiedLocalNeuralEngine({
    manifest: remote, pins, createEngine: () => ({}),
  }), /local-only/);
});

test("rejects arbitrary text and audio buffers over the in-memory limit", async () => {
  const engine = createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins,
    createEngine: () => ({
      localOnly: true, available: true,
      async synthesize() {
        return { audio: new Uint8Array(MAX_NEURAL_AUDIO_BYTES + 1), sampleRate: 24000, durationMs: 2000 };
      },
    }),
  });
  await assert.rejects(engine.synthesize("nama siswa"), /fixed generic/);
  await assert.rejects(engine.synthesize(APPROVED_NEURAL_TTS_TEXT), /8 MiB/);
  engine.dispose();
});
