# SEPHIA Stage 4 — Visualizer & Controls Closeout

**Branch:** `feature/sephia-module`  
**Scope:** standalone Panitia control surface, visual state, holographic visualizer  
**Disposition:** isolated UI/state module implemented; host placement and session wiring remain gated  
**Production:** unchanged; no dashboard injection, merge, deployment, or automatic activation

## Completed

- [x] Added a small SEPHIA activation control suitable for an explicitly provided Panitia header/container mount point.
- [x] Activation is manual; the control reflects active/inactive state and exposes accessible button labels and pressed state.
- [x] Added state indicator colors for standby, speaking, error, and inactive states.
- [x] Added a restrained cyan/violet holographic bar visualizer.
- [x] Added a disclosure/settings control containing the visualizer enable/disable action.
- [x] Disabling the visualizer does not deactivate the notification reader/runtime.
- [x] Added reduced-motion support and keyboard-visible focus styles.
- [x] DOM is built using element APIs and `textContent`; no `innerHTML` or remote assets.
- [x] Styles are scoped to the SEPHIA class namespace and injected once per document.
- [x] Added visual-state and UI-control tests, including manual activation, deactivation, independent visualizer disable, and state updates.

## Not integrated

- [ ] No automatic insertion into `panitia/index.html` or the production header.
- [ ] No authentication/session-expiry/logout wiring.
- [ ] No avatar/digital-human renderer or lip-sync.
- [ ] No real local TTS provider or wake-word/microphone.
- [ ] No browser/device acceptance test has been run.

## Host integration requirements

The host must explicitly supply:
- a trusted Panitia header/container element;
- the verified runtime instance;
- a visual-state controller;
- a session-expiry/logout callback that deactivates runtime and visual state;
- a local speech adapter only after the Stage 3 privacy gate passes.

Do not find a mount point using a broad document search from the SEPHIA module. The host should pass the exact container. On account switch/logout/session expiry, host code must call `runtime.deactivate()` and `visualState.deactivate()`; no session is inferred by the visual component.

## Release decision

Stage 4 is closed as an **isolated visualizer/control module milestone**. It is not a production-ready Panitia dashboard integration. The next gate is host-side staging integration after the authentication/session boundary is verified. Keep all changes on `feature/sephia-module`.
