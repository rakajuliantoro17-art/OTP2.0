# SEPHIA Stage 21 — Local Digital-Human Portrait Asset

**Branch:** `feature/sephia-module`  
**Status:** original same-origin SVG portrait added and wired into the Panitia host  
**Scope:** local visual asset, preload behavior, fallback isolation  
**Safety:** no remote image/font/script, no identity inference, no student data, no OTP changes

## Implemented

- Added `sephia/assets/avatar-sephia.svg`, an original stylized semi-realistic portrait of an adult Indonesian woman with a calm, professional expression and a subtle cyan-violet holographic frame.
- The Panitia host explicitly supplies `avatarAssetUrl: "/sephia/assets/avatar-sephia.svg"`.
- The avatar image is preloaded eagerly from the same origin so the first listening/speaking interaction is less likely to show an empty portrait.
- The renderer continues to reject remote artwork URLs.
- The portrait remains hidden until SEPHIA is manually activated and enters listening/speaking state; disabling the visualizer hides it.
- If the SVG cannot load, the existing CSS face remains as a fallback and the host dashboard continues to function.
- CI checks the host asset path and ensures the SVG contains no remote image, font, or script dependencies.

## Visual direction

The portrait is an original vector illustration, not a photograph or a likeness of a real person. It uses mature facial proportions, natural skin/hair shading, professional clothing, and restrained holographic accents. This is the first local artwork version for the project, not a claim of photorealistic rendering.

## Remaining visual acceptance

1. Review the portrait on the actual Panitia monitor for crop, scale, contrast, and visual fit.
2. Decide whether the vector illustration meets the intended semi-realistic style or should be replaced with a higher-fidelity approved portrait.
3. Verify responsive placement and reduced-motion behavior in Chrome.
4. Implement true phoneme/audio-timed lip synchronization only after the final voice asset and timing strategy are approved.

## Release boundary

The SVG is now bundled and wired, but actual Chrome workstation acceptance and final owner visual approval remain pending. No merge to `main` or deployment is performed by this stage.
