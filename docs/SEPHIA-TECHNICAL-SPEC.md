# SEPHIA — Technical Integration Specification
**Status:** Design specification only; no implementation changes  
**Version:** 1.0.0  
**Parent:** [SEPHIA Master Blueprint](./SEPHIA-BLUEPRINT.md)

## 1. Objective

Define a minimal, auditable browser integration that reads only qualifying notifications already rendered in the OTP 2.0 Panitia interface and announces a short instruction.

The integration must not become a second monitoring system.

## 2. Current notification path (source inspection)

Current repository flow:

```text
Firebase Realtime Database: alerts
        |
        v
panitia/js/realtime.js
  listenAlerts()
  ref("alerts").limitToLast(10).on("child_added")
        |
        +--> CBT_STATE.alerts.unshift(alert)
        |
        +--> EventBus.emit("alert:new", alert)
        |
        +--> addAlert(alert.msg || alert.message)
                    |
                    v
panitia/js/ui.js
  addAlert()
        |
        v
panitia/components/alert.html
  #alertList
    .alert-item
      .alert-msg
      .alert-time
```

The Panitia entry loads `#alertMount` from `panitia/components/alert.html`. The alert list is rendered in the browser.

Current limitations:
- Snapshot key is not propagated to the rendered item.
- The visible DOM item has no stable structured event ID.
- The renderer receives a message string and defaults its alert type to `info`.
- The alert list contains general system messages as well as violation alerts.
- The backend can create alerts for critical violation types before count 27.
- Therefore observing every `.alert-item` and reading it aloud would be incorrect.

## 3. Allowed integration boundary

### Allowed
- Locate the single approved notification list element (currently `#alertList`, subject to staging verification).
- Observe child additions/removals inside that element only.
- Read the text and explicitly approved metadata attached to each rendered notification.
- Maintain an in-memory set of already announced event IDs for the active page session.
- Invoke the local speech output for a validated event.
- Display SEPHIA's own icon and visualizer in the approved Panitia header/overlay.

### Prohibited
- Observe `document.body`, the whole dashboard, or arbitrary page mutations.
- Read student tables, drawers, OTP modals, Firebase state, or unrelated alerts.
- Subscribe directly to Firebase or EventBus as a data bypass.
- Call `/api/violation`, `/api/status`, `/api/students`, or other OTP endpoints.
- Access Moodle client data, student sessions, local monitor files, or server memory.
- Change, delete, acknowledge, hide, or rewrite OTP notifications.
- Trigger OTP generation, unlock, auto-submit, or student updates.

## 4. Minimal notification metadata contract

A DOM-only observer needs reliable metadata without broad data access. The future approved renderer change should attach the following attributes to the exact rendered notification node:

| Attribute | Meaning | Requirement |
|---|---|---|
| `data-sephia-event-id` | Stable Firebase child key or equivalent immutable event ID | Required |
| `data-sephia-event-type` | Must identify a violation notification | Required |
| `data-sephia-violation-count` | Integer count at event time | Required |
| `data-sephia-readable` | Optional explicit true/false validity marker | Recommended |

The visible text remains the source for the short generic announcement. Student identity is not required for the standard phrase.

These attributes must be placed on the already-rendered notification item only. Do not expose a new endpoint or create a second data feed for SEPHIA.

**Important:** this requires a small future change to the existing notification rendering path (likely `panitia/js/realtime.js` to preserve `snapshot.key`, and `panitia/js/ui.js` to attach the metadata). This document does not authorize those code changes.

## 5. Qualification rules

A notification is eligible only when all conditions are true:

1. It is a rendered child of the approved `#alertList`.
2. Its event type is explicitly a violation event.
3. Its violation count is a valid integer.
4. Its count is >=27.
5. Its event ID is present and has not been announced in this page session.
6. Its content is sufficiently readable to identify it as a valid notification.

Reject:
- count <=26;
- non-violation alerts;
- unknown event types;
- missing/invalid count;
- missing stable ID (do not claim exact deduplication);
- malformed or partially rendered items until they become complete.

Count 30 is in scope for announcement even though OTP 2.0 may separately transition the student to locked/auto-submit status. SEPHIA only announces; it does not make or alter that decision.

## 6. Event and speech lifecycle

Recommended deterministic pipeline:

```text
DOM child added
  -> validate node is inside #alertList
  -> read approved data attributes
  -> validate event type and count >= 27
  -> validate stable event ID
  -> reject duplicate ID
  -> prepare fixed announcement text
  -> send to single speech controller
  -> mark as announced only when speech policy defines delivery
```

### Speech controller requirements
- One active utterance maximum.
- No overlapping voices.
- A newer qualifying notification interrupts the current utterance and takes priority.
- The previous dashboard notification remains untouched.
- No repeat command or repeat button.
- No audio archive.
- No historical replay after notification source recovery.
- If the speech engine fails, show the selected visual failure state and leave the dashboard notification available.

### Announcement template
`Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.`

Do not speak count, name, class, or inferred details in the default announcement. If notification fields are incomplete, use the generic warning; never guess.

## 7. Session-scoped deduplication

- Use stable event ID, not name/type/time alone.
- Keep IDs in memory for the current page instance.
- Do not persist IDs in localStorage or IndexedDB.
- Clear IDs on logout/session expiry, refresh, page close, or manual service shutdown.
- A page refresh intentionally starts a fresh inactive SEPHIA instance.
- If the source does not expose stable IDs, treat exactly-once behavior as an implementation blocker. A content fingerprint may be used only as a temporary, explicitly imperfect fallback and must not merge two distinct violations.

## 8. Browser lifecycle state machine

Suggested internal states:

| State | Meaning |
|---|---|
| OFF | Manually disabled or initial page load |
| STARTING | User activated; permission and basic checks running |
| STANDBY | Active, waiting for a qualifying notification/wake phrase |
| LISTENING | Local wake-word or voice input is active |
| PROCESSING | Local recognition/validation is running |
| SPEAKING | TTS announcement is active |
| LIMITED_NO_MIC | Microphone denied; notification TTS may still operate |
| VISUAL_ONLY | TTS unavailable; visual notification indicator only |
| FAILED | Fatal SEPHIA failure; manual restart required |

Lifecycle:
- Initial load -> OFF.
- User click -> STARTING.
- Health checks pass -> STANDBY or LIMITED_NO_MIC.
- Notification event -> SPEAKING, then STANDBY.
- Wake phrase -> LISTENING, PROCESSING, then STANDBY.
- TTS failure -> VISUAL_ONLY.
- Fatal failure -> FAILED.
- Logout/session expiry -> OFF and clear context.
- Refresh/close -> instance terminates; next load -> OFF.

Browser-specific constraints:
- Background tabs may be throttled.
- Browser/OS may suspend microphone capture when the workstation locks.
- Autoplay policy may block speech until a user gesture.
- A tab can remain open while its JavaScript timers are delayed.
- No guarantee of operation after browser process termination.
- The selected behavior “remain active while tab is backgrounded or workstation is locked” is a test target, not a guaranteed browser feature.

## 9. Local processing recommendation

Because the approved scope is notification reading, a large LLM is unnecessary for event eligibility or message generation.

Recommended:
- deterministic event validation in JavaScript;
- fixed Indonesian announcement templates;
- local wake-word model only if the approved wake-word interaction remains required;
- local speech synthesis where feasible;
- no external speech or LLM service;
- no transcript persistence.

The exact browser-compatible local wake-word/TTS implementation must be selected only after device/browser benchmarking. Do not add a separate daemon, local server, browser extension, or desktop app without explicit approval because the controlling boundary is browser-only.

Realistic lip-sync requires reliable phoneme/timing output. If the selected local TTS cannot provide it, use restrained avatar animation rather than inventing inaccurate lip-sync.

## 10. Security and isolation controls

- No credentials, API keys, shared secrets, or privileged tokens in SEPHIA frontend code.
- The hard-coded secret found in `moodle/inject.html` must be treated as exposed and remediated separately.
- SEPHIA receives no Firebase SDK reference for its own purposes.
- SEPHIA does not import OTP engine modules.
- No write access to OTP data.
- No network requests from SEPHIA for student or violation data.
- All DOM access is scoped to the designated notification list and its child nodes.
- Every SEPHIA event handler must fail closed: unknown shape -> do not speak.
- SEPHIA errors must be caught locally and must not break the existing dashboard scripts.

## 11. Test matrix

| Test | Expected result |
|---|---|
| Count 25 | Ignore |
| Count 26 | Ignore |
| Count 27 | Announce once |
| Count 28 | Announce once |
| Count 29 | Announce once |
| Count 30 | Announce once; no OTP action |
| Non-violation alert | Ignore |
| Missing count | Do not announce as qualifying |
| Missing event ID | Block exact-once acceptance; log technical test failure |
| Same event rerendered | Do not announce twice |
| Two distinct IDs with same message | Treat as two distinct events |
| New event during speech | Cancel current utterance and prioritize newest |
| Notification component removed | Stop reading; standby behavior |
| Component returns | Read new events only; no backlog |
| TTS blocked | Visual-only/failure behavior; dashboard remains readable |
| Microphone denied | Yellow limited mode; TTS behavior tested separately |
| Logout/session expiry | Stop and clear session state |
| Refresh | Start OFF; do not restore active state |
| Tab background | Remain active if browser permits; record measured result |
| Workstation locked | Remain active only if OS/browser permits; record measured result |
| SEPHIA crash | OTP dashboard and monitoring continue normally |

## 12. Implementation gates

Do not start implementation until:
1. Actual production notification source is confirmed (Firebase-backed or local-monitor-backed).
2. Exact DOM selector and lifecycle are verified in staging.
3. Stable event ID and violation count can be attached to the rendered notification.
4. Session expiry/logout hook is identified.
5. Secret exposure remediation is planned.
6. Browser and audio hardware are known.
7. The user approves the specific implementation stage.

No item in this specification is evidence that the feature has been built.


## 13. Additional verified repository constraints (Phase 0 audit)

See `docs/SEPHIA-PHASE0-AUDIT.md` for evidence and the full risk register.

- Panitia notifications currently originate from Firebase `alerts`; the local `/events` stream is used for student state, not alerts.
- The Panitia listener discards Firebase `snap.key` and renders only message text.
- The alert object has no explicit numeric violation count in the DOM contract. Alert existence alone does not prove count >=27.
- `api/violation.js` can create alerts for selected critical violation types below count 27; the SEPHIA filter must use trusted numeric count.
- The Panitia page source has no verified authentication/session/logout hook. Do not invent a session flag.
- Vercel currently disables microphone access through its Permissions-Policy. Local LAN HTTP may also fail browser secure-context requirements. Verify the exact target URL/browser before designing wake-word activation.
- Repository Firebase rules do not explicitly grant `alerts` read, but deployed rules are unknown. Do not change rules for SEPHIA.
- Existing alert renderer interpolates message text with `innerHTML`; this is a separate XSS-hardening issue.
- A TOTP secret is hard-coded in `moodle/inject.html`; treat it as exposed and remediate separately with coordinated rotation.

## 14. Integration gates added after audit

1. External runtime verification: Vercel protection, live Firebase rules, Panitia auth/session model, workstation URL/browser/OS.
2. Notification contract: stable event ID and trusted numeric violation count attached only to the existing rendered notification item; safe text rendering.
3. Scoped browser reader: observe only `#alertList`; no direct Firebase/API access.
4. Audio and visualizer: only after browser microphone/TTS compatibility is proven.
