# SEPHIA Module Architecture

**Status:** Stage 7 Panitia host bridge integrated on feature branch; Stage 8 static checks and browser-ESM build pipeline added  
**Scope:** OTP 2.0 Panitia browser only  
**Runtime activation:** bridge loads after dashboard components; reader remains OFF until manual activation

## 1. Design principles

1. OTP 2.0 remains the source of truth.
2. SEPHIA is a passive consumer of rendered Panitia notifications.
3. The observer boundary is exactly `#alertList`; no document-wide observer.
4. Only events with a stable ID, visible message, and trusted numeric violation count >= 27 qualify.
5. No inference when metadata is missing or malformed.
6. No Firebase/API/database/Moodle/OTP control access from SEPHIA.
7. No persistent memory, event archive, audio archive, or transcript archive.
8. Failure or deactivation of SEPHIA must not affect OTP monitoring or submission.
9. Optional capabilities (TTS, microphone, avatar, visualizer) must be isolated behind adapters and must fail independently.
10. No auto-activation after page load, refresh, or browser reopen.

## 2. Module boundaries

```text
OTP 2.0 Panitia host
  #alertList
      |
      | rendered DOM + explicit data attributes only
      v
SEPHIA DOM adapter
  src/adapters/dom-alert-observer.js
      |
      v
Core contract
  src/core/notification-contract.js
      |
      v
SEPHIA runtime lifecycle
  src/runtime/create-sephia-runtime.js
      |
      +--> audio announcement controller (optional)
      +--> visualizer and controls (optional)
      +--> avatar presentation renderer (optional)
```

### Core — `src/core/`

Pure rules and normalized data contracts. No browser UI, network, storage, TTS, or OTP dependencies.

### Adapters — `src/adapters/`

Narrow integration with the host DOM. An adapter may observe only the explicitly passed `#alertList` node and the three approved metadata attributes.

### Runtime — `src/runtime/`

Explicit activation/deactivation and session-local duplicate prevention. Runtime must not self-start and must clear its in-memory event IDs when stopped.

### Visualizer and controls — `src/visual/`

`visual-state.js` owns a small, non-persistent state model. `mount-sephia-controls.js` mounts controls only into an explicitly supplied container, uses DOM APIs/text nodes, and never searches the host document. The visualizer can be disabled independently without stopping the reader. Reduced-motion and visible keyboard focus are supported. The host supplies the explicit header mount. The Panitia dashboard has no account login; do not invent user-session or logout semantics.

### Avatar renderer — `src/visual/mount-sephia-avatar.js`\n\nMounts only into an explicitly supplied container. It remains hidden unless the service is active and the visual state is listening or speaking, and is also hidden when the visualizer is disabled. Optional artwork must use a same-origin relative path; absent or failed artwork falls back to a CSS placeholder. The placeholder is not the final approved digital-human asset. Mouth activity requires both the speaking visual state and an injected speech controller reporting `isSpeaking === true`; this is a simple activity cue, not phoneme-aligned lip-sync.\n\n### Audio controller — `src/audio/announcement.js`

Uses a fixed approved announcement, accepts only normalized violation events, cancels the prior utterance when a newer event arrives, and contains provider failures. A concrete provider is intentionally not bundled until local-only processing is verified on the target browser/OS. Microphone and wake-word remain future gated capabilities.

## 3. Host notification contract

Each rendered `.alert-item` may expose:

| Attribute | Requirement | Purpose |
|---|---|---|
| `data-sephia-event-id` | Required, stable, non-empty | Duplicate prevention |
| `data-sephia-event-type` | Required, exact `violation` | Event qualification |
| `data-sephia-violation-count` | Required integer >= 27 | Qualification |

The message must be visible as text within the item. The host must populate these attributes from the authoritative alert payload. Client-provided or inferred values are not trusted.

The host metadata path is implemented on the isolated `feature/sephia-module` branch: server-originated alert payloads carry the numeric count, and the Panitia listener adds the Firebase child key to the newly rendered alert. Only counts 27–30 receive SEPHIA attributes. The Panitia dashboard has no account login; SEPHIA does not infer identity or add a session model. The bridge uses page lifecycle cleanup and manual activation. This is not deployed.

## 4. Lifecycle

- Initial state: inactive.
- Activation: explicit Panitia action only.
- Active: observe only new DOM mutations under `#alertList`.
- Duplicate: ignore an event ID already handled in the current active session.
- Deactivation: disconnect observer and clear in-memory duplicate IDs.
- Refresh/reopen: inactive; no replay of existing alerts.
- Page exit: lifecycle binding stops the runtime and clears in-memory event IDs. There is no account login or authenticated session expiry hook in this dashboard.
- Fatal reader failure: stop SEPHIA only; never block host alert rendering.

There is no Panitia account-login or authenticated session hook in the inspected host. SEPHIA therefore does not pretend to bind to a user identity. The page lifecycle helper stops the runtime on page exit; URL secrecy is not authentication. See [Host Integration](./HOST-INTEGRATION.md).

## 5. Error isolation

- Missing root: refuse activation.
- Missing MutationObserver: refuse activation and report to host diagnostics only.
- Missing/invalid metadata: ignore the event.
- Missing message text: ignore the event.
- TTS unavailable: future visual-only/notification-only fallback; no repeated speech.
- Visualizer failure: disable visual layer only.
- Runtime failure: stop SEPHIA and preserve host page behavior.

No errors should be thrown into the OTP event listener or prevent alert rendering. The Stage 8 static checker rejects network APIs, persistent browser storage, dynamic code evaluation, and microphone access in SEPHIA source.

## 6. Compatibility and versioning

- Keep the public runtime API small: `activate()`, `deactivate()`, `dispose()`, `isActive`.
- Stage 8 build validates relative imports, emits browser ES modules to `dist/`, and records SHA-256 hashes in `manifest.json`.
- Keep the notification contract versioned in documentation before changing attributes or qualification rules.
- Preserve `src/notification-reader.js` as a compatibility entry point until imports are migrated.
- Do not couple module version numbers to OTP application version numbers.
- Breaking contract changes require tests, migration notes, and explicit approval. `npm run build` validates local relative imports, copies the browser ES modules to `dist/`, and generates a SHA-256 manifest.

## 7. Security notes

DOM attributes are not inherently secure. Their trustworthiness depends on the host renderer sourcing them from the authoritative server payload and preventing untrusted client input from setting them. Avatar assets must remain same-origin; do not load remote avatar or animation services. Do not add Firebase credentials, TOTP secrets, API keys, or authentication tokens to this module.
