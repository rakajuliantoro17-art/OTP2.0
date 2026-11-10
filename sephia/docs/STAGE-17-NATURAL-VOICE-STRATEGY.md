# SEPHIA Stage 17 — Natural Voice Strategy and Engine Evaluation

**Branch:** `feature/sephia-module`  
**Status:** architecture decision and evaluation plan; no production change  
**Scope:** natural Indonesian feminine voice, offline playback, quality gates  
**Safety:** no Firebase, Moodle, OTP, or notification-source changes

## Executive decision

SEPHIA's currently approved announcement is a fixed, generic sentence. It does not contain a student's name, class, violation count, or any other dynamic value. Therefore, the most reliable path to natural speech is:

1. Produce and approve a high-quality adult feminine Indonesian recording (preferably a properly consented voice actor, or a neural TTS model whose complete model/data/runtime licenses are verified).
2. Store the approved audio as a versioned local asset in the SEPHIA package.
3. Play that asset locally when an eligible notification arrives.
4. Keep the existing browser-local TTS adapter as a diagnostic/development fallback only, not the production voice-quality target.

This is a deliberate design optimization: because the spoken sentence is fixed, running a large neural model on every alert adds startup delay, memory/CPU/GPU load, and model-runtime complexity without adding useful capability. Pre-rendering once gives the same approved timbre and prosody every time, immediate playback, and no runtime model inference or network dependency.

No voice recording or generated model is included by this stage. Voice identity, consent, and the final audio asset remain acceptance gates.

## Voice character

The approved SEPHIA voice target is:

- Adult feminine; mature and professional, not childish or synthetic-sounding.
- Warm, calm, clear, and reassuring without sounding overly intimate.
- Native Indonesian pronunciation, neutral standard Indonesian rather than a strong regional accent.
- Moderate pace, natural phrase grouping, and a short pause after "Perhatian, Panitia."
- Controlled intonation; no exaggerated announcer cadence, sing-song delivery, or robotic pitch.
- Consistent loudness and clean recording, with no room echo, hiss, clipping, or background music.

The fixed approved text remains:

> Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.

Do not change the text or add personal/student information as part of voice tuning.

## Candidate assessment

This is a paper assessment, not an acoustic quality test. No candidate is approved for production until its audio is auditioned on the target Panitia PC.

| Candidate | Strength | Limitation / risk | Current decision |
|---|---|---|---|
| Human voice recording | Highest control over natural Indonesian intonation, pauses, and warmth; no inference runtime | Requires speaker consent, recording quality control, and an agreed reuse license | Preferred for this fixed sentence |
| VoxCPM 1.5 Indonesian Female LoRA v2 | Explicitly fine-tuned for natural Indonesian female speech; Apache-2.0 is declared by the adapter; model card suggests short 1–3 sentence output | Base is 800M parameters; model card estimates about 6 GB VRAM; base model's official language description lists Chinese and English, so Indonesian quality depends on the fine-tune; CPU latency and actual output must be measured | Quality candidate for offline one-time rendering, not yet suitable as browser runtime |
| Pocket TTS Indonesian 6-layer | CC BY 4.0 declared; 438 MB; model card reports CPU inference at 2.23x real time and provides four voice prompts | Voice gender/timbre is not established by metadata; reported UTMOS is 2.68; numbers are OOV and formal narration is out of domain | Secondary candidate for local CPU rendering and audition |
| sanoTTS Indonesian | Very small model, browser/WASM capable according to project materials; attractive for low-resource offline execution | Voice identity/gender and naturalness for this exact announcement are not established; GPL-3.0 compliance must be reviewed before bundling | Technical prototype only; not the naturalness baseline |
| ArboTTS | Browser/WASM and CPU-oriented; MIT source repository | Documented Indonesian announcer timbre is male, so it misses SEPHIA's feminine voice requirement | Do not select as SEPHIA production voice |

## Recommended implementation architecture

### Production playback path

- Add a small `LocalAudioAnnouncementAdapter` implementing the existing `speak(text)`, `cancel()`, and `dispose()` contract.
- The adapter must accept only the exact approved announcement string. Reject unexpected text rather than silently speaking arbitrary notification content.
- Play a bundled same-origin audio asset. Do not fetch from a remote API or use a hosted speech provider.
- Use the browser's local audio playback after the existing manual activation gesture. Handle autoplay restrictions explicitly.
- Keep volume controlled by the operating system/browser. Do not add a separate SEPHIA volume setting.
- On OFF, pagehide, error, or disposal, stop playback and release the audio element.
- Do not store recordings, transcripts, notification history, or audio generated at runtime.
- Keep the existing eligibility, stable-ID deduplication, one-at-a-time queue policy, and fixed generic phrase unchanged.

### Asset format

Preferred delivery: mono WAV or high-quality compressed audio, 24 kHz or 44.1 kHz, normalized loudness, no clipping, clean leading/trailing silence. The final choice should balance clarity, file size, and reliable playback in the target Chrome version. Keep the source master separately outside the deployed runtime package if its licensing terms require it.

### Neural TTS rendering workflow

If a human recording is not practical, evaluate VoxCPM Female v2 and Pocket TTS as offline rendering tools on a workstation. Generate the same fixed sentence with controlled settings, export lossless WAV, and compare blind listening samples. Only distribute the rendered output after reviewing the model, training-data, speaker, and output-use licenses. A model card's adapter license alone is not a complete legal review.

Do not clone a real person's voice without explicit, documented consent. Do not use a model or dataset marked non-commercial for school operational use without permission.

## Naturalness acceptance scorecard

Rate each sample from 1 (poor) to 5 (excellent). At least two independent listeners should score the same samples without being told which engine generated them.

| Dimension | Acceptance target |
|---|---:|
| Indonesian pronunciation and articulation | 5 |
| Natural intonation and phrase stress | 4 or 5 |
| Warm, adult feminine timbre | 4 or 5 |
| Pause after the opening address | 4 or 5 |
| Absence of robotic artifacts / metallic resonance | 4 or 5 |
| Consistent voice identity across playback | 5 |
| Intelligibility on ordinary laptop speakers | 5 |
| Playback start latency after trigger | Under 500 ms for bundled audio |
| Repeatability | Identical approved asset on every playback |

Reject any sample with wrong pronunciation, unstable pitch, clipping, excessive sibilance, robotic cadence, or an identity that does not meet the feminine adult voice target.

## Spoken-text preparation

The sentence is intentionally short. Preserve punctuation as prosody cues. If a future announcement contains numbers, abbreviations, or technical terms, create an explicit approved pronunciation map rather than relying on the model to infer them. Do not introduce dynamic student data.

## Security and privacy boundary

- Audio is a generic, pre-approved asset and contains no student information.
- No audio upload, cloud synthesis, external speech API, telemetry, transcript, or recording is permitted.
- No runtime model download is permitted from a third-party host.
- Any model-based rendering happens offline before packaging; pin model revision, checksums, and license notices.
- The production runtime remains a passive reader of the designated `#alertList` region only.
- TTS failure must never affect OTP/CBT monitoring or dashboard alerts.

## Work sequence

1. Prepare two or three voice samples for the exact fixed sentence: human-recorded reference, VoxCPM Female v2 render, and Pocket TTS render if the workstation can run it.
2. Score them using the naturalness scorecard; record engine/model revision, parameters, file hash, duration, and license provenance.
3. Select one voice only after listening and approval.
4. Add the bundled asset and `LocalAudioAnnouncementAdapter`; keep the existing TTS diagnostic page and browser adapter for diagnostics.
5. Add deterministic tests for exact-text enforcement, local asset playback, cancellation, disposal, and autoplay rejection.
6. Re-run the complete CI gates and then perform Chrome acceptance on the Panitia PC.

## Evidence and references

- VoxCPM Indonesian Female v2 model card and hardware notes: https://huggingface.co/aisyahsyihab/voxcpm-lora-indonesian-female-v2
- Official VoxCPM 1.5 model information and declared Apache-2.0 license: https://huggingface.co/openbmb/VoxCPM1.5
- Pocket TTS Indonesian model card, benchmark notes, limitations, and CC BY 4.0: https://huggingface.co/tryzz889/pocket-tts-indonesian
- Pocket TTS voice prompts and their Common Voice CC0 provenance: https://huggingface.co/tryzz889/pocket-tts-indonesian/blob/main/voices/README.md
- sanoTTS technical overview and GPL-3.0 notes: https://aurion.semai.id/models/ampixa-sanotts/
- ArboTTS source and documented Indonesian announcer profile: https://github.com/ARBO-TEAM/arboTTS

## Explicit non-claims

This stage does not claim that any candidate sounds natural enough, that a suitable female voice has been approved, that the Panitia PC can run a given model, or that a production audio asset exists. Those require actual audio samples, listening tests, license review, and device acceptance.
