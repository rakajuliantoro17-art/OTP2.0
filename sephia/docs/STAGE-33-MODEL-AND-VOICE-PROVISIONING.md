# SEPHIA Stage 33 — Offline Model and Voice Provisioning

**Status:** explicit model download/verification script and Windows install workflow implemented. No model or voice file has been provisioned on the Panitia PC.

## Model provisioning

The pinned Pocket TTS Indonesian bundle contains nine ONNX/tokenizer files (approximately 164 MB), identified by `docs/POCKET-TTS-INDONESIAN-ONNX-PROVENANCE.json`.

Verify an existing local directory without downloading:

    .\sephia\native-host\provision-model-windows.ps1 -ModelDir C:\SEPHIA\models

Explicitly download the pinned revision and verify every file:

    .\sephia\native-host\provision-model-windows.ps1 -ModelDir C:\SEPHIA\models -Download

The download script:
- uses a fixed Hugging Face repository and commit revision;
- downloads only when the explicit `-Download` switch is supplied;
- writes each download to a temporary file before moving it into place;
- checks each file's byte size and SHA-256;
- checks the aggregate bundle size and digest;
- prints the required CC-BY-4.0 attribution.

The browser page, extension, Native Messaging host, and runtime do not download model weights. The Windows installer only verifies and copies an already provisioned bundle.

## Voice reference provisioning

A separate adult feminine Indonesian WAV recording is required. The recording must be made by a speaker who has explicitly consented to local voice-cloning use for SEPHIA announcements. A public recording, a dataset license, or an ordinary recording license is not automatically consent for voice cloning.

Required installation evidence:
- voice consent document, including the speaker's identity/authority, permitted purpose, local processing scope, and withdrawal/contact process;
- model license notice/evidence;
- WAV file SHA-256 (computed by installer and checked by host).

The installer copies the WAV and evidence into the per-user SEPHIA directory. Uninstall removes the model, voice reference, evidence copies, host binary, and registration.

## Windows install

After model and voice provisioning, build the Windows executable with:

    cargo build --release --features inference --manifest-path sephia/native-host/Cargo.toml

Then install using the packaged extension ID and evidence files:

    .\sephia\native-host\install-windows.ps1 -ExtensionId <32-character-id> -HostExePath <absolute-path-to-exe> -ModelDir C:\SEPHIA\models -VoiceReferenceWav C:\SEPHIA\voice.wav -VoiceConsentEvidencePath C:\SEPHIA\consent.pdf -ModelLicenseEvidencePath .\sephia\native-host\THIRD-PARTY-NOTICES.md

The installer verifies and copies the model files, copies the voice/evidence, pins the native executable and runtime DLL hashes, writes a strict host config, and registers only the exact extension ID. Restart Chrome after installation.

## Acceptance

After installation:
1. Pair the active HTTPS Panitia tab through the extension popup.
2. Confirm the host sends the ready handshake only after model/voice/runtime verification.
3. Activate SEPHIA manually from the Panitia dashboard.
4. Generate a synthetic eligible test alert in a non-production fixture; verify the fixed generic phrase is spoken once.
5. Test STOP during synthesis/playback, tab reload, navigation, browser close, host crash, and missing/mismatched files.
6. Verify generated audio is never written to disk and no external network request occurs during inference.
7. Complete two-listener voice approval and Stage 28 cold/warm latency, CPU, RAM, and thermal acceptance on the target PC.

**No production release** until the actual voice consent, local model files, Windows installer, extension ID, and target-workstation evidence are reviewed.
