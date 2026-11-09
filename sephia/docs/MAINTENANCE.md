# SEPHIA Maintenance Guide

## Before changing code

1. Read `../../docs/SEPHIA-DECISION-REGISTER.md`, `../../docs/SEPHIA-PHASE0-AUDIT.md`, and this module's `ARCHITECTURE.md`.
2. Confirm the change stays inside SEPHIA's approved passive-reader scope.
3. Identify whether the change affects the core contract, DOM adapter, runtime lifecycle, or optional presentation.
4. Add or update unit, host-contract, audio-controller, visual-controls, and avatar-renderer regression tests before integrating with the OTP host.
5. Never change OTP thresholds, authentication, Firebase rules, or server behavior as part of a SEPHIA-only maintenance task.

## Local test and build

From this folder, with Node.js 22:

```bash
npm test
npm run check
npm run build
```

The build has no third-party dependencies. It validates local relative imports, copies browser ES modules to `dist/`, and writes a SHA-256 manifest. CI uploads the output as a temporary artifact.

The current tests use Node's built-in test runner and do not require external dependencies.

## Change procedure

1. Work on `feature/sephia-module` or a dedicated feature branch.
2. Keep changes confined to `sephia/` unless a separately approved host integration is underway.
3. Update architecture/decision documentation when behavior or contracts change.
4. Run tests and inspect the diff.
5. Verify that SEPHIA remains inactive by default and does not inspect outside `#alertList`.
6. Do not merge to `main` or deploy without explicit approval.

## Regression checklist

- [ ] Only exact `#alertList` is observed.
- [ ] No document-wide query or observer is introduced.
- [ ] Counts below 27, missing counts, malformed counts, and unsafe integers are ignored.
- [ ] Stable event ID is mandatory.
- [ ] Visible message is read through `textContent`.
- [ ] Existing alerts are not replayed on activation.
- [ ] Duplicate IDs are ignored during one active session.
- [ ] Deactivation disconnects the observer and clears session memory.
- [ ] Refresh/reopen does not auto-activate.
- [ ] Pagehide and beforeunload stop the runtime; the Panitia dashboard has no account login, so no user logout/session-expiry hook is assumed.
- [ ] No Firebase/API/Moodle/OTP mutation capability is introduced.
- [ ] Optional audio/visual failures cannot break OTP 2.0.
- [ ] Speech adapter is verified local before it is enabled.
- [ ] New notification interrupts current speech; no overlapping utterances.
- [ ] Microphone/wake-word permission is never requested on page load.
- [ ] Visualizer can be disabled without deactivating the reader.
- [ ] Controls mount only into an explicit host-provided container.
- [ ] Reduced-motion and keyboard focus behavior remain accessible.
- [ ] Visual/UI errors cannot interrupt Panitia alert rendering.\n- [ ] Avatar remains hidden while inactive and in standby.\n- [ ] Avatar artwork uses a same-origin relative asset path only.\n- [ ] Mouth activity requires the actual speech controller speaking state.\n- [ ] CSS fallback is never described as the final digital-human avatar.\n- [ ] Avatar and visualizer respect reduced-motion preferences and dispose cleanly.

## Stage 6 staging acceptance\n\n- Use only the isolated synthetic fixture in `staging/`; never connect it to production OTP, Firebase, Moodle, or real student data.\n- Follow `docs/STAGE-6-CHROME-TEST-RUNBOOK.md` and record results in `docs/STAGE-6-ACCEPTANCE-REPORT.md`.\n- A passing Node.js suite does not prove Chrome, local TTS, microphone, session expiry, workstation lock, or device performance.\n- Keep the fixture bound to loopback (`127.0.0.1`) and do not expose its static server to the LAN.\n- Stage 6 Chrome acceptance is deferred until the Stage 8 build artifact is ready; passing Node tests does not replace the PC test.\n\n## Production release gate

The feature-branch source integration is already in place. Do not promote it to production until the following are verified:

- actual deployed Firebase alert-read behavior;
- host-generated event ID and numeric violation count;
- local/staging browser behavior;
- avatar asset loading and target-workstation performance;\n- local TTS/viseme timing before lip-sync is claimed;
- microphone and TTS feasibility only if those future capabilities are explicitly approved.

Vercel being paused is compatible with isolated repository development. It does not prove runtime or browser behavior.
