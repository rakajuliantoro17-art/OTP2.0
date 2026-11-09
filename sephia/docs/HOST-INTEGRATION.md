# SEPHIA Host Integration — Stage 2

**Branch:** `feature/sephia-module`  
**Integration state:** notification metadata path implemented in branch; Panitia session binding remains blocked.  
**Production state:** unchanged; no deployment or Firebase rules change.

## 1. Data path

1. `api/violation.js` increments the authoritative student violation count on the server.
2. When the existing alert condition is met, the server writes `violationCount: newCount` into the Firebase `alerts` payload. Existing alert conditions and OTP thresholds are unchanged.
3. `panitia/js/realtime.js` receives the Firebase child event and retains `snap.key` as the stable event ID for the rendered alert.
4. The normal Panitia alert is rendered first. SEPHIA metadata is then attached to the newly prepended `.alert-item` only when:
   - event ID is present;
   - payload type is exactly `violation`;
   - `violationCount` is a safe integer from 27 through 30.
5. SEPHIA observes only `#alertList`, reads the three metadata attributes and visible message text, and performs its own validation.

## 2. DOM contract

| Attribute | Source | Rule |
|---|---|---|
| `data-sephia-event-id` | Firebase `snap.key` | Required stable event key |
| `data-sephia-event-type` | Server alert `type` | `violation` only |
| `data-sephia-violation-count` | Server alert `violationCount` | Integer 27–30 only |

Alerts without the complete contract remain visible in Panitia but are ignored by SEPHIA. This includes critical alert types generated below count 27 and alerts created by local UI actions.

## 3. Isolation guarantees

- Panitia renders the alert before metadata decoration.
- Metadata decoration is wrapped in its own error boundary; a decoration failure does not suppress the normal alert.
- The existing alert listener, event bus, alert count, and alert retention behavior remain in place.
- Alert message rendering now uses DOM nodes and `textContent`, rather than interpolating the message into `innerHTML`.
- No SEPHIA code calls Firebase, API endpoints, or OTP actions.
- No threshold, auto-submit, unlock, or student-monitoring rule was changed.

## 4. Session boundary — still blocked

The repository source inspected during Phase 0 did not expose a verified Panitia authentication state, logout callback, or session-expiry event. The new metadata path does **not** imply that authentication is present.

Do not activate or connect the SEPHIA runtime to the dashboard until a trusted host session provider is identified and verified. Once available, the host must:
- activate SEPHIA only after a valid Panitia session is established and a Panitia user manually enables it;
- call `runtime.deactivate()` immediately on logout, expiry, account switch, or loss of authorization;
- clear the session-local event deduplication set on deactivation;
- start inactive after refresh/reopen.

Do not infer session validity from URL, page visibility, the presence of dashboard elements, or Firebase connectivity.

## 5. Required verification before runtime activation

- [ ] Verify deployed Firebase rules permit Panitia to read `alerts`.
- [ ] Verify the actual Panitia authentication and expiry/logout mechanism.
- [ ] Test a server-originated count 26 alert: visible in Panitia, no SEPHIA metadata.
- [ ] Test counts 27, 28, 29, and 30: each gets a stable ID and correct count metadata.
- [ ] Test count above 30, missing count, non-integer count, and non-violation alert: visible if the host already renders it, but no SEPHIA metadata.
- [ ] Confirm duplicate Firebase delivery does not cause duplicate speech within one active runtime session.
- [ ] Confirm SEPHIA observer failure does not affect Panitia alert rendering.
- [ ] Run `npm test` from `sephia/` and perform browser staging tests.

## 6. Rollback

The integration is isolated to the feature branch. To disable the metadata path in a later approved host integration, remove the `attachSephiaMetadata` helper and its call from `panitia/js/realtime.js`, and remove `violationCount` from the alert payload in `api/violation.js`. The `textContent` alert-rendering hardening in `panitia/js/ui.js` should be retained independently because it prevents alert text from being interpreted as HTML.

Do not cherry-pick or merge these changes into `main` until the security gates and staging checks pass.
