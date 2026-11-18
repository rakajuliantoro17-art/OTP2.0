import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Stage 32 pins Laras source and enables inference only as an explicit build feature", async () => {
  const cargo = await read("native-host/Cargo.toml");
  assert.match(cargo, /Urdemonlord\/laras-tts/);
  assert.match(cargo, /rev = "e4ab05ca53a8cbf749405de5b1ac902b76880768"/);
  assert.match(cargo, /features = \["onnx"\]/);
  assert.match(cargo, /inference = \[/);
});

test("inference uses Laras Engine API and in-memory PCM, never its WAV file writer", async () => {
  const source = await read("native-host/src/inference.rs");
  assert.match(source, /Engine as LarasEngine/);
  assert.match(source, /\.synthesize\(APPROVED_PHRASE/);
  assert.match(source, /wav::read_mono/);
  assert.match(source, /engine\.set_voice/);
  assert.match(source, /pcm\.extend_from_slice\(&value\.to_le_bytes\(\)\)/);
  assert.match(source, /MAX_AUDIO_BYTES: usize = 700 \* 1024/);
  assert.doesNotMatch(source, /Native::synth_to|wav::write_mono|File::create|fs::write/);
});

test("runtime pins model files, voice reference, native binary, and consent evidence", async () => {
  const source = await read("native-host/src/inference.rs");
  for (const value of [
    "model_bundle_sha256",
    "voice_reference_sha256",
    "voice_consent_evidence_path",
    "model_license_evidence_path",
    "runtime_sha256",
    "runtime_dlls",
    "native runtime dependency SHA-256 mismatch",
    "MAX_VOICE_REFERENCE_BYTES: u64 = 10 * 1024 * 1024",
    "MAX_VOICE_REFERENCE_DURATION_MS: u64 = 20_000",
    "LARAS_DUMP_PCM",
    "LARAS_DUMP_VOICE",
    "LARAS_DUMP_LATENTS",
  ]) assert.ok(source.includes(value), value);
});

test("pinned Pocket TTS bundle manifest has nine files and a reproducible aggregate digest", async () => {
  const manifest = JSON.parse(await read("docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json"));
  assert.equal(manifest.files.length, 9);
  assert.equal(manifest.modelBundleBytes, manifest.files.reduce((sum, file) => sum + file.bytes, 0));
  const canonical = [...manifest.files]
    .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
    .map((file) => `${file.path}|${file.bytes}|${file.sha256}`)
    .join("\n");
  const digest = createHash("sha256").update(canonical, "utf8").digest("hex");
  assert.equal(digest, manifest.modelBundleSha256);
});

test("native host sends ready only after local engine initialization succeeds", async () => {
  const host = await read("native-host/src/main.rs");
  assert.match(host, /runtime\.is_ready\(\)/);
  assert.match(host, /"status": "ready"/);
  assert.match(host, /ENGINE_UNAVAILABLE/);
});

test("model download is a separate explicit provisioning action, never a runtime behavior", async () => {
  const provisioner = await read("native-host/provision-model-windows.ps1");
  const host = await read("native-host/src/inference.rs");
  assert.match(provisioner, /\[switch\]\s*\$Download/);
  assert.match(provisioner, /17257664e384561c957b02ac92edd1a24807f0e5/);
  assert.match(provisioner, /if \(-not \$Download\)/);
  assert.match(provisioner, /Invoke-WebRequest/);
  assert.doesNotMatch(host, /Invoke-WebRequest|reqwest|https:\/\//i);
});
