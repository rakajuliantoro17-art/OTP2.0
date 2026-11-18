# SEPHIA Native Messaging Host (Stage 31)

This crate implements Chrome Native Messaging framing, exact extension-origin checking, strict request schema, size bounds, and an optional pinned Laras in-memory inference feature.

## Current behavior

The default executable (without `--features inference`) is protocol-only and returns `ENGINE_UNAVAILABLE`. The inference feature calls the pinned Laras `Engine::synthesize` API and converts returned samples directly to PCM16 in memory. It does not call `Native::synth_to`, write generated WAV files, download models, open a TCP/UDP port, or invoke shell commands.

## Build

Requires Rust toolchain 1.92 or newer:

    cargo test --manifest-path sephia/native-host/Cargo.toml
    cargo build --release --features inference --manifest-path sephia/native-host/Cargo.toml

## Install on Windows

1. Package the Chrome extension and obtain its exact 32-character extension ID.
2. Build the native host with `--features inference`. Provision the pinned model files, a consented adult feminine Indonesian WAV voice reference, and both evidence files.
3. Run PowerShell as the installing Windows user:

       .\sephia\native-host\install-windows.ps1 -ExtensionId <32-character-id> -HostExePath <absolute-path-to-exe>

4. Restart Chrome so it reloads the Native Messaging registry registration.
5. The installer copies the host into `%LOCALAPPDATA%\\SMANSASOO\\SEPHIA`, writes a strict `sephia-host-config.json` beside it, and registers only the supplied extension ID in `allowed_origins`.

Uninstall:

    .\sephia\native-host\uninstall-windows.ps1

## Protocol

- Input/output: 32-bit native-endian length prefix + UTF-8 JSON.
- Input frame maximum: 4 KiB.
- Output frame maximum: Chrome's 1 MiB host-to-extension limit.
- Only request: `{ "version": 1, "action": "synthesize-approved-announcement" }`.
- Caller origin must exactly match `extension_origin` in the adjacent `sephia-host-config.json` file.
- Startup handshake is sent only after the configured model, voice reference, evidence files, and runtime hash pass validation. Missing or invalid assets return `ENGINE_UNAVAILABLE`.

The host must never accept free-form speech text, student identity, OTP, event IDs, file paths, URLs, or shell commands.
