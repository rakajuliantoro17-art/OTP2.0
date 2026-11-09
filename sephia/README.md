# SEPHIA — OTP 2.0 Panitia Module

SEPHIA is a passive, browser-scoped notification reader for the OTP 2.0 Panitia dashboard.

## Status

- Stage 2 notification metadata bridge and passive reader are implemented on this feature branch.
- Stage 2 remains isolated: session-bound runtime activation and production deployment are not authorized or verified.
- Development branch: `feature/sephia-module`.
- Not imported by the OTP 2.0 application and not active in any deployment.
- Vercel may remain paused while repository-level development and local tests continue.

## Approved operating boundary

- Observe only the designated host notification element: `#alertList`.
- Accept only visible alert items with a stable event ID and trusted integer violation count from 27 through 30.
- Read visible message text through `textContent`; never infer missing data.
- Do not call Firebase, APIs, server endpoints, Moodle, or OTP actions.
- Do not issue, validate, revoke, unlock, reset, or auto-submit OTPs.
- Do not persist event history, audio, transcripts, or session memory.
- Start inactive; require explicit manual activation.
- On deactivation, disconnect the observer and clear session-local duplicate IDs.
- Never allow SEPHIA failures to affect OTP monitoring or host alert rendering.

## Module layout

```text
sephia/
├── docs/
│   ├── ARCHITECTURE.md
│   └── MAINTENANCE.md
├── src/
│   ├── core/
│   │   └── notification-contract.js
│   ├── adapters/
│   │   └── dom-alert-observer.js
│   ├── runtime/
│   │   └── create-sephia-runtime.js
│   └── notification-reader.js
├── tests/
│   ├── notification-reader.test.mjs
│   └── host-contract.test.mjs
└── package.json
```

- **Core:** pure contract validation and qualification.
- **Adapter:** passive observation of the exact `#alertList` element.
- **Host bridge:** OTP host now forwards stable Firebase event IDs and server-originated violation counts into eligible rendered alerts on this feature branch.
- **Runtime:** explicit activation/deactivation and session lifecycle.
- **Optional future modules:** TTS, voice input, avatar, and visualizer remain separate and are not implemented.

## Host contract (implemented on this feature branch only)

A host-rendered `.alert-item` may expose:

- `data-sephia-event-id`: stable event identifier (required)
- `data-sephia-event-type`: event type (optional, informational only)
- `data-sephia-violation-count`: trusted integer from 27 through 30 (required)

The host must populate metadata from the authoritative server-originated alert payload. DOM attributes are not inherently trustworthy. The message must remain visible text.

**Important:** the host metadata bridge exists only on `feature/sephia-module`. It is not present in `main` or a production deployment. The browser reader remains disconnected until Panitia session validity and logout/expiry hooks are verified.

## Test

From this folder, using Node.js 22 with built-in `node:test` support. The suite includes unit tests plus source-level regression checks for the server payload, Firebase event key propagation, count/type qualification, and safe alert text rendering:

```bash
npm test
```

A GitHub Actions workflow at `.github/workflows/sephia-tests.yml` runs this suite when SEPHIA files change. A successful run must be confirmed before calling the test gate passed.

## Integration gates

1. Verify Panitia authentication/session boundary and deployed Firebase rules.
2. Test the metadata bridge against a staging/local Panitia page, including counts 26–30 and malformed/missing values.
3. Connect runtime only after a trusted session provider and expiry/logout hook are verified.
4. Only then consider audio and visual layers as separately gated modules.

See [Architecture](./docs/ARCHITECTURE.md), [Host Integration](./docs/HOST-INTEGRATION.md), and [Maintenance Guide](./docs/MAINTENANCE.md).

Nothing in this folder self-activates or changes the production application.
