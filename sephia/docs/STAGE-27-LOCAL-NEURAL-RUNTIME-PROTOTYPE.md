# SEPHIA Stage 27 — Local Neural Runtime Prototype

**Branch:** feature/sephia-module  
**Status:** qualification wrapper and offline-engine contract implemented; no model/runtime provisioned or approved.  
**Candidate:** Laras + Pocket TTS Indonesian, subject to license, voice, and target-PC validation.

## Implemented

- A versioned model manifest pins model SHA-256, voice-reference SHA-256, runtime version, model license evidence, and explicit voice-reference consent.
- Only the laras-pocket-tts candidate identifier and local-only execution are accepted.
- A mandatory provisioning verifier must independently hash the actual local model and voice-reference bytes before the engine factory is called. A manifest string alone is not treated as proof of file integrity.
- The runtime factory is injected from a pre-provisioned local bundle; this module defines no HTTP endpoint, sidecar URL, network request, model download, browser TTS, or storage.
- Only the exact approved generic announcement may be synthesized.
- Generated output must be an in-memory ArrayBuffer/typed-array payload, at most 8 MiB, 16–48 kHz, and 0.25–15 seconds.
- The wrapper exposes cancel/dispose and refuses work after disposal or during concurrent synthesis.

## Important limitation

This is a qualification boundary, not a bundled Laras/Pocket model or a working speech engine. The checksum verifier and engine factory are trusted local integration code and must be reviewed to ensure they read only provisioned files and perform offline inference. No endpoint is enabled.

Stage 24 topology review remains open. Do not expose an unauthenticated LAN service or bypass Chrome mixed-content, CORS, Private Network Access, or secure-context controls.

## Exit criteria

- Provision exact model/runtime locally and verify model + reference hashes from actual bytes.
- Complete documented model-license and voice-actor/dataset consent review.
- Confirm adult feminine Indonesian timbre by listening; do not infer voice gender from model metadata.
- Demonstrate no external network requests and no persistent audio/cache.
- Run Stage 28 benchmark on the actual Panitia PC.
