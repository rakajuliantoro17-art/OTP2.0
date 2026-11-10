# SEPHIA Voice Assets

This directory contains same-origin static assets used by the SEPHIA browser module. The avatar SVG is an original project asset; the announcement WAV remains absent pending voice approval.

## Avatar portrait asset

`avatar-sephia.svg` is the original local vector portrait used by the Panitia host. It contains no remote image, font, or script dependency. Final visual acceptance on the target monitor remains pending.

## Expected announcement asset

`sephia-announcement.wav` is intentionally absent until a final recording/render is approved.

Required contract:
- One adult feminine Indonesian voice.
- Exact approved announcement only; no student data or additional phrases.
- RIFF/WAVE, uncompressed PCM, mono, 16-bit.
- Sample rate: 24 kHz or 44.1 kHz.
- Duration: 2–8 seconds.
- No background music, clipping, echo, or audible room noise.
- Consent and permitted-use documentation retained with the asset provenance.
- Two independent listeners approve pronunciation, naturalness, intelligibility, and tone.
- SHA-256 and technical metadata recorded in the release record.

Run `npm run verify:voice-asset` from `sephia/` after adding the real WAV. The validator reports BLOCKED (without failing CI) while the file is absent; it does not generate a placeholder.
