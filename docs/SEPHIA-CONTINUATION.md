# SEPHIA — Continuation and Handoff Guide
**Purpose:** preserve continuity across separate ChatGPT conversations and project workspaces, including future continuation through the PINTUKU project.

## Read order for every new session

1. Read this file first: `docs/SEPHIA-CONTINUATION.md`.
2. Read `docs/SEPHIA-BLUEPRINT.md` for the approved product decisions.
3. Read `docs/SEPHIA-TECHNICAL-SPEC.md` for the integration boundary and technical requirements.
4. Inspect the current repository branch and source files before making any claim about implementation status.
5. Compare the current code against the documents; code may have changed since this snapshot.

Canonical repository: https://github.com/rakajuliantoro17-art/OTP2.0  
Canonical documentation branch: `docs/sephia-blueprint`  
Original default branch at the time of documentation: `main`.

## Project identity

- Project: SEPHIA for SMANSASOO CBT LOCK / OTP 2.0.
- SEPHIA is a restricted browser notification reader for Panitia.
- It reads only the designated visible notification element and announces qualifying violation notifications above 26 (27+; intended OTP 27–30).
- It does not operate OTP 2.0.
- OTP 2.0 remains the source of truth and must continue functioning if SEPHIA is disabled or crashes.

## Mandatory scope guard

Do not expand the project into:
- full dashboard assistant;
- system analytics or diagnosis;
- mitigation recommendations;
- general student monitoring;
- OTP generation, validation, unlock, revocation, or auto-submit control;
- Firebase/database/API/server/terminal access;
- background daemon or desktop companion unless separately authorized.

Do not reintroduce features that the user explicitly removed. The user narrowed SEPHIA to reading the existing browser notification and giving a short instruction.

## Working style expected by the user

- Continue autonomously from already settled decisions.
- Do not ask the user to repeat decisions already recorded in these documents or earlier project conversations.
- Do not present repetitive batches of multiple-choice questions for matters already decided.
- When a detail is unspecified, first make a conservative technical recommendation consistent with the approved scope.
- Ask only when a genuine product decision, safety trade-off, or irreversible action is required.
- Clearly distinguish approved decisions, technical recommendations, assumptions, and blockers.
- Give an actionable next step, not generic progress updates.
- The user prefers Indonesian responses, precise technical language, objective risk assessment, and explicit limitations.
- Never claim that a feature is implemented when it is only designed.

## Decision hierarchy

When sources conflict, use this order:
1. The user's latest explicit instruction in the active conversation.
2. The approved decisions in `SEPHIA-BLUEPRINT.md`.
3. The technical constraints in `SEPHIA-TECHNICAL-SPEC.md`.
4. Older exploratory discussion, only if it does not conflict with the above.
5. Repository code as evidence of current implementation, not as authority to change the approved product scope.

If an older choice is superseded, do not reopen it as an unanswered question. Explain the conflict and apply the latest decision.

## Current implementation status (documentation snapshot)

- Product design: documented.
- Technical integration design: documented.
- Repository audit: partial/read-only.
- SEPHIA source code: not implemented by this documentation work.
- OTP source code: not modified by this documentation work.
- Moodle configuration: not modified.
- Firebase/database: not modified.
- Production deployment: not performed.

Repository audit findings that must be remembered:
- Panitia visible notification list currently mounts as `#alertList`.
- The current renderer creates `.alert-item` and `.alert-msg` nodes.
- Current Firebase alert listener emits `alert:new` but does not pass Firebase snapshot key into the rendered DOM.
- Current alert list contains non-violation messages too; reading all of it would be wrong.
- Current backend can emit violation alerts for selected critical types before count 27; SEPHIA must independently filter count >=27.
- The current code has a client-side hard-coded secret in Moodle injection; treat it as exposed and do not copy the literal into new documents or code.
- The active production path and session/logout lifecycle are not yet fully verified.
- Browser background/locked-device audio operation is not guaranteed and must be tested.

## Next autonomous task

The next task is **Phase 0: complete read-only audit**, not implementation.

Audit only the minimum required files and report:
1. What creates the visible Panitia notification.
2. Which runtime path is actually active (Firebase or local monitor).
3. Exact DOM selector and how it behaves on page/component changes.
4. Whether each alert has a stable ID available to the rendered node.
5. How violation count and event type can be verified from the visible notification.
6. Where Panitia login/session expiry/logout is enforced.
7. Which browser/OS/device constraints affect background operation, microphone, and TTS.
8. Security issue remediation plan for the client-side secret, without changing it.
9. The smallest future code changes needed to expose metadata on the existing rendered notification, without granting SEPHIA wider access.

Output:
- audit findings;
- evidence with file paths and exact code locations;
- risk classification;
- minimal implementation plan;
- staging acceptance checklist;
- explicit statement that no code was changed.

## Rules for PINTUKU continuation

PINTUKU may be used as the workspace from which the user resumes or coordinates SEPHIA work, but it must not become an implicit integration target.

When continuing SEPHIA from a PINTUKU conversation:
- load this handoff file and the two companion documents from the OTP2.0 repository;
- keep OTP2.0 as the canonical repository and source of truth;
- do not copy or embed SEPHIA code into PINTUKU unless the user explicitly requests a separate PINTUKU integration;
- do not couple PINTUKU authentication, data, or deployment to OTP 2.0;
- do not assume that the same UI, session, or permissions apply in PINTUKU;
- record any future cross-project integration as a separate architecture decision.

## Change authorization

This documentation does not authorize:
- code edits;
- branch merge;
- commit to `main`;
- deployment to Vercel;
- Moodle Additional HTML changes;
- Firebase rules/schema changes;
- secret rotation or server configuration changes.

Before any implementation, obtain explicit authorization for the named stage. A user request to continue planning is not permission to deploy.
