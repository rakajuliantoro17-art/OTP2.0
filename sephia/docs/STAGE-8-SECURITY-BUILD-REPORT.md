# SEPHIA Stage 8 — Security, Reliability and Build Readiness

**Status:** source hardening and build pipeline implemented  
**Branch:** `feature/sephia-module`  
**Release:** not deployed; no merge to `main`

## 1. Security boundary

The static source checker scans all JavaScript under `src/` and rejects:
- network fetch, XMLHttpRequest, WebSocket, and EventSource APIs;
- persistent browser storage (localStorage, sessionStorage, IndexedDB);
- dynamic code evaluation;
- beacon transmission;
- microphone access APIs.

It also validates every relative source import stays inside the `src/` boundary and resolves to an existing file. The host bridge must use only the explicit `#alertList` and `#sephiaControlMount` mount points.

These checks are defense-in-depth, not a formal security proof. They do not establish server-side access control, deployed Firebase rules, trustworthiness of a live alert payload, or browser/OS isolation.

## 2. Reliability controls retained

- SEPHIA is optional and starts OFF.
- The Panitia page catches module import/initialization errors.
- Missing mount points fail closed.
- Runtime/observer/speech errors are contained and do not become OTP actions.
- Only stable event IDs, exact event type `violation`, and safe integer counts 27–30 qualify.
- The reader observes only the explicit `#alertList` root and does not replay existing alerts.
- Duplicate IDs are kept in memory only while active; stop clears them.
- `pagehide` and `beforeunload` stop the reader; BFCache restoration does not reactivate it.
- No identity, account, role, PIN, or authenticated session is inferred from the dedicated URL.
- No audio, transcript, notification archive, or browser storage is introduced.

## 3. Build pipeline

From `sephia/`, using Node.js 22:

```bash
npm test
npm run check
npm run build
```

The build:
1. validates local relative imports;
2. copies browser ES modules from `src/` to `dist/`;
3. writes `dist/manifest.json` with entrypoint, module paths, byte sizes, SHA-256 digests, package version, and CI commit identifier;
4. uses Node built-ins only; no third-party package install is required.

GitHub Actions runs tests, static checks, and build in sequence. The generated `dist/` directory is uploaded as a 14-day artifact named `sephia-stage8-build-<commit>`.

## 4. Build consumption boundary

The Panitia feature-branch source currently imports the isolated host bridge from `sephia/src/`. The Stage 8 `dist/` output is a reproducible packaged copy for review and staging. Switching the host loader to consume the generated artifact is a later release-packaging decision and must preserve relative module paths and hashes.

Do not deploy the artifact or replace the host loader as part of Stage 8.

## 5. Known risks not solved by source code

- A URL known only to Panitia is not authentication. Server/network restrictions must be verified separately.
- Actual deployed Firebase RTDB rules and live alert payload provenance remain unverified.
- The current local speech provider is not connected; TTS remains disabled until local-only processing is verified on the target Chrome/OS.
- Microphone, wake-word, external AI, final avatar artwork, and phoneme lip-sync are not enabled.
- Chrome PC rendering, CPU/memory, background-tab behavior, autoplay, and workstation-lock behavior remain deferred until the build is ready for the planned PC test.
- Existing host CSP/security headers and the unrelated client-side TOTP secret finding from the Phase 0 audit are outside this stage and remain separate security work items.

## 6. Acceptance status

Automated acceptance requires:
- complete Node test suite green;
- static security/import checker green;
- build successful;
- manifest present and artifact uploaded.

Human/browser acceptance remains pending. A green CI run is not evidence that Chrome PC, deployed Firebase, network restrictions, or local audio have been validated.

## 7. Rollback

If the build or integration causes trouble, revert the Stage 8 scripts/workflow changes independently. To disable the optional SEPHIA bridge, remove its dynamic import from `panitia/index.html` and the explicit mount from `panitia/components/topbar.html`. OTP thresholds, Firebase rules, and existing notification generation do not need to change.
