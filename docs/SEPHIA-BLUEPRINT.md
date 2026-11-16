# SEPHIA — Master Blueprint
**Project:** SMANSASOO CBT LOCK / OTP 2.0  
**Document status:** Approved design baseline; implementation not authorized  
**Document version:** 1.0.0  
**Last reviewed:** 2026-11-09  
**Canonical repository:** https://github.com/rakajuliantoro17-art/OTP2.0  
**Branch for this documentation:** `docs/sephia-blueprint`

> This document is the canonical, portable source of truth for future SEPHIA work. Read it before proposing changes. The design decisions recorded here supersede older exploratory suggestions where explicitly marked.

---

## 1. Executive definition

SEPHIA is a browser-contained, narrowly scoped voice notification assistant for the authenticated Panitia view of OTP 2.0.

Its only operational responsibility is to read qualifying violation notifications that are already rendered in the Panitia browser, then announce a short, friendly instruction asking Panitia to inspect the dashboard.

SEPHIA is **not**:
- an OTP engine, exam controller, monitoring engine, disciplinary decision-maker, or mitigation engine;
- an autonomous operator;
- a general-purpose analytics assistant;
- a service allowed to change student records, issue/revoke OTP, unlock exams, submit answers, or change exam state;
- a component allowed to explore the entire dashboard, access Firebase directly, call internal OTP APIs, access server files, or run terminal commands.

**OTP 2.0 remains the source of truth.** If SEPHIA stops, OTP monitoring and exam controls must continue without interruption.

## 2. Non-negotiable boundaries

1. Browser-only integration in the Panitia interface.
2. Read only the designated, visible notification component.
3. Only qualifying violation notifications with a violation count strictly greater than 26 (27 and above); the intended operational range is OTP 27–30.
4. Do not read other dashboard information or unrelated alerts.
5. Do not navigate the dashboard or manipulate OTP operations.
6. Do not make direct database, Firebase, server, or OTP API requests.
7. Do not store audio, voice recordings, transcripts, or persistent student notification copies.
8. Keep only session-scoped transient context and deduplication state; clear it on logout/session expiry, page refresh, page close, or manual shutdown as applicable.
9. If information is incomplete or unreadable, announce a generic warning. Never infer or fabricate identity, class, violation type, or count.
10. Any SEPHIA failure must be isolated from OTP 2.0.

## 3. Identity, persona, and interaction

### 3.1 Identity
- Name: **SEPHIA**
- Wake phrase: **“SEPHIA”**
- Visual avatar: feminine semi-realistic digital human.
- Voice: adult feminine, soft, gentle, warm, smooth, calm, clear Indonesian articulation.
- Speaking pace: slow and calm, with natural pauses.
- Language: natural, friendly Indonesian; short, polite, professional sentences.
- Personality: natural, interactive, expressive but restrained; no robotic or excessive animation.
- Visual direction: futuristic holographic visual overlay, dark elegant surface, cyan-violet accents; not anime and not a mechanical robot.

### 3.2 Communication behavior
- Moderate communication initiative.
- No repeated unsolicited greetings.
- No long analysis, system diagnosis, mitigation advice, or speculative commentary.
- Notification announcements are short and informative.
- Critical announcements remain clear and firm without changing the voice identity.
- Student identity must not be spoken through a room-wide/public speaker. The design baseline is a Panitia workstation output; actual acoustic privacy must be validated in the room.

### 3.3 Visualizer
- The main SEPHIA icon is in the Panitia dashboard header near account/control elements.
- One icon is the primary activation/deactivation gateway.
- Visualizer appears only during interaction or announcement, not permanently.
- Visualizer uses an adaptive hide duration; it must not hide while listening, processing, speaking, or delivering an important alert.
- A concealed visualizer-disable control is part of the Panitia dashboard concept.
- Visualizer OFF, voice output OFF, and SEPHIA service OFF are distinct internal states even if the visible control remains minimal.

### 3.4 Status presentation
- Dim cyan: inactive/standby.
- Bright cyan: listening.
- Violet: processing.
- Cyan-violet: speaking.
- Yellow: limited/no-microphone mode.
- Red: failure.
- Use icon shape/state as well as color so the state is not communicated by color alone.
- Connection recovery is visual only; do not speak a recovery announcement.

## 4. Approved operational scope

### 4.1 Qualifying event
SEPHIA is intended to announce only a Panitia browser notification representing a violation count **greater than 26**. This means 27, 28, 29, and 30 are in scope; 26 is out of scope.

The exact meaning of “OTP 27–30” is a product decision, not a substitute for verifying the actual event payload and UI. Do not alter OTP 2.0 thresholds to make SEPHIA fit. If the visible message does not contain enough verifiable information to determine eligibility, do not announce it as a qualifying event; use the approved generic warning only when the event is known to be an in-scope notification.

### 4.2 Announcement content
Approved default phrase:

> “Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.”

- Do not speak the numeric violation level.
- Do not speak the student name or class in the standard announcement.
- If the notification content is incomplete or the name is difficult to read, use the generic warning.
- If class information is unreadable, omit it rather than guessing.
- Follow the browser/device volume. No separate SEPHIA volume control is required.
- No repeat button or voice repeat command. Panitia can inspect the original notification in the dashboard.

### 4.3 Notification lifecycle
- Read notifications as they appear in the browser; no click is required.
- Read one at a time; never overlap speech.
- If a newer qualifying notification appears while SEPHIA is speaking, stop the current announcement and prioritize the newest notification.
- Prevent duplicate announcements using a stable event ID.
- Do not repeat an already delivered notification.
- The original dashboard notification remains untouched and is always the source of truth.
- When the notification component is disconnected, SEPHIA remains in standby and does not read.
- After connection recovery, read new notifications only; do not replay historical notifications.
- Recovery indication is visual only.
- If no qualifying notification exists, remain in standby without an alert.

## 5. Activation, session, and lifecycle

### 5.1 Activation
- SEPHIA is inactive by default after opening, re-opening, or refreshing the Panitia page.
- Panitia manually activates it with one click on the header icon.
- Browser microphone permission is requested only when required.
- Once active, the local wake phrase “SEPHIA” is used for voice interaction.
- Wake confirmation is visual only; no spoken “Ya, saya mendengarkan”.
- Low wake-word sensitivity is preferred to reduce false activation.
- Failed wake detection produces no spoken response; the standby indicator remains visible.
- Conversation timeout: 10 seconds of silence, then return to standby.
- No explicit “SEPHIA selesai” command is required.

### 5.2 Microphone and audio
- If microphone permission is denied, use limited/no-microphone mode: notification TTS may still work, but wake-word and voice input are unavailable.
- Yellow indicator identifies this limited mode.
- Do not repeatedly trigger permission prompts automatically.
- If browser autoplay policy blocks speech, show a visual warning and wait for a permitted user gesture; do not retry in an endless loop.
- If TTS is unsupported or fails, switch to visual-only mode; the dashboard notification remains readable.
- TTS failure does not mean OTP monitoring failure.
- Follow the system/browser output volume.
- No audio recording or permanent audio storage.

### 5.3 Browser and session lifecycle
- Browser tab switches: SEPHIA is intended to remain active while the page remains alive.
- Computer lock: SEPHIA is intended to remain running.
- Panitia dashboard navigation: SEPHIA remains active while the designated notification component is available.
- Login session expiry/logout: immediately stop SEPHIA and clear session context.
- Browser/tab close: stop SEPHIA; no background process.
- Page refresh: prior instance stops; new page remains inactive until manual activation.
- Do not restore active state from localStorage/sessionStorage after refresh.
- These are target behaviors, not browser guarantees. Background throttling, microphone suspension, locked-device audio policy, and autoplay must be tested on the actual Panitia browser/OS.

## 6. Failure and recovery

### 6.1 Failure categories
- **Notification source unavailable:** remain standby; do not read. Existing design choice does not visibly change the icon. This carries a silent-missed-notification risk and must be highlighted in the technical test report.
- **Microphone unavailable:** yellow limited mode; TTS may still announce browser notifications.
- **TTS unavailable:** visual-only mode; red indicator; Panitia reads the dashboard directly.
- **Fatal SEPHIA component failure:** stop the entire SEPHIA service; red indicator; do not auto-restart.
- **Session invalid/logout:** stop immediately and clear context.

### 6.2 Manual recovery
- All logged-in Panitia members may manually restart SEPHIA.
- Restart is limited to the SEPHIA browser service; it grants no OS, terminal, server, or OTP privileges.
- One confirmation is sufficient.
- Run a basic health check before reactivation.
- If checks fail, remain off.
- Record restart requester/time/result only if this can be done without collecting unnecessary student data.
- Restart must never restart OTP 2.0.

### 6.3 Basic health check
Check only:
- SEPHIA controller availability;
- the designated notification component is present;
- current Panitia session is valid;
- SEPHIA remains isolated from OTP operations.

A basic health check does not prove that microphone, wake-word model, TTS, or visualizer works end-to-end. Label it accurately.

## 7. Privacy and local processing

Approved baseline:
- Local AI processing was selected.
- No audio sent to external AI providers.
- No persistent audio archive.
- Audio buffers are temporary and cleared after processing.
- No transcript archive.
- Conversation context is session-only and cleared at logout/session end/account change.
- No persistent SEPHIA copy of student notification content.
- Notification source remains OTP 2.0 browser UI.

**Scope simplification:** because SEPHIA is now only a notification reader, a full general-purpose LLM is not required for its core function. Prefer deterministic notification validation and fixed/template-based Indonesian TTS. Keep local wake-word detection only if it remains needed for the approved interaction. Do not introduce an external AI or cloud speech dependency.

The exact local runtime (browser-native local capability versus a separately installed local runtime) has not been technically proven. The browser-only restriction is controlling: do not silently introduce a desktop daemon, companion application, or local server. If a required capability cannot run within the approved browser boundary, report the limitation and request a design decision rather than expanding privileges.

## 8. Repository baseline and current-code observations

Repository inspected on 2026-11-09, default branch `main`. The following observations are from the inspected source, not design assumptions:

| Area | Current repository observation |
|---|---|
| Panitia entry | `panitia/index.html` |
| Notification mount | `#alertMount`, loaded from `panitia/components/alert.html` |
| Visible notification list | `#alertList` |
| Notification renderer | `addAlert()` in `panitia/js/ui.js`; creates `.alert-item` and `.alert-msg` |
| Realtime source | `panitia/js/realtime.js`; Firebase `alerts` listener uses `child_added` and `limitToLast(10)` |
| Event bus | `EventBus`; emits `alert:new` before rendering |
| Violation API | `api/violation.js` |
| Moodle injection | `moodle/inject.html` |
| Local monitor | `monitor/server.js`; SSE is primarily student-state delivery |
| Existing docs | `docs/architecture.md`, `docs/workflow.md`, `docs/api-flow.md` |

Important code facts:
1. `panitia/js/realtime.js` currently reads Firebase `alerts`, emits `alert:new`, and calls `addAlert(alert.msg || alert.message)`.
2. The Firebase snapshot key is not currently forwarded into the rendered notification element. A robust event-ID-based deduplication contract therefore is not yet exposed to a DOM-only reader.
3. `addAlert()` renders generic alert classes and visible message text; it currently does not expose structured event metadata such as event ID, event type, or violation count as data attributes.
4. `api/violation.js` creates alert records for selected critical violation types even before count 27, and also when the count reaches at least 26. SEPHIA must filter its own scope and must not announce all alerts.
5. Current code uses count 26 as the CRITICAL/master threshold and count 30 for locked/auto-submit. SEPHIA's approved scope is strictly greater than 26. These are different concerns and must not be conflated.
6. `moodle/inject.html` contains a hard-coded secret in client-side JavaScript. Treat it as exposed: do not reproduce it, do not rely on it, rotate it through the proper server-side process, and move secret validation to a server-side boundary before any production change.
7. The current source includes both Firebase/Vercel and local-monitor pathways. The exact active production path and the source of the visible Panitia alerts must be confirmed during the audit.
8. The current Panitia HTML entry does not by itself establish the full authentication/session lifecycle. Locate and verify the actual session guard before wiring SEPHIA shutdown to logout/expiry.
9. The existing README's project structure is not fully aligned with the current repository tree. Use the actual files, not README-only assumptions.

### Source files inspected
- `panitia/index.html`
- `panitia/components/alert.html`
- `panitia/js/ui.js`
- `panitia/js/realtime.js`
- `moodle/inject.html`
- `moodle/tracker.js`
- `shared/constants.js`
- `shared/otp-engine.js`
- `shared/status-engine.js`
- `api/violation.js`
- `monitor/server.js`
- `package.json`
- `docs/architecture.md`, `docs/workflow.md`, `docs/api-flow.md`

## 9. Recommended technical direction

1. Keep SEPHIA as a separate, isolated browser module loaded only in the Panitia page.
2. Attach only to the designated notification list; do not query arbitrary dashboard regions.
3. Prefer observing the rendered notification DOM. Do not subscribe to Firebase directly and do not call OTP APIs.
4. Add a minimal, explicit metadata contract to the notification rendering path in a future approved code change:
   - stable `data-sephia-event-id` sourced from the Firebase child key;
   - `data-sephia-event-type`;
   - `data-sephia-violation-count`;
   - optional validated display text.
   This metadata must be attached only to the already-rendered qualifying notification element. It is not permission for SEPHIA to read other data.
5. Until that metadata exists, do not claim robust exactly-once delivery. Text/time fingerprinting can collide and is only a temporary fallback.
6. Use a deterministic filter: event must be a violation notification and numeric count must be >=27. Ignore unrelated alerts and count 26.
7. Use fixed short announcement templates; do not use LLM inference to decide eligibility or create student identity.
8. Use a single speech controller with cancellation so the newest event can interrupt the current announcement according to the approved policy.
9. Keep event IDs in memory for the active page session only; clear on logout, refresh, close, and service shutdown.
10. No queue persistence, replay, or historical catch-up after a source interruption unless a later explicit decision changes this.
11. Do not let SEPHIA control OTP or student state.
12. Keep every SEPHIA exception contained; failures must not propagate into OTP scripts.

## 10. Delivery roadmap

### Phase 0 — Read-only audit
- Confirm actual production notification source and runtime.
- Identify the exact notification component and its lifecycle.
- Verify login/session/logout hooks.
- Map event shape and stable event ID.
- Confirm whether count 27–30 is visible in the rendered notification.
- Audit secret exposure and record a remediation plan.
- No source code changes.

### Phase 1 — Notification contract
- Specify exact DOM selector and allowed attributes.
- Define event ID, event type, violation count, display text, and lifecycle.
- Verify that the contract exposes only the designated rendered notification.
- No voice/visualizer implementation yet.

### Phase 2 — Notification reader
- Implement a scoped observer and deterministic filter.
- Add deduplication and speech cancellation behavior.
- Test generic warning for incomplete data.
- Test source disconnect/recovery behavior.

### Phase 3 — Audio
- Implement local wake-word only if still required.
- Implement local TTS and browser permission/autoplay handling.
- Verify no audio storage or external audio transmission.
- Benchmark latency and resource usage.

### Phase 4 — Visualizer and controls
- Header icon, minimal state indicator, temporary visualizer, hidden visualizer-disable control.
- Verify no interference with existing Panitia dashboard layout.

### Phase 5 — Lifecycle, privacy, and isolation
- Test tab switch, page navigation, locked workstation, logout, refresh, browser close, manual shutdown, and failure.
- Verify session context cleanup.
- Verify OTP remains operational when SEPHIA is disabled or crashes.

### Phase 6 — Staging acceptance
- Use simulated notifications and test identities only.
- Do not test by creating real student violations in production.
- Run concurrency, duplicate, audio failure, browser policy, and resource tests.
- Produce a pass/fail report and rollback procedure.

### Phase 7 — Explicit production authorization
- Only after user review of audit and staging results.
- Separate code changes from deployment approval.
- No automatic push/deploy based solely on this document.

## 11. Acceptance criteria

SEPHIA is not ready for production until all of the following pass:

- [ ] Only visible, designated Panitia notification elements are observed.
- [ ] Only violation count >=27 is announced.
- [ ] Count 26 and unrelated alerts are ignored.
- [ ] No other dashboard data is read.
- [ ] No Firebase/database/API/terminal/server access is added to SEPHIA.
- [ ] Stable event ID prevents duplicate reading.
- [ ] Speech never overlaps.
- [ ] Newest notification interruption policy works.
- [ ] Incomplete notification uses the generic warning.
- [ ] TTS failure leaves the original dashboard notification intact.
- [ ] No audio/transcript archive exists.
- [ ] Logout/expiry clears context and stops the service.
- [ ] Refresh does not reactivate SEPHIA.
- [ ] Browser lifecycle limitations are documented and tested.
- [ ] OTP monitoring works normally with SEPHIA disabled/crashed.
- [ ] Exposed client-side secret remediation is completed separately.
- [ ] Staging test report and rollback plan are approved.

## 12. Change-control rules

- This document is the canonical approved design baseline.
- Do not reopen settled choices as questions unless repository evidence proves they are impossible or unsafe.
- If implementation reality conflicts with a design choice, explain the exact conflict and propose the smallest safe alternative.
- Mark every item as one of: **APPROVED DECISION**, **TECHNICAL RECOMMENDATION**, **UNVERIFIED ASSUMPTION**, or **IMPLEMENTATION BLOCKER**.
- Never describe a planned capability as implemented.
- No production code, commit to main, deployment, database change, or Moodle configuration change is authorized by this blueprint.
- A future user instruction must explicitly authorize the specific implementation stage.

---
**End of master blueprint.**
