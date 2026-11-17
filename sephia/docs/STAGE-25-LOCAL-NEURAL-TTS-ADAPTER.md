# SEPHIA Stage 25 — Local Neural TTS Adapter Contract

**Status:** implemented as a dependency-injected adapter boundary; no inference engine or voice model is bundled.

## Contract delivered

`src/audio/local-neural-tts.js` implements `createLocalNeuralTtsAdapter({ engine, player })`.

Engine contract:
- `available === true` only after the local model/runtime is actually ready.
- `synthesize(approvedText, { signal })` returns an in-memory audio handle.
- Optional `cancel()` and `dispose()`.

Player contract:
- `play(audio, { signal })` resolves when playback finishes.
- `cancel()` stops playback.
- `release(audio)` releases the generated audio handle.

Adapter API:
- `speak(text)`, `cancel()`, `dispose()`, `available`, and `isSpeaking`.

## Security and lifecycle guarantees

- Exact allowlist: only the fixed generic SEPHIA announcement can be synthesized.
- No student name, class, count, arbitrary notification text, or caller-provided prompt is accepted.
- Single in-flight operation; concurrent calls are rejected, not queued.
- Bounded timeout (1–30 seconds; default 12 seconds).
- Abort signal is propagated to synthesis and playback.
- Cancellation calls both engine and player cancellation hooks.
- Audio handles are released in a `finally` path after success, failure, timeout, or cancellation.
- No network, model download, browser speech, storage, transcript, or audio persistence is implemented by this adapter.
- Runtime and player are injected; an unavailable engine fails closed.

## Explicit non-goals

This stage does not select a model, download weights, create a voice reference, clone a person, expose a local HTTP endpoint, or assert female voice quality. The adapter is not connected as the Panitia production default. Stage 24 topology approval and actual target-PC verification remain prerequisites.
