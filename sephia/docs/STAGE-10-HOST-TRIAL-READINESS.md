# SEPHIA Stage 10 — Host Integration Trial Readiness

**Status:** browser host-bridge fixture assembled; automated verification pending CI  
**Branch:** `feature/sephia-module`  
**Production:** no merge, no deployment, no Firebase/Moodle/OTP configuration changes

## 1. Objective

Stage 10 closes the gap between the Stage 9 runtime fixture and the actual Panitia host bridge. The new browser fixture imports the built `dist/host/mount-panitia-sephia.js` entrypoint and mounts it against synthetic DOM targets named exactly `#alertList` and `#sephiaControlMount`.

It tests the integration path without connecting to the Panitia dashboard or live services.

## 2. What was added

- `staging/panitia-host.html`: isolated browser page with the exact host mount IDs.
- `staging/panitia-host-fixture.js`: imports the built host bridge and sends synthetic alert DOM mutations.
- The host bridge accepts an optional `onNotification` callback. The production default remains a no-op; no audio provider is attached.
- The callback receives only events already normalized by the notification contract: stable ID, event type, numeric count, and visible message text.
- The fixture logs only synthetic event ID/count, and contains no real student identity.
- The Stage 10 verifier validates imports from both staging pages against `dist/` and the SHA-256 manifest.

## 3. Run locally

From the `sephia/` directory on Node.js 22:

```bash
npm test
npm run check
npm run build
npm run verify:staging
python -m http.server 4173 --bind 127.0.0.1
```

Open the runtime fixture:

```
http://127.0.0.1:4173/staging/
```

Open the host bridge fixture:

```
http://127.0.0.1:4173/staging/panitia-host.html
```

Both URLs are loopback-only and must be opened on the same PC running the static server.

## 4. Host bridge acceptance matrix

| ID | Action | Expected result |
|---|---|---|
| H10-01 | Open host fixture | Bridge mounts; SEPHIA is OFF |
| H10-02 | Add count 26 while OFF | Alert visible; no callback |
| H10-03 | Activate then add count 26 | Alert visible; ignored |
| H10-04 | Add counts 27, 28, 29, 30 while active | One normalized callback per unique event |
| H10-05 | Add count 31 | Alert visible; ignored |
| H10-06 | Duplicate last event ID | No second callback |
| H10-07 | Deactivate, then add count 27 | No callback |
| H10-08 | Refresh page | Starts OFF; no backlog replay |
| H10-09 | Inspect console | No uncaught SEPHIA errors |
| H10-10 | Inspect Network panel | Only loopback fixture requests; no Firebase/API/audio requests |
| H10-11 | Navigate away | Page lifecycle disposes the bridge |

The existing Stage 9 fixture remains the detailed runtime/audio-controller mock test. This Stage 10 fixture specifically validates the host bridge and normalized callback path.

## 5. Security and behavior boundaries

- Synthetic data only; no real Panitia or student information.
- No Firebase, API, server, Moodle, OTP, microphone, camera, geolocation, storage, or external AI access.
- The optional callback is an integration seam, not an audio provider.
- The Panitia production integration currently leaves the callback at its safe no-op default. It does not speak or expose notification details in another UI surface.
- Real TTS remains disabled until a local-only provider is independently verified.
- The Panitia dashboard has no account login. This stage does not invent authentication, roles, PINs, or user-session expiry.
- A secret URL is not authentication.

## 6. What Stage 10 does not prove

- Chrome acceptance on the actual Panitia PC.
- Live alert provenance or deployed Firebase read rules.
- Host CSP, JavaScript MIME type, server/network access restrictions, or deployed static paths.
- Audible local TTS, microphone, wake-word, avatar artwork, or lip-sync.
- Workstation-lock/background-tab guarantees or production performance.

## 7. Rollback

The new fixture is isolated under `sephia/staging/`. Stop the loopback server with Ctrl+C and close the browser tab. Revert only the Stage 10 fixture, verifier, and optional callback change on `feature/sephia-module` if required. Do not alter OTP thresholds, Firebase Rules, Moodle, or production configuration.

## 8. Release gate

Stage 10 is complete at repository/CI level only after the latest branch CI passes. Human browser acceptance must then be recorded on the Panitia PC. Only after both synthetic fixtures pass should the team prepare a separate non-production Panitia copy for live-host integration checks. No production deployment or merge is authorized by this stage.
