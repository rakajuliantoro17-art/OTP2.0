# SEPHIA Stage 6 — Access Boundary and Threat Model

## Actual Panitia access model

The Panitia dashboard does not have an account login. It is reached through a dedicated page whose URL is known to Panitia personnel. This is obscurity-based access, not authentication.

Consequences:
- Anyone who obtains, receives, or discovers the URL may be able to open the page, subject to any separate network/server restrictions.
- SEPHIA cannot identify the person viewing the page and must not claim that the active viewer is an authenticated Panitia user.
- A hidden URL is not a reliable authorization boundary and must not be used to protect student or operational data.
- Do not place credentials, API keys, OTP secrets, or other secrets in the URL or client-side source.
- URL secrecy can be one low-assurance operational friction only; it is not a substitute for server-side access control.

## Stage 6 approved lifecycle model

Because there is no login/logout/session-expiry event in the current host:
1. SEPHIA starts OFF on every document load.
2. A person who can open the dashboard must manually activate SEPHIA.
3. SEPHIA observes only the designated visible `#alertList` while active.
4. On manual OFF, pagehide, beforeunload, or document teardown, SEPHIA disconnects its observer and cancels speech.
5. Returning from browser back/forward cache does not reactivate SEPHIA. Manual activation is required again.
6. No identity, role, login state, or authenticated session is inferred from the URL, page contents, visibility, or network connectivity.

This is a page-lifecycle boundary, not a user-session boundary. It reduces stale runtime behavior but does not protect the dashboard from unauthorized visitors.

## Threat controls and residual risks

| Threat | Stage 6 control | Residual risk |
|---|---|---|
| URL forwarded or leaked | Explicitly document access limitation; recommend server/network access control | Unauthorized page access remains possible |
| SEPHIA runs after navigation/refresh | Manual OFF plus pagehide/beforeunload cleanup | Browser/OS crash may bypass graceful cleanup |
| Page restored from BFCache | No pageshow auto-activation | Operator must activate manually |
| Duplicate visible alert | Stable event ID deduplication within active runtime | Deduplication resets after deactivation/reload by design |
| Malformed or untrusted DOM metadata | Strict event type/count validation | DOM metadata is not a cryptographic trust boundary |
| Audio adapter failure | Contained error; visual/browser alert remains primary | Real local TTS not yet verified |
| SEPHIA runtime failure | Isolated module; no OTP control API | Host integration itself still needs staging verification |

## Production recommendation

Do not treat the secret URL as sufficient production security. Before enabling the dashboard broadly, the owner should choose at least one real access boundary appropriate to the school's network and data sensitivity, such as VPN/allowlisted network plus server-side authorization, or a proper authenticated gateway. Do not implement a new login or change server/network configuration as part of this Stage 6 work without separate approval.

Stage 6 can validate SEPHIA's isolated page-lifecycle behavior. It cannot certify the dashboard's access security.
