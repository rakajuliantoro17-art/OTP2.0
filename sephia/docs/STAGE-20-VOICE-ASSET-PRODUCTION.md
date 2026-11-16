# SEPHIA Stage 20 — Voice Asset Production Contract

**Branch:** `feature/sephia-module`  
**Status:** technical contract and validator implemented; real recording/render is still missing  
**Scope:** deterministic WAV metadata, duration, signal-level and clipping checks  
**Safety:** no audio recording, model inference, upload, remote synthesis, or OTP behavior changes

## Approved speech content

The final asset must contain this exact sentence and nothing else:

> Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.

Do not include student identity, class, violation count, OTP value, background music, greeting, or any additional dynamic phrase.

## File contract

- Path: `sephia/assets/sephia-announcement.wav`
- RIFF/WAVE container.
- Uncompressed PCM (format code 1).
- Mono, 16-bit.
- Sample rate 24,000 Hz or 44,100 Hz.
- Duration 2–8 seconds.
- Maximum file size 2 MiB.
- Audible signal required; silent/near-silent files are rejected.
- Excessive clipped samples are rejected.

The validator does not assess whether a voice sounds feminine, natural, native, or appropriate. Those remain human-listening acceptance checks.

## Recording/rendering workflow

1. Use a consenting adult speaker or an offline neural voice whose base model, adapter, training data, voice identity, runtime, and output-use terms have been reviewed.
2. Record/render the exact approved sentence in a quiet room with a consistent microphone distance.
3. Speak in standard Indonesian, warm and professional, calm moderate pace, with a short pause after “Perhatian, Panitia.”
4. Export a clean mono WAV master. Do not apply aggressive denoising, pitch correction, or compression that introduces artifacts.
5. Normalize consistently and audition on ordinary laptop speakers.
6. Have at least two independent listeners score the sample without knowing the source.
7. Record provenance, speaker consent/license, sample rate, duration, peak level, clipping ratio, file size, SHA-256, and reviewer decision.
8. Add the approved file at the exact path and rerun CI.

## Automated validator

`scripts/wav-asset-contract.mjs` parses RIFF chunks and verifies:
- header and declared file length;
- PCM format;
- mono channel count;
- supported sample rate and bit depth;
- consistent byte rate/block alignment;
- duration and file size;
- non-silent signal and clipping ratio.

`npm run verify:voice-asset` prints technical metadata and SHA-256 when the file exists. While it is absent, it prints **BLOCKED** and exits successfully so normal development CI remains usable. Production release must still treat this gate as incomplete.

## Human acceptance checklist

| Dimension | Required result |
|---|---|
| Indonesian articulation | Correct, clear, natural |
| Adult feminine timbre | Clearly meets approved profile |
| Intonation | Calm, professional, not robotic |
| Pause after opening address | Natural and consistent |
| Noise / echo / clipping | No audible defect |
| Laptop speaker intelligibility | Fully understandable |
| Two-listener review | Both approve |
| Consent / license | Written evidence available |

## Current status

No real voice asset is included. No sample has been auditioned, no speaker consent has been collected, and no neural model has been approved. Do not set `announcementAssetUrl` in the Panitia host until the real asset is committed and accepted.
