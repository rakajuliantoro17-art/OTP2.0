import { APPROVED_NEURAL_TTS_TEXT } from "./local-neural-tts.js";

const DEFAULT_LIMITS = Object.freeze({
  iterations: 3,
  timeoutMs: 20000,
  maxWarmSynthesisMs: 8000,
  maxPlaybackStartMs: 1200,
  maxAudioBytes: 8 * 1024 * 1024,
  maxCpuPercent: 85,
  maxMemoryMb: 1024,
});

function percentile95(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

function validMetric(value) {
  return Number.isFinite(value) && value >= 0;
}

async function withTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out.")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs an in-memory acceptance benchmark. player.play(audio) must return
 * { started: Promise, finished: Promise, cancel() }. No audio or transcript
 * is returned or persisted; only numeric measurements and gate results.
 */
export async function runNeuralTtsAcceptance({
  engine,
  player,
  getMetrics = async () => null,
  limits = {},
  voiceReviewPassed = false,
  networkReviewPassed = false,
  licenseReviewPassed = false,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  const config = { ...DEFAULT_LIMITS, ...limits };
  if (!engine || engine.localOnly !== true || engine.available !== true ||
      typeof engine.synthesize !== "function") {
    throw new TypeError("A ready local-only neural engine is required.");
  }
  if (!player || typeof player.play !== "function" || typeof player.release !== "function") {
    throw new TypeError("A local audio player with play() and release() is required.");
  }
  if (!Number.isSafeInteger(config.iterations) || config.iterations < 3 || config.iterations > 10) {
    throw new RangeError("Acceptance benchmark requires 3–10 iterations.");
  }
  if (!Number.isSafeInteger(config.timeoutMs) || config.timeoutMs < 1000 || config.timeoutMs > 60000) {
    throw new RangeError("Benchmark timeout must be between 1 and 60 seconds.");
  }

  const synthesisMs = [];
  const playbackStartMs = [];
  const audioBytes = [];
  const cpuSamples = [];
  const memorySamples = [];
  const errors = [];
  let firstSynthesisMs = null;

  for (let index = 0; index < config.iterations; index += 1) {
    let audio = null;
    let playback = null;
    const controller = new AbortController();
    try {
      const before = now();
      const result = await withTimeout(
        Promise.resolve().then(() => engine.synthesize(APPROVED_NEURAL_TTS_TEXT, { signal: controller.signal })),
        config.timeoutMs,
        "Local neural synthesis",
      );
      const synthesizedAt = now();
      const elapsed = Math.max(0, synthesizedAt - before);
      if (index === 0) firstSynthesisMs = elapsed;
      else synthesisMs.push(elapsed);
      audio = result?.audio;
      const bytes = result?.byteLength ?? (audio?.byteLength ?? -1);
      if (!Number.isSafeInteger(bytes) || bytes < 1 || bytes > config.maxAudioBytes) {
        throw new Error("Audio output exceeded the configured in-memory size limit.");
      }
      audioBytes.push(bytes);

      playback = player.play(audio, { signal: controller.signal });
      if (!playback?.started || !playback?.finished || typeof playback.cancel !== "function") {
        throw new TypeError("Player must return started, finished, and cancel().");
      }
      const playbackRequestedAt = now();
      await withTimeout(Promise.resolve(playback.started), config.timeoutMs, "Playback start");
      playbackStartMs.push(Math.max(0, now() - playbackRequestedAt));
      await withTimeout(Promise.resolve(playback.finished), config.timeoutMs, "Playback completion");

      const metrics = await getMetrics();
      if (metrics && validMetric(metrics.cpuPercent)) cpuSamples.push(metrics.cpuPercent);
      if (metrics && validMetric(metrics.memoryMb)) memorySamples.push(metrics.memoryMb);
    } catch (error) {
      errors.push(String(error?.message || error));
      controller.abort();
      try { playback?.cancel?.(); } catch {}
      try { engine.cancel?.(); } catch {}
      break;
    } finally {
      if (audio != null) {
        try { player.release(audio); } catch {}
      }
    }
  }

  const p95SynthesisMs = percentile95(synthesisMs);
  const p95PlaybackStartMs = percentile95(playbackStartMs);
  const maxCpuPercent = cpuSamples.length ? Math.max(...cpuSamples) : null;
  const maxMemoryMb = memorySamples.length ? Math.max(...memorySamples) : null;
  const technicalChecks = {
    allIterationsCompleted: errors.length === 0 && synthesisMs.length === config.iterations - 1 &&
      playbackStartMs.length === config.iterations,
    warmSynthesisLatency: p95SynthesisMs !== null && p95SynthesisMs <= config.maxWarmSynthesisMs,
    playbackStartLatency: p95PlaybackStartMs !== null && p95PlaybackStartMs <= config.maxPlaybackStartMs,
    audioBufferLimit: audioBytes.length === config.iterations && Math.max(...audioBytes) <= config.maxAudioBytes,
    cpuLimit: maxCpuPercent !== null && maxCpuPercent <= config.maxCpuPercent,
    memoryLimit: maxMemoryMb !== null && maxMemoryMb <= config.maxMemoryMb,
  };
  const technicalPass = Object.values(technicalChecks).every(Boolean);
  const evidence = {
    voiceReviewPassed: voiceReviewPassed === true,
    networkReviewPassed: networkReviewPassed === true,
    licenseReviewPassed: licenseReviewPassed === true,
  };

  return Object.freeze({
    report: "SEPHIA Local Neural TTS Acceptance",
    candidate: "Laras + Pocket TTS Indonesian (prototype qualification only)",
    iterations: config.iterations,
    measurements: Object.freeze({
      firstSynthesisMs,
      p95WarmSynthesisMs: p95SynthesisMs,
      p95PlaybackStartMs,
      maxAudioBytes: audioBytes.length ? Math.max(...audioBytes) : null,
      maxCpuPercent,
      maxMemoryMb,
    }),
    technicalChecks: Object.freeze(technicalChecks),
    technicalPass,
    evidence: Object.freeze(evidence),
    overallAccepted: technicalPass && Object.values(evidence).every(Boolean),
    errors: Object.freeze(errors),
    privacy: "No audio, transcript, student data, or benchmark history is persisted by this harness.",
  });
}
