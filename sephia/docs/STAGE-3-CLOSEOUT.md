# SEPHIA Stage 3 — Audio Closeout

**Branch:** `feature/sephia-module`  
**Scope:** deterministic announcement controller and audio-provider boundary  
**Disposition:** controller/API milestone complete; real audio provider remains gated  
**Production:** unchanged; no merge, deployment, microphone prompt, recording, or external speech service

## Completed

- [x] Added `src/audio/announcement.js` with a narrow injected speech-adapter contract.
- [x] Uses the approved generic Panitia announcement; no student name, class, or violation count is spoken.
- [x] Rejects events without stable ID, explicit `violation` type, or integer count 27–30 (reader contract).
- [x] New qualifying event cancels the previous utterance and takes priority; no application-level queue is created.
- [x] Stop/dispose cancels active speech.
- [x] Provider errors and state-callback errors are contained.
- [x] Runtime can route normalized notifications to the optional speech controller and contains callback/provider errors.
- [x] Added tests for fixed announcement, qualification, interruption, failure containment, stop, disposal, and runtime isolation.
- [x] Documented local-provider requirements and privacy acceptance gates.

## Deliberately not enabled

- [ ] Concrete browser/OS speech provider.
- [ ] Microphone capture or permission request.
- [ ] Local wake-word model for “SEPHIA”.
- [ ] Voice input, audio buffers, avatar lip-sync, or audio archive.

This is intentional. Browser-native speech voices are not guaranteed to be local on every OS/browser. The selected local-processing policy prohibits silently using a network-backed voice or cloud fallback. No actual target workstation/browser/OS verification has been supplied, and no local wake-word model has been selected. Requesting microphone permission before selecting and validating a local model would be premature.

## Required external acceptance

1. Confirm target workstation OS, browser/version, and Panitia origin.
2. Select a speech adapter that demonstrably works with network disabled.
3. Inspect network activity to confirm no audio or notification text is transmitted.
4. Test user-gesture/autoplay restrictions and speech cancellation.
5. Measure speech start latency, completion, CPU, and memory.
6. Confirm TTS failure leaves the original Panitia alert intact and moves SEPHIA to visual-only mode once the visual state layer exists.
7. Verify microphone permission is requested only after explicit activation; denial must not disable notification TTS.
8. Verify logout/session expiry stops the runtime before any live integration.

## Release decision

Stage 3 is closed as a **speech-controller engineering milestone**, not as a working audio release. A real local speech adapter and wake-word implementation remain blocked on device/browser privacy verification. Do not substitute a cloud voice, external AI, or desktop daemon to make the checklist appear complete.

The next implementation stage may build the isolated visualizer/control layer, but it must not claim audio is operational until the external audio acceptance gates pass.
