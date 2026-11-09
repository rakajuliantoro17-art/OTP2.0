# SEPHIA Stage 9 — Final Assembly & Staging Preparation

**Status:** staging candidate assembled; human Chrome/PC acceptance pending  
**Branch:** `feature/sephia-module`  
**Production:** no merge, no deployment, no Firebase/Moodle/OTP configuration changes

## 1. Assembly decision

The Stage 9 staging fixture now imports SEPHIA modules from the generated `dist/` package, not from `src/`. This ensures the acceptance fixture exercises the same browser ES module files that the build pipeline packages.

The fixture remains isolated:
- synthetic notifications only;
- mock speech adapter only (no audible TTS);
- no Firebase, OTP API, Moodle, account, or student data;
- no microphone, camera, location, or external AI;
- no connection to the Panitia dashboard.

## 2. Build and run

Use Node.js 22 from the `sephia/` directory:

```bash
npm test
npm run check
npm run build
npm run verify:staging
python -m http.server 4173 --bind 127.0.0.1
```

Open Chrome on the same PC at:

```
http://127.0.0.1:4173/staging/
```

The server is bound to loopback only. Do not expose this fixture over LAN or run it against the production Panitia URL.

## 3. What the assembled package validates

- The fixture resolves modules from `dist/`.
- Initial OFF and manual activation.
- Thresholds 26, 27–30, and 31.
- Stable event-ID deduplication.
- Burst/newest-event interruption behavior using mock speech.
- Mock speech failure containment.
- Manual deactivation and page-exit cleanup.
- Visualizer independent toggle, keyboard operation, and reduced motion.
- Synthetic-only network/privacy inspection and basic performance observation.

See [Stage 6 Chrome Runbook](./STAGE-6-CHROME-TEST-RUNBOOK.md) for the complete S6 test matrix. Stage 6 tests now exercise the built distribution via the fixture.

## 4. What this does not validate

- The live Panitia dashboard host bridge, deployed Firebase Rules, server/network URL restrictions, or real alert provenance.
- Real local TTS, voice quality, audible playback, microphone, or wake-word.
- Final semi-realistic digital-human artwork or phoneme-aligned lip-sync. The avatar remains a CSS placeholder.
- Production CSS fit, host CSP, Vercel behavior, workstation lock, background-tab guarantees, or actual Panitia PC performance.
- Security of the dedicated Panitia URL. URL secrecy is not authentication.

## 5. Host package boundary

The Panitia feature-branch integration source still imports the host bridge from `sephia/src/`. The built `dist/` package is used by the isolated staging fixture. Do not change the production host loader to `dist/` until a staging deployment process can place the artifact at the expected static path and verify MIME type, relative module imports, CSP, and rollback.

## 6. Acceptance status

**Repository assembly:** ready for Chrome staging test once the build is generated locally.  
**Automated acceptance:** pending the next GitHub Actions run after this Stage 9 change.  
**Chrome/PC acceptance:** not run; the user is not currently at the Panitia PC.  
**Production acceptance:** not authorized.

A human operator must record Chrome/OS version, date/time, PASS/FAIL/BLOCKED per test, and evidence without real student information. Never claim browser acceptance based on CI alone.

## 7. Rollback

The fixture remains separate from OTP 2.0. Stop the loopback server with Ctrl+C and close the tab. Revert only the Stage 9 fixture/runbook changes on `feature/sephia-module` if required. Do not modify OTP thresholds, Firebase Rules, Moodle, or production host files.

## 8. Next release gate

After the fixture passes on the Panitia PC:
1. Prepare an approved non-production copy of the Panitia dashboard.
2. Verify host alert metadata and deployed-equivalent Firebase read permissions.
3. Confirm the exact static artifact path, JavaScript MIME type, CSP and server access restrictions.
4. Decide whether to supply final avatar artwork.
5. Independently qualify a local-only TTS provider or leave audio disabled.
6. Complete host-integrated staging and rollback rehearsal before any production approval.
