# SEPHIA Stage 31 — Native Messaging Host Protocol

**Status:** Rust protocol host and Windows registration scripts implemented; Stage 32 adds an optional pinned in-memory Laras inference feature. Production remains blocked until model/voice provisioning and target-PC acceptance.  
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

The default Rust build (without `--features inference`) returns `ENGINE_UNAVAILABLE`. The optional inference build is implemented in Stage 32 and uses Laras' in-memory Engine API. It still returns `ENGINE_UNAVAILABLE` if model files, the voice reference, consent evidence, license evidence, or binary hash are missing or invalid.

## Build and tests

    cargo test --manifest-path sephia/native-host/Cargo.toml
    cargo build --release --features inference --manifest-path sephia/native-host/Cargo.toml

The Node regression gate checks the source and installer policy. CI separately runs Rust unit tests.

## Remaining production blockers

1. Provision the nine pinned ONNX model files on the Panitia PC and verify the installer and host both accept their hashes.
2. Supply an adult feminine Indonesian WAV reference with explicit written voice-cloning consent and hash it.
3. Supply and review the voice-consent and model-license evidence files.
4. Build the host with `--features inference`, package the required ONNX Runtime DLLs, and install with the exact extension ID.
5. Add end-to-end tests with the real extension and native process, including host startup, synthesis, cancel, rate limit, malformed frames, host crash, and buffer release.
6. Build/sign the Windows installer and package the extension so the final extension ID can be allowlisted.
7. Run voice, security, cold/warm latency, CPU/RAM, and Chrome audio-activation acceptance on the actual Panitia PC.

No merge, production deployment, or OTP behavior change is authorized by this stage.
