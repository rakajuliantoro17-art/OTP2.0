# SEPHIA Stage 45 — Offline Indonesian Female TTS Candidate Matrix

**Status:** completed research gate; no candidate approved for production installation.  
**Branch:** `feature/sephia-module`.

## User requirement

- Original synthetic adult feminine voice in Indonesian (`id-ID`).
- Soft-spoken, gentle, warm, calm, natural, and clearly articulated.
- No user WAV upload and no public-figure imitation.
- Local Windows inference after one-time installation.
- No cloud TTS, no audio upload, and no unauthenticated localhost/LAN service.
- Audio must be available as in-memory PCM for the existing Chrome Native Messaging boundary and avatar events.

## Candidates reviewed

### A. Piper — `rhasspy/piper-voices/id_ID-news_tts-medium`

Observed upstream facts:
- ONNX voice file is approximately 63 MB; config declares Indonesian `id_ID`, one speaker, medium quality, and 22,050 Hz output.
- The Hugging Face repository page displays MIT metadata.
- The model card points to a Kaggle dataset and says its dataset license must be checked at the source URL; it also says the model was fine-tuned from the U.S. English `lessac` voice.
- Public metadata does not declare speaker gender or establish a feminine soft-spoken delivery.

References:
- https://huggingface.co/rhasspy/piper-voices/tree/main/id/id_ID/news_tts/medium
- https://huggingface.co/rhasspy/piper-voices/blob/main/id/id_ID/news_tts/medium/id_ID-news_tts-medium.onnx.json
- https://huggingface.co/rhasspy/piper-voices/blob/main/id/id_ID/news_tts/medium/MODEL_CARD

Decision: **not approved**. The language/runtime footprint is promising, but gender/acoustic suitability and dataset rights are not established. Do not bundle or install this voice as the requested feminine SEPHIA voice.

### B. Indonesian VITS — `jerichosiahaya/vits-tts-id`

Observed upstream facts:
- Model card declares Indonesian and MPL-2.0 metadata.
- Checkpoint is approximately 346 MB.
- The model card describes training with VITS and LJSpeech datasets, but does not document a female speaker identity or a soft-spoken target.
- The hosted `config.json` is reported as invalid JSON because it contains the non-standard value `Infinity`.
- The checkpoint is a PyTorch `.pth` artifact; loading must be isolated and reviewed rather than trusting a model repository blindly.

References:
- https://huggingface.co/jerichosiahaya/vits-tts-id
- https://huggingface.co/jerichosiahaya/vits-tts-id/tree/main

Decision: **not approved**. Runtime reproducibility, config validity, speaker identity, and acoustic suitability remain unresolved.

### C. Indonesian F5-TTS fine-tunes

The reviewed Indonesian F5-TTS fine-tunes disclose CC-BY-NC-4.0 / non-commercial restrictions and rely on reference-audio workflows. They do not meet the no-WAV preset requirement and are not suitable for the intended institutional deployment without a separate rights review.

References:
- https://huggingface.co/Eempostor/F5-TTS-INDO-FINETUNE-V2
- https://huggingface.co/Eempostor/F5-TTS-INDO-FINETUNE

Decision: **not approved**.

### D. Pocket TTS Indonesian

The reviewed Pocket TTS Indonesian model is an Indonesian voice-cloning model. It requires a reference voice and therefore does not satisfy the user's current preset/no-upload requirement, even though its student model reports CPU inference results.

Reference:
- https://huggingface.co/anak10thn/pocket-tts-indonesian

Decision: **not approved for this requirement**. Retain only as a separate future option if a properly consented voice reference is ever supplied.

### E. ArboTTS

See Stage 44. The default female persona route uses Edge TTS network streaming; the local Kokoro Indonesian female pack provenance and license were not verified.

Decision: **not approved**.

## Stage 45 conclusion

No reviewed candidate currently satisfies all four mandatory gates at once:

1. Verifiable adult feminine Indonesian acoustic identity and soft-spoken quality.
2. Fully local/offline inference without a user-provided reference WAV.
3. Clear model, dataset, voice-pack, and dependency redistribution/use rights.
4. Reproducible pinned artifacts with hashes and a tested Windows/Native Messaging adapter.

Therefore, **do not select a production engine and do not build/release the Windows installer yet**. A generic Indonesian voice is not an acceptable substitute for the requested female voice.

## Next steps

1. Find or commission a legally cleared, preset female Indonesian voice model with documented speaker/gender provenance and redistribution rights; no celebrity imitation.
2. If a candidate is found, audition its official sample with the user and evaluate Indonesian pronunciation, prosody, and soft-spoken quality.
3. Pin source revision, model files, licenses, file sizes, and SHA-256 hashes.
4. Prototype a local adapter that accepts only the two fixed SEPHIA phrases and emits in-memory PCM.
5. Integrate through Chrome Native Messaging only; no cloud fallback and no unauthenticated localhost/LAN endpoint.
6. Run offline, security, latency, CPU/RAM, cancellation, and avatar synchronization tests on the target Panitia PC.
7. Only then migrate the WAV-dependent installer.

## Release boundaries

- Keep work on `feature/sephia-module`.
- Do not merge to `main`, deploy, or install anything on the Panitia workstation.
- Do not alter OTP logic, Firebase rules, Moodle, or Panitia alert handling.
- Until a candidate passes all gates, SEPHIA remains visual-only when local neural TTS is unavailable.
