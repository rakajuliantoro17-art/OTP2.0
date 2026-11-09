# SEPHIA Stage 6 — Staging Acceptance Report

**Branch:** `feature/sephia-module`  
**Target:** Google Chrome on Panitia PC  
**Panitia access model:** dedicated URL; no account login  
**Production changes:** none

## Scope decision

The dashboard has no login. The dedicated URL is obscurity-based access, not authentication. Stage 6 therefore validates page/document lifecycle cleanup only. It does not claim authenticated user identity, role, logout, expiry, or account-switch handling.

No login was added. No host activation or deployment was performed.

## Status legend

- **PASS — automated:** verified by source-level tests/CI on the recorded commit.
- **READY — manual:** fixture and procedure exist; Chrome execution has not occurred.
- **BLOCKED:** requires actual workstation, staging host, server/network control review, or verified local audio provider.
- **NOT RUN:** no evidence yet.

## Evidence and current status

| Area | Status | Evidence / notes |
|---|---|---|
| Threshold 26 ignored; 27–30 accepted; 31 rejected | PASS — automated | Notification contract and synthetic burst tests |
| Stable event-ID deduplication | PASS — automated | Observer and acceptance tests |
| Newest event interrupts prior mock speech | PASS — automated | Speech controller tests |
| Mock TTS failure containment | PASS — automated | Audio and acceptance tests |
| Manual stop cancels pending mock speech | PASS — automated | Runtime/audio lifecycle tests |
| No backlog on activation | PASS — automated | Observer starts on new mutations; manual Chrome test pending |
| Pagehide/beforeunload shutdown helper | PASS — source tests | Added helper and lifecycle tests; Chrome execution pending |
| Manual activation after reload/BFCache restore | READY — manual | Chrome runbook S6-01/S6-12 |
| Synthetic Chrome fixture | READY — manual | `sephia/staging/index.html` |
| Chrome console/network/permissions/accessibility | READY — manual | Runbook S6-13 through S6-17 |
| CPU/memory/background tab | NOT RUN | Requires Panitia PC |
| Workstation lock/unlock | NOT RUN | Requires actual PC and OS session |
| URL/server/network access control | BLOCKED | Requires review of actual deployment/network configuration |
| Actual Firebase Rules and host alert bridge | BLOCKED | Deployed rules and staging host not verified |
| Real local TTS/voice quality | BLOCKED | No concrete provider verified; mock only |
| Microphone/wake-word | BLOCKED | Not implemented/authorized for Stage 6 |
| Host header integration | BLOCKED | Runtime remains disconnected from host |
| OTP independence under live integration | PARTIAL | Source-level isolation only; no live host test |

## New Stage 6 lifecycle code

- `src/runtime/bind-page-lifecycle.js`: stops runtime and visual state on `pagehide` and `beforeunload`; does not infer identity or auto-activate on `pageshow`.
- `tests/page-lifecycle.test.mjs`: covers page exit, BFCache-style pageshow non-reactivation, idempotent cleanup, and invalid dependencies.
- The staging fixture now uses this lifecycle helper and cleans up all fixture components on page exit.

## Automated CI evidence

The previously reported GitHub Actions run [#58](https://github.com/rakajuliantoro17-art/OTP2.0/actions/runs/42562798678) passed 33 tests on commit `c29431840b96f9f8df737bb54786492ec432bdf3`. That run predates the newly added lifecycle module/tests and therefore does **not** validate the latest branch head. A new CI run must pass before the current automated gate is marked green.

## Acceptance decision

**Stage 6 is not fully accepted yet.** Source-level page lifecycle behavior is implemented and has dedicated tests, but latest-head CI and manual Chrome/PC tests remain outstanding. The URL-only access model is explicitly documented as non-authentication. Production activation is not authorized by this report.

## Release gate

Before any production consideration:
1. Latest-head CI passes.
2. Chrome fixture passes on the Panitia PC and records CPU/memory/background-tab evidence.
3. Actual server/network restrictions for the dedicated URL are reviewed; URL secrecy alone is insufficient.
4. Host alert metadata and Firebase read permissions are verified in an approved staging copy.
5. Concrete local-only TTS is independently verified or audio remains disabled.
6. Rollback and monitoring responsibilities are agreed.
