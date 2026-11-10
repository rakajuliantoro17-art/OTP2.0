# SEPHIA Stage 15 — Notification-to-Speech Pipeline

**Branch:** \`feature/sephia-module\`  
**Scope:** deterministic end-to-end runtime pipeline tests using synthetic DOM and an injected speech controller  
**Production:** unchanged; no merge, deployment, Firebase Rules, Moodle, or OTP behavior changes

## Verified contract

The Stage 15 tests connect the existing DOM observer and runtime to an injected speech controller. They verify:

- The runtime starts OFF and emits no speech before manual activation.
- Existing \`#alertList\` content is not replayed when activation occurs.
- Only newly inserted visible alert items inside the designated root are inspected.
- The observer forwards stable event ID, explicit \`violation\` type, safe integer violation count 27–30, and visible text.
- Invalid counts, missing IDs, and other event types are rejected.
- A stable event ID is announced only once during an active observer session.
- Deactivation stops the speech controller and disconnects observation.
- Reactivation does not scan or replay old DOM entries; only later inserted alerts are delivered.
- The tests use synthetic text and never contain real student identity.

## Important boundary

This verifies the notification event pipeline and injected speech-controller contract. It does not prove a real browser voice exists, the Panitia PC has microphone access, wake-word recognition is supported, or TTS output is audible. It also does not prove Firebase or server-side access controls.

## Release gate

The actual Panitia Chrome trial remains pending. It must be performed against a controlled test alert and a verified local Indonesian feminine TTS voice before enabling spoken notifications in operational use.
