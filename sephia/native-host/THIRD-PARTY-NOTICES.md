# Third-Party Notices

## Laras TTS source code

- Project: Laras TTS
- Repository: https://github.com/Urdemonlord/laras-tts
- Pinned source commit: `e4ab05ca53a8cbf749405de5b1ac902b76880768`
- Source-code license: MIT OR Apache-2.0
- This project uses Laras' public ONNX Engine API directly. SEPHIA does not call the Laras HTTP server or its file-writing `Native::synth_to` wrapper.

## Pocket TTS Indonesian model weights

- Model: anak10thn/pocket-tts-indonesian
- Pinned config revision: `17257664e384561c957b02ac92edd1a24807f0e5`
- Model weights license: CC-BY-4.0
- Required attribution: **Pocket TTS Indonesian oleh anak10thn, CC-BY-4.0**
- License: https://creativecommons.org/licenses/by/4.0/
- Exact ONNX file hashes and aggregate bundle digest: `docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json`

## Voice reference

The production voice reference is a separate recording. It is not covered by the Laras or Pocket TTS licenses. It must have explicit written permission for local TTS/voice-cloning use, a recorded consent scope, and a pinned SHA-256. Do not use a dataset sample or public recording as a cloned voice without verifying the relevant consent and rights.
