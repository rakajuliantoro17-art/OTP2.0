# SEPHIA Stage 40 — Native Speech Contract Integrity

**Status:** repository-level contract audit added; Windows build and Panitia workstation acceptance remain separate gates.  
**Branch:** `feature/sephia-module`.

## Objective

Prevent the two approved SEPHIA speech actions from drifting between the page adapter, Chrome extension, Rust Native Messaging host, and Laras inference implementation.

## Fixed speech contract

Only these two phrases are permitted:

1. Notification: "Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya."
2. Wake acknowledgement: "Ya, Panitia. SEPHIA siap membantu."

The page adapter maps each exact phrase to one fixed action. The extension and Native Host relay only those action names. Rust inference selects the corresponding hard-coded phrase. No arbitrary text, student identity, class, OTP, violation count, event ID, or notification body crosses the speech bridge.

## Automated verification

Run from `sephia/`:

```sh
npm run verify:stage40
```

The verifier checks:
- exact phrase constants;
- both action names across page adapter, extension content script, service worker, Rust host, and inference;
- Rust action-to-phrase mapping;
- absence of free-form text and student metadata transport;
- Native Messaging permission;
- presence of the pinned Cargo dependency lock;
- CI workflow invocation and artifact documentation.

The Stage 40 verifier is static contract validation. It does not prove the Windows executable runs, that model assets are provisioned, or that audio is audible.

## Release gates unchanged

- Linux verification and Windows Native Host build must both pass on the same commit.
- Install only matching extension and Windows Native Host artifacts from that run.
- Model hashes, voice-reference consent, and license evidence must validate.
- Actual Panitia PC tests must confirm speaker output, wake-word recognition, visual speaking state, cancellation, and inactive-on-reload behavior.
- Do not generate test violations in the live OTP system.
- No merge to `main`, production deployment, Firebase Rules change, or Moodle change is part of this stage.
