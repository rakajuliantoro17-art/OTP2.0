# SEPHIA — Approved Decision Register
**Status:** Consolidated record of user-approved decisions  
**Purpose:** prevent repeated questions and preserve the design across conversations  
**Parent documents:** [Master Blueprint](./SEPHIA-BLUEPRINT.md) · [Technical Specification](./SEPHIA-TECHNICAL-SPEC.md)

> This register consolidates decisions from the SEPHIA design conversations. Some early numeric labels overlapped when sprint numbering was restarted. For that reason, the topic and final wording are authoritative; do not infer that an ambiguous old number represents a new unanswered decision.

## A. Product identity and persona

| Area | Approved decision |
|---|---|
| Product name | SEPHIA |
| Scope | OTP 2.0 only; browser notification reader for Panitia |
| Wake phrase | “SEPHIA” |
| Avatar | Feminine, semi-realistic digital human |
| Voice identity | Adult feminine voice, soft, gentle, warm, smooth, calm |
| Speaking style | Slow and calm, clear Indonesian articulation, natural pauses |
| Language | Natural, friendly, polite Indonesian; concise and professional |
| Personality | Natural, interactive, expressive but restrained; no robotic/excessive movement |
| Visual style | Futuristic holographic HUD/overlay with dark elegant surface and cyan-violet accents |
| Lip-sync | Realistic phoneme-aligned lip-sync, Indonesian pronunciation; stop mouth motion when speech ends. Feasibility depends on selected TTS timing data. |
| Facial behavior | Warm friendly expression, natural blinking and eye contact; serious expression for critical alert |
| Avatar motion | Natural human movement; subtle head/body motion, not exaggerated |
| Acronym/tagline | Proposed expansions/taglines were not approved as final brand copy. Do not treat them as settled. |

## B. Visibility and dashboard interaction

| Area | Approved decision |
|---|---|
| Visualizer visibility | Only during interaction/announcement; not permanently visible |
| Visualizer duration | Adaptive; remain while listening, processing, speaking, or announcing important alerts; manual close remains available |
| Main control | One minimal SEPHIA icon for service activation/deactivation |
| Placement | Dashboard Panitia header near account/control area |
| Activation | Single click |
| Deactivation | Single click, immediate OFF; no confirmation |
| Initial page load | SEPHIA OFF |
| Refresh/reopen | SEPHIA remains OFF; manual activation required |
| Visualizer OFF | Separate internal concept from voice OFF and service OFF |
| Concealed control | A hidden control to disable the visualizer is part of the design |
| Dashboard navigation | No SEPHIA-driven navigation; the user narrowed the product to notification reading only |
| Dashboard exploration | Prohibited; no general DOM exploration |

## C. Communication and autonomy

| Area | Approved decision |
|---|---|
| Initiative | Moderate; no repeated unsolicited greetings |
| Interaction | Respond when called/asked within the narrow approved SEPHIA scope |
| Critical interruption | Critical-only interruption policy; normal information must not overwhelm Panitia |
| Autonomy | Assistant/notifier only; no autonomous OTP or exam operations |
| System analysis | Not in scope |
| Mitigation or recommendations | Not in scope |
| General dashboard assistance | Superseded by the later narrow-scope decision |
| Memory | Session-only conversation context; no persistent memory or cross-account transfer |
| Session end | Clear context on logout/session end/account change |

## D. Access, privacy, and processing

| Area | Approved decision |
|---|---|
| Panitia permissions | Shared Panitia access group for initial design |
| Authentication | Follow the active Panitia login session; no separate voice identity or PIN |
| Session expiry | Immediately stop SEPHIA and clear context |
| Audio storage | No persistent audio storage |
| Transcript storage | No permanent transcript/archive |
| Audio processing | Temporary processing only; clear buffers after processing |
| AI processing preference | Local AI; no external AI audio processing |
| Core OTP independence | OTP monitoring must continue when SEPHIA is OFF, failed, or unavailable |
| Student data | No permanent SEPHIA copy of student data/notifications |
| External service | No external STT/TTS/LLM fallback approved |

## E. Browser integration and scope

| Area | Approved decision |
|---|---|
| Integration surface | Panitia browser only |
| Read scope | Only the designated visible notification element |
| Qualifying events | Violation count strictly greater than 26; intended range OTP 27–30 |
| Access exclusions | No Firebase/database/API/server/terminal access; no whole-dashboard DOM reading |
| OTP controls | No issue, validate, revoke, unlock, reset, or auto-submit actions |
| Student state | No modification |
| Navigation | No navigation or dashboard control |
| Source of truth | Existing notification shown in OTP 2.0 Panitia browser |
| Notification observer | Narrowly scoped observer of the approved notification component only |
| Refresh behavior | No auto-reactivation after refresh |

## F. Notification reading behavior

| Area | Approved decision |
|---|---|
| Detection | Read qualifying notification as it appears; no click required |
| Read order | One at a time |
| New event during speech | Stop current announcement and prioritize the newest event |
| Priority | Newest notification takes precedence |
| Duplicate prevention | Use a stable event ID; one read per ID in the active browser session |
| Duplicate rerender | Must not trigger another announcement |
| Repeat | No voice repeat command and no repeat button |
| Missing/unreadable content | Use a generic warning; do not guess |
| Student name | Not spoken in the final short generic announcement |
| Class | Omit when unreadable; final standard phrase does not require class |
| Violation number | Do not speak the numeric level in the final standard phrase |
| Instruction style | Natural, friendly, short, and professional |
| Volume | Follow browser/device volume; no separate SEPHIA volume control |
| No notification | Remain standby without alert |
| Notification component disconnected | Remain standby; no reading while source is unavailable |
| Recovery | Read new notifications only; do not replay historical notifications |
| Recovery announcement | Visual indication only; no spoken recovery message |
| Audio failure | No automatic repeat; original dashboard notification remains available |
| Public speaker | Do not announce student identity through room-wide/public output |

Final standard announcement:

> “Perhatian, Panitia. Ada notifikasi pelanggaran OTP baru. Silakan periksa notifikasinya di dashboard, ya.”

## G. Wake word and voice interaction

| Area | Approved decision |
|---|---|
| Activation method | Wake word only after manual service activation |
| Wake phrase | “SEPHIA” |
| Wake confirmation | Visual confirmation only; no spoken acknowledgement |
| Wake sensitivity | Low sensitivity to reduce false activations |
| Failed wake detection | Visual standby only; no spoken response |
| Microphone indicator | Simple microphone icon |
| Color palette | Cyan-violet futuristic; red for failure |
| Conversation timeout | 10 seconds of silence |
| Conversation ending | Automatic timeout; no explicit end phrase |
| No-microphone mode | Notification TTS may continue, but wake-word/voice input unavailable |
| No-microphone indicator | Yellow |
| Microphone permission | Do not repeatedly prompt automatically; Panitia can grant permission in browser settings |

## H. Failure, restart, and health

| Area | Approved decision |
|---|---|
| Fatal SEPHIA failure | Shut down the SEPHIA service |
| Failure indicator | Red |
| Automatic restart | Not allowed |
| Recovery | Manual restart |
| Restart permission | All logged-in Panitia |
| Restart scope | SEPHIA service only |
| Restart confirmation | One confirmation |
| Health check | Basic check before reactivation |
| Failed health check | Remain OFF |
| Restart audit | Record requester, time, and result where safely possible |
| OTP effect | Restart/failure must not affect OTP or CBT |
| TTS unsupported/failure | Visual-only mode; dashboard remains source of truth |
| Source disconnected | Standby behavior; this carries a silent-missed-notification risk |

## I. Browser lifecycle refinements (latest approved)

| Decision | Final behavior |
|---|---|
| Tab switched to another tab | SEPHIA remains active while the page is still running |
| Workstation locked | SEPHIA is intended to keep running |
| Panitia navigates within dashboard | SEPHIA remains active while the designated notification component is available |
| Panitia session expires | SEPHIA stops immediately and clears session context |

These are approved target behaviors. They are not guaranteed by browser/OS APIs; actual browser and workstation tests are mandatory.

## J. Superseded or excluded proposals

The following must not be reintroduced as active scope:
- Deep access to the OTP dashboard.
- Full dashboard navigation by voice.
- General analytics, system diagnosis, and mitigation.
- Autonomous exam/OTP operations.
- Direct endpoint-based notification data path for SEPHIA.
- Broad DOM observation.
- Persistent memory or audio archive.
- Auto-restart after fatal failure.
- Automatic SEPHIA reactivation after refresh.
- Speaking student identity in the default announcement.

## K. Unresolved technical facts (not product questions)

These require repository/device audit, not another preference questionnaire:
1. The active production notification path (Firebase-backed or local-monitor-backed).
2. Exact production DOM selector and component lifecycle.
3. Stable event ID propagation into the rendered notification.
4. Exact session/logout/expiry enforcement point.
5. Browser/OS behavior when tab is backgrounded or workstation is locked.
6. Local wake-word and TTS runtime feasibility without a companion service.
7. Reliable lip-sync timing data from the selected TTS engine.
8. Remediation path for the client-side secret found in Moodle injection.

When continuing, resolve these through read-only inspection and measured tests. Ask the user only if a genuine product decision or authorization is required.
