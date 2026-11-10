# SEPHIA Stage 12 — Local Indonesian TTS

**Branch:** \`feature/sephia-module\`  
**Scope:** browser/OS speech adapter and deterministic unit tests  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Language adaptation

The Panitia laptop may have English as its operating-system/browser default. SEPHIA does not change that global setting. Each speech utterance explicitly requests \`id-ID\`, with a calm delivery profile (\`rate=0.9\`, \`pitch=1.04\`, full device volume).

## Local-only and feminine voice selection

The adapter accepts only voices whose language is Indonesian (\`id\` or \`id-*\`), whose browser-reported \`localService\` property is exactly \`true\`, and whose voice name contains a known feminine hint. It will not silently select a male or gender-unknown voice. A cloud voice, an English-only voice list, a local male-only Indonesian voice, or missing speech APIs is rejected. No cloud fallback, network request, audio upload, transcript storage, or persistent memory is implemented.

Browser voice metadata does not reliably expose speaker gender. Name hints are only a conservative filter, not proof of gender. The selected voice must be auditioned and approved on the Panitia laptop.

## Windows 11 preparation

If the Panitia laptop is Windows 11 and Indonesian speech is not installed:

1. Open **Settings → Time & language → Language & region**.
2. Select **Add a language**, search for **Indonesian / Bahasa Indonesia**, then continue.
3. In language features, install the available speech-related feature(s).
4. Restart the browser and inspect its speech voice list again.

Microsoft's current Windows language-pack guide lists Indonesian and notes English (United States) as a required base language for some Indonesian language-pack paths. Microsoft's Narrator voice list documents **Andika** as the Indonesian voice and identifies it as male. Therefore, installing the Indonesian Windows language pack alone does **not** prove that the required feminine SEPHIA voice is available. If the browser exposes only Andika, SEPHIA deliberately keeps TTS unavailable rather than violating the feminine-voice requirement.

A separately licensed, on-device Indonesian feminine neural voice may be integrated in a later engine milestone. No third-party model with unclear, non-commercial, or incompatible licensing is bundled in this stage.

## Runtime behavior

- The adapter speaks only the fixed generic announcement; it does not build speech from student identity.
- Language and calm rate/pitch are set per utterance; OS defaults remain unchanged.
- Missing local feminine Indonesian voice is a hard TTS-unavailable condition. The application remains visually usable.
- Speech errors are surfaced as red error state; no automatic repeat is performed.
- Cancel and dispose stop pending speech.
- No microphone, wake-word engine, remote AI, audio recording, or transcript archive is added by this stage.

## Required Panitia PC acceptance

1. Install Indonesian speech components if available and restart Chrome.
2. Confirm the browser exposes an \`id-ID\` voice with \`localService=true\` and a feminine voice name hint.
3. Audition the selected voice and confirm adult feminine Indonesian delivery, clear articulation, and calm tone.
4. Confirm the generic announcement is pronounced naturally in Indonesian.
5. Confirm English-only, cloud-only, male-only, or unknown-gender voice lists enter visual-only mode.
6. Confirm no network request is made by this adapter and no audio/transcript is persisted.
7. Test interruption, cancellation, browser tab close, and TTS error handling.

## Limitations

This stage supplies a strict local Indonesian TTS adapter and unit tests. It does not prove the actual Panitia laptop has a suitable feminine voice, that Chrome permits speech after user interaction, or that a given OS voice is genuinely local. Those claims require workstation acceptance testing.

## References

- Microsoft Windows language packs: https://support.microsoft.com/id-id/windows/hardware/input-devices/language-packs-for-windows
- Microsoft supported Narrator languages and voices: https://support.microsoft.com/id-id/accessibility/windows/narrator/appendix-a-supported-languages-and-voices
