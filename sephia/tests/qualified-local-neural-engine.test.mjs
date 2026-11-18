import test from "node:test";
import assert from "node:assert/strict";
import {
  createQualifiedLocalNeuralEngine,
  MAX_NEURAL_AUDIO_BYTES,
} from "../src/audio/qualified-local-neural-engine.js";
import { APPROVED_NEURAL_TTS_TEXT } from "../src/audio/local-neural-tts.js";

const modelHash = "a".repeat(64);
const voiceHash = "b".repeat(64);
const runtimeHash = "c".repeat(64);
const manifest = () => ({
  schemaVersion: 1,
  engineId: "laras-pocket-tts",
  execution: "local-only",
  runtime: { version: "0.2.1", sourceRevision: "e4ab05ca53a8cbf749405de5b1ac902b76880768", sha256: runtimeHash },
  model: {
    sha256: modelHash,
    bytes: 160000000,
    sourceRevision: "17257664e384561c957b02ac92edd1a24807f0e5",
    license: "CC-BY-4.0",
    attribution: "Pocket TTS Indonesian oleh anak10thn, CC-BY-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    licenseEvidence: "MODEL-LICENSE-REVIEW-01",
    files: [{ path: "flow_lm_main_int8.onnx", bytes: 160000000, sha256: "d".repeat(64) }],
  },
  voice: {
    profile: "adult-feminine-indonesian",
    referenceSha256: voiceHash,
    consent: { granted: true, scope: "SEPHIA local announcement synthesis", evidenceRef: "VOICE-CONSENT-REVIEW-01" },
  },
});
const pins = { modelSha256: modelHash, voiceReferenceSha256: voiceHash, runtimeSha256: runtimeHash };
const verifyProvisioning = async ({ modelSha256, voiceReferenceSha256, runtimeSha256 }) =>
  modelSha256 === modelHash && voiceReferenceSha256 === voiceHash && runtimeSha256 === runtimeHash;

test("qualifies only checksum-verified local engine with license and consent evidence", async () => {
  const engine = await createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins, verifyProvisioning,
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

test("rejects mismatched pins before provisioning verification or engine load", async () => {
  let loaded = false;
  await assert.rejects(createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins: { ...pins, modelSha256: "c".repeat(64) },
    verifyProvisioning, createEngine: () => { loaded = true; return {}; },
  }), /checksum/);
  assert.equal(loaded, false);
});

test("requires actual byte verification before loading runtime", async () => {
  let loaded = false;
  await assert.rejects(createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins, verifyProvisioning: async () => false,
    createEngine: () => { loaded = true; return {}; },
  }), /checksum verification/);
  assert.equal(loaded, false);
});

test("rejects missing consent and non-local runtime", async () => {
  const noConsent = manifest();
  noConsent.voice.consent.granted = false;
  await assert.rejects(createQualifiedLocalNeuralEngine({
    manifest: noConsent, pins, verifyProvisioning, createEngine: () => ({}),
  }), /consent/);
  const remote = manifest();
  remote.execution = "remote";
  await assert.rejects(createQualifiedLocalNeuralEngine({
    manifest: remote, pins, verifyProvisioning, createEngine: () => ({}),
  }), /local-only/);
});

test("rejects arbitrary text and audio buffers over the in-memory limit", async () => {
  const engine = await createQualifiedLocalNeuralEngine({
    manifest: manifest(), pins, verifyProvisioning,
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
