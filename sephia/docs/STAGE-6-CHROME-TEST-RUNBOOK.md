# SEPHIA Stage 6 — Chrome Staging Acceptance Runbook

**Branch:** `feature/sephia-module`  
**Target:** Google Chrome on Panitia PC  
**Fixture:** `sephia/staging/`  
**Data:** synthetic only  
**Production:** no host injection, no OTP/Firebase/Moodle connection, no deployment

## Purpose and limits

This runbook verifies the isolated reader, controls, avatar placeholder, DOM behavior, and simulated speech lifecycle in a real Chrome browser. It does **not** validate Panitia authentication/session expiry, actual host integration, Firebase Rules, real TTS, microphone/wake-word, or production safety. Those require separate approved staging integration and the actual Panitia workstation/session provider.

The fixture contains no remote scripts, API calls, Firebase SDK, OTP action, microphone request, or real audio output. The speech adapter is a deterministic mock.

## Prepare the fixture on the Panitia PC

1. Obtain the `feature/sephia-module` branch locally. Do not use the production branch or production page.
2. Open a terminal in the repository's `sephia` directory.
3. Start a loopback-only static server:

```bash
python -m http.server 4173 --bind 127.0.0.1
```

4. In Chrome on the same PC, open `http://127.0.0.1:4173/staging/`.
5. Confirm the page title is **SEPHIA — Staging Acceptance Fixture** and the warning says this is synthetic data.
6. Confirm SEPHIA is OFF on first load. Do not open OTP 2.0 or a production Panitia URL during this fixture test.

If Python is unavailable, use an already approved local static-file server. Do not expose the server to the LAN; bind to loopback only.

## Test procedure

Record each result as PASS, FAIL, or BLOCKED, with Chrome version, OS version, date/time, and a screenshot or console excerpt that contains no real student data.

| ID | Test | Procedure | Expected result |
|---|---|---|---|
| S6-01 | Initial state | Refresh fixture | SEPHIA OFF; avatar hidden; no event spoken |
| S6-02 | Manual activation | Click SEPHIA once | State changes to active/standby |
| S6-03 | Threshold 26 | Click count 26 | Item visible; no speech-state transition |
| S6-04 | Threshold 27–30 | Click counts 27, 28, 29, 30 | Each distinct event accepted once |
| S6-05 | Threshold 31 | Click count 31 | Item visible; rejected by qualification contract |
| S6-06 | Duplicate | Send a qualifying event, then click duplicate | Same event ID is not delivered twice |
| S6-07 | Burst | Click burst 27–29 | Events processed in order; newest event interrupts previous mock speech |
| S6-08 | Audio failure | Click simulated audio failure | Error is logged; page and notification list remain usable |
| S6-09 | Visualizer control | Toggle visualizer OFF/ON | Visual layer hides/shows independently of reader activation |
| S6-10 | Manual shutdown | Click SEPHIA OFF while mock speech is pending | Speech is cancelled; state becomes inactive |
| S6-11 | Refresh reset | Activate, then refresh | New page starts OFF; no old event replay |
| S6-12 | Keyboard | Tab to controls and use Enter/Space | Controls remain operable and focus visible |
| S6-13 | Reduced motion | Enable OS/Chrome reduced-motion preference and reload | CSS animation is suppressed |
| S6-14 | Console | Inspect DevTools Console | No uncaught error during the above tests |
| S6-15 | Network/privacy | DevTools Network, preserve log, repeat tests | Only loopback fixture/module requests; no remote host, API, telemetry, audio, or student-data transmission |
| S6-16 | Permission | Inspect site permissions | Fixture never asks for microphone/camera/location |
| S6-17 | Background tab | Switch away for 2 minutes, return, emit event | Record actual result; browser throttling is not assumed away |
| S6-18 | Performance | Record 5-minute idle and 20-event burst in Performance/Task Manager | Record CPU, memory, long tasks, and visual responsiveness; do not infer performance from source tests |

### Important interpretation

- The fixture's speech is mocked. S6-07 and S6-08 validate controller behavior, not voice quality, local processing, or audible output.
- S6-17 does not establish locked-workstation behavior.
- A fixture PASS is not a Panitia session/authentication PASS.
- Do not generate real student violations to test SEPHIA.
- Do not grant microphone permission during Stage 6 fixture tests.

## Host and workstation tests that remain blocked

These cannot be completed by the isolated fixture:

1. Actual Panitia login, logout, expiry, and account-switch lifecycle.
2. Deactivation when the authenticated Panitia session expires.
3. Deployed Firebase alert-read behavior and real host-rendered metadata.
4. Actual browser TTS provider locality, audible output, autoplay, cancellation, and voice quality.
5. Microphone/wake-word operation under the approved local-only policy.
6. Workstation lock/unlock behavior.
7. Real host header placement and CSS interaction.
8. Actual Panitia workstation CPU/GPU/memory under integrated use.

Do not fake these results. Record BLOCKED until an approved staging host and the Panitia PC are available.

## Rollback

The fixture is isolated under `sephia/staging/`; it is not imported by OTP 2.0. If it causes a problem, stop the loopback server with Ctrl+C and close the fixture tab. No OTP data or configuration is changed.

For a repository regression, revert the Stage 6 commit on `feature/sephia-module` only. Do not reset, merge, or cherry-pick to `main`; do not deploy. Keep the previous known-good feature commit available in Git history.

## Acceptance decision

Stage 6 may be marked **fully accepted** only after:
- automated integration tests pass on the current branch head;
- S6-01 through S6-16 pass in Chrome on the Panitia PC;
- S6-17 and S6-18 are measured and recorded;
- blocked host/session/audio tests have a separately approved, safe staging plan;
- the acceptance report and rollback procedure are reviewed.

The fixture itself is a test tool, not a release candidate.
