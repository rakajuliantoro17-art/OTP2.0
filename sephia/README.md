# SEPHIA — OTP 2.0 Panitia Module

SEPHIA is a passive, browser-scoped notification reader for the OTP 2.0 Panitia dashboard.

## Status

- Stages 2–17 provide the host contract, security boundaries, local TTS diagnostics, on-device wake-word prototype, avatar overlay, synthetic notification-to-speech tests, and the initial natural-voice strategy.
- Stage 23 locks the final voice architecture: dynamic local neural TTS, not a prerecorded WAV.
- Stages 25–26 implement the local neural TTS adapter contract and controller integration tests. Fixed approved phrases only, bounded timeout, abort/cancel, one operation at a time, and in-memory audio release. Host default remains fail-closed visual-only.
- Stage 27 adds a qualified offline-engine wrapper and checksum/consent manifest contract. It does not bundle model weights, start a sidecar, download files, or activate a speech engine. The Laras/Pocket candidate remains unqualified until real files and evidence are reviewed.
- Stage 28 adds an in-memory benchmark and acceptance report for cold/warm synthesis latency, playback-start latency, buffer size, CPU, and memory. Acoustic, network, license, and target-PC evidence remain manual gates. Mock tests are not proof of real voice quality or workstation performance.
- Stage 24 rejected localhost/LAN HTTP inference as the default topology. Stage 29 records Chrome Native Messaging as the preferred local bridge; extension, native host, in-memory Laras API, installer, and target-PC acceptance are still blocked. No localhost/LAN inference endpoint is enabled.
- Stage 18 records the local audio adapter contract; Stage 20 records legacy WAV asset validation. Stages 18–20 remain isolated legacy/validation components. The production Panitia host no longer imports or selects the WAV adapter.
- The intended voice remains adult feminine Indonesian: natural, warm, calm, gentle, clear, and professional. Voice-reference consent and acoustic approval are mandatory. Pocket TTS Indonesian weights require CC-BY-4.0 attribution; this is separate from Laras source-code licensing.
- The dashboard has no account login; access through a dedicated URL is not authentication.
- SEPHIA host integration remains on feature/sephia-module; it is not deployed. It starts OFF and requires manual activation after every page load.
- No merge to main or production deployment is authorized.

## Approved operating boundary

- Observe only the designated host notification element: #alertList.
- Accept only visible alert items with stable event ID, event type violation, and trusted integer count 27–30.
- Never speak a student name, class, OTP, violation count, or identifying detail. The only permitted speech consists of two fixed generic phrases: the wake acknowledgement and the violation announcement.
- Do not call Firebase, APIs, Moodle, or OTP actions.
- Do not persist event history, generated audio, transcripts, or session memory.
- Start inactive and require explicit manual activation after every page load.
- Manual OFF and page lifecycle stop observation and speech.
- SEPHIA failures must not affect OTP monitoring or host alert rendering.
- Local TTS must not use cloud fallback, external telemetry, or third-party audio upload. Model provisioning must be explicit and checksum-pinned.

## Testing

From the sephia folder, run with Node.js 22:

    npm test
    npm run check
    npm run build
    npm run verify:staging
    npm run verify:host
    npm run verify:neural-tts
    npm run verify:runtime-prototype
    npm run verify:acceptance
    npm run verify:stage29
    npm run verify:stage30
    npm run verify:stage31
    npm run verify:stage32
    npm run verify:stage33
    npm run verify:stage34
    npm run verify:stage35
    npm run verify:stage37
    npm run verify:stage38
    npm run verify:stage39
    cargo test --manifest-path native-host/Cargo.toml
    cargo test --manifest-path native-host/Cargo.toml --features inference
    npm run verify:release

Stage 28 benchmark requires an explicitly injected local-only engine, local player, and workstation CPU/RAM sampler. It returns numeric metrics only; it does not create audio files. The report cannot pass overall until voice, network, and license reviews are explicitly recorded.

See docs/STAGE-39-WAKE-WORD-VOICE-ACKNOWLEDGEMENT.md, docs/STAGE-38-AUDIO-READINESS-DIAGNOSTICS.md, docs/STAGE-37-CHROME-AUDIO-ACTIVATION.md, docs/STAGE-36-PRODUCTION-CANDIDATE-RUNBOOK.md, docs/STAGE-35-NATIVE-HOST-PROTOCOL-SMOKE-TEST.md, docs/STAGE-34-TARGET-PC-BENCHMARK.md, docs/STAGE-33-MODEL-AND-VOICE-PROVISIONING.md, docs/STAGE-32-IN-MEMORY-LARAS-INFERENCE.md, docs/STAGE-31-NATIVE-MESSAGING-HOST.md, docs/STAGE-30-CHROME-EXTENSION-BRIDGE.md, docs/STAGE-29-LOCAL-CHROME-BRIDGE-SECURITY.md, docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json, native-messaging/protocol.schema.json, docs/STAGE-28-NEURAL-TTS-QUALITY-PERFORMANCE-VALIDATION.md, docs/STAGE-27-LOCAL-NEURAL-RUNTIME-PROTOTYPE.md, docs/STAGE-26-NEURAL-TTS-INTEGRATION.md, docs/STAGE-25-LOCAL-NEURAL-TTS-ADAPTER.md, docs/STAGE-24-LOCAL-TTS-TOPOLOGY-GATE.md, and docs/STAGE-23-LOCAL-NEURAL-TTS-DECISION.md.

The build output is an artifact, not a production deployment. Nothing in this folder self-activates or changes production OTP behavior.
