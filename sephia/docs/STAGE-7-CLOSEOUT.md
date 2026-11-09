# SEPHIA Stage 7 — Closeout

**Status:** source integration milestone complete  
**Branch:** `feature/sephia-module`  
**No production release:** true

## Delivered

1. Added the single explicit `#sephiaControlMount` to the Panitia dashboard topbar.
2. Added optional dynamic loading of the SEPHIA host bridge after all Panitia components, including `#alertList`, have loaded.
3. Added `src/host/mount-panitia-sephia.js` to connect the exact alert root, manual controls, visual state, runtime, and page lifecycle cleanup.
4. The bridge starts inactive. No observer runs until a manual activation click.
5. The bridge uses only `getElementById("alertList")` and `getElementById("sephiaControlMount")`; it does not scan unrelated dashboard content.
6. The Panitia dashboard has no login. No identity, role, account, or authenticated session is inferred or added.
7. Host import and bridge-construction errors are contained. Panitia dashboard initialization continues without SEPHIA if the optional module fails.
8. Pagehide disposes the bridge and clears runtime resources.
9. Added unit and static host-wiring tests.
10. Documented rollback and remaining release gates.

## Automated verification

GitHub Actions [run #73](https://github.com/rakajuliantoro17-art/OTP2.0/actions/runs/42629992116) passed on branch head `4a896c688864815afced83440033aa63933747a6`:
- Node.js 22
- 43 tests passed
- 0 failed
- 0 skipped

The test suite includes Panitia event metadata, safe text rendering, bridge mount boundaries, initial OFF state, pagehide cleanup, missing mount fail-closed behavior, partial-construction cleanup, and page-level dynamic-import ordering.

## Deliberately not enabled

- Real speech/TTS provider: disabled until local-only processing is verified.
- Microphone and wake-word: not connected.
- Avatar artwork and phoneme lip-sync: not connected.
- No persistent event history, audio archive, transcript, or identity state.
- No Firebase/API/Moodle/OTP control access from SEPHIA.

Existing Panitia browser-visible alerts remain the source of truth. The integrated SEPHIA reader currently provides manual activation and the isolated notification observer; it does not yet speak announcements.

## Acceptance still pending

Stage 6 Chrome/PC tests are intentionally deferred until the build is ready, per the project decision. These include actual header rendering, browser lifecycle behavior, background tab behavior, performance, and permissions. Actual deployed Firebase Rules, server/network restrictions protecting the URL-only Panitia page, and a local-only TTS provider also remain unverified.

## Branch and release controls

- Branch: `feature/sephia-module`
- No merge to `main`
- No deployment
- No Firebase Rules, server access, Moodle, OTP threshold, or production configuration changes
- The URL known only to Panitia is not authentication; this limitation remains documented.

## Rollback

Disable SEPHIA host loading by removing the dynamic import block from `panitia/index.html` and removing `#sephiaControlMount` from `panitia/components/topbar.html`. The underlying alert bridge can remain without starting SEPHIA. No OTP behavior needs to change.
