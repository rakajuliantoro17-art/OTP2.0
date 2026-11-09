# SEPHIA — Phase 0 Read-Only Repository Audit

**Audit date:** 2026-11-09  
**Audited ref:** `main`  
**Audit type:** Source inspection only  
**Code changes:** None  
**Status:** Repository-level audit completed; live deployment/runtime verification remains outstanding.

## 1. Executive conclusion

The Panitia dashboard has a usable narrow notification mount (`#alertList`) and a Firebase-backed alert listener. A future SEPHIA reader can be scoped to this list.

SEPHIA must not be implemented against the current source without a small, explicitly approved notification-contract change and resolution of security/compatibility blockers. The current rendered notification has no stable event ID or numeric violation count. No Panitia login/session lifecycle was found in the inspected dashboard source. Actual deployment protection remains unknown.

Microphone compatibility is also unresolved:
- Vercel currently sends `Permissions-Policy: camera=(), microphone=(), geolocation=()`, disabling microphone access.
- The local monitor serves HTTP. A LAN IP over plain HTTP is generally not a secure browser context for microphone APIs; `localhost` is treated specially.
- Browser TTS/autoplay behavior has not been verified.

OTP 2.0 remains the source of truth. This audit does not alter the approved SEPHIA scope.

## 2. Notification source and render path

### Panitia page — `panitia/index.html`
- Loads Firebase compat SDK 9.23.0.
- Loads `firebase.js`, `otp.js`, `ui.js`, and `realtime.js`.
- Dynamically mounts `panitia/components/alert.html` into `#alertMount`.
- No login form, Firebase Auth initialization, auth-state observer, or logout/session-expiry handler appears in this file.

### Alert component — `panitia/components/alert.html`
Current DOM:
- `#alertList`
- child notification class `.alert-item`
- visible message class `.alert-msg`

This is the narrowest current observation boundary. SEPHIA must observe only children of `#alertList`, never `document.body` or the general dashboard.

### Realtime listener — `panitia/js/realtime.js`
The `listenAlerts()` function:
- subscribes to Firebase path `alerts`;
- uses `limitToLast(10)` and `child_added`;
- reads `snap.val()`;
- emits `EventBus.emit("alert:new", alert)`;
- calls `addAlert(alert.msg || alert.message)`;
- discards `snap.key`;
- does not forward structured event ID, event type, or numeric violation count to the DOM.

Important distinction:
- `listenStudents()` uses `EventSource("/events")` when `window.CBT_LOCAL` is true.
- `listenAlerts()` has no local-monitor branch; it continues to read Firebase.
- Local monitor `/events` sends student views, not alert events.

**Finding:** based on the inspected source, Panitia alerts are Firebase-driven in both local and non-local modes. Whether the deployed Firebase rules permit the listener is not confirmed.

### Renderer — `panitia/js/ui.js`, `addAlert()`
- Creates `.alert-item.alert-[type]`.
- Receives only a message string and optional display type.
- The realtime listener does not forward the Firebase event type.
- Does not attach stable event ID or violation count.
- Interpolates message text using `innerHTML`.

**Security risk:** untrusted alert text interpolated into HTML can create an injection/XSS risk. A future renderer hardening should use `textContent` for message text. This is separate from SEPHIA and does not grant it wider DOM access.

## 3. Violation qualification

Files: `api/violation.js`, `assets/js/app.js`, `panitia/js/realtime.js`.

Observed:
- Server status is `critical` at count >=26 and `locked` at >=30.
- `api/violation.js` may create an alert when selected violation types occur OR when count >=26.
- Alert payload currently includes `type`, `msg`, `status`, `uid`, and `time`; it has no dedicated numeric `violationCount`.
- Therefore an alert's existence does not prove count >=27.
- Parsing the count from free-form message text is not a reliable contract.
- `assets/js/app.js` also defines >=26 as CRITICAL and >=30 as AUTOSUBMIT.

**Approved SEPHIA filter remains:** only verified numeric count >=27; count 26 and unrelated critical alerts must be ignored. Do not alter OTP thresholds.

## 4. Minimal notification metadata contract

The Firebase snapshot key already exists but is discarded before rendering.

Recommended future contract (not yet implemented):
1. Preserve `snap.key` as the immutable event ID.
2. Pass a structured alert object to the renderer.
3. Add only these attributes to the exact rendered notification item:
   - `data-sephia-event-id`: Firebase child key;
   - `data-sephia-event-type`: normalized event type;
   - `data-sephia-violation-count`: server-generated numeric count.
4. SEPHIA observes only `#alertList`, reading those attributes and the visible text of that child.
5. Render message text with `textContent`.

The numeric count should be added to the alert record by trusted server-side `api/violation.js`. Do not infer it from the student table or parse prose. No new SEPHIA endpoint or database permission is required.

This is the smallest proposed code surface, not authorization to edit it.

## 5. Authentication and session lifecycle

### Panitia page
Inspected: `panitia/index.html`, `panitia/components/topbar.html`, `panitia/js/firebase.js`, `panitia/js/realtime.js`.

No Firebase Auth integration, login guard, `onAuthStateChanged`, logout action, session-expiry callback, or authenticated Panitia identity is visible in these files. The topbar is a dashboard title/hamburger header, not an authenticated profile header.

**Blocker:** SEPHIA cannot safely claim to follow an active Panitia login session until the real access-control boundary is identified.

### Local monitor — `monitor/server.js`
- `/panitia/*` is served only to localhost-origin requests; non-local requests are redirected to `/pengawas`.
- This is a network-origin restriction, not an application login/session.
- `/api/report` accepts POST without an authentication check.
- `/events` uses a token for non-local clients, but streams student monitoring data and is not the Panitia alert source.
- Local Panitia is served over HTTP. `localhost` may be a secure-context exception; a LAN IP over HTTP generally is not.

### Vercel/static path
Files: `vercel.json`, `index.html`, `panitia/index.html`.
- Root page links directly to `panitia/index.html`.
- No Panitia login guard appears in repository source.
- Vercel deployment protection or external access control is not represented in the repository; actual settings are unknown.
- Do not assume the deployed Panitia page is private until deployment protection and production URL are verified.

## 6. Microphone and TTS compatibility

### Vercel
`vercel.json` globally sets `Permissions-Policy: microphone=()`. This explicitly disables microphone access on that deployment. The current Vercel path is incompatible with wake-word/microphone operation unless this policy is deliberately revised and reviewed.

### Local monitor
`monitor/server.js` serves HTTP. Browser microphone APIs generally require a secure context. `http://localhost` is treated specially by modern browsers; a LAN IP over plain HTTP generally is not. Test the actual URL on the Panitia workstation.

### TTS
The repository does not establish a TTS engine or autoplay strategy. Speech synthesis availability, voices, and playback policy vary by browser/OS. Test TTS independently of microphone/wake-word functionality.

## 7. Firebase rules

Files: `firebase/rules.txt`, `panitia/js/firebase.js`, `panitia/js/realtime.js`.

The repository rules file:
- defaults root read/write to false;
- contains broad permissions for several data paths;
- has no explicit `alerts` rule;
- while the Panitia client attempts to read `alerts`.

If these exact rules are deployed, the alert read may be denied. A repository file is not proof of the rules currently deployed.

Required read-only verification:
- inspect active Realtime Database rules in the actual Firebase project;
- verify Panitia can read `alerts`;
- verify whether student clients can write alert records;
- ensure SEPHIA receives no new database permission.

Do not change Firebase rules as part of SEPHIA integration.

## 8. Client-side secret exposure

File: `moodle/inject.html`, line 99 in the audited revision.

A TOTP secret is hard-coded in client-side JavaScript and used by browser code. Treat it as exposed. Do not copy the literal into SEPHIA or future client code.

Separate remediation plan:
1. Identify all active TOTP generation/verification paths and consumers.
2. Move secret-dependent generation/verification to a trusted server-side boundary.
3. Coordinate rotation after transition planning to avoid disrupting active exams.
4. Remove the old literal from client-delivered code and invalidate cached copies where feasible.
5. Test student and Panitia unlock flows in staging.
6. Review repository history and deployment artifacts.

No secret was rotated and no code was changed during this audit.

## 9. Risk register

| ID | Finding | Severity | Required action |
|---|---|---|---|
| A-01 | Stable event ID absent from rendered notification | High | Forward Firebase key to DOM metadata |
| A-02 | Numeric count absent from DOM contract | High | Add trusted server-generated count metadata |
| A-03 | Panitia session/logout hook not found | Critical blocker | Verify actual access control before SEPHIA session binding |
| A-04 | Vercel disables microphone | High | Review policy if Vercel mic is intended |
| A-05 | LAN HTTP microphone secure-context limitation | High | Validate localhost/HTTPS route |
| A-06 | Deployed Firebase rules unknown; repo rules omit alerts | High | Verify live rules read-only |
| A-07 | Alert text uses innerHTML | High | Harden renderer with textContent |
| A-08 | Client-side TOTP secret | Critical security issue | Separate coordinated remediation |
| A-09 | Source disconnect can look like standby | Medium | Preserve chosen behavior and document missed-alert risk |
| A-10 | Browser lock/background throttling | Medium | Test actual workstation/browser |

## 10. Smallest implementation path (only after approval)

### Gate 0 — External runtime verification (no code changes)
- Confirm actual Panitia URL and hosting path.
- Verify Vercel deployment protection or local-only access.
- Verify active Firebase rules.
- Confirm actual Panitia login/session model.
- Confirm workstation browser, OS, and exact URL.
- Test microphone and TTS without adding SEPHIA.

### Gate 1 — Notification contract
- Preserve Firebase snapshot key.
- Include server-generated numeric violation count in the alert event.
- Pass structured alert to renderer.
- Render text safely with `textContent`.
- Add minimal metadata attributes to the exact notification item.
- Preserve all OTP thresholds and operations.

### Gate 2 — SEPHIA browser reader
- Observe only `#alertList`.
- Filter `type=violation` and `violationCount >= 27`.
- Deduplicate by stable event ID in memory.
- Apply newest-event speech interruption policy.
- Use the approved short generic announcement.
- No Firebase subscription or API calls from SEPHIA.

### Gate 3 — Audio and visualizer
- Local TTS and optional local wake word within approved browser boundary.
- No companion daemon/server without separate authorization.
- Minimal header icon and transient visualizer.
- TTS must work independently from microphone/wake-word availability.

## 11. Audit checklist

| Item | Result |
|---|---|
| Panitia notification mount | Pass — `#alertList` |
| Firebase alert listener | Pass — `listenAlerts()` |
| Local monitor is alert source | No — student SSE only |
| Stable event ID reaches DOM | Fail |
| Numeric violation count reaches DOM | Fail |
| Count >=27 reliably verifiable in DOM | Fail |
| Panitia auth/session lifecycle found | Not found in inspected source |
| Vercel microphone policy compatible | Fail — microphone disabled |
| Local LAN HTTP mic compatibility | Not guaranteed |
| Firebase deployed rules confirmed | Not verified |
| Client-side secret risk identified | Pass — remediation not performed |
| Code changes | None |

## 12. Next action

The next step is not another design questionnaire and not implementation. It is controlled verification of external runtime facts: Vercel protection, live Firebase rules, actual Panitia login/session model, and exact workstation URL/browser.

If the Panitia dashboard has no authentication/session boundary, that must be handled as a separate system-security decision before SEPHIA can claim to follow an authenticated Panitia session.

---
**End of Phase 0 read-only audit.**
