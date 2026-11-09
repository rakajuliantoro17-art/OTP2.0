# SEPHIA Stage 5 — Avatar Digital Human & Contextual Presentation

**Branch:** `feature/sephia-module`  
**Scope:** isolated avatar presentation component and interaction-state contract  
**Disposition:** renderer foundation implemented; final digital-human asset, phoneme lip-sync, and browser acceptance remain gated  
**Production:** unchanged; no host injection, merge, deployment, microphone, or external AI processing

## Approved visual identity

- Feminine adult digital human.
- Semi-realistic human appearance; not anime, mascot, or mechanical robot.
- Warm, calm, professional expression.
- Dark elegant futuristic presentation with cyan-violet accent lighting.
- Natural blinking, subtle head/body movement, and realistic mouth motion are desired, subject to asset/renderer feasibility.
- Avatar appears only during interaction/announcement, not permanently on the dashboard.

## Implemented renderer foundation

`src/visual/mount-sephia-avatar.js` provides:

- Explicit mount container; no broad document query.
- Optional same-origin relative avatar artwork path.
- Safe CSS fallback when no final artwork is supplied or an image fails to load.
- Hidden-by-default behavior.
- Visibility only while active and in listening/speaking states, and while the visualizer is enabled.
- Speech mouth activity only when both visual state is `speaking` and the injected speech controller reports `isSpeaking === true`.
- Reduced-motion support.
- Error containment and explicit disposal.
- No microphone, network, storage, external AI, or audio capture.

The CSS portrait is a **temporary loading placeholder**, not the approved final semi-realistic digital-human artwork. No final avatar image asset is bundled in this milestone.

## Animation boundary

The current mouth effect is a simple speaking-state indicator. It is **not phoneme-aligned lip-sync** and does not analyze audio samples. Natural facial expression, blinking, head motion, and reliable Indonesian phoneme lip-sync require a final artwork/animation approach and a verified local TTS engine that exposes timing/viseme data.

Do not claim lip-sync completion based only on a CSS mouth animation.

## Asset contract

- Store final avatar artwork under a local SEPHIA asset path.
- The renderer accepts only relative/same-origin paths; remote image URLs are rejected.
- Do not embed third-party trackers, remote image services, or externally hosted animation runtimes.
- Keep the avatar artwork optional: missing asset must fall back without breaking notification reading.
- Confirm image license/ownership before committing a final asset.

## Acceptance criteria

1. Final artwork matches the approved adult feminine semi-realistic persona.
2. Asset loads from the same origin and no external request is generated.
3. Avatar is hidden while inactive and in standby.
4. Avatar appears only during active listening/speaking interaction.
5. Mouth movement occurs only while the speech controller is actually speaking.
6. Mouth movement stops immediately when speech ends, fails, or is cancelled.
7. Visualizer OFF hides the avatar without stopping the notification reader.
8. Session expiry/logout deactivates runtime and hides/disposes avatar.
9. Reduced-motion preference disables animation.
10. Asset load failure leaves the rest of SEPHIA and OTP 2.0 unaffected.
11. Performance is measured on the target Panitia workstation/browser.
12. No microphone/audio/network/storage capability is added by the avatar renderer.

## Not yet verified

- Final digital-human artwork and asset license.
- Actual browser rendering across target workstation/browser combinations.
- Image decoding and GPU/memory impact on the Panitia workstation.
- Local TTS provider and phoneme/viseme timing.
- Session expiry/logout wiring.
- Integrated host placement.

## Release decision

Stage 5 may be considered complete only as an **isolated avatar-renderer foundation** after source tests pass. It is not a finished digital-human experience and is not production-ready. Final artwork and browser/device acceptance are separate gates.
