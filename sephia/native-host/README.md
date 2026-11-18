# SEPHIA Native Messaging Host (Stage 31)

This crate implements the Chrome Native Messaging framing, exact extension-origin check, strict request schema, size bounds, and fail-closed error response.

## Current behavior

The executable is a **protocol stub**, not a speech engine. Every valid request returns `ENGINE_UNAVAILABLE`. This is intentional until the in-memory Laras inference adapter is audited and integrated. It does not download models, write audio, open a port, or invoke shell commands.

## Build

Requires Rust toolchain 1.92 or newer:

    cargo test --manifest-path sephia/native-host/Cargo.toml
    cargo build --release --manifest-path sephia/native-host/Cargo.toml

## Install on Windows

1. Package the Chrome extension and obtain its exact 32-character extension ID.
2. Build the native host executable and place it in a controlled, user-readable installation directory.
3. Run PowerShell as the installing Windows user:

       .\sephia\native-host\install-windows.ps1 -ExtensionId <32-character-id> -HostExePath <absolute-path-to-exe>

4. Restart Chrome so it inherits `SEPHIA_EXTENSION_ORIGIN`.
5. The installer copies the host into `%LOCALAPPDATA%\\SMANSASOO\\SEPHIA`, writes a strict `sephia-host-config.json` beside it, and registers only the supplied extension ID in `allowed_origins`.

Uninstall:

    .\sephia\native-host\uninstall-windows.ps1

## Protocol

- Input/output: 32-bit native-endian length prefix + UTF-8 JSON.
- Input frame maximum: 4 KiB.
- Output frame maximum: Chrome's 1 MiB host-to-extension limit.
- Only request: `{ "version": 1, "action": "synthesize-approved-announcement" }`.
- Caller origin must exactly match `SEPHIA_EXTENSION_ORIGIN`.
- Current response: `{ "version": 1, "ok": false, "code": "ENGINE_UNAVAILABLE" }`.

The host must never accept free-form speech text, student identity, OTP, event IDs, file paths, URLs, or shell commands.
