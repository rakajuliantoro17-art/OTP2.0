# SEPHIA Stage 14 — Panitia Avatar Overlay

**Branch:** \`feature/sephia-module\`  
**Scope:** explicit avatar mount in Panitia topbar and isolated presentation lifecycle  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Implemented

- Added one explicit \`#sephiaAvatarMount\` next to the existing \`#sephiaControlMount\` in the Panitia topbar.
- The host bridge resolves only the explicit avatar mount; it does not scan the document.
- Avatar follows the shared SEPHIA visual state and speech-controller state.
- It is hidden by default, hidden while inactive/standby/limited/error, and appears only during a listening or speaking interaction.
- The existing visualizer-disable control also hides the avatar without stopping the runtime.
- The overlay uses a fixed, responsive, dark holographic surface with cyan/violet accents and reduced-motion support.
- The avatar renderer is optional. A missing mount or renderer/asset failure is contained and must not prevent Panitia controls, notification observation, or OTP dashboard operation.
- Any final artwork path must be same-origin and relative. Remote image URLs are rejected.

## Visual asset status

The current face is a CSS-generated geometric placeholder. It is **not** the approved semi-realistic adult feminine digital-human artwork. No external portrait URL is loaded and no unlicensed model/image has been embedded. The renderer accepts a future same-origin image asset through \`avatarAssetUrl\`, but the Panitia host currently does not provide one.

Mouth movement is a short speaking-state cue only. It is not phoneme-aligned lip synchronization. Both final portrait artwork and phoneme/audio-timed lip synchronization remain incomplete acceptance items.

## Lifecycle and failure policy

- Initial state remains OFF.
- Avatar is not a separate activation surface; it follows the one SEPHIA control.
- Deactivation, pagehide, and bridge disposal remove the avatar and its state subscription.
- Avatar rendering errors are reported to the host but do not disable the runtime.
- No avatar image is loaded from a third-party host.
- No identity, student data, or notification content is rendered in the avatar.

## Verification

Automated checks cover the explicit mount, same-origin asset policy, visual-state visibility, visualizer coupling, and failure isolation. They do not establish the appearance or frame rate on the actual Panitia PC; Chrome workstation acceptance is still pending.

## Remaining acceptance

1. Supply and review the final semi-realistic adult feminine portrait asset.
2. Verify overlay placement on the actual Panitia monitor and responsive layout.
3. Verify animation performance and reduced-motion behavior in Chrome.
4. Integrate true phoneme/audio-timed lip synchronization only after a compliant local speech engine exposes timing data.
5. Complete real Panitia Chrome acceptance before considering release.

## Release boundary

This is a feature-branch implementation milestone only. It has not been merged into \`main\`, deployed, or tested on the actual Panitia workstation.
