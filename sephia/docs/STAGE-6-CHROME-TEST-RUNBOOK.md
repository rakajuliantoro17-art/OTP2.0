# SEPHIA Stage 6 — Chrome Staging Acceptance Runbook

**Branch:** `feature/sephia-module`  
**Target:** Google Chrome on Panitia PC  
**Fixture:** `sephia/staging/`  
**Data:** synthetic only  
**Production:** no deployment, no live OTP/Firebase/Moodle test

## Scope and access model

The Panitia dashboard has no account login. It is reached through a dedicated page URL known to Panitia. A URL known only to a group is obscurity-based access, **not authentication**. SEPHIA must not claim to know who opened the page or infer identity from the URL.

Stage 6 therefore tests a **document/page lifecycle boundary**, not a login session:
- SEPHIA starts OFF after every page load.
- Manual activation is required.
- Manual OFF, `pagehide`, and `beforeunload` stop the reader and speech.
- Browser back/forward-cache restoration does not reactivate SEPHIA; manual activation is required.
- Page visibility changes alone do not stop SEPHIA; background-tab behavior must be measured.
- No user identity, role, or login state is created or inferred.

The host fixture imports the packaged `dist/` modules and contains only synthetic data plus a mock speech adapter. It does not call remote APIs, Firebase, OTP actions, or request microphone/camera/location permissions. A separate voice-diagnostics page is available for explicit local TTS and on-device wake-word checks; it is not part of the Stage 6 no-permission fixture.

## Prepare the fixture on the Panitia PC

1. Obtain branch `feature/sephia-module`; do not use `main` or the production dashboard.
2. Open a terminal in the repository's `sephia` directory.
3. Build the browser package first. The fixture imports `dist/`, not source modules:

```bash
npm test
npm run check
npm run build
npm run verify:staging
```

4. Start a loopback-only static server:

```bash
python -m http.server 4173 --bind 127.0.0.1
```

5. In Chrome on the same PC, open `http://127.0.0.1:4173/staging/`.
6. Confirm the title **SEPHIA — Staging Acceptance Fixture** and the synthetic-data warning.
7. Confirm SEPHIA is OFF. Do not open OTP 2.0 or a production Panitia URL during fixture tests.

If Python is unavailable, use an approved local static server bound to loopback only. Do not expose the fixture server to the LAN.

## Stage 10 — Panitia host bridge fixture

The additional page `/staging/panitia-host.html` imports the built `dist/host/mount-panitia-sephia.js` bridge and uses the exact host mount IDs. It is still synthetic-only and does not open the OTP dashboard.

Record PASS/FAIL/BLOCKED for:
- Initial OFF and manual activation.
- Count 26 ignored; counts 27–30 forwarded once; count 31 ignored.
- Duplicate event ID ignored.
- Manual OFF prevents subsequent callbacks.
- Refresh returns to OFF with no backlog replay.
- Console and Network panel show no SEPHIA errors or non-loopback requests.

See [Stage 10 Host Trial Readiness](./STAGE-10-HOST-TRIAL-READINESS.md) for the complete H10 matrix.

## Stage 16 — local voice diagnostics\n\nAfter `npm run build`, open `http://127.0.0.1:4173/staging/voice-diagnostics.html` on the Panitia PC. This page is separate from the synthetic host fixture. Click **Uji suara SEPHIA** to test the selected local Indonesian feminine TTS voice, then click **Mulai uji “SEPHIA”** to request microphone access and check on-device `id-ID` recognition. Say only “SEPHIA”; do not use student names or real alert data. Stop the recognizer after the test. The page never auto-starts the microphone, stores audio, or sends transcripts. If the browser lacks a local feminine Indonesian voice or on-device recognition, record BLOCKED rather than enabling a cloud fallback.\n\n## Test procedure

Record PASS, FAIL, or BLOCKED with Chrome version, OS version, date/time, and evidence containing no real student data.

| ID | Test | Procedure | Expected result |
|---|---|---|---|
| S6-01 | Initial state | Refresh fixture | SEPHIA OFF; avatar hidden; no event spoken |
| S6-02 | Manual activation | Click SEPHIA once | Active/standby |
| S6-03 | Threshold 26 | Click count 26 | Visible; ignored by SEPHIA |
| S6-04 | Threshold 27–30 | Click 27, 28, 29, 30 | Each distinct event accepted once |
| S6-05 | Threshold 31 | Click 31 | Visible; ignored by SEPHIA |
| S6-06 | Duplicate | Send event then click duplicate | Same stable event ID not delivered twice while active |
| S6-07 | Burst | Click burst 27–29 | Newest mock speech interrupts prior mock speech |
| S6-08 | Audio failure | Click simulated failure | Error contained; fixture and list remain usable |
| S6-09 | Visualizer | Toggle OFF/ON | Visual layer changes independently of reader |
| S6-10 | Manual OFF | Turn SEPHIA OFF during mock speech | Speech cancelled; state inactive |
| S6-11 | Refresh reset | Activate, refresh | Starts OFF; no historical event replay |
| S6-12 | Page exit | Activate, navigate away/back or reload | `pagehide` cleanup; restored/reloaded page remains OFF |
| S6-13 | Keyboard | Use Tab, Enter, Space | Controls operable; focus visible |
| S6-14 | Reduced motion | Enable reduced motion and reload | Animation suppressed |
| S6-15 | Console | Inspect DevTools Console | No uncaught errors |
| S6-16 | Network/privacy | Preserve Network log and repeat | Loopback requests only; no remote API/telemetry/audio/student-data transmission |
| S6-17 | Permissions | Inspect site permissions | No microphone/camera/location prompt |
| S6-18 | Background tab | Switch away 2 minutes, return, emit event | Record actual browser result; do not assume execution guarantees |
| S6-19 | Performance | 5-minute idle and 20-event burst | Record CPU, memory, long tasks, and responsiveness |

## Interpretation and limitations

- Speech is mocked; these tests do not validate actual local TTS, audible output, voice quality, or audio locality.
- Pagehide/beforeunload are best-effort browser lifecycle events; a crash or power loss may bypass graceful cleanup.
- A URL-only dashboard remains accessible to anyone who obtains the URL, subject to separate network/server restrictions. This fixture does not validate URL secrecy or server authorization.
- S6-18 does not establish locked-workstation behavior.
- Do not generate real student violations or grant microphone permission during Stage 6.
- Do not test against the live Panitia dashboard.

## Remaining host/workstation checks

1. Verify the actual server/network restriction around the dedicated Panitia URL. Do not treat the URL itself as authentication.
2. Verify the deployed Firebase rules and the host-rendered alert metadata in an approved staging copy.
3. Confirm the existing server alert bridge handles counts 26, 27–30, 31+, missing/non-integer counts, and non-violation alerts.
4. Verify pagehide cleanup in Chrome on the actual Panitia PC.
5. Measure background-tab and workstation-lock behavior.
6. Verify a concrete local-only TTS provider separately before enabling real audio.
7. Inspect actual host header placement/CSS and performance only in a non-production staging copy.

Do not fake these results. Record BLOCKED until the relevant staging host or Panitia PC is available.

## Rollback

The fixture is isolated under `sephia/staging/` and is not imported by OTP 2.0. Stop the loopback server with Ctrl+C and close the fixture tab. No OTP data/configuration is changed.

For a repository regression, revert only the relevant commit on `feature/sephia-module`. Do not reset, merge, cherry-pick to `main`, or deploy.

## Acceptance decision

Stage 6 can be marked fully accepted only after:
- automated tests pass on the latest branch head;
- S6-01 through S6-17 pass on Chrome/PC;
- S6-18 and S6-19 are measured and recorded;
- host URL/network access controls are independently reviewed;
- real TTS remains disabled unless its local-only behavior is verified;
- the acceptance report and rollback procedure are reviewed.

This fixture is a test tool, not a release candidate.
