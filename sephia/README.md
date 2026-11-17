# SEPHIA — OTP 2.0 Panitia Module

SEPHIA is a passive, browser-scoped notification reader for the OTP 2.0 Panitia dashboard.

## Status

- Stages 2–17 provide the host contract, security boundaries, local TTS diagnostics, on-device wake-word prototype, avatar overlay, synthetic notification-to-speech tests, and the initial natural-voice strategy.
- **Stage 23 records the owner's final voice decision: dynamic local neural TTS, not a prerecorded WAV.**
- **Stage 24 documents the runtime-topology security gate.** The current host bridge still has legacy WAV/browser-TTS selection paths; neither is approved as the final production voice. Neural adapter integration is blocked until the actual Panitia Chrome origin, local runtime connectivity, and workstation performance can be verified. It supersedes the fixed-WAV recommendation in Stage 17 and the WAV production path described in Stages 18–20.
- Stages 18–20 remain isolated implementation/validation components. The Panitia host must not select `announcementAssetUrl` as its production speech adapter.
- Stage 12 browser/OS TTS remains diagnostic only; it is not an automatic production fallback because voice metadata does not prove feminine timbre.
- Laras + Pocket TTS Indonesian is the primary technical prototype candidate, subject to a licensed adult feminine reference voice, acoustic audition, security review, and target-device performance. CSM-1B Indonesian is a secondary candidate; speaker gender must be verified.
- Stage 21 adds an original same-origin SVG digital-human portrait and wires it into the Panitia host. Final visual approval on the Panitia monitor and phoneme-timed lip sync remain pending.
- The dashboard has no account login; access is through a dedicated URL known to Panitia. This is not authentication and does not establish viewer identity.
- SEPHIA host integration is present on this feature branch only; it is not deployed. The control appears after dashboard components load, but the reader remains OFF until manually activated.
- Development branch: `feature/sephia-module`; no merge to `main` or production deployment is authorized.
- Vercel project resume was reported by the project owner; the GitHub/Vercel Production Branch and deployment integration still require direct verification.

## Approved operating boundary

- Observe only the designated host notification element: `#alertList`.
- Accept only visible alert items with stable event ID, event type `violation`, and trusted integer count 27–30.
- Read visible message text through `textContent`; never infer missing data.
- Do not call Firebase, APIs, server endpoints, Moodle, or OTP actions. A future local TTS endpoint is a narrowly scoped speech engine, not a data-source or OTP API.
- Do not issue, validate, revoke, unlock, reset, or auto-submit OTPs.
- Do not persist event history, generated audio, transcripts, or session memory.
- Start inactive and require explicit manual activation after every page load.
- Manual OFF, `pagehide`, and `beforeunload` stop the observer and speech. BFCache restoration does not auto-activate.
- This page-lifecycle boundary is not authentication. Never infer identity or role from the secret URL.
- Never allow SEPHIA failures to affect OTP monitoring or host alert rendering.
- Local TTS must not use cloud fallback, external telemetry, or third-party audio upload. Model provisioning must be explicit and checksum-pinned.

## Module layout

```text
sephia/
├── docs/
├── src/
│   ├── adapters/
│   ├── audio/
│   ├── core/
│   ├── host/
│   ├── runtime/
│   └── visual/
├── staging/
└── tests/
```

## Runtime and host boundary

The feature branch contains the notification metadata bridge, local speech adapters, wake-word recognizer, avatar overlay, and isolated SEPHIA modules. The optional bridge is mounted in the Panitia page source on this branch only; it is not deployed. It starts OFF and requires a manual activation click. `npm run build` creates a dependency-free browser ES module package in `dist/`.

The dedicated URL is not a security credential. Review server/network access restrictions separately before production use. The dashboard has no account login; SEPHIA does not add identity, roles, PINs, or a fictitious logout/session-expiry hook.

## Testing

From `sephia/`, run with Node.js 22:

```bash
npm test
npm run check
npm run build
npm run verify:staging
npm run verify:host
npm run verify:audio
npm run verify:voice-asset
npm run verify:release
```

Then follow [the Chrome staging runbook](./docs/STAGE-6-CHROME-TEST-RUNBOOK.md). The staging fixture imports the built `dist/` modules and uses synthetic alerts plus mock speech only; it is not connected to OTP/Firebase or a live Panitia page. The build copies browser ES modules to `dist/`, validates local imports, and writes a SHA-256 manifest. CI uploads this output as a 14-day artifact.

See [Stage 24 Local TTS Topology Gate](./docs/STAGE-24-LOCAL-TTS-TOPOLOGY-GATE.md), [Stage 23 Local Neural TTS Decision](./docs/STAGE-23-LOCAL-NEURAL-TTS-DECISION.md), [Stage 22 Release Readiness](./docs/STAGE-22-RELEASE-READINESS.md), [Stage 21 Local Avatar Asset](./docs/STAGE-21-LOCAL-AVATAR-ASSET.md), [Stage 20 Voice Asset Production](./docs/STAGE-20-VOICE-ASSET-PRODUCTION.md), [Stage 19 Local Audio Host Wiring](./docs/STAGE-19-LOCAL-AUDIO-HOST-WIRING.md), [Stage 18 Local Audio Adapter](./docs/STAGE-18-LOCAL-AUDIO-ADAPTER.md), [Stage 17 Natural Voice Strategy](./docs/STAGE-17-NATURAL-VOICE-STRATEGY.md), [Stage 16 Voice Diagnostics](./docs/STAGE-16-VOICE-DIAGNOSTICS.md), [Stage 15 Notification Speech Pipeline](./docs/STAGE-15-NOTIFICATION-SPEECH-PIPELINE.md), [Stage 14 Avatar Host Overlay](./docs/STAGE-14-AVATAR-HOST-OVERLAY.md), [Stage 13 Local Wake Word](./docs/STAGE-13-LOCAL-WAKE-WORD.md), [Stage 12 Local Indonesian TTS](./docs/STAGE-12-LOCAL-INDONESIAN-TTS.md), [Stage 10 Host Trial Readiness](./docs/STAGE-10-HOST-TRIAL-READINESS.md), [Stage 9 Staging Package](./docs/STAGE-9-STAGING-PACKAGE.md), [Access Boundary](./docs/STAGE-6-ACCESS-BOUNDARY.md), [Host Integration](./docs/HOST-INTEGRATION.md), [Stage 6 Acceptance Report](./docs/STAGE-6-ACCEPTANCE-REPORT.md), [Audio Adapter](./docs/AUDIO-ADAPTER.md), and [Maintenance Guide](./docs/MAINTENANCE.md).

The build output is uploaded as a 14-day GitHub Actions artifact. It is not a production deployment. Nothing in this folder self-activates or changes production OTP behavior.
