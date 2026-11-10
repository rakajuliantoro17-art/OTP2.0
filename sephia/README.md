# SEPHIA — OTP 2.0 Panitia Module

SEPHIA is a passive, browser-scoped notification reader for the OTP 2.0 Panitia dashboard.

## Status

- Stages 2–17 are implemented to varying repository/CI levels on this feature branch. Stage 12 adds a strict local Indonesian feminine-voice TTS adapter; Stage 13 adds an opt-in on-device wake-word path; Stage 14 mounts the avatar overlay, and Stage 15 adds synthetic end-to-end notification-to-speech tests, and Stage 16 adds a local workstation voice-diagnostics page. Actual Chrome/PC acceptance remains pending, and the CSS avatar remains a placeholder until final artwork is supplied. Stage 17 defines a natural-voice strategy: because the approved announcement is fixed, the preferred production path is a consented, approved local audio asset rather than heavyweight runtime synthesis. Neural candidates remain unapproved until audition, license review, and device testing.
- The dashboard has no account login; access is through a dedicated URL known to Panitia. This is not authentication and does not establish viewer identity.
- SEPHIA host integration is present on this feature branch only; it is not deployed. The control appears after dashboard components load, but the reader remains OFF until manually activated.
- Development branch: `feature/sephia-module`; no merge to `main` or production deployment is authorized.
- Vercel may remain paused while repository work and local tests continue.

## Approved operating boundary

- Observe only the designated host notification element: `#alertList`.
- Accept only visible alert items with stable event ID, event type `violation`, and trusted integer count 27–30.
- Read visible message text through `textContent`; never infer missing data.
- Do not call Firebase, APIs, server endpoints, Moodle, or OTP actions.
- Do not issue, validate, revoke, unlock, reset, or auto-submit OTPs.
- Do not persist event history, audio, transcripts, or session memory.
- Start inactive and require explicit manual activation after every page load.
- Manual OFF, `pagehide`, and `beforeunload` stop the observer and speech. BFCache restoration does not auto-activate.
- This page-lifecycle boundary is not authentication. Never infer identity or role from the secret URL.
- Never allow SEPHIA failures to affect OTP monitoring or host alert rendering.

## Module layout

```text
sephia/
├── docs/
│   ├── HOST-INTEGRATION.md
│   ├── STAGE-6-ACCESS-BOUNDARY.md
│   ├── STAGE-6-CHROME-TEST-RUNBOOK.md
│   └── STAGE-6-ACCEPTANCE-REPORT.md
├── src/
│   ├── adapters/
│   ├── audio/
│   ├── core/
│   ├── runtime/
│   │   ├── bind-page-lifecycle.js
│   │   └── create-sephia-runtime.js
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
```

Then follow [the Chrome staging runbook](./docs/STAGE-6-CHROME-TEST-RUNBOOK.md). The staging fixture imports the built `dist/` modules and uses synthetic alerts plus mock speech only; it is not connected to OTP/Firebase or a live Panitia page. Build first with `npm run build`, then serve `staging/` on loopback at `127.0.0.1:4173`. The build copies browser ES modules to `dist/`, validates local imports, and writes a SHA-256 manifest. CI uploads this output as a 14-day artifact.

See [Stage 17 Natural Voice Strategy](./docs/STAGE-17-NATURAL-VOICE-STRATEGY.md), [Stage 16 Voice Diagnostics](./docs/STAGE-16-VOICE-DIAGNOSTICS.md), [Stage 15 Notification Speech Pipeline](./docs/STAGE-15-NOTIFICATION-SPEECH-PIPELINE.md), [Stage 14 Avatar Host Overlay](./docs/STAGE-14-AVATAR-HOST-OVERLAY.md), [Stage 13 Local Wake Word](./docs/STAGE-13-LOCAL-WAKE-WORD.md), [Stage 12 Local Indonesian TTS](./docs/STAGE-12-LOCAL-INDONESIAN-TTS.md), [Stage 10 Host Trial Readiness](./docs/STAGE-10-HOST-TRIAL-READINESS.md), [Stage 9 Staging Package](./docs/STAGE-9-STAGING-PACKAGE.md), [Access Boundary](./docs/STAGE-6-ACCESS-BOUNDARY.md), [Host Integration](./docs/HOST-INTEGRATION.md), [Stage 6 Acceptance Report](./docs/STAGE-6-ACCEPTANCE-REPORT.md), [Audio Adapter](./docs/AUDIO-ADAPTER.md), and [Maintenance Guide](./docs/MAINTENANCE.md).

The build output is uploaded as a 14-day GitHub Actions artifact. It is not a production deployment. Nothing in this folder self-activates or changes production OTP behavior.
