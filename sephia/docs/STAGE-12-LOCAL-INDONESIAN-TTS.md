# SEPHIA Stage 12 — Local Indonesian TTS

**Branch:** `feature/sephia-module`  
**Scope:** browser/OS speech adapter and deterministic unit tests  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Language adaptation

The Panitia laptop may have English as its operating-system/browser default. SEPHIA does not change that global setting. Each speech utterance explicitly requests `id-ID`, with a calm delivery profile (`rate=0.9`, `pitch=1.04`, full device volume).

## Local-only selection policy

The adapter accepts only voices whose language is Indonesian (`id` or `id-*`) and whose browser-reported `localService` property is exactly `true`. A voice with `localService=false`, an English-only voice list, or missing speech APIs is rejected. No cloud fallback, network request, audio upload, transcript storage, or persistent memory is implemented.

If several eligible voices exist, a name containing an explicit feminine hint is preferred. Browser voice metadata does not reliably expose speaker gender, so the adapter cannot guarantee a feminine voice solely from metadata. The actual voice must be auditioned and approved on the Panitia laptop.

The Web Speech API's `localService` flag is a platform-reported property, not cryptographic proof that the operating system will never use a remote component. This implementation is a strict local-voice filter, not a formal privacy certification.

## Runtime behavior

- The adapter speaks only supplied generic text; it does not build announcement content from student identity.
- Language and calm rate/pitch are set per utterance; OS defaults remain unchanged.
- Missing local Indonesian voice is a hard TTS-unavailable condition. The application must remain visually usable.
- Speech errors are surfaced to the host; no automatic repeat is performed.
- Cancel and dispose stop pending speech.
- No microphone, wake-word engine, remote AI, audio recording, or transcript archive is added by this stage.

## Required Panitia PC acceptance

1. Open the isolated host trial over a secure context where required by browser APIs.
2. Confirm the available voice list contains an `id-ID` voice with `localService=true`.
3. Audition the selected voice and confirm it is an adult feminine Indonesian voice with clear articulation and the intended calm tone.
4. Confirm the generic announcement is pronounced naturally in Indonesian.
5. Confirm a machine with English-only or cloud-only Indonesian voices enters limited/visual-only mode.
6. Confirm no network request is made by this adapter and no audio/transcript is persisted.
7. Test interruption, cancellation, browser tab close, and TTS error handling.

## Limitations

This stage supplies a local Indonesian browser TTS adapter and unit tests. It does not prove the actual Panitia laptop has a suitable voice, that Chrome permits speech after the user interaction, or that a given OS voice is genuinely local. Those claims require the workstation acceptance test. Wake-word/microphone and final avatar/lip synchronization remain separate capabilities.
