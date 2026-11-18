# SEPHIA Stage 31 — Native Messaging Host Protocol

**Status:** Rust protocol host and Windows registration scripts implemented; speech inference deliberately unavailable.  
**Native host name:** `com.smansasoo.sephia`.

## Implemented

- Rust host reads Chrome Native Messaging frames from stdin and writes framed JSON only to stdout.
- Request payload is limited to 4 KiB; response is limited to 1 MiB.
- Caller origin is compared exactly with the strict `extension_origin` value in a local config file installed beside the host executable.
- Request deserialization denies unknown properties.
- Only protocol v1 action `synthesize-approved-announcement` is accepted.
- A two-second rate limit is enforced.
- No TCP/UDP listener, HTTP endpoint, shell execution, model download, or audio-file write exists.
- Windows install/uninstall scripts copy the executable into the per-user application directory, write its adjacent config file, register the host under the current user's Chrome Native Messaging registry key, and allowlist one exact 32-character extension ID.
- Installer writes both host config and native-host manifest as UTF-8 without BOM. Chrome restart is required after registry registration.

## Deliberate fail-closed state

The Rust host currently returns `ENGINE_UNAVAILABLE` for every valid synthesis request. It is a protocol implementation, not a speech engine. This allows the framing, origin check, and extension installer to be validated without falsely claiming that TTS works.

## Build and tests

    cargo test --manifest-path sephia/native-host/Cargo.toml
    cargo build --release --manifest-path sephia/native-host/Cargo.toml

The Node regression gate checks the source and installer policy. CI separately runs Rust unit tests.

## Remaining production blockers

1. Add a pinned, audited in-memory PCM API to Laras; do not use the existing `Native::synth_to(..., out: &Path)` file-writing API.
2. Integrate the local ONNX model bundle and verify every file against the pinned provenance manifest.
3. Supply an adult feminine Indonesian voice reference with written consent and hash it.
4. Implement host-side synthesis and return PCM16 24 kHz mono within the 700 KiB extension transport limit.
5. Add end-to-end protocol tests with a real native process, including cancellation, rate limit, malformed frames, host crash, and buffer release.
6. Build/sign the Windows installer and package the extension so the final extension ID can be allowlisted.
7. Run voice, security, latency, CPU/RAM, and Chrome audio-activation acceptance on the actual Panitia PC.

No merge, production deployment, or OTP behavior change is authorized by this stage.
