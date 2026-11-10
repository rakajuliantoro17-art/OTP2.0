# SEPHIA Stage 19 — Optional Production Audio Host Wiring

**Branch:** `feature/sephia-module`  
**Status:** host wiring implemented; production audio remains disabled by default  
**Scope:** select the local bundled audio adapter through an explicit host configuration  
**Safety:** no notification contract, OTP behavior, Firebase Rules, Moodle, or network API changes

## Implemented

- Panitia host bridge accepts an optional `announcementAssetUrl` configuration.
- When the value is omitted (the default), the existing strict local Indonesian browser TTS adapter remains selected for diagnostics.
- When a same-origin bundled WAV path is explicitly supplied, the host selects `createLocalAudioAnnouncementAdapter`.
- The audio adapter still permits only the exact approved generic announcement and rejects remote, protocol-relative, traversal, non-WAV, query, fragment, and encoded paths.
- Invalid audio configuration fails closed during SEPHIA mounting. The existing Panitia host loader catches the failure, so the dashboard remains usable.
- Adapter cancellation/disposal is exercised through the existing notification speech controller lifecycle.

## Production default

The host bridge intentionally does **not** set `announcementAssetUrl`. This prevents a missing or unapproved file from being treated as a production voice. The default remains the browser-local TTS diagnostic adapter until the final audio asset passes the voice, consent, licensing, and workstation acceptance gates.

After approval, the only required host configuration is a path such as:

```js
announcementAssetUrl: "/sephia/assets/sephia-announcement.wav"
```

The file must actually exist in the deployed repository at that exact path. Do not add this configuration before the file is committed and verified.

## Automated verification

The Stage 19 host wiring tests cover:
- explicit configuration selects the local audio adapter;
- the approved generic sentence is the only accepted text;
- the bundled same-origin asset path is used;
- playback resolves on the media `ended` event;
- bridge disposal stops audio;
- path traversal is rejected during mount.

## Remaining release blockers

1. Final adult feminine Indonesian audio file, consent and license evidence.
2. Two-listener blind audition and target Panitia PC playback test.
3. Final semi-realistic avatar artwork; current CSS portrait is still a placeholder.
4. Audio-timed lip synchronization.
5. Chrome on-device wake-word support and microphone permission test on the Panitia PC.
6. WAV asset production, consent/license verification, and human audition (Stage 20).
7. Live host staging acceptance and production/Vercel configuration verification.

No claim of production-ready voice or avatar is made by this stage.
