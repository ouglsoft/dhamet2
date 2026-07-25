# Changes

## 2026-07-25 — messageparity1

- Replaced the backup translation dictionary with the primary Arabic, English and French message dictionary.
- Retained only two backup-only technical messages and five Firebase-anonymous-session wording overrides.
- Matched the primary invite, active-match, nickname, room-name, undo, Soufla, chat, voice, settings and post-match modal behavior.
- Removed backup-only game-over, invitation-rejection, chat-button, AI-settings and visible invite-log messages.
- Added the primary dropdown and Soufla modal modules byte-for-byte.
- Added message/modal parity regression tests and release-specific cache busting.

## 2026-07-25 — rulesparity1

- Copied the primary shared state, turn-resolution, move, Soufla, control, result, and match-end modules byte-for-byte.
- Added a Firebase compatibility runtime that applies the primary forced-opening, capture-chain, deferred-promotion, Soufla, terminal-result, snapshot, and turn-history behavior.
- Matched the primary undo policy, including last-mover ownership and opening/capture-chain restrictions.
- Preserved canonical opening and promotion fields in Firebase synchronization.
- Added exact SHA-256 rule-reference tests and behavioral regression tests.
- Retained the previously verified primary UI CSS, icons, and visible DOM parity.
- Updated automatic deployment and browser cache versions to `20260725-messageparity1-<commit>`.

# التغييرات الرئيسية

## محذوف

- تسجيل الدخول والتسجيل واستعادة كلمة المرور وGoogle Sign-in.
- لوحة التحكم والملف الشخصي والتصنيف والنتائج الدائمة.
- اللعب ضد الحاسوب ومحرك AI وAI worker.
- التدريب وملفات ONNX وعمليات الصيانة القديمة.
- Cloudflare Pages Function الخاصة بـTURN والصوت المعتمد عليها.
- صفحات وملفات وموارد الواجهات المحذوفة.

## باقٍ

- Anonymous Authentication التلقائي.
- اللوبي والحضور والدعوات والغرف والمشاهدة.
- اللعب المباشر والمزامنة وإعادة الاتصال.
- الدردشة النصية والتراجع والصوفلة والاستسلام.
- قواعد ظامت ولوحة اللعب ثنائية وثلاثية الأبعاد.

## منقول من النسخة الأحدث

- `shared/dhamet-rules.js` و`shared/dhamet-utils.js` الأحدث.
- تطبيق الحركة وتصنيف الأخذ من محرك القواعد المشترك.
- حساب أطول سلسلة أخذ وإجبارية الأخذ.
- خيارا النقلة الرابعة في الافتتاح الإجباري، وإلزام النقلة السادسة بالخيار المتبقي.
- الترقية المؤجلة بدل الترقية الفورية.
- كشف الصوفلة وفق مجموعة المخالفين العالمية الأحدث.
- التعادل عند بقاء ملك واحد لكل طرف، وفحص انعدام النقلات القانونية.

## قواعد RTDB

ملف القواعد القديمة لم يظهر ضمن الملفات المرفقة؛ لذلك أنشئت قواعد جديدة وفق مسارات الكتابة الفعلية في الشفرة، مع إغلاق مسارات الحسابات والتصنيف والنتائج.

## 2026-07-24 — Primary-interface parity

- Replaced the backup color system, typography, cards, buttons, board shell, lobby panels, modals and responsive layout with the current primary Dhamet interface layer.
- Rebuilt the lobby and game markup from the primary application's current structures while keeping Firebase anonymous authentication and RTDB gameplay unchanged.
- Removed every visible emergency/anonymous/unranked banner and backup-specific meta message.
- Added the primary desktop topbar, language selector, legal links and mobile shell behavior.
- Added the primary phone portrait and landscape layout engine, including orientation handling and the game drawer/header/control placement.
- Synchronized the primary Arabic, English and French UI messages, preserving only backup-only fallback keys required by the Firebase runtime.
- Added voice control buttons supported by the existing Firebase RTC paths.
- Preserved the two-page deployment: lobby and game only.


## 2026-07-25 stabilityfix1
- Restored desktop online action buttons when the PvC box is absent.
- Made the mobile capture timer tile clickable through the real end-capture button.
- Switched anonymous auth persistence to tab/session scope and bounded auth operations.
- Started the lobby watchdog before Firebase initialization and made stale-room recovery non-blocking.
- Removed Firebase writes from unload handlers to prevent browser-wide freezes.


## 20260725-messageparity1
- Desktop controls are pre-mounted in visible rows.
- Mobile capture timer uses delegated pointer/click activation.
- Active online games recover stale UI hold classes.
- CSS and asset cache headers added.
- All page URLs use build `20260725-messageparity1`.

## 20260725-messageparity1

- Added GitHub Actions production deployment after every push to `main`.
- Added manual `workflow_dispatch` deployment.
- Added explicit validation for Cloudflare account ID, API token, and Pages project name.
- The workflow runs all tests, builds `_site`, validates the output, and deploys through Wrangler.
- Updated all browser cache-busting references and `version.json` to `20260725-messageparity1`.
- Each deployment now receives a unique cache version derived from the Git commit SHA.
