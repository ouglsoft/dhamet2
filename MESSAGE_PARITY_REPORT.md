# Dhamet2 messages and modals parity report

Release: `20260725-messageparity1`

## Exact primary modules

- `js/modal.js`
- `js/ui/dropdown-view.js`
- `js/ui/soufla-view.js`

These files match the primary application by SHA-256.

## Translation parity

For each of Arabic, English and French:

- 397 primary message leaves are present.
- No primary message key is missing.
- Two additional technical keys remain: `errors.render3d.failed` and `online.errors.joinFailed`.
- Five existing messages use Firebase anonymous-session wording: `status.onlineInitHelp`, `online.permissionDenied`, `online.authRestoreFailed`, `online.errors.authRequired`, and `online.errors.inviteWriteDenied`.

## Modal and message behavior matched

- Nickname and room-name prompts.
- Incoming invitation and active-match-before-invite choices.
- Undo request, waiting and rejection flow.
- Soufla decisions and explanations.
- Text chat labels.
- Detailed voice failure reasons.
- Online settings rows and apply feedback.
- Online match-end presentation and single confirmation button.
- Hidden invitation lifecycle records in the visible game log.

## Necessary differences

Firebase transport, anonymous authentication and return-to-primary-mode navigation remain specific to the backup architecture.

No Firebase console or RTDB rule update is required.
