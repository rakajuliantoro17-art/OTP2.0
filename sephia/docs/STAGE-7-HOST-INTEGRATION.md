# SEPHIA Stage 7 — Panitia Host Integration

**Branch:** `feature/sephia-module`  
**Integration:** opt-in source integration on the feature branch  
**Production:** not deployed; no merge to `main`

## 1. Confirmed host model

The Panitia dashboard has no account login. It is opened through a dedicated URL known to Panitia. SEPHIA does not add credentials, PINs, roles, or claim viewer identity. The URL is not authentication.

## 2. What is integrated

- `panitia/components/topbar.html` contains one explicit `#sephiaControlMount` next to the dashboard title.
- After all dashboard components load, `panitia/index.html` dynamically imports the isolated SEPHIA host bridge.
- `sephia/src/host/mount-panitia-sephia.js` resolves only `#alertList` and `#sephiaControlMount`; it does not perform broad document queries.
- The bridge creates the reader runtime, visual state, manual controls, and page lifecycle cleanup.
- Runtime starts OFF and requires a manual click.
- `pagehide` disposes the bridge and stops the observer.
- If SEPHIA initialization fails, the dashboard continues without SEPHIA; error reporting is isolated.
- No SEPHIA code calls Firebase, APIs, Moodle, OTP controls, local storage, or remote AI services.
- No audio provider is connected. This is deliberate: a browser speech API is not proof of local-only audio processing. Until a local provider is verified, integration is visual/notification-reader only; existing Panitia notification remains the source of truth.
- No avatar artwork or microphone/wake-word is activated.

## 3. Host failure isolation

The host import is wrapped in `try/catch`. A missing module, missing mount point, unsupported browser API, or initialization error logs a SEPHIA-specific warning and does not abort dashboard component loading or realtime initialization.

The bridge itself performs best-effort cleanup of partially constructed resources if mounting fails.

## 4. Data path

`api/violation.js` → Firebase `alerts` payload → `panitia/js/realtime.js` preserves `snap.key` and decorates only eligible server-originated violation alerts → `#alertList` → SEPHIA observer → normalized event contract → optional speech adapter (not connected in this stage).

SEPHIA observes only new DOM mutations after manual activation. It does not read the initial backlog. The host alert renderer remains independent.

## 5. Acceptance and limits

Automated tests cover the host bridge mount contract, exact mount targets, inactive initial state, pagehide disposal, missing mount fail-closed behavior, and partial-construction cleanup.

Still requiring Stage 6 Chrome acceptance after the build is ready:
- Actual Chrome rendering and header placement.
- Pagehide/BFCache behavior on the Panitia PC.
- CPU/memory and background-tab measurements.
- Actual host server/network access restrictions.
- Deployed Firebase Rules and live alert metadata verification.
- Local-only TTS provider verification before any audio activation.

This Stage 7 source integration is not a production release and must not be represented as fully browser-accepted.

## 6. Rollback

To remove the integration from the feature branch:
1. Remove the dynamic import call from `panitia/index.html`.
2. Remove `#sephiaControlMount` from `panitia/components/topbar.html`.
3. Remove `sephia/src/host/mount-panitia-sephia.js`.

The alert metadata bridge can remain independently; it does not activate the reader. No OTP thresholds or alert rules need to be reverted to disable the SEPHIA UI.

## 7. Release boundary

No deployment, merge, Firebase Rules update, server/network access change, TOTP secret change, or OTP/Moodle behavior change is part of Stage 7.
