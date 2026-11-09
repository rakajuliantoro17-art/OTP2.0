# SEPHIA — OTP 2.0 Panitia Module

SEPHIA is a passive, browser-scoped notification reader for the OTP 2.0 Panitia dashboard.

## Current development boundary

This folder is an isolated module. It is not imported by the OTP 2.0 application and is not active in any deployment.

- Reads only the designated notification list supplied by the host: `#alertList`.
- Accepts only notification items carrying trusted metadata attributes.
- Qualifies only a numeric violation count greater than 26 (27–30).
- Uses visible text only; it does not infer missing data.
- Does not call Firebase, APIs, server endpoints, Moodle, or OTP actions.
- Does not issue, validate, revoke, unlock, reset, or auto-submit OTPs.
- Does not contain TTS, microphone, wake-word, avatar, or visualizer integration yet.
- Does not persist event history or session memory.

## Expected host contract (not yet implemented in OTP 2.0)

A host-rendered notification item may expose:

- `data-sephia-event-id`: stable event identifier (required)
- `data-sephia-event-type`: event type (informational metadata)
- `data-sephia-violation-count`: trusted numeric violation count (required)

The notification's human-readable message remains visible in the rendered item. SEPHIA reads it through `textContent`, never `innerHTML`.

**Important:** the current OTP 2.0 notification renderer does not yet provide this contract. Until the host-side contract is implemented and verified, this reader will intentionally ignore existing notifications.

## Files

- `src/notification-reader.js`: isolated observer and strict event qualification.
- `tests/notification-reader.test.mjs`: focused tests for event qualification and duplicate handling.

## Integration gates

1. Verify Panitia authentication/session boundary and deployed Firebase rules.
2. Implement the trusted notification metadata contract in the OTP host, preserving existing OTP thresholds and behavior.
3. Test the reader against a staging/local Panitia page.
4. Only then consider audio and visual layers as separate, gated modules.

Vercel being paused does not prevent repository-level development. Nothing in this folder activates itself or changes the production application.
