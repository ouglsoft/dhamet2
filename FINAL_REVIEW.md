# Final review — 20260725-messageparity1

The backup application remains online-only and Firebase-backed. Its common Arabic, English and French messages, modal engine, dropdowns, Soufla windows, settings window, invitation windows, undo windows, voice failures and game-over presentation now match the primary application.

Intentional differences retained:

1. Firebase anonymous-session errors use temporary-session wording instead of account sign-in wording.
2. Firebase join/write failures retain concise recovery instructions.
3. The legacy 3D renderer keeps its own failure fallback.
4. The final confirmation returns to the primary mode page because the backup has no mode page.

No Firebase rule, secret, authentication or console setting change is required.
