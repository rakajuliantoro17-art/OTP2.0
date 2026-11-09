# SEPHIA Module Architecture

**Status:** modular notification reader and isolated speech-controller foundation in development  
**Scope:** OTP 2.0 Panitia browser only  
**Runtime activation:** manual only; not connected to the host dashboard

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
      +--> future avatar renderer (optional)
```

### Core — `src/core/`

Pure rules and normalized data contracts. No browser UI, network, storage, TTS, or OTP dependencies.

### Adapters — `src/adapters/`

Narrow integration with the host DOM. An adapter may observe only the explicitly passed `#alertList` node and the three approved metadata attributes.

### Runtime — `src/runtime/`

Explicit activation/deactivation and session-local duplicate prevention. Runtime must not self-start and must clear its in-memory event IDs when stopped.

### Visualizer and controls — `src/visual/`

`visual-state.js` owns a small, non-persistent state model. `mount-sephia-controls.js` mounts controls only into an explicitly supplied container, uses DOM APIs/text nodes, and never searches the host document. The visualizer can be disabled independently without stopping the reader. Reduced-motion and visible keyboard focus are supported. The host remains responsible for trusted header placement and session-expiry/logout deactivation.

### Audio controller — `src/audio/announcement.js`

Uses a fixed approved announcement, accepts only normalized violation events, cancels the prior utterance when a newer event arrives, and contains provider failures. A concrete provider is intentionally not bundled until local-only processing is verified on the target browser/OS. Microphone and wake-word remain future gated capabilities.

## 3. Host notification contract

Each rendered `.alert-item` may expose:

| Attribute | Requirement | Purpose |
|---|---|---|
| `data-sephia-event-id` | Required, stable, non-empty | Duplicate prevention |
| `data-sephia-event-type` | Required, exact `violation` | Event qualification |
| `data-sephia-violation-count` | Required integer >= 27 | Qualification |

The message must be visible as text within the item. The host must populate these attributes from the authoritative alert payload. Client-provided or inferred values are not trusted.

The host metadata path is now implemented on the isolated `feature/sephia-module` branch: server-originated alert payloads carry the numeric count, and the Panitia listener adds the Firebase child key to the newly rendered alert. Only counts 27–30 receive SEPHIA attributes. This is not deployed. Runtime activation remains blocked until the Panitia session lifecycle is verified.

## 4. Lifecycle

- Initial state: inactive.
- Activation: explicit Panitia action only.
- Active: observe only new DOM mutations under `#alertList`.
- Duplicate: ignore an event ID already handled in the current active session.
- Deactivation: disconnect observer and clear in-memory duplicate IDs.
- Refresh/reopen: inactive; no replay of existing alerts.
- Panitia session expiry/logout: host must call runtime deactivation; do not infer authentication from URL or DOM visibility.
- Fatal reader failure: stop SEPHIA only; never block host alert rendering.

The repository audit did not find a verified Panitia authentication/session lifecycle hook. Session binding remains an integration blocker, not something the module should guess. See [Host Integration](./HOST-INTEGRATION.md) for the current data path and verification checklist.

## 5. Error isolation

- Missing root: refuse activation.
- Missing MutationObserver: refuse activation and report to host diagnostics only.
- Missing/invalid metadata: ignore the event.
- Missing message text: ignore the event.
- TTS unavailable: future visual-only/notification-only fallback; no repeated speech.
- Visualizer failure: disable visual layer only.
- Runtime failure: stop SEPHIA and preserve host page behavior.

No errors should be thrown into the OTP event listener or prevent alert rendering.

## 6. Compatibility and versioning

- Keep the public runtime API small: `activate()`, `deactivate()`, `dispose()`, `isActive`.
- Keep the notification contract versioned in documentation before changing attributes or qualification rules.
- Preserve `src/notification-reader.js` as a compatibility entry point until imports are migrated.
- Do not couple module version numbers to OTP application version numbers.
- Breaking contract changes require tests, migration notes, and explicit approval.

## 7. Security notes

DOM attributes are not inherently secure. Their trustworthiness depends on the host renderer sourcing them from the authoritative server payload and preventing untrusted client input from setting them. Do not add Firebase credentials, TOTP secrets, API keys, or authentication tokens to this module.
