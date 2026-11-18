# SEPHIA Stage 36 — Production Candidate Runbook

**Status:** deployment/runbook prepared; production release remains BLOCKED by voice consent, model provisioning, and target Panitia PC acceptance.  
**Repository:** `rakajuliantoro17-art/OTP2.0`  
**Working branch:** `feature/sephia-module`.

## 1. Release artifacts

Use only artifacts from a workflow run whose Linux verification and Windows native-host build both report success:

- `sephia-stage22-local-voice-diagnostics-<commit>`: browser distribution, Chrome extension source, native-host source/scripts, and stage documentation.
- `sephia-native-host-windows-<commit>`: Windows executable and runtime DLLs.

The native-host executable and source must come from the same commit. Do not mix artifacts from different commits. CI artifacts expire after 14 days; rerun the workflow if they expire.

## 2. Model provisioning

On the target Windows PC, extract the Stage 22 artifact and run PowerShell 7 from the extracted repository folder:

    .\sephia\native-host\provision-model-windows.ps1 -ModelDir C:\SEPHIA\models -Download

This explicitly downloads the pinned Pocket TTS Indonesian model files and verifies their size and SHA-256. Do not run this during a live Panitia session. The runtime itself never downloads model weights.

## 3. Voice reference and consent

Before installation, obtain:
- an adult feminine Indonesian WAV reference recording;
- explicit written permission for local voice-cloning use for SEPHIA announcements;
- a consent record specifying purpose, local processing, retention/deletion, and withdrawal/contact process;
- a copy of the model license notice.

Do not substitute a public recording or dataset sample without verifying voice-cloning rights and speaker consent.

## 4. Chrome extension

1. Open Chrome at `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select the extracted `sephia/extension` folder.
4. Copy the exact extension ID shown by Chrome.
5. Keep the extension folder at a stable local path; if the extension ID changes, reinstall the Native Messaging host with the new ID.

The extension has no broad host permission. It pairs only after a deliberate popup click on the active HTTPS Panitia tab.

## 5. Native host installation

Run PowerShell 7 with the Windows executable and evidence paths:

    .\sephia\native-host\install-windows.ps1 -ExtensionId <32-character-id> -HostExePath <path-to-sephia-native-host.exe> -ModelDir C:\SEPHIA\models -VoiceReferenceWav <path-to-consented-voice.wav> -VoiceConsentEvidencePath <path-to-consent.pdf> -ModelLicenseEvidencePath .\sephia\native-host\THIRD-PARTY-NOTICES.md

The installer re-verifies the model files, copies the voice reference and evidence into the per-user SEPHIA directory, pins runtime hashes, registers the exact extension ID, and creates the host config. Restart Chrome after installation.

## 6. Panitia acceptance

1. Open the actual HTTPS Panitia dashboard.
2. Open the SEPHIA extension popup and pair the active tab.
3. Confirm the popup reports successful pairing only after the native engine readiness handshake.
4. Confirm SEPHIA remains OFF until manually activated from the dashboard.
5. Confirm the activation click unlocks Web Audio successfully; wait at least 60 seconds before testing playback.
6. In a non-production staging fixture, trigger one synthetic eligible notification.
7. Confirm only the approved generic sentence is spoken once; no student identity or violation details are spoken.
8. Test STOP, duplicate events, timeout, disconnect, page reload, navigation, tab close, Chrome restart, host crash, and missing/mismatched model/voice hashes.
9. Run the Stage 34 benchmark and save its JSON result.
10. Obtain two independent listener approvals and complete privacy/network inspection.

Do not generate test violations in the live OTP system. Do not change OTP rules or Firebase/Moodle behavior for acceptance.

## 7. Rollback

Run:

    .\sephia\native-host\uninstall-windows.ps1

This removes the Native Messaging registration, host executable, runtime DLLs, model bundle, voice reference, and evidence copies from the per-user SEPHIA directory. Then remove the extension from `chrome://extensions`.

## 8. Production release gate

Production is permitted only after:
- all CI jobs pass, including Windows build and host smoke test;
- model license and voice consent are approved;
- target PC benchmark meets the limits;
- two listeners approve the voice;
- browser playback, activation, privacy, and failure isolation are accepted;
- Vercel preview is reviewed;
- a pull request is reviewed and the owner explicitly authorizes merge/deployment.

Until then, keep all work on `feature/sephia-module`. No merge to `main` or production deployment is authorized.
