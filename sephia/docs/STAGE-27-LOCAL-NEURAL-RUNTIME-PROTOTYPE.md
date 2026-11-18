# SEPHIA Stage 27 — Local Neural Runtime Prototype

**Branch:** `feature/sephia-module`  
**Status:** qualification wrapper and offline-engine contract implemented; no model/runtime provisioned or approved.  
**Candidate:** Laras + Pocket TTS Indonesian, subject to license, voice, and target-PC validation.

## Implemented

- A versioned model manifest contract pins the model SHA-256, voice-reference SHA-256, runtime version, model license evidence, and explicit voice-reference consent.
- Only the `laras-pocket-tts` candidate identifier and `execution: local-only` are accepted.
- The runtime factory must be injected from a pre-provisioned local bundle; this module defines no HTTP endpoint, sidecar URL, network request, model download, browser TTS, or storage.
- Only the exact approved generic announcement may be synthesized.
- Generated output must be an in-memory ArrayBuffer/typed-array payload, at most 8 MiB, 16–48 kHz, and 0.25–15 seconds.
- The wrapper exposes cancel/dispose and refuses work after disposal or during concurrent synthesis.

## Important limitation

This is a qualification boundary, not a bundled Laras/Pocket model or a working speech engine. A model hash in a manifest is a pin, not proof that the bytes were independently hashed; provisioning must verify the actual model and voice files against these pins before calling the factory. The factory is trusted code and must be reviewed to ensure it performs offline inference only.

No endpoint is enabled. Stage 24 topology review remains open. Do not expose an unauthenticated LAN service or bypass Chrome mixed-content, CORS, Private Network Access, or secure-context controls.

## Exit criteria

- Provision exact model/runtime locally and verify model + reference hashes.
- Complete documented model-license and voice-actor/dataset consent review.
- Confirm adult feminine Indonesian timbre by listening; do not infer voice gender from model metadata.
- Demonstrate no external network requests and no persistent audio/cache.
- Run Stage 28 benchmark on the actual Panitia PC.
