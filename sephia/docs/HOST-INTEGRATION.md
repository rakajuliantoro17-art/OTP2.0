# SEPHIA Host Integration — Stage 2

**Branch:** `feature/sephia-module`  
**Integration state:** notification metadata path implemented in branch; page-lifecycle cleanup helper added; dashboard runtime remains disconnected.  
**Production state:** unchanged; no deployment or Firebase rules change.

## 1. Data path

1. `api/violation.js` increments the authoritative student violation count on the server.
2. When the existing alert condition is met, the server writes `violationCount: newCount` into the Firebase `alerts` payload. Existing alert conditions and OTP thresholds are unchanged.
3. `panitia/js/realtime.js` receives the Firebase child event and retains `snap.key` as the stable event ID for the rendered alert.
4. The normal Panitia alert is rendered first. SEPHIA metadata is then attached to the newly prepended `.alert-item` only when event ID is present, type is exactly `violation`, and `violationCount` is a safe integer from 27 through 30.
5. SEPHIA observes only `#alertList`, reads the metadata attributes and visible message text, and validates the notification contract.

## 2. DOM contract

| Attribute | Source | Rule |
|---|---|---|
| `data-sephia-event-id` | Firebase `snap.key` | Required stable event key |
| `data-sephia-event-type` | Server alert `type` | `violation` only |
| `data-sephia-violation-count` | Server alert `violationCount` | Integer 27–30 only |

Alerts without the complete contract remain visible in Panitia but are ignored by SEPHIA.

## 3. Isolation guarantees

- Panitia renders the alert before metadata decoration.
- Metadata decoration has its own error boundary.
- Existing alert listener, event bus, alert count, and retention behavior remain in place.
- Alert message rendering uses DOM nodes and `textContent`, not HTML interpolation.
- SEPHIA does not call Firebase, APIs, server endpoints, Moodle, or OTP actions.
- No threshold, auto-submit, unlock, or student-monitoring rule is changed by SEPHIA.

## 4. Panitia access and lifecycle boundary

The owner has confirmed that the Panitia dashboard has **no account login**. It is accessed through a dedicated page URL known to Panitia. This is obscurity-based access, not authentication.

Accordingly:
- SEPHIA must not describe the viewer as authenticated or infer a Panitia identity/role.
- The URL is not a security credential and may be forwarded, leaked, or discovered.
- No new login is added by this SEPHIA stage.
- SEPHIA starts OFF on each page load and requires manual activation.
- On manual OFF, `pagehide`, or `beforeunload`, the reader and speech are stopped; a page restored from BFCache remains OFF.
- This is only a document-lifecycle boundary. It does not provide logout, expiry, account-switch, or authorization semantics.
- Page visibility and Firebase connectivity are not identity/session signals.

The helper `src/runtime/bind-page-lifecycle.js` implements best-effort page-exit cleanup. It must be mounted by the host only when the host integration is separately approved. The helper does not itself mount SEPHIA or connect the runtime to the dashboard.

## 5. Required verification before any host activation

- [ ] Review actual server/network access controls protecting the dedicated Panitia URL. Do not rely on secrecy of the URL alone.
- [ ] Verify deployed Firebase rules permit the intended Panitia page to read `alerts`.
- [ ] Test server-originated count 26: visible in Panitia, no SEPHIA qualification metadata.
- [ ] Test counts 27, 28, 29, 30; count 31+; missing/non-integer count; and non-violation alert.
- [ ] Confirm duplicate Firebase delivery does not cause duplicate speech within one active page runtime.
- [ ] Confirm observer/metadata errors do not affect Panitia alert rendering.
- [ ] Run `npm test` from `sephia/` and confirm latest branch CI.
- [ ] Run the Chrome fixture and record pagehide/BFCache behavior on the Panitia PC.
- [ ] Verify actual local-only TTS separately before enabling audio; until then, keep speech disabled in host integration.

## 6. Rollback

The host metadata bridge is isolated to this feature branch. To disable it in a later approved host integration, remove `attachSephiaMetadata` and its call from `panitia/js/realtime.js`, and remove `violationCount` from the alert payload in `api/violation.js`. Retain safe `textContent` alert rendering independently.

Do not cherry-pick or merge these changes into `main` until security and staging gates pass.
