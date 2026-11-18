# SEPHIA Stage 11 — Phase 1: Integration Preparation

**Status:** preparation and source review complete; no live-host integration executed  
**Branch:** `feature/sephia-module`  
**Deployment:** none; Vercel project remains paused  
**Production:** unchanged; no merge to `main`, no deployment, no Firebase Rules or Moodle changes

## 1. Objective and scope

Prepare a controlled integration path between SEPHIA and the OTP 2.0 Panitia dashboard. This phase is a repository/source review and integration contract definition. It does not activate SEPHIA in a live dashboard, modify production behavior, or claim browser acceptance.

The target host is the existing Panitia page at `panitia/index.html`. The only permitted observation target is `#alertList`; the only permitted control mount is `#sephiaControlMount`.

## 2. Source review — verified current branch state

The following source files were reviewed on `feature/sephia-module`:

- `panitia/index.html`
- `panitia/components/topbar.html`
- `panitia/js/realtime.js`
- `panitia/js/ui.js`
- `api/violation.js`
- `sephia/src/host/mount-panitia-sephia.js`
- `sephia/staging/panitia-host.html`
- `sephia/staging/panitia-host-fixture.js`

### 2.1 Host mount points

- Panitia topbar declares `#sephiaControlMount`.
- Panitia alert component supplies `#alertList`.
- `panitia/index.html` loads dashboard components sequentially and then dynamically imports the SEPHIA host bridge.
- SEPHIA bridge resolves only those two explicit IDs, starts inactive, and disposes on `pagehide`.
- The loader catches bridge import/mount errors so SEPHIA failure does not intentionally block the Panitia dashboard.

### 2.2 Notification data contract

- `api/violation.js` writes server-calculated `violationCount` into violation alert payloads.
- Existing OTP thresholds remain: critical status begins at 26; auto-submit begins at 30. SEPHIA must not alter these rules.
- `panitia/js/realtime.js` retains Firebase `snap.key` as the event ID and decorates the newly rendered alert only when type is exactly `violation` and count is a safe integer from 27 through 30.
- Normal Panitia rendering occurs before SEPHIA metadata decoration.
- `panitia/js/ui.js` renders alert message content with `textContent`.
- SEPHIA's runtime observes only `#alertList` and accepts the explicit metadata contract. No Firebase/API/Moodle access is permitted from SEPHIA.

### 2.3 Access boundary

The Panitia dashboard has no account login. Access is via a dedicated URL known to Panitia. This is not authentication or authorization. Phase 1 does not add login, password, PIN, role, or identity assumptions. The actual server/network restriction protecting that URL remains to be independently verified.

## 3. Integration build gap — must be resolved in Phase 2

**Important:** the current Panitia loader imports the host bridge from `../sephia/src/host/mount-panitia-sephia.js`, while the Stage 9/10 browser build creates a separate `sephia/dist/` package. The Stage 10 fixture imports the built `dist/host/mount-panitia-sephia.js`, but the actual Panitia page does not yet consume that built artifact.

Therefore:

1. A successful SEPHIA package build does not, by itself, prove the Panitia host page can load the build artifact.
2. Phase 2 must define and test the exact artifact placement/path relative to `panitia/index.html`.
3. The loader must not be switched from `src` to `dist` until the integration package layout, static MIME type, relative module imports, CSP, and rollback path are verified in an isolated copy.
4. Vercel deployment is not a prerequisite for local build work, but a paused Vercel project cannot provide a deployed test URL.

No loader path or production host file is changed in Phase 1.

## 4. Required integration topology

Expected controlled topology for later phases:

```text
OTP2.0 isolated working copy / feature branch
  |
  +-- Panitia host page (existing dashboard shell)
  |     +-- #sephiaControlMount (manual controls; OFF by default)
  |     +-- #alertList (visible host notifications)
  |
  +-- SEPHIA built browser modules
        +-- host bridge
        +-- notification reader
        +-- visual state and controls
        +-- lifecycle cleanup
```

The only data path allowed is:

```text
Server-created Firebase alert
  -> existing Panitia realtime listener
  -> existing visible #alertList item + qualifying metadata
  -> SEPHIA observer
  -> normalized event callback
```

SEPHIA must not create a parallel Firebase listener or call any OTP action.

## 5. Safety invariants

- SEPHIA starts OFF after every page load or refresh.
- Manual activation is required.
- Qualifying notification: stable event ID, event type `violation`, safe integer count 27–30.
- Count 26, count 31+, missing/invalid count, non-violation events, and events without stable IDs are ignored by SEPHIA.
- One unique event ID is consumed at most once per active runtime.
- SEPHIA does not announce student name, class, UID, count, or violation detail.
- Approved generic announcement remains the only permitted spoken content when a separately verified local-only speech adapter is approved.
- No TTS provider is connected in the current host bridge.
- No microphone, wake-word, external AI, audio archive, transcript archive, persistent storage, or automatic restart.
- SEPHIA failure must remain isolated from Panitia alert rendering and OTP/CBT operation.
- No changes to OTP thresholds, auto-submit, unlock, student records, Firebase Rules, Moodle, or production deployment.

## 6. Phase 2 implementation prerequisites

Before changing the host loader or preparing an integration build:

- [ ] Choose a deterministic artifact layout that can be served beside the Panitia page.
- [ ] Verify all relative imports resolve from that layout.
- [ ] Verify JavaScript module MIME type from the intended local/static host.
- [ ] Inspect applicable Content Security Policy and script/module restrictions.
- [ ] Verify that a missing/corrupt SEPHIA artifact leaves Panitia operational.
- [ ] Define a one-step rollback that removes only the SEPHIA mount/import.
- [ ] Build an isolated copy of the Panitia host; never test against production services first.
- [ ] Replace real Firebase access with controlled synthetic alert delivery for initial integration tests.
- [ ] Confirm the host's existing Firebase alert read permission without changing deployed rules.
- [ ] Record browser, server origin, and network observations during manual Chrome acceptance.

## 7. Release gates

| Gate | Required evidence | Current status |
|---|---|---|
| Source review | Host, alert and API source reviewed | Complete |
| Integration contract | Mount points, event schema and safety invariants documented | Complete |
| Artifact path | Built modules load from isolated Panitia copy | Pending Phase 2 |
| Static hosting | MIME, relative imports and CSP verified | Pending Phase 2 |
| Synthetic host test | Chrome test on Panitia-shaped isolated copy | Pending |
| Live-host validation | Approved non-production host and controlled alerts | Pending |
| Production release | Explicit owner approval after all gates | Not authorized |

## 8. Rollback strategy

Phase 1 has no executable source changes, so no runtime rollback is required. For later integration phases, rollback must remove the SEPHIA dynamic import/mount and its dedicated control mount only. Existing Panitia alert rendering, Firebase listeners, OTP actions, and CBT logic must remain unchanged.

Do not revert the independently useful safe alert rendering or server payload metadata unless a separate review establishes that doing so is necessary.

## 9. Phase 1 completion statement

Phase 1 is complete as an integration-preparation milestone: the host mount points, notification contract, data path, safety invariants, artifact-path gap, implementation prerequisites, and release gates are documented.

This phase does **not** claim that SEPHIA has been integrated into a runnable OTP 2.0 test deployment. The critical artifact-path gap remains for Phase 2. No deployment is expected while the Vercel project is paused.
