# SEPHIA Maintenance Guide

## Before changing code

1. Read `../../docs/SEPHIA-DECISION-REGISTER.md`, `../../docs/SEPHIA-PHASE0-AUDIT.md`, and this module's `ARCHITECTURE.md`.
2. Confirm the change stays inside SEPHIA's approved passive-reader scope.
3. Identify whether the change affects the core contract, DOM adapter, runtime lifecycle, or optional presentation.
4. Add or update unit, host-contract, and audio-controller regression tests before integrating with the OTP host.
5. Never change OTP thresholds, authentication, Firebase rules, or server behavior as part of a SEPHIA-only maintenance task.

## Local test

From this folder, with a supported Node.js version:

```bash
npm test
```

The current tests use Node's built-in test runner and do not require external dependencies.

## Change procedure

1. Work on `feature/sephia-module` or a dedicated feature branch.
2. Keep changes confined to `sephia/` unless a separately approved host integration is underway.
3. Update architecture/decision documentation when behavior or contracts change.
4. Run tests and inspect the diff.
5. Verify that SEPHIA remains inactive by default and does not inspect outside `#alertList`.
6. Do not merge to `main` or deploy without explicit approval.

## Regression checklist

- [ ] Only exact `#alertList` is observed.
- [ ] No document-wide query or observer is introduced.
- [ ] Counts below 27, missing counts, malformed counts, and unsafe integers are ignored.
- [ ] Stable event ID is mandatory.
- [ ] Visible message is read through `textContent`.
- [ ] Existing alerts are not replayed on activation.
- [ ] Duplicate IDs are ignored during one active session.
- [ ] Deactivation disconnects the observer and clears session memory.
- [ ] Refresh/reopen does not auto-activate.
- [ ] Logout/session expiry can deactivate the runtime once a verified host hook exists.
- [ ] No Firebase/API/Moodle/OTP mutation capability is introduced.
- [ ] Optional audio/visual failures cannot break OTP 2.0.
- [ ] Speech adapter is verified local before it is enabled.
- [ ] New notification interrupts current speech; no overlapping utterances.
- [ ] Microphone/wake-word permission is never requested on page load.

## Integration gate

Do not connect this module to Panitia until the following are verified:

- Panitia authentication and session lifecycle;
- actual deployed Firebase alert-read behavior;
- host-generated event ID and numeric violation count;
- local/staging browser behavior;
- microphone and TTS feasibility for the exact serving origin.

Vercel being paused is compatible with isolated repository development. It does not prove runtime or browser behavior.
