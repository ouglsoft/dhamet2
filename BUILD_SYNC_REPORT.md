# Dhamet2 rules parity release

Release: `20260725-messageparity1`

This release keeps the primary-interface parity from `uiparity1` and synchronizes the backup game's rules and control behavior with the primary OuglSoft Dhamet application.

Validation:

- Nine primary shared rule/control modules match the primary application by SHA-256 and byte size.
- Forced opening, movement, longest capture, deferred promotion, Soufla, terminal results, and undo policy are covered by regression tests.
- Firebase payloads preserve the canonical rule state without adding fields forbidden by the current RTDB schema.
- Primary CSS, icon assets, and visible lobby/game DOM parity continue to pass.
- GitHub Actions generates `20260725-messageparity1-<commit>` for every deployment.
- The production `_site` build passes.
