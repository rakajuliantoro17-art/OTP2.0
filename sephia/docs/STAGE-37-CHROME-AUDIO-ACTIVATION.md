# SEPHIA Stage 37 — Chrome Web Audio Activation

**Status:** explicit AudioContext unlock implemented; real Chrome playback acceptance remains required.

## Why this stage exists

Chrome may suspend or block Web Audio playback if an AudioContext is first created only when a background notification arrives. SEPHIA's notification can occur long after the user clicks Activate. Creating the AudioContext at notification time is therefore not a reliable production strategy.

## Implemented behavior

- The Panitia Activate click synchronously calls the speech adapter's `prepare()` before awaiting microphone permission or other asynchronous work.
- The adapter dispatches a one-time unlock event to the extension content script.
- The content script creates and resumes AudioContext while the original user gesture is still active.
- The content script reports whether the AudioContext reached `running`.
- The speech adapter reports itself available only after both Native Messaging pairing and audio unlock succeed.
- If audio unlock fails or the content script is absent, SEPHIA remains visually available in limited mode but does not claim that speech is ready.
- AudioContext is closed on pagehide. Generated PCM remains in memory and is cleared after use.

## Acceptance on the actual Panitia PC

1. Load the unpacked extension and pair the HTTPS Panitia tab.
2. Click Activate once; confirm the audio unlock succeeds.
3. Wait at least 60 seconds without speech.
4. Trigger a synthetic eligible notification and confirm audio plays without another click.
5. Repeat after minimizing/restoring Chrome and after a long idle period.
6. Confirm page reload returns SEPHIA to OFF and requires a fresh manual activation/unlock.

This is a browser-policy mitigation, not proof of playback on every managed Chrome policy. Actual target-PC playback acceptance remains mandatory.
