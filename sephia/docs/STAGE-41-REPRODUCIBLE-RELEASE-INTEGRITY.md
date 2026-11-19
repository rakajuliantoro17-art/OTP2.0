# SEPHIA Stage 41 — Reproducible Release and Artifact Integrity

**Status:** automated repository/build integrity gate. This stage does not install SEPHIA, provision a model, or approve production use.  
**Branch:** `feature/sephia-module`.

## Objective

Ensure the browser bundle, Chrome extension, Native Messaging host, and pinned model provenance can be traced to one source commit. Prevent accidental mixing of browser and Windows artifacts from different CI runs.

## Automated gate

Run after `npm run build`:

```sh
npm run verify:stage41
```

The verifier checks:

- package version and generated browser manifest agree;
- every source JavaScript module appears exactly once in the distribution manifest;
- each built module's byte count and SHA-256 match the actual bytes;
- the manifest build ID matches `GITHUB_SHA` in CI;
- required speech, wake-word, avatar, and host modules are present;
- model and Laras revisions are immutable commit hashes;
- model file hashes, aggregate byte count, and aggregate digest are internally consistent;
- the user-supplied voice reference is not bundled;
- required CC-BY-4.0 attribution and release workflow gates remain present;
- browser and Windows host artifacts are named with the same commit SHA.

## Artifact pairing rule

Install only these artifacts from the **same successful workflow run and exact commit**:

- `sephia-stage41-panitia-bundle-<commit>`: browser distribution, extension, native-host source and install scripts, model provenance, notices, and runbooks.
- `sephia-native-host-windows-<commit>`: Windows Native Messaging executable and runtime DLLs.

Never pair artifacts by branch name alone. Compare the full 40-character commit SHA in the artifact names. If either artifact is missing, failed, expired, or comes from another SHA, do not install; rerun CI on the desired commit.

## Data and privacy boundary

- Model weights are not included in the repository artifact; provision them separately using the explicit pinned download workflow.
- A production voice reference, consent evidence, and license evidence are user-provisioned inputs. They must not be committed, uploaded as CI artifacts, or included in a public release bundle.
- CI verifies provenance metadata, not the authenticity of a real-world consent document or the acoustic quality of a voice.
- No audio recording, generated speech, transcript, student identity, OTP value, or alert payload is uploaded by this stage.

## Release gates not satisfied by this stage

A successful Stage 41 CI check is not a workstation acceptance. Production remains blocked until the Windows executable runs on the Panitia PC, model and consented voice are provisioned locally, speaker output and wake-word behavior are tested, and privacy/network/failure-isolation checks pass.

No merge to `main`, production deployment, Firebase Rules change, Moodle change, or OTP behavior change is part of Stage 41.
