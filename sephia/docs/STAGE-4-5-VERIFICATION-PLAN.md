# SEPHIA Stage 4–5 Verification Plan

**Branch:** `feature/sephia-module`  
**Purpose:** record source-level and external acceptance gates without implying unrun tests passed.  
**Production:** no merge, deployment, Firebase Rules change, or Moodle change.

## Verification status definitions

- **Implemented:** source code exists.
- **Source-testable:** a deterministic automated test can verify the behavior.
- **External verification required:** requires actual browser, host page, device, network inspection, or session provider.
- **Blocked:** a prerequisite is absent and the test must not be simulated as passed.

## Stage 4 — Visualizer & Controls

| ID | Verification | Method | Current disposition |
|---|---|---|---|
| V4-01 | Starts inactive | Unit test + browser refresh | Source-testable; browser pending |
| V4-02 | Manual activation/deactivation | Control/runtime contract tests | Source-testable; browser pending |
| V4-03 | Runtime activation failure leaves UI inactive | Regression test | Included in this verification pass |
| V4-04 | Runtime deactivation failure is contained and state clears | Regression test | Included in this verification pass |
| V4-05 | State indicator follows actual state | State/control tests | Source-testable; browser pending |
| V4-06 | Visualizer OFF is independent of reader | Unit test + browser | Source-testable; browser pending |
| V4-07 | Keyboard and accessible labels | Accessibility inspection | Partial source support; browser audit pending |
| V4-08 | Reduced-motion support | CSS inspection + browser preference | Source support; browser pending |
| V4-09 | Component disposal removes listeners/elements | Unit test | Source-testable |
| V4-10 | Avatar/visual failure cannot break OTP monitoring | Isolation tests + host staging | Source-testable in part; host staging blocked |
| V4-11 | Logout/session expiry/account switch | Real host session integration | **Blocked:** no verified host session hook |
| V4-12 | Header placement and responsive layout | Actual Panitia staging browser | **Blocked:** no staging integration authorized/performed |

## Stage 5 — Avatar Digital Human

| ID | Verification | Method | Current disposition |
|---|---|---|---|
| V5-01 | Final semi-realistic adult feminine artwork | Asset review | **Blocked:** final artwork not supplied/created |
| V5-02 | Same-origin asset loading | Browser network inspection | External verification pending |
| V5-03 | Hidden while inactive/standby | Unit test + browser | Source-testable |
| V5-04 | Appears during listening/speaking only | Unit test + browser | Source-testable |
| V5-05 | Mouth animation requires active speech | Unit test | Source-testable; not phoneme lip-sync |
| V5-06 | Mouth motion stops on speech cancellation/failure | Unit test + local TTS test | Controller contract testable; real TTS blocked |
| V5-07 | Visualizer OFF hides avatar but keeps reader active | Unit test | Source-testable |
| V5-08 | Asset failure fallback | Browser image-load test | Source logic present; browser pending |
| V5-09 | Reduced-motion support | CSS inspection + browser | Source support; browser pending |
| V5-10 | CPU/GPU/memory impact | Target workstation profiling | **Blocked:** target device/browser not tested |
| V5-11 | Indonesian phoneme/viseme lip-sync | Local TTS timing integration | **Blocked:** no verified local TTS/viseme provider |
| V5-12 | Logout/session expiry hides avatar | Real host session integration | **Blocked:** no verified host session hook |

## Automated verification evidence\n\n- GitHub Actions workflow: [SEPHIA Tests run #48](https://github.com/rakajuliantoro17-art/OTP2.0/actions/runs/42559862077).\n- Tested commit: `6646faa28e539b70ef16488144aa2c823030302d` on `feature/sephia-module`.\n- Result: **28 tests passed, 0 failed, 0 skipped** under Node.js 22 (`node --test`).\n- Included coverage: host payload/event-key contract, notification qualification, runtime lifecycle, speech controller, visual state, visual controls, runtime activation/deactivation failure containment, and avatar visibility/speech-state behavior.\n- This is source-level CI evidence only. It does not verify the actual Panitia browser, final artwork, local TTS, session expiry, or target workstation performance.\n\n## Risks and gates

1. **Session lifecycle — Critical integration blocker.** Do not connect the runtime/avatar to Panitia until the real authenticated session, logout, expiry, and account-switch lifecycle are identified and tested.
2. **Local TTS — High privacy/feasibility gate.** No external TTS/AI fallback. Browser-native speech must not be assumed local.
3. **Final artwork — Medium product gate.** Current CSS fallback is a placeholder only.
4. **Browser/device performance — Medium operational gate.** No claims until measured on the actual workstation.
5. **CI — Passed for the recorded commit.** Run #48 passed 28/28 tests. Re-run CI after any subsequent code changes; the result does not replace browser/device acceptance.

## Scope protection

- No Firebase, API, database, server, Moodle, or OTP control access from SEPHIA.
- No change to OTP thresholds or notification source of truth.
- No audio recording, transcript archive, persistent memory, or external processing.
- No auto-activation after refresh.
- SEPHIA failure must never block Panitia alert rendering or OTP/CBT monitoring.
- Keep all code under `sephia/` on `feature/sephia-module`.
- No merge/deployment without explicit approval.
