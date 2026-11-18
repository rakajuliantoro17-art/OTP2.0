# SEPHIA Stage 35 — Windows Native Host Protocol Smoke Test

**Status:** Windows process-level smoke test implemented; target Panitia PC has not been tested.

## What the smoke test verifies

The Windows CI job builds the real Rust native host with the inference feature and then runs the executable as a child process in a temporary directory.

Two cases are checked:

1. A valid extension origin with no model/voice configuration returns the strict `ENGINE_UNAVAILABLE` readiness response and exits cleanly. This confirms the host does not falsely report ready when provisioning is absent.
2. A mismatched extension origin is rejected before the host sends any protocol response and exits non-zero.

The temporary configuration and copied executable/DLLs are removed after the test. No model, voice sample, generated audio, or student data is required.

## Scope limitation

This is a transport and fail-closed startup test, not a synthesis acceptance test. It does not prove model loading, sound output, Chrome extension interoperability, voice quality, or target-PC performance. Those require Stage 33 provisioning and Stage 34/real Panitia workstation acceptance.

## CI

The Windows job sequence is:
1. Parse-check all PowerShell scripts.
2. Build the Windows native host with `--features inference`.
3. Run the native host process smoke test.
4. Upload the executable and required runtime DLLs as a short-lived CI artifact.

A successful smoke test is not production authorization.
