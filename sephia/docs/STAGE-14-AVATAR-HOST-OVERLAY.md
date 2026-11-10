# SEPHIA Stage 14 — Panitia Avatar Overlay

**Branch:** `feature/sephia-module`  
**Scope:** explicit avatar mount in Panitia topbar and isolated presentation lifecycle  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Implemented

- Added one explicit `#sephiaAvatarMount` next to the existing `#sephiaControlMount` in the Panitia topbar.
- The host bridge resolves only the explicit avatar mount; it does not scan the document.
- Avatar follows the shared SEPHIA visual state and speech-controller state.
- It is hidden by default, hidden while inactive/standby/limited/error, and appears only during a listening or speaking interaction.
- The existing visualizer-disable control also hides the avatar without stopping the runtime.
- The overlay uses a fixed, responsive, dark holographic surface with cyan/violet accents and reduced-motion support.
- The avatar renderer is optional. A missing mount or renderer/asset failure is contained and must not prevent Panitia controls, notification observation, or OTP dashboard operation.
- Artwork paths must be same-origin and relative. Remote image URLs are rejected.

## Visual asset status

Stage 21 adds an original same-origin SVG portrait at `/sephia/assets/avatar-sephia.svg` and the Panitia host supplies that path to the renderer. The portrait is an original stylized vector illustration of an adult woman, not a photograph or a likeness of a real person. It is the first local artwork version; final visual approval on the target Panitia monitor remains pending.

The CSS-generated geometric face is retained only as a loading/error fallback. It is a placeholder, not the approved final portrait. If the SVG fails to load, the fallback is shown and the dashboard continues to work.

Mouth movement is a short speaking-state cue only. It is not phoneme-aligned lip synchronization. True audio-timed lip synchronization remains incomplete.

## Lifecycle and failure policy

- Initial state remains OFF.
- Avatar is not a separate activation surface; it follows the one SEPHIA control.
- Deactivation, pagehide, and bridge disposal remove the avatar and its state subscription.
- Avatar rendering errors are reported to the host but do not disable the runtime.
- No avatar image is loaded from a third-party host.
- No identity, student data, or notification content is rendered in the avatar.

## Verification

Automated checks cover the explicit mount, same-origin asset policy, local SVG presence, visual-state visibility, visualizer coupling, and failure isolation. They do not establish appearance, frame rate, crop, or contrast on the actual Panitia PC; Chrome workstation acceptance is still pending.

## Remaining acceptance

1. Review portrait scale, crop, contrast, and visual fit on the actual Panitia monitor.
2. Confirm the stylized vector portrait meets the intended semi-realistic direction or replace it with a higher-fidelity approved asset.
3. Verify responsive layout and reduced-motion behavior in Chrome.
4. Implement true phoneme/audio-timed lip synchronization after the final voice asset and timing strategy are approved.
5. Complete real Panitia Chrome acceptance before considering release.

## Release boundary

This is a feature-branch implementation milestone only. It has not been merged into `main`, deployed, or tested on the actual Panitia workstation.
