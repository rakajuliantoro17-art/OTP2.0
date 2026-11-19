import { APPROVED_NEURAL_TTS_TEXT } from "./local-neural-tts.js";

export const MAX_LOCAL_MODEL_BYTES = 512 * 1024 * 1024;
export const MAX_NEURAL_AUDIO_BYTES = 8 * 1024 * 1024;
export const MAX_NEURAL_AUDIO_DURATION_MS = 15000;

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function validateManifest(manifest, pins) {
  if (!manifest || manifest.schemaVersion !== 1) throw new TypeError("A version 1 local neural model manifest is required.");
  if (manifest.execution !== "local-only") throw new Error("Only a local-only neural runtime is permitted.");
  if (manifest.engineId !== "laras-pocket-tts") throw new Error("The selected engine is not the qualified SEPHIA prototype candidate.");
  if (!manifest.model || !isSha256(manifest.model.sha256) || manifest.model.sha256 !== pins.modelSha256) {
    throw new Error("Model checksum is missing or does not match the pinned checksum.");
  }
  if (!Array.isArray(manifest.model.files) || manifest.model.files.length < 1 || manifest.model.files.length > 32) {
    throw new TypeError("A pinned per-file model manifest with 1–32 files is required.");
  }
  const paths = new Set();
  let totalBytes = 0;
  for (const file of manifest.model.files) {
    if (!file || typeof file.path !== "string" || !/^[a-zA-Z0-9._/-]+$/.test(file.path) ||
        file.path.startsWith("/") || file.path.split("/").includes("..") || paths.has(file.path)) {
      throw new Error("Model file paths must be unique, relative, and traversal-safe.");
    }
    if (!Number.isSafeInteger(file.bytes) || file.bytes < 1 || !isSha256(file.sha256)) {
      throw new Error("Every model file must have a positive byte size and pinned SHA-256.");
    }
    paths.add(file.path);
    totalBytes += file.bytes;
  }
  if (!Number.isSafeInteger(manifest.model.bytes) || manifest.model.bytes !== totalBytes ||
      totalBytes > MAX_LOCAL_MODEL_BYTES) {
    throw new RangeError("Local model bundle size must equal the pinned file manifest and remain within 512 MiB.");
  }
  if (manifest.model.license !== "CC-BY-4.0" ||
      manifest.model.attribution !== "Pocket TTS Indonesian oleh anak10thn, CC-BY-4.0" ||
      manifest.model.licenseUrl !== "https://creativecommons.org/licenses/by/4.0/" ||
      typeof manifest.model.licenseEvidence !== "string" || !manifest.model.licenseEvidence.trim()) {
    throw new Error("The model must carry CC-BY-4.0 attribution and documented license evidence.");
  }
  if (!/^[a-f0-9]{40}$/.test(manifest.model.sourceRevision || "")) {
    throw new Error("The model source revision must be pinned to a full commit SHA.");
  }
  if (!manifest.voice || manifest.voice.profile !== "adult-feminine-indonesian" ||
      !isSha256(manifest.voice.referenceSha256) || manifest.voice.referenceSha256 !== pins.voiceReferenceSha256) {
    throw new Error("A pinned adult feminine Indonesian voice reference is required.");
  }
  if (manifest.voice.consent?.granted !== true ||
      typeof manifest.voice.consent.evidenceRef !== "string" || !manifest.voice.consent.evidenceRef.trim()) {
    throw new Error("Documented voice-reference consent is required.");
  }
  if (manifest.voice.consent.scope !== "SEPHIA local announcement synthesis") {
    throw new Error("Voice-reference consent scope does not match SEPHIA use.");
  }
  if (!manifest.runtime || typeof manifest.runtime.version !== "string" || !manifest.runtime.version.trim() ||
      !/^[a-f0-9]{40}$/.test(manifest.runtime.sourceRevision || "") ||
      !isSha256(manifest.runtime.sha256) || manifest.runtime.sha256 !== pins.runtimeSha256) {
    throw new Error("The local runtime version, source revision, and binary SHA-256 must be pinned.");
  }
}

function audioByteLength(audio) {
  if (audio instanceof ArrayBuffer) return audio.byteLength;
  if (ArrayBuffer.isView(audio)) return audio.byteLength;
  return -1;
}

/**
 * Qualification wrapper for a pre-provisioned offline engine.
 * verifyProvisioning must hash the actual local model and voice-reference bytes.
 * No endpoint, download, storage, or browser speech API is accepted here.
 */
export async function createQualifiedLocalNeuralEngine({
  manifest,
  pins,
  verifyProvisioning,
  createEngine,
} = {}) {
  if (!pins || !isSha256(pins.modelSha256) || !isSha256(pins.voiceReferenceSha256) ||
      !isSha256(pins.runtimeSha256)) {
    throw new TypeError("Pinned model, voice-reference, and runtime SHA-256 values are required.");
  }
  validateManifest(manifest, pins);
  if (typeof verifyProvisioning !== "function") {
    throw new TypeError("A local model and voice-reference checksum verifier is required.");
  }
  if (typeof createEngine !== "function") {
    throw new TypeError("A trusted pre-provisioned local engine factory is required.");
  }
  const verified = await verifyProvisioning(Object.freeze({
    manifest,
    modelSha256: pins.modelSha256,
    voiceReferenceSha256: pins.voiceReferenceSha256,
    runtimeSha256: pins.runtimeSha256,
  }));
  if (verified !== true) throw new Error("Actual local model/voice bytes did not pass checksum verification.");

  const engine = createEngine(Object.freeze({
    modelSha256: pins.modelSha256,
    voiceReferenceSha256: pins.voiceReferenceSha256,
    runtimeVersion: manifest.runtime.version,
    runtimeSha256: pins.runtimeSha256,
    runtimeSourceRevision: manifest.runtime.sourceRevision,
    modelFiles: manifest.model.files,
  }));
  if (!engine || engine.localOnly !== true || engine.available !== true ||
      typeof engine.synthesize !== "function") {
    try { engine?.dispose?.(); } catch {}
    throw new Error("The provisioned engine did not declare a ready local-only runtime.");
  }

  let disposed = false;
  let active = false;
  return Object.freeze({
    get available() { return !disposed && engine.available === true; },
    async synthesize(text, { signal } = {}) {
      if (disposed) throw new Error("Qualified neural engine has been disposed.");
      if (active) throw new Error("Qualified neural engine is busy.");
      if (text !== APPROVED_NEURAL_TTS_TEXT) throw new Error("Only the fixed generic SEPHIA announcement may be synthesized.");
      if (signal?.aborted) throw new Error("Neural synthesis was aborted.");
      active = true;
      try {
        const result = await engine.synthesize(APPROVED_NEURAL_TTS_TEXT, { signal });
        if (signal?.aborted || disposed) throw new Error("Neural synthesis was aborted.");
        const bytes = audioByteLength(result?.audio);
        if (bytes < 1 || bytes > MAX_NEURAL_AUDIO_BYTES) {
          throw new RangeError("Generated audio must be an in-memory buffer within the 8 MiB limit.");
        }
        if (!Number.isSafeInteger(result.sampleRate) || result.sampleRate < 16000 || result.sampleRate > 48000) {
          throw new RangeError("Generated audio sample rate must be between 16 and 48 kHz.");
        }
        if (!Number.isFinite(result.durationMs) || result.durationMs < 250 || result.durationMs > MAX_NEURAL_AUDIO_DURATION_MS) {
          throw new RangeError("Generated audio duration is outside the 0.25–15 second limit.");
        }
        return Object.freeze({ audio: result.audio, byteLength: bytes, sampleRate: result.sampleRate, durationMs: result.durationMs });
      } finally {
        active = false;
      }
    },
    cancel() { try { engine.cancel?.(); } catch {} },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { engine.cancel?.(); } catch {}
      try { engine.dispose?.(); } catch {}
    },
  });
}
