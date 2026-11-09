# SEPHIA — OTP 2.0 Panitia Module

SEPHIA is a passive, browser-scoped notification reader for the OTP 2.0 Panitia dashboard.

## Status

- Stages 2–7 are implemented on this feature branch. Stage 7 mounts the optional SEPHIA control bridge in the Panitia dashboard source. Stage 8 adds static security checks and a dependency-free browser ES module build.
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

The feature branch contains the notification metadata bridge and isolated SEPHIA modules. The optional bridge is mounted in the Panitia page source on this branch only; it is not deployed. It starts OFF and requires a manual activation click. `npm run build` creates a dependency-free browser ES module package in `dist/`.

The dedicated URL is not a security credential. Review server/network access restrictions separately before production use. The dashboard has no account login; SEPHIA does not add identity, roles, PINs, or a fictitious logout/session-expiry hook.

## Testing

From `sephia/`, run with Node.js 22:

```bash
npm test
```

Then follow [the Chrome staging runbook](./docs/STAGE-6-CHROME-TEST-RUNBOOK.md). The fixture uses synthetic alerts and mock speech only; it is not connected to OTP/Firebase or a live Panitia page. The build copies browser ES modules to `dist/`, validates local imports, and writes a SHA-256 manifest. CI uploads this output as a 14-day artifact.

See [Access Boundary](./docs/STAGE-6-ACCESS-BOUNDARY.md), [Host Integration](./docs/HOST-INTEGRATION.md), [Stage 6 Acceptance Report](./docs/STAGE-6-ACCEPTANCE-REPORT.md), [Audio Adapter](./docs/AUDIO-ADAPTER.md), and [Maintenance Guide](./docs/MAINTENANCE.md).

The build output is uploaded as a 14-day GitHub Actions artifact. It is not a production deployment. Nothing in this folder self-activates or changes production OTP behavior.
