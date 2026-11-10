# SEPHIA Stage 22 — Release Readiness Audit

**Branch:** `feature/sephia-module`  
**Status:** CI/build ready; production release is BLOCKED by external acceptance gates  
**No merge, no production deployment, no OTP/Firebase/Moodle behavior change**

## Verified in repository

- Stage 21 CI passes unit/integration tests, static security checks, build, staging verification, host contract verification, TTS, wake-word, avatar, notification speech pipeline, voice diagnostics, audio adapter, and voice asset validation command.
- Original same-origin avatar SVG is included and referenced from the Panitia dashboard.
- Local WAV playback adapter is available through explicit `announcementAssetUrl`; the host does not set that option by default.
- `vercel.json` permits same-origin microphone and on-device speech recognition.
- GitHub Actions now runs on pushes to `feature/sephia-module` and `main`, and on pull requests.
- No deployment workflow or production secret has been added to the SEPHIA CI workflow.

## External acceptance still required

| Gate | Status | Required evidence |
|---|---|---|
| Final Indonesian feminine voice | BLOCKED | Approved WAV, consent/license record, two-listener audition, checksum |
| Panitia Chrome workstation | MANUAL | Secure context, microphone permission, on-device wake word, speaker playback |
| Avatar visual fit | MANUAL | Owner review on target monitor and responsive viewport |
| Vercel Git integration | MANUAL | Project linked to repository; Production Branch confirmed as `main` |
| Vercel preview | MANUAL | Successful preview deployment and browser acceptance |
| Production release | NOT AUTHORIZED | Approved PR and explicit owner approval |

The current browser TTS adapter is retained for diagnostics only; its local voice metadata is not proof of feminine timbre. The fixed WAV asset remains the intended production voice path.

## Security and environment notes

- Microphone and on-device speech recognition require a secure context. Vercel HTTPS satisfies the secure-origin requirement when the page is served correctly. A plain HTTP LAN origin such as `http://10.10.10.246` is not a secure context for microphone access; use HTTPS or a supported localhost workflow for local testing.
- SEPHIA stays OFF after page load/refresh and requires manual activation.
- Only the explicit `#alertList` region is observed.
- No student name, class, OTP value, or violation count is spoken.
- No Firebase/API/Moodle access, persistence, or OTP mutation is added.
- The dashboard has no account login; a known URL is not authentication.

## Branch relationship

At this audit, `feature/sephia-module` is ahead of `main` by 365 commits and behind by 2. The two main-side commits concern a staging verifier that was added and subsequently removed; the final main tree does not retain that file. The branches remain divergent. Do not force-push, rewrite history, merge, or silently rebase. Review the eventual pull-request diff and GitHub mergeability before merging.

## Deployment sequence after blockers close

1. Supply and approve the voice asset; run the WAV validator and human audition.
2. Complete target Panitia PC acceptance under HTTPS.
3. Verify Vercel project link, project root/build settings, Production Branch `main`, and preview deployment.
4. Review the complete feature-to-main pull-request diff and require all CI checks.
5. Owner approves merge to `main`.
6. Vercel auto-deploys from `main`; verify deployment and smoke-test the live Panitia page.

## Automated report

Run `npm run verify:release` from `sephia/`. It prints repository-observable gates and labels external checks as MANUAL. It intentionally does not claim production readiness while the voice asset is absent, and it never deploys or merges.
