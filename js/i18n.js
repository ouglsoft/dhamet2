(function () {
  const translations = {
  "ar": {
    "pages": {
      "cta": {
        "playNow": "ابدأ اللعب الآن"
      },
      "nav": {
        "rules": "القواعد",
        "privacy": "الخصوصية",
        "terms": "شروط الاستخدام",
        "contact": "تواصل معنا"
      },
      "navShort": {
        "privacy": "الخصوصية",
        "terms": "الشروط",
        "contact": "تواصل"
      },
      "footer": {
        "text": "© ${year} العُقل للبرمجيات / El Ougl Software SARL — جميع الحقوق محفوظة"
      }
    },
    "soufla": {
      "pick": {
        "toastNotOffender": "هذه القطعة ليست مسوفلة/مخالفة، اختر القطعة التي تجاهلت الأسر.",
        "title": "لديك حق السوفلة. اختر القطعة التي تجاهلت الأسر.",
        "btnRemove": "إزالة القطعة",
        "btnForcePath": "إجبارها على المسار ${n}"
      },
      "applied": {
        "force": "أُجبرت قطعة الخصم على تنفيذ مسار الأسر الصحيح.",
        "remove": "أُزيلت قطعة الخصم التي تجاهلت الأسر.",
        "self": "تم تطبيق السوفلة."
      },
      "sendFailed": "تعذر تطبيق السوفلة بسبب مشكلة في الاتصال. تحقق من الإنترنت ثم حاول مرة أخرى.",
      "summary": {
        "force": "اختار {actor} عقوبة السوفلة ضدك، وأجبرك على تنفيذ المسار المحدد على الرقعة باللون الأخضر.",
        "penaltyTitle": "العقوبة المختارة:",
        "reason": "طالب خصمك بالسوفلة لأن قطعتك تجاهلت الأسر المحدد بالمسار الأحمر.",
        "remove": "اختار {actor} عقوبة السوفلة ضدك، وأزال قطعتك الموجودة في الموضع المحدد بعلامة X الحمراء.",
        "title": "نتيجة السوفلة",
        "undo": "أُلغيت نقلتك الأخيرة، ويظهر مسارها باللون الأصفر."
      },
      "spectator": {
        "force": "اختار {actor} عقوبة السوفلة ضد {victim}، وأجبره على تنفيذ المسار المحدد على الرقعة باللون الأخضر.",
        "penaltyTitle": "العقوبة المختارة:",
        "reason": "طُلبت السوفلة لأن إحدى القطع تجاهلت الأسر المحدد بالمسار الأحمر.",
        "remove": "اختار {actor} عقوبة السوفلة ضد {victim}، وأزال قطعته الموجودة في الموضع المحدد بعلامة X الحمراء.",
        "title": "نتيجة السوفلة",
        "undo": "أُلغيت النقلة المخالفة، ويظهر مسارها باللون الأصفر."
      }
    },
    "pvp": {
      "voice": {
        "micOn": "كتم الميكروفون",
        "spkOn": "كتم الصوت",
        "failed": "فشل الاتصال",
        "failedTitle": "تعذر تشغيل الصوت",
        "failure": {
          "permission": "اسمح للموقع باستخدام الميكروفون، ثم حاول مرة أخرى.",
          "noDevice": "لم يُعثر على ميكروفون متاح.",
          "busy": "الميكروفون مستخدم في تطبيق آخر أو غير متاح الآن.",
          "unsupported": "المحادثة الصوتية غير مدعومة في هذا المتصفح.",
          "session": "تعذر بدء الصوت في هذه المباراة. أعد فتح المباراة ثم حاول مرة أخرى.",
          "service": "تعذر بدء الصوت بسبب مشكلة في الاتصال. تحقق من الإنترنت ثم حاول مرة أخرى.",
          "generic": "تعذر تشغيل المحادثة الصوتية. حاول مرة أخرى."
        },
        "micOff": "فتح الميكروفون",
        "spkOff": "فتح الصوت",
        "mic": "الميكروفون",
        "speaker": "الصوت"
      },
      "chat": {
        "empty": "لا توجد رسائل حاليًا.",
        "failed": "تعذر إرسال الرسالة. حاول مرة أخرى.",
        "placeholder": "اكتب رسالة...",
        "rateLimit": "انتظر ثانية قبل إرسال رسالة أخرى.",
        "title": "الدردشة الكتابية",
        "tooLong": "اختصر الرسالة إلى 200 حرف أو أقل."
      },
      "leave": "مغادرة المباراة"
    },
    "buttons": {
      "soufla": "سوفلة",
      "settings": "الإعدادات",
      "sync": "تحديث",
      "endKill": "إنهاء الأسر",
      "undo": "تراجع",
      "endMatch": "خروج"
    },
    "dashboard": {
      "showLeaderboard": "عرض الترتيب العام"
    },
    "settings": {
      "board2d": "ثنائي الأبعاد",
      "board3d": "ثلاثي الأبعاد",
      "dark": "داكن",
      "coords": "إظهار ترقيم النقاط",
      "boardStyle": "شكل الرقعة",
      "light": "فاتح",
      "theme": "الوضع البصري",
      "enabled": "مفعّل",
      "disabled": "غير مفعّل",
      "showCoords": "عرض الترقيم"
    },
    "modals": {
      "gameOver": {
        "title": "انتهت المباراة",
        "winner": "تهانينا لـ{player}، لقد فاز بالمباراة!",
        "draw": "مباراة متكافئة، انتهت بالتعادل.",
        "reason": {
          "noPieces": "نفدت قطع {player}.",
          "noLegalMoves": "لا يملك {player} أي نقلة قانونية.",
          "oneKingEach": "تعادل اللاعبان بعد بقاء ظائم واحد لكل منهما."
        }
      },
      "endMatch": {
        "confirm": "هل تريد إنهاء المباراة الحالية؟"
      },
      "soufla": {
        "none": "النقلة الأخيرة صحيحة، ولا توجد فيها سوفلة.",
        "header": "السوفلة",
        "forcedOpeningWarning": "السوفلة غير متاحة أثناء الافتتاح الإجباري."
      },
      "apply": "تطبيق",
      "yes": "نعم",
      "no": "لا",
      "forcedOpening": {
        "title": "الافتتاح الإجباري",
        "body": "تبدأ المباراة بخمس نقلات إجبارية لكل لاعب. اتبع السهم الأحمر لتنفيذ النقلة المطلوبة، ثم ينتقل اللعب إلى الوضع الحر."
      },
      "notice": "تنبيه",
      "undo": {
        "notAllowedBody": "لا يمكن التراجع قبل انتهاء الافتتاح الإجباري.",
        "notAllowedTitle": "التراجع غير متاح",
        "title": "التراجع عن نقلة"
      },
      "errorTitle": "تعذر تنفيذ الإجراء",
      "pickOnlineNickTitle": "اختر اسمًا للعب عبر الإنترنت",
      "applySettings": {
        "title": "حفظ الإعدادات",
        "noChanges": "لم تغيّر أي إعداد.",
        "changedTitle": "التغييرات:",
        "applied": "تم حفظ الإعدادات."
      },
      "successTitle": "تم بنجاح"
    },
    "log": {
      "gameStarted": "بدأت المباراة.",
      "forced": {
        "openingStarted": "بدأ الافتتاح الإجباري.",
        "openingEnded": "انتهى الافتتاح الإجباري."
      },
      "promote": "تتويج: ${cell} أصبح ظائم (${side})",
      "promoteActor": "${actor}: رقّى القطعة عند النقطة ${cell}.",
      "promoteSelf": "${actor}: رقّيت القطعة عند النقطة ${cell}.",
      "soufla": {
        "force": "سوفلة: إجبار ${from} على سلسلة (${path})",
        "remove": "سوفلة: إزالة ${cell}",
        "pressed": "ضغط على زر سوفلة",
        "pressedActor": "${actor}: ضغط على زر سوفلة.",
        "pressedSelf": "${actor}: ضغطت على زر سوفلة.",
        "removeActor": "${actor}: أزال بالسوفلة القطعة عند النقطة ${cell}.",
        "removeSelf": "${actor}: أزلت بالسوفلة القطعة عند النقطة ${cell}.",
        "forceActor": "${actor}: أجبر بالسوفلة القطعة على الأسر ${from}-${to} (${n}).",
        "forceSelf": "${actor}: أجبرت بالسوفلة القطعة على الأسر ${from}-${to} (${n})."
      },
      "undoActor": "${actor}: تراجع عن النقلة.",
      "undoSelf": "${actor}: تراجعت عن النقلة.",
      "matchEndedByActor": "${actor}: أنهى المباراة.",
      "matchEndedBySelf": "${actor}: أنهيت المباراة.",
      "gameWinner": "تهانينا لـ${winner}، لقد فاز بالمباراة!",
      "gameWinnerSelf": "تهانينا، لقد فزت بالمباراة!",
      "gameLoserSelf": "حظًا أوفر، انتهت المباراة بخسارتك.",
      "gameDraw": "مباراة متكافئة، انتهت بالتعادل.",
      "turnMoveFmt": "${side}: حركة ${from}-${to}.",
      "turnMoveSelf": "أنت: حرّكت القطعة من ${from} إلى ${to}.",
      "turnCaptureFmt": "${side}: أسر ${from}-${to} (${n}).",
      "turnCaptureSelf": "أنت: أسرت من ${from} إلى ${to} (${n})."
    },
    "lobby": {
      "backToMode": "العودة إلى اختيار نمط اللعب",
      "refresh": "تحديث اللوبي",
      "emptyRooms": "لا توجد مباريات جارية.",
      "emptyPlayers": "لا يوجد لاعبون متصلون.",
      "loadingPlayers": "جاري تحميل قائمة اللاعبين المتصلين...",
      "loadingRooms": "جاري تحميل قائمة المباريات الجارية...",
      "loadFailed": "تعذر تحميل اللوبي مؤقتًا. ستتم إعادة المحاولة تلقائيًا، ويمكنك الضغط على زر «تحديث» للمحاولة الآن.",
      "roomsTitle": "قائمة المباريات الجارية",
      "playersTitle": "قائمة اللاعبين المتصلين",
      "subtitle": "شاهد المباريات الجارية أو اختر لاعبًا متصلًا وادعه إلى مباراة مباشرة.",
      "title": "اللوبي",
      "inviteDisabled": "لا يمكن دعوته الآن",
      "invitesDisabled": "لا يقبل الدعوات",
      "returnToMatch": "العودة إلى المباراة",
      "reconnectingRoom": "اللاعبان يعيدان الاتصال",
      "privateRoom": "مباراة خاصة",
      "roomDefault": "مباراة",
      "roomLabel": "المباراة",
      "spectate": "مشاهدة",
      "spectatorFull": "اكتمل عدد المشاهدين لهذه المباراة."
    },
    "status": {
      "forcedChainStepByStep": "هذه سلسلة أسر إجبارية. نفّذها خطوةً خطوة.",
      "onlineInitFail": "تعذر فتح اللعب عبر الإنترنت الآن.",
      "reconnecting": "جارٍ استعادة الاتصال…",
      "loadingMatch": "جارٍ فتح المباراة…",
      "onlineInitHelp": "تحقق من اتصال الإنترنت، ثم حدّث الصفحة لإعادة إنشاء جلسة اللعب المؤقتة.",
      "loading": "جارٍ التحميل…",
      "wait": "الدور على اللاعب الآخر. انتظر قليلًا.",
      "turn": "الدور الآن على:",
      "forcedChainIncomplete": "ما زال هناك أسر متاح. أكمل السلسلة ثم اضغط مؤقت إنهاء الأسر.",
      "forcedMove": "نقلة الافتتاح المطلوبة: من ${from} إلى ${to}",
      "moveSendFail": "فشل إرسال النقلة، يرجى الضغط على زر التحديث ثم إعادة النقلة."
    },
    "players": {
      "player": "لاعب",
      "you": "أنت",
      "white": "⚪ الأبيض",
      "black": "⚫ الأسود"
    },
    "aria": {
      "board": "لوحة اللعب",
      "activityLog": "سجل النشاط",
      "controls": "عناصر التحكم",
      "mobileStats": "إحصاءات الهاتف",
      "pvpActions": "إجراءات اللعب ضد لاعب",
      "stats": "الإحصاءات",
      "matchDetails": "تفاصيل المباراة",
      "editAccount": "تعديل الحساب",
      "authOverview": "نظرة عامة على ظامت",
      "authStart": "ابدأ لعب ظامت",
      "drawer": "الدرج",
      "orientationToggle": "تبديل اتجاه العرض",
      "drawerToggle": "تبديل الدرج",
      "menu": "القائمة",
      "primaryNav": "التنقل الرئيسي"
    },
    "ui": {
      "stats": "الإحصائيات",
      "noUndo": "لا توجد نقلة يمكن التراجع عنها.",
      "undoOwnLastOnly": "يمكنك التراجع فقط عن آخر نقلة نفذتها.",
      "language": "اللغة"
    },
    "meta_keywords": "ظامت, زامت, لعبة موريتانية, داما, لعب عبر الإنترنت, ألعاب استراتيجية",
    "online": {
      "permissionDenied": "تعذر تنفيذ الإجراء بسبب انقطاع جلسة اللعب المؤقتة. حدّث الصفحة ثم حاول مرة أخرى.",
      "authRestoreFailed": "تعذر استعادة جلسة اللعب المؤقتة. حدّث الصفحة ثم حاول مرة أخرى.",
      "presence": {
        "online": "متصل",
        "disconnected": "انقطع الاتصال"
      },
      "endFail": "تعذر إنهاء المباراة الآن. تحقق من الاتصال ثم أعد المحاولة.",
      "endPresentation": {
        "winner": "تهانينا لـ{player}، لقد فاز بالمباراة!",
        "selfWinner": "تهانينا، لقد فزت بالمباراة!",
        "selfLoser": "حظًا أوفر، انتهت المباراة بخسارتك.",
        "endedBy": "{player} أنهى المباراة.",
        "selfEndedBy": "أنهيت المباراة.",
        "selfEndedByAbsence": "أنهيت المباراة بعد استمرار غياب {opponent}.",
        "endedByAbsence": "طلب {player} إنهاء المباراة بعد استمرار غياب {opponent}.",
        "noRecordedResult": "انتهت المباراة دون نتيجة محفوظة.",
        "roomUnavailable": "لم تعد المباراة متاحة، لذلك تعذر عرض نتيجتها.",
        "reason": {
          "noLegalMoves": "لم يعد {player} يملك نقلة قانونية.",
          "selfNoPieces": "نفدت قطعك.",
          "selfNoLegalMoves": "لم تعد تملك نقلة قانونية.",
          "oneKingEach": "تحقق التعادل ببقاء ظائم واحد لكل لاعب.",
          "positionDecisive": "اعتمدت النتيجة لأن اللاعب الفائز كان متقدمًا بوضوح عند إنهاء المباراة."
        }
      },
      "errors": {
        "noGame": "انتهت المباراة أو لم تعد متاحة.",
        "authRequired": "انتهت جلسة اللعب المؤقتة. حدّث الصفحة لإنشاء جلسة جديدة ثم حاول مرة أخرى.",
        "presenceWriteDenied": "عاد الاتصال. جارٍ إعادتك إلى المباراة…",
        "moveWriteDenied": "لم تُرسل النقلة. تأكد أن الدور لك وأن المباراة ما زالت مستمرة، ثم حاول مرة أخرى.",
        "inviteWriteDenied": "تعذر إرسال الدعوة. حدّث اللوبي وتأكد من اتصالك، ثم حاول مرة أخرى.",
        "chatWriteDenied": "لم تُرسل الرسالة لأنك لم تعد داخل هذه المباراة. أعد فتحها ثم حاول مرة أخرى.",
        "voiceWriteDenied": "تعذر تحديث الصوت. أوقف المحادثة الصوتية ثم شغّلها من جديد.",
        "matchEnded": "انتهت المباراة، ولا يمكن تنفيذ إجراء جديد.",
        "spectatorAction": "أنت تشاهد المباراة فقط، لذلك لا يمكنك تحريك القطع.",
        "spectatorJoinFailed": "تعذر الانضمام كمشاهد. حاول مرة أخرى.",
        "joinFailed": "تعذر الانضمام إلى المباراة عبر الإنترنت. حدّث الصفحة وتأكد من اتصالك، ثم حاول مرة أخرى."
      },
      "inviteInvalidated": "لم تعد الدعوة صالحة؛ ربما دخل اللاعب مباراة أخرى أو انقطع اتصاله.",
      "inviteSendFail": "تعذر إرسال الدعوة. حاول مرة أخرى.",
      "resultNotCounted": {
        "early": "لم يُحدَّد فائز لأن المباراة انتهت في وقت مبكر جدًا.",
        "unclear": "لم يُحدَّد فائز لأن وضع القطع عند الإنهاء لم يُظهر تفوقًا واضحًا.",
        "generic": "انتهت المباراة دون اعتماد فائز."
      },
      "newInviteBody": "يدعوك <strong>${fromName}</strong> إلى مباراة${roomPart}.",
      "newInviteRoomPart": " باسم <strong>${roomName}</strong>",
      "newInviteTitle": "دعوة إلى مباراة",
      "noPlayers": "لا يوجد لاعب متاح الآن.",
      "absenceTitle": "انقطع اتصال الخصم",
      "absencePrompt": "انقطع اتصال {player} منذ دقيقتين. هل تريد الانتظار أم إنهاء المباراة؟",
      "opponent": "الخصم",
      "roomNamePlaceholder": "اسم المباراة",
      "roomNamePrompt": "اكتب اسمًا قصيرًا يميّز المباراة في القائمة.",
      "roomNameTitle": "اسم المباراة",
      "roomVisibility": {
        "public": "مباراة عامة (يسمح للمشاهدين بمتابعتها)",
        "private": "مباراة خاصة (لا يسمح للمشاهدين بمتابعتها)"
      },
      "invites": {
        "receiveLabel": "استقبال الدعوات:",
        "enabled": "مفعل",
        "disabled": "معطل",
        "receivingEnabled": "تم تفعيل استقبال الدعوات.",
        "receivingDisabled": "تم تعطيل استقبال الدعوات.",
        "notAccepting": "هذا اللاعب لا يستقبل الدعوات الآن.",
        "activeMatchTitle": "لديك مباراة جارية",
        "leaveActivePrompt": "لديك مباراة أونلاين جارية. هل تريد مغادرتها وإرسال الدعوة؟",
        "leaveAndSend": "مغادرة المباراة وإرسال الدعوة"
      },
      "status": {
        "available": "متاح",
        "inPvP": "في مباراة أونلاين"
      },
      "syncFail": "تعذر تحديث المباراة. تحقق من الاتصال ثم حاول مرة أخرى.",
      "syncIssueNotice": "لم تظهر آخر تغييرات المباراة. اضغط «تحديث» لإعادة تحميلها.",
      "waitingAcceptance": "أُرسلت الدعوة، ولم يرد اللاعب بعد.",
      "playersLoadFail": "تعذر تحميل اللاعبين المتصلين. حاول تحديث اللوبي."
    },
    "stats": {
      "left": "القطع المتبقية",
      "kings": "الظائم(الملك)",
      "captured": "المأسورة"
    },
    "spectator": {
      "only": "هذه المباراة بين لاعبين آخرين. أنت الآن مشاهد فقط ولا تملك صلاحية تحريك القطع."
    },
    "langs": {
      "en": "English",
      "ar": "العربية",
      "fr": "Français"
    },
    "chain": {
      "notice": {
        "body": "اضغط على مؤقت إنهاء الأسر لإنهاء دورك.\nملاحظة: إذا كان هناك أسر متتابع متاح، أكمل السلسلة أولًا.",
        "inactive": "يعمل مؤقت إنهاء الأسر فقط أثناء وجود أسر جارٍ، وهو الذي ينهي دور اللاعب."
      }
    },
    "actions": {
      "ok": "موافق",
      "accept": "قبول",
      "continue": "متابعة",
      "invite": "دعوة",
      "reject": "رفض",
      "wait": "الانتظار",
      "cancel": "إلغاء",
      "close": "إغلاق",
      "back": "رجوع",
      "send": "إرسال"
    },
    "meta_description": "نسخة ويب للعب ظامت الموريتانية عبر الإنترنت بثلاث لغات.",
    "topbar": {
      "login": "تسجيل الدخول",
      "logout": "تسجيل الخروج",
      "account": "الحساب"
    },
    "game": {
      "title": "لعبة ظامت الموريتانية"
    },
    "schema_game_genre": "لعبة استراتيجية",
    "schema_game_name": "ظامت الموريتانية",
    "schema_game_type": "Game",
    "undo": {
      "applied": "تم التراجع عن النقلة الأخيرة.",
      "failed": "تعذر التراجع عن النقلة.",
      "notCommitted": "لم يتم التراجع لأن المباراة تقدمت قبل اكتمال الطلب. اضغط «تحديث» ثم حاول مرة أخرى.",
      "rejected": "رفض اللاعب الآخر طلب التراجع.",
      "rejectedTitle": "رُفض طلب التراجع",
      "spectatorRequested": "طلب {player} التراجع عن النقلة الأخيرة.",
      "spectatorAccepted": "وافق {responder} على تراجع {requester} عن النقلة الأخيرة المحددة بالسهم الأصفر المعكوس.",
      "spectatorRejected": "رفض {responder} طلب {requester} التراجع عن النقلة الأخيرة.",
      "requesterAccepted": "وافق {responder} على التراجع عن النقلة الأخيرة المحددة بالسهم الأصفر المعكوس.",
      "requesterRejected": "رفض {responder} التراجع عن النقلة الأخيرة.",
      "request": {
        "body": "يريد {name} التراجع عن النقلة الأخيرة. هل توافق؟",
        "title": "طلب التراجع عن نقلة"
      },
      "requestFailed": "تعذر إرسال طلب التراجع. تحقق من الاتصال ثم أعد المحاولة.",
      "wait": {
        "body": "أُرسل طلب التراجع. انتظر رد اللاعب الآخر."
      }
    },
    "errors": {
      "nick": {
        "required": "الاسم المستعار مطلوب.",
        "tooShort": "الاسم المستعار قصير جدًا.",
        "tooLong": "الاسم المستعار طويل جدًا.",
        "invalid": "اسم مستعار غير صالح."
      },
      "render3d": {
        "failed": "تعذر تشغيل العرض ثلاثي الأبعاد. سيتم استخدام الشكل ثنائي الأبعاد."
      }
    }
  },
  "en": {
    "pages": {
      "cta": {
        "playNow": "Start playing now"
      },
      "nav": {
        "rules": "Rules",
        "privacy": "Privacy",
        "terms": "Terms of Use",
        "contact": "Contact"
      },
      "navShort": {
        "privacy": "Privacy",
        "terms": "Terms",
        "contact": "Contact"
      },
      "footer": {
        "text": "© ${year} El Ougl Software SARL — All rights reserved."
      }
    },
    "soufla": {
      "pick": {
        "toastNotOffender": "This piece is not the offending Soufla piece. Select the piece that ignored the capture.",
        "title": "You may claim Soufla. Select the piece that skipped the capture.",
        "btnRemove": "Remove piece",
        "btnForcePath": "Force path ${n}"
      },
      "applied": {
        "force": "The opponent’s piece was forced to follow the valid capture path.",
        "remove": "The opponent’s piece that skipped the capture was removed.",
        "self": "Soufla applied."
      },
      "sendFailed": "Soufla could not be applied because of a connection problem. Check your internet connection and try again.",
      "summary": {
        "force": "{actor} chose a Soufla penalty against you and forced you to follow the path marked in green on the board.",
        "penaltyTitle": "Selected penalty:",
        "reason": "Your opponent claimed Soufla because your piece skipped the capture shown by the red path.",
        "remove": "{actor} chose a Soufla penalty against you and removed your piece from the position marked with a red X.",
        "title": "Soufla result",
        "undo": "Your last move was undone and its path is shown in yellow."
      },
      "spectator": {
        "force": "{actor} chose a Soufla penalty against {victim} and forced them to follow the path marked in green on the board.",
        "penaltyTitle": "Selected penalty:",
        "reason": "Soufla was claimed because a piece skipped the capture shown by the red path.",
        "remove": "{actor} chose a Soufla penalty against {victim} and removed their piece from the position marked with a red X.",
        "title": "Soufla result",
        "undo": "The offending move was undone and its path is shown in yellow."
      }
    },
    "pvp": {
      "voice": {
        "micOn": "Mute mic",
        "spkOn": "Mute",
        "failed": "Connection failed",
        "failedTitle": "Voice could not start",
        "failure": {
          "permission": "Allow microphone access for this site, then try again.",
          "noDevice": "No available microphone was found.",
          "busy": "The microphone is being used by another app or is unavailable.",
          "unsupported": "Voice chat is not supported by this browser.",
          "session": "Voice could not start in this match. Reopen the match and try again.",
          "service": "Voice could not start because of a connection problem. Check your internet connection and try again.",
          "generic": "Voice chat could not start. Try again."
        },
        "micOff": "Turn on microphone",
        "spkOff": "Turn on sound",
        "mic": "Mic",
        "speaker": "Sound"
      },
      "chat": {
        "empty": "No messages yet.",
        "failed": "The message could not be sent. Try again.",
        "placeholder": "Type a message…",
        "rateLimit": "Wait one second before sending another message.",
        "title": "Chat",
        "tooLong": "Shorten the message to 200 characters or fewer."
      },
      "leave": "Leave match"
    },
    "buttons": {
      "soufla": "Soufla",
      "settings": "Settings",
      "sync": "Refresh",
      "endKill": "End capture",
      "undo": "Undo",
      "endMatch": "Exit"
    },
    "dashboard": {
      "showLeaderboard": "Show leaderboard"
    },
    "settings": {
      "board2d": "2D",
      "board3d": "3D",
      "dark": "Dark",
      "coords": "Show point numbering",
      "boardStyle": "Board style",
      "light": "Light",
      "theme": "Theme",
      "enabled": "Enabled",
      "disabled": "Disabled",
      "showCoords": "Show coordinates"
    },
    "modals": {
      "gameOver": {
        "title": "Match over",
        "winner": "Congratulations to {player}, who won the match!",
        "draw": "A closely fought match—it ended in a draw.",
        "reason": {
          "noPieces": "{player} has no pieces left.",
          "noLegalMoves": "{player} has no legal move left.",
          "oneKingEach": "The match is a draw with one king left for each player."
        }
      },
      "endMatch": {
        "confirm": "End the current match?"
      },
      "soufla": {
        "none": "The last move was valid. There is no Soufla.",
        "header": "Soufla",
        "forcedOpeningWarning": "Soufla is unavailable during the forced opening."
      },
      "apply": "Apply",
      "yes": "Yes",
      "no": "No",
      "forcedOpening": {
        "title": "Forced opening",
        "body": "The match begins with five forced moves for each player. Follow the red arrow for the required move; free play starts afterward."
      },
      "notice": "Notice",
      "undo": {
        "notAllowedBody": "You cannot undo until the forced opening is complete.",
        "notAllowedTitle": "Undo unavailable",
        "title": "Undo a move"
      },
      "errorTitle": "Action could not be completed",
      "pickOnlineNickTitle": "Choose an online name",
      "applySettings": {
        "title": "Save settings",
        "noChanges": "No settings were changed.",
        "changedTitle": "Changes:",
        "applied": "Settings saved."
      },
      "successTitle": "Done"
    },
    "log": {
      "gameStarted": "The match started.",
      "forced": {
        "openingStarted": "Forced opening started.",
        "openingEnded": "Forced opening ended."
      },
      "promote": "Promotion: ${cell} became a king (${side})",
      "promoteActor": "${actor}: Promoted the piece at ${cell}.",
      "promoteSelf": "${actor}: Promoted the piece at ${cell}.",
      "soufla": {
        "force": "Soufla: forcing ${from} to follow a chain (${path})",
        "remove": "Soufla: remove ${cell}",
        "pressed": "Pressed the Soufla button",
        "pressedActor": "${actor}: Pressed the Soufla button.",
        "pressedSelf": "${actor}: Pressed the Soufla button.",
        "removeActor": "${actor}: Removed the piece with Soufla at ${cell}.",
        "removeSelf": "${actor}: Removed the piece with Soufla at ${cell}.",
        "forceActor": "${actor}: Forced the piece with Soufla to capture ${from}-${to} (${n}).",
        "forceSelf": "${actor}: Forced the piece with Soufla to capture ${from}-${to} (${n})."
      },
      "undoActor": "${actor}: Undid the move.",
      "undoSelf": "${actor}: Undid the move.",
      "matchEndedByActor": "${actor}: Ended the match.",
      "matchEndedBySelf": "${actor}: Ended the match.",
      "gameWinner": "Congratulations to ${winner}, who won the match!",
      "gameWinnerSelf": "Congratulations, you won the match!",
      "gameLoserSelf": "Better luck next time—you lost the match.",
      "gameDraw": "A closely fought match—it ended in a draw.",
      "turnMoveFmt": "${side}: Move ${from}-${to}.",
      "turnMoveSelf": "You: moved from ${from} to ${to}.",
      "turnCaptureFmt": "${side}: Capture ${from}-${to} (${n}).",
      "turnCaptureSelf": "You: captured from ${from} to ${to} (${n})."
    },
    "lobby": {
      "backToMode": "Back to mode selection",
      "refresh": "Refresh lobby",
      "emptyRooms": "No ongoing matches.",
      "emptyPlayers": "No players online.",
      "loadingPlayers": "Loading online players...",
      "loadingRooms": "Loading ongoing matches...",
      "loadFailed": "The lobby could not be loaded temporarily. It will retry automatically, or press Refresh to try now.",
      "roomsTitle": "List of ongoing matches",
      "playersTitle": "Connected players list",
      "subtitle": "Choose a match to watch, or invite a player to start one.",
      "title": "Lobby",
      "inviteDisabled": "Can't invite right now",
      "invitesDisabled": "Not accepting invites",
      "returnToMatch": "Return to match",
      "reconnectingRoom": "Players are reconnecting",
      "privateRoom": "Private match",
      "roomDefault": "Match",
      "roomLabel": "Match",
      "spectate": "Spectate",
      "spectatorFull": "This match has reached its spectator limit."
    },
    "status": {
      "forcedChainStepByStep": "This is a forced capture chain. Complete it one step at a time.",
      "onlineInitFail": "Online play could not be opened right now.",
      "reconnecting": "Restoring the connection…",
      "loadingMatch": "Opening the match…",
      "onlineInitHelp": "Check your internet connection, then refresh the page to recreate the temporary play session.",
      "loading": "Loading…",
      "wait": "It is the other player’s turn. Please wait.",
      "turn": "Turn:",
      "forcedChainIncomplete": "Another capture is available. Finish the chain, then press the end-capture timer.",
      "forcedMove": "Required opening move: ${from} → ${to}",
      "moveSendFail": "The move could not be sent. Press Refresh, then make the move again."
    },
    "players": {
      "player": "Player",
      "you": "You",
      "white": "⚪ White",
      "black": "⚫ Black"
    },
    "aria": {
      "board": "Game board",
      "activityLog": "Activity log",
      "controls": "Controls",
      "mobileStats": "Mobile stats",
      "pvpActions": "PvP actions",
      "stats": "Stats",
      "matchDetails": "Match details",
      "editAccount": "Edit account",
      "authOverview": "Dhamet overview",
      "authStart": "Start playing Dhamet",
      "drawer": "Drawer",
      "orientationToggle": "Toggle display orientation",
      "drawerToggle": "Toggle drawer",
      "menu": "Menu",
      "primaryNav": "Primary navigation"
    },
    "ui": {
      "stats": "Stats",
      "noUndo": "There is no move to undo.",
      "undoOwnLastOnly": "You can only undo the latest move that you made.",
      "language": "Language"
    },
    "meta_keywords": "zamat, zamet, mauritanian game, board game, checkers, draughts, online multiplayer",
    "online": {
      "permissionDenied": "The temporary play session was interrupted. Refresh the page and try again.",
      "authRestoreFailed": "The temporary play session could not be restored. Refresh the page and try again.",
      "presence": {
        "online": "Online",
        "disconnected": "Disconnected"
      },
      "endFail": "The match could not be ended. Check your connection and try again.",
      "endPresentation": {
        "winner": "Congratulations to {player}, who won the match!",
        "selfWinner": "Congratulations, you won the match!",
        "selfLoser": "Better luck next time—you lost the match.",
        "endedBy": "{player} ended the match.",
        "selfEndedBy": "You ended the match.",
        "selfEndedByAbsence": "You ended the match after {opponent} remained absent.",
        "endedByAbsence": "{player} requested to end the match after {opponent} remained absent.",
        "noRecordedResult": "The match ended without a saved result.",
        "roomUnavailable": "The match is no longer available, so its result cannot be shown.",
        "reason": {
          "noLegalMoves": "{player} had no legal move left.",
          "selfNoPieces": "You have no pieces left.",
          "selfNoLegalMoves": "You have no legal move left.",
          "oneKingEach": "The draw was reached with one king remaining for each player.",
          "positionDecisive": "The result was confirmed because the winner had a clear advantage when the match ended."
        }
      },
      "errors": {
        "noGame": "The match has ended or is no longer available.",
        "authRequired": "The temporary play session ended. Refresh the page to create a new session, then try again.",
        "presenceWriteDenied": "Connection restored. Returning you to the match…",
        "moveWriteDenied": "The move was not sent. Make sure it is your turn and the match is still active, then try again.",
        "inviteWriteDenied": "The invite could not be sent. Refresh the lobby, check your connection, and try again.",
        "chatWriteDenied": "The message was not sent because you are no longer in this match. Reopen it and try again.",
        "voiceWriteDenied": "Voice could not be updated. Turn voice chat off and on, then try again.",
        "matchEnded": "The match has ended, so no new action can be taken.",
        "spectatorAction": "You are watching this match and cannot move the pieces.",
        "spectatorJoinFailed": "You could not join as a spectator. Try again.",
        "joinFailed": "Couldn't join the online match. Refresh the page, check your connection, and try again."
      },
      "inviteInvalidated": "The invite is no longer valid. The player may have joined another match or gone offline.",
      "inviteSendFail": "The invite could not be sent. Try again.",
      "resultNotCounted": {
        "early": "No winner was declared because the match ended too early.",
        "unclear": "No winner was declared because the pieces did not show a clear advantage when the match ended.",
        "generic": "The match ended without an official winner."
      },
      "newInviteBody": "<strong>${fromName}</strong> invited you to a match${roomPart}.",
      "newInviteRoomPart": " named <strong>${roomName}</strong>",
      "newInviteTitle": "Match invitation",
      "noPlayers": "No player is available right now.",
      "absenceTitle": "Opponent disconnected",
      "absencePrompt": "{player} has been offline for two minutes. Wait or end the match?",
      "opponent": "Opponent",
      "roomNamePlaceholder": "Match name",
      "roomNamePrompt": "Enter a short name that identifies this match in the list.",
      "roomNameTitle": "Match name",
      "roomVisibility": {
        "public": "Public match (spectators can watch)",
        "private": "Private match (spectators cannot watch)"
      },
      "invites": {
        "receiveLabel": "Invite receiving:",
        "enabled": "Enabled",
        "disabled": "Disabled",
        "receivingEnabled": "Invite receiving enabled.",
        "receivingDisabled": "Invite receiving disabled.",
        "notAccepting": "This player is not accepting invites right now.",
        "activeMatchTitle": "You have an active match",
        "leaveActivePrompt": "You already have an active online match. Leave it and send this invite?",
        "leaveAndSend": "Leave match and send invite"
      },
      "status": {
        "available": "Available",
        "inPvP": "In online match"
      },
      "syncFail": "The match could not be refreshed. Check your connection and try again.",
      "syncIssueNotice": "The latest match changes are not showing. Press Refresh to load them again.",
      "waitingAcceptance": "Invite sent. Waiting for the player’s response.",
      "playersLoadFail": "Online players could not be loaded. Refresh the lobby and try again."
    },
    "stats": {
      "left": "Pieces left",
      "kings": "Kings",
      "captured": "Captured"
    },
    "spectator": {
      "only": "This match is between two other players. You are currently a spectator only and are not allowed to move the pieces."
    },
    "langs": {
      "en": "English",
      "ar": "العربية",
      "fr": "Français"
    },
    "chain": {
      "notice": {
        "body": "Press the end-capture timer to finish your turn.\nNote: If another capture is available, complete the chain first.",
        "inactive": "The end-capture timer works only while a capture chain is active, and it is what ends the player’s turn."
      }
    },
    "actions": {
      "ok": "OK",
      "accept": "Accept",
      "continue": "Continue",
      "invite": "Invite",
      "reject": "Reject",
      "wait": "Wait",
      "cancel": "Cancel",
      "close": "Close",
      "back": "Back",
      "send": "Send"
    },
    "meta_description": "A web version of the Mauritanian game Zamat for online play in Arabic, English, and French.",
    "topbar": {
      "logout": "Sign out",
      "account": "Account",
      "login": "Log in"
    },
    "game": {
      "title": "Mauritanian Dhamet game"
    },
    "schema_game_name": "Mauritanian Zamat",
    "schema_game_genre": "Strategy game",
    "schema_game_type": "Game",
    "undo": {
      "applied": "The last move was undone.",
      "failed": "The move could not be undone.",
      "notCommitted": "The move was not undone because the match continued before the request finished. Press Refresh and try again.",
      "rejected": "The other player declined the undo request.",
      "rejectedTitle": "Undo request declined",
      "spectatorRequested": "{player} requested to undo the last move.",
      "spectatorAccepted": "{responder} accepted {requester}’s request to undo the last move marked by the reversed yellow arrow.",
      "spectatorRejected": "{responder} declined {requester}’s request to undo the last move.",
      "requesterAccepted": "{responder} accepted undoing the last move marked by the reversed yellow arrow.",
      "requesterRejected": "{responder} declined undoing the last move.",
      "request": {
        "body": "{name} wants to undo the last move. Allow it?",
        "title": "Undo request"
      },
      "requestFailed": "The undo request could not be sent. Check your connection and try again.",
      "wait": {
        "body": "Undo request sent. Waiting for the other player’s response."
      }
    },
    "errors": {
      "nick": {
        "required": "Nickname is required.",
        "tooShort": "Nickname is too short.",
        "tooLong": "Nickname is too long.",
        "invalid": "Invalid nickname."
      },
      "render3d": {
        "failed": "Failed to start the 3D view. Falling back to 2D."
      }
    }
  },
  "fr": {
    "pages": {
      "cta": {
        "playNow": "Commencer à jouer"
      },
      "nav": {
        "rules": "Règles",
        "privacy": "Confidentialité",
        "terms": "Conditions d’utilisation",
        "contact": "Contact"
      },
      "navShort": {
        "privacy": "Confid.",
        "terms": "Conditions",
        "contact": "Contact"
      },
      "footer": {
        "text": "© ${year} El Ougl Software SARL — Tous droits réservés."
      }
    },
    "soufla": {
      "pick": {
        "toastNotOffender": "Cette pièce n’est pas la pièce fautive de la soufla. Sélectionnez la pièce qui a ignoré la prise.",
        "title": "Vous pouvez réclamer Soufla. Sélectionnez la pièce qui a ignoré la prise.",
        "btnRemove": "Retirer la pièce",
        "btnForcePath": "Imposer le chemin ${n}"
      },
      "applied": {
        "force": "La pièce adverse a été forcée à suivre le chemin de prise valide.",
        "remove": "La pièce adverse qui a ignoré la prise a été retirée.",
        "self": "Soufla appliquée."
      },
      "sendFailed": "La Soufla n’a pas pu être appliquée à cause d’un problème de connexion. Vérifiez votre accès à Internet puis réessayez.",
      "summary": {
        "force": "{actor} a choisi une sanction de Soufla contre vous et vous a imposé le chemin indiqué en vert sur le plateau.",
        "penaltyTitle": "Sanction choisie :",
        "reason": "Votre adversaire a réclamé Soufla parce que votre pièce a ignoré la prise indiquée par le chemin rouge.",
        "remove": "{actor} a choisi une sanction de Soufla contre vous et a retiré votre pièce de la position marquée d’une croix rouge.",
        "title": "Résultat de la Soufla",
        "undo": "Votre dernier coup a été annulé et son chemin apparaît en jaune."
      },
      "spectator": {
        "force": "{actor} a choisi une sanction de Soufla contre {victim} et lui a imposé le chemin indiqué en vert sur le plateau.",
        "penaltyTitle": "Sanction choisie :",
        "reason": "La Soufla a été réclamée parce qu’une pièce a ignoré la prise indiquée par le chemin rouge.",
        "remove": "{actor} a choisi une sanction de Soufla contre {victim} et a retiré sa pièce de la position marquée d’une croix rouge.",
        "title": "Résultat de la Soufla",
        "undo": "Le coup fautif a été annulé et son chemin apparaît en jaune."
      }
    },
    "pvp": {
      "voice": {
        "micOn": "Couper le micro",
        "spkOn": "Couper le son",
        "failed": "Échec de connexion",
        "failedTitle": "Impossible de démarrer l’audio",
        "failure": {
          "permission": "Autorisez ce site à utiliser le microphone, puis réessayez.",
          "noDevice": "Aucun microphone disponible n’a été trouvé.",
          "busy": "Le microphone est utilisé par une autre application ou indisponible.",
          "unsupported": "Le chat vocal n’est pas pris en charge par ce navigateur.",
          "session": "L’audio n’a pas pu démarrer dans cette partie. Rouvrez la partie puis réessayez.",
          "service": "L’audio n’a pas pu démarrer à cause d’un problème de connexion. Vérifiez votre accès à Internet puis réessayez.",
          "generic": "Le chat vocal n’a pas pu démarrer. Réessayez."
        },
        "micOff": "Activer le micro",
        "spkOff": "Activer le son",
        "mic": "Micro",
        "speaker": "Son"
      },
      "chat": {
        "empty": "Aucun message pour le moment.",
        "failed": "Le message n’a pas pu être envoyé. Réessayez.",
        "placeholder": "Écrivez un message…",
        "rateLimit": "Attendez une seconde avant d’envoyer un autre message.",
        "title": "Chat",
        "tooLong": "Réduisez le message à 200 caractères ou moins."
      },
      "leave": "Quitter la partie"
    },
    "buttons": {
      "soufla": "Soufla",
      "settings": "Paramètres",
      "sync": "Actualiser",
      "endKill": "Terminer la prise",
      "undo": "Annuler",
      "endMatch": "Quitter"
    },
    "dashboard": {
      "showLeaderboard": "Afficher le classement"
    },
    "settings": {
      "board2d": "2D",
      "board3d": "3D",
      "dark": "Sombre",
      "coords": "Afficher la numérotation",
      "boardStyle": "Style du plateau",
      "light": "Clair",
      "theme": "Thème",
      "enabled": "Activé",
      "disabled": "Désactivé",
      "showCoords": "Afficher les coordonnées"
    },
    "modals": {
      "gameOver": {
        "title": "Partie terminée",
        "winner": "Félicitations à {player}, qui remporte la partie !",
        "draw": "Une partie équilibrée, terminée par un match nul.",
        "reason": {
          "noPieces": "{player} n’a plus de pièces.",
          "noLegalMoves": "{player} n’a plus de coup légal.",
          "oneKingEach": "La partie est nulle avec un roi restant pour chaque joueur."
        }
      },
      "endMatch": {
        "confirm": "Voulez-vous terminer la partie en cours ?"
      },
      "soufla": {
        "none": "Le dernier coup est valide. Il n’y a pas de Soufla.",
        "header": "Soufla",
        "forcedOpeningWarning": "La Soufla n’est pas disponible pendant l’ouverture obligatoire."
      },
      "apply": "Appliquer",
      "yes": "Oui",
      "no": "Non",
      "forcedOpening": {
        "title": "Ouverture obligatoire",
        "body": "La partie commence par cinq coups obligatoires pour chaque joueur. Suivez la flèche rouge pour jouer le coup demandé ; le jeu devient ensuite libre."
      },
      "notice": "Information",
      "undo": {
        "notAllowedBody": "Vous ne pouvez pas annuler avant la fin de l’ouverture obligatoire.",
        "notAllowedTitle": "Annulation indisponible",
        "title": "Annuler un coup"
      },
      "errorTitle": "Action impossible",
      "pickOnlineNickTitle": "Choisissez un nom en ligne",
      "applySettings": {
        "title": "Enregistrer les paramètres",
        "noChanges": "Aucun paramètre n’a été modifié.",
        "changedTitle": "Modifications :",
        "applied": "Paramètres enregistrés."
      },
      "successTitle": "Terminé"
    },
    "log": {
      "gameStarted": "La partie a commencé.",
      "forced": {
        "openingStarted": "Ouverture obligatoire démarrée.",
        "openingEnded": "Ouverture obligatoire terminée."
      },
      "promote": "Promotion : ${cell} est devenu roi (${side})",
      "promoteActor": "${actor} : a promu la pièce au point ${cell}.",
      "promoteSelf": "${actor} : avez promu la pièce au point ${cell}.",
      "soufla": {
        "force": "Soufla : forcer ${from} à suivre une chaîne (${path})",
        "remove": "Soufla : retirer ${cell}",
        "pressed": "Bouton Soufla activé",
        "pressedActor": "${actor} : a appuyé sur le bouton Soufla.",
        "pressedSelf": "${actor} : avez appuyé sur le bouton Soufla.",
        "removeActor": "${actor} : a retiré la pièce avec Soufla au point ${cell}.",
        "removeSelf": "${actor} : avez retiré la pièce avec Soufla au point ${cell}.",
        "forceActor": "${actor} : a forcé la pièce avec Soufla à capturer ${from}-${to} (${n}).",
        "forceSelf": "${actor} : avez forcé la pièce avec Soufla à capturer ${from}-${to} (${n})."
      },
      "undoActor": "${actor} : a annulé le coup.",
      "undoSelf": "${actor} : avez annulé le coup.",
      "matchEndedByActor": "${actor} : a terminé la partie.",
      "matchEndedBySelf": "${actor} : avez terminé la partie.",
      "gameWinner": "Félicitations à ${winner}, qui remporte la partie !",
      "gameWinnerSelf": "Félicitations, vous avez gagné la partie !",
      "gameLoserSelf": "Courage, vous avez perdu la partie.",
      "gameDraw": "Une partie équilibrée, terminée par un match nul.",
      "turnMoveFmt": "${side} : Déplacement ${from}-${to}.",
      "turnMoveSelf": "Vous : déplacement de ${from} à ${to}.",
      "turnCaptureFmt": "${side} : Prise ${from}-${to} (${n}).",
      "turnCaptureSelf": "Vous : prise de ${from} à ${to} (${n})."
    },
    "lobby": {
      "backToMode": "Retour au choix du mode",
      "refresh": "Actualiser le lobby",
      "emptyRooms": "Aucune partie en cours.",
      "emptyPlayers": "Aucun joueur en ligne.",
      "loadingPlayers": "Chargement des joueurs en ligne...",
      "loadingRooms": "Chargement des parties en cours...",
      "loadFailed": "Le lobby est temporairement indisponible. Une nouvelle tentative sera effectuée automatiquement, ou appuyez sur Actualiser pour réessayer maintenant.",
      "roomsTitle": "Liste des parties en cours",
      "playersTitle": "Liste des joueurs connectés",
      "subtitle": "Choisissez une partie à regarder, ou invitez un joueur à en démarrer une.",
      "title": "Lobby",
      "inviteDisabled": "Invitation impossible pour le moment",
      "invitesDisabled": "N’accepte pas les invitations",
      "returnToMatch": "Revenir à la partie",
      "reconnectingRoom": "Les joueurs se reconnectent",
      "privateRoom": "Partie privée",
      "roomDefault": "Partie",
      "roomLabel": "Partie",
      "spectate": "Observer",
      "spectatorFull": "Cette partie a atteint le nombre maximal de spectateurs."
    },
    "status": {
      "forcedChainStepByStep": "Cette chaîne de prises est obligatoire. Effectuez-la étape par étape.",
      "onlineInitFail": "Le jeu en ligne ne peut pas être ouvert pour le moment.",
      "reconnecting": "Rétablissement de la connexion…",
      "loadingMatch": "Ouverture de la partie…",
      "onlineInitHelp": "Vérifiez la connexion Internet, puis actualisez la page pour recréer la session de jeu temporaire.",
      "loading": "Chargement…",
      "wait": "C’est au tour de l’autre joueur. Veuillez patienter.",
      "turn": "Au tour de :",
      "forcedChainIncomplete": "Une autre prise est disponible. Terminez la chaîne, puis appuyez sur le minuteur de fin de prise.",
      "forcedMove": "Coup d’ouverture requis : ${from} → ${to}",
      "moveSendFail": "Échec de l’envoi du coup. Appuyez sur Actualiser, puis rejouez-le."
    },
    "players": {
      "player": "Joueur",
      "you": "Vous",
      "white": "⚪ Blanc",
      "black": "⚫ Noir"
    },
    "aria": {
      "board": "Plateau de jeu",
      "activityLog": "Journal d’activité",
      "controls": "Commandes",
      "mobileStats": "Statistiques mobile",
      "pvpActions": "Actions PvP",
      "stats": "Statistiques",
      "matchDetails": "Détails du match",
      "editAccount": "Modifier le compte",
      "authOverview": "Vue d’ensemble de Dhamet",
      "authStart": "Commencer à jouer à Dhamet",
      "drawer": "Tiroir",
      "orientationToggle": "Changer l’orientation de l’affichage",
      "drawerToggle": "Ouvrir/Fermer le tiroir",
      "menu": "Menu",
      "primaryNav": "Navigation principale"
    },
    "ui": {
      "stats": "Statistiques",
      "noUndo": "Aucun coup ne peut être annulé.",
      "undoOwnLastOnly": "Vous pouvez uniquement annuler le dernier coup que vous avez joué.",
      "language": "Langue"
    },
    "meta_keywords": "zamat, zamet, jeu mauritanien, jeu de plateau, dames, multijoueur en ligne",
    "online": {
      "permissionDenied": "La session de jeu temporaire a été interrompue. Actualisez la page puis réessayez.",
      "authRestoreFailed": "Impossible de restaurer la session de jeu temporaire. Actualisez la page puis réessayez.",
      "presence": {
        "online": "En ligne",
        "disconnected": "Connexion coupée"
      },
      "endFail": "La partie n’a pas pu être terminée. Vérifiez votre connexion et réessayez.",
      "endPresentation": {
        "winner": "Félicitations à {player}, qui remporte la partie !",
        "selfWinner": "Félicitations, vous avez gagné la partie !",
        "selfLoser": "Courage, vous avez perdu la partie.",
        "endedBy": "{player} a terminé la partie.",
        "selfEndedBy": "Vous avez terminé la partie.",
        "selfEndedByAbsence": "Vous avez terminé la partie après l’absence prolongée de {opponent}.",
        "endedByAbsence": "{player} a demandé la fin de la partie après l’absence prolongée de {opponent}.",
        "noRecordedResult": "La partie s’est terminée sans résultat enregistré.",
        "roomUnavailable": "La partie n’est plus disponible ; son résultat ne peut donc pas être affiché.",
        "reason": {
          "noLegalMoves": "{player} n’avait plus de coup légal.",
          "selfNoPieces": "Vous n’avez plus de pièces.",
          "selfNoLegalMoves": "Vous n’avez plus de coup légal.",
          "oneKingEach": "Le match nul a été atteint avec un roi restant pour chaque joueur.",
          "positionDecisive": "Le résultat a été confirmé, car le gagnant avait un avantage clair à la fin de la partie."
        }
      },
      "errors": {
        "noGame": "La partie est terminée ou n’est plus disponible.",
        "authRequired": "La session de jeu temporaire est terminée. Actualisez la page pour en créer une nouvelle, puis réessayez.",
        "presenceWriteDenied": "Connexion rétablie. Retour à la partie en cours…",
        "moveWriteDenied": "Le coup n’a pas été envoyé. Vérifiez que c’est votre tour et que la partie est toujours en cours, puis réessayez.",
        "inviteWriteDenied": "Impossible d’envoyer l’invitation. Actualisez le lobby, vérifiez votre connexion, puis réessayez.",
        "chatWriteDenied": "Le message n’a pas été envoyé, car vous n’êtes plus dans cette partie. Rouvrez-la puis réessayez.",
        "voiceWriteDenied": "L’audio n’a pas pu être mis à jour. Désactivez puis réactivez le chat vocal et réessayez.",
        "matchEnded": "La partie est terminée ; aucune nouvelle action ne peut être effectuée.",
        "spectatorAction": "Vous regardez cette partie et ne pouvez pas déplacer les pièces.",
        "spectatorJoinFailed": "Impossible de rejoindre comme spectateur. Réessayez.",
        "joinFailed": "Impossible de rejoindre la partie en ligne. Actualisez la page, vérifiez votre connexion, puis réessayez."
      },
      "inviteInvalidated": "L’invitation n’est plus valable. Le joueur a peut-être rejoint une autre partie ou s’est déconnecté.",
      "inviteSendFail": "L’invitation n’a pas pu être envoyée. Réessayez.",
      "resultNotCounted": {
        "early": "Aucun gagnant n’a été déclaré, car la partie s’est terminée trop tôt.",
        "unclear": "Aucun gagnant n’a été déclaré, car la position des pièces ne montrait pas d’avantage clair à la fin.",
        "generic": "La partie s’est terminée sans gagnant officiel."
      },
      "newInviteBody": "<strong>${fromName}</strong> vous invite à une partie${roomPart}.",
      "newInviteRoomPart": " nommée <strong>${roomName}</strong>",
      "newInviteTitle": "Invitation à une partie",
      "noPlayers": "Aucun joueur n’est disponible pour le moment.",
      "absenceTitle": "Adversaire déconnecté",
      "absencePrompt": "{player} est hors ligne depuis deux minutes. Attendre ou terminer la partie ?",
      "opponent": "Adversaire",
      "roomNamePlaceholder": "Nom de la partie",
      "roomNamePrompt": "Saisissez un nom court pour identifier cette partie dans la liste.",
      "roomNameTitle": "Nom de la partie",
      "roomVisibility": {
        "public": "Partie publique (les spectateurs peuvent la regarder)",
        "private": "Partie privée (les spectateurs ne peuvent pas la regarder)"
      },
      "invites": {
        "receiveLabel": "Réception des invitations :",
        "enabled": "Activée",
        "disabled": "Désactivée",
        "receivingEnabled": "Réception des invitations activée.",
        "receivingDisabled": "Réception des invitations désactivée.",
        "notAccepting": "Ce joueur n’accepte pas les invitations pour le moment.",
        "activeMatchTitle": "Vous avez une partie en cours",
        "leaveActivePrompt": "Vous avez déjà une partie en ligne active. La quitter et envoyer cette invitation ?",
        "leaveAndSend": "Quitter et envoyer l’invitation"
      },
      "syncFail": "La partie n’a pas pu être actualisée. Vérifiez votre connexion puis réessayez.",
      "syncIssueNotice": "Les derniers changements de la partie ne sont pas affichés. Appuyez sur Actualiser pour les recharger.",
      "waitingAcceptance": "Invitation envoyée. En attente de la réponse du joueur.",
      "status": {
        "available": "Disponible",
        "inPvP": "Dans une partie en ligne"
      },
      "playersLoadFail": "Impossible de charger les joueurs connectés. Actualisez le lobby et réessayez."
    },
    "stats": {
      "left": "Pièces restantes",
      "kings": "Rois",
      "captured": "Capturées"
    },
    "spectator": {
      "only": "Cette partie se joue entre deux autres joueurs. Vous êtes actuellement simple spectateur et vous n’êtes pas autorisé à déplacer les pièces."
    },
    "langs": {
      "en": "English",
      "ar": "العربية",
      "fr": "Français"
    },
    "chain": {
      "notice": {
        "body": "Appuyez sur le minuteur de fin de prise pour terminer votre tour.\nRemarque : si une autre prise est disponible, terminez d’abord la chaîne.",
        "inactive": "Le minuteur de fin de prise fonctionne uniquement lorsqu’une prise est en cours, et c’est lui qui termine le tour du joueur."
      }
    },
    "actions": {
      "ok": "OK",
      "accept": "Accepter",
      "continue": "Continuer",
      "invite": "Inviter",
      "reject": "Refuser",
      "wait": "Attendre",
      "cancel": "Annuler",
      "close": "Fermer",
      "back": "Retour",
      "send": "Envoyer"
    },
    "meta_description": "Une version web du jeu mauritanien Zamat pour jouer en ligne en arabe, anglais et français.",
    "topbar": {
      "logout": "Déconnexion",
      "account": "Compte",
      "login": "Connexion"
    },
    "game": {
      "title": "Jeu de Dhamet mauritanien"
    },
    "schema_game_name": "Zamat mauritanien",
    "schema_game_genre": "Jeu de stratégie",
    "schema_game_type": "Game",
    "undo": {
      "applied": "Le dernier coup a été annulé.",
      "failed": "Le coup n’a pas pu être annulé.",
      "notCommitted": "Le coup n’a pas été annulé, car la partie a continué avant la fin de la demande. Appuyez sur Actualiser puis réessayez.",
      "rejected": "L’autre joueur a refusé la demande d’annulation.",
      "rejectedTitle": "Demande d’annulation refusée",
      "spectatorRequested": "{player} a demandé l’annulation du dernier coup.",
      "spectatorAccepted": "{responder} a accepté la demande de {requester} d’annuler le dernier coup indiqué par la flèche jaune inversée.",
      "spectatorRejected": "{responder} a refusé la demande de {requester} d’annuler le dernier coup.",
      "requesterAccepted": "{responder} a accepté d’annuler le dernier coup indiqué par la flèche jaune inversée.",
      "requesterRejected": "{responder} a refusé d’annuler le dernier coup.",
      "request": {
        "body": "{name} souhaite annuler le dernier coup. Acceptez-vous ?",
        "title": "Demande d’annulation"
      },
      "requestFailed": "La demande d’annulation n’a pas pu être envoyée. Vérifiez votre connexion et réessayez.",
      "wait": {
        "body": "Demande envoyée. En attente de la réponse de l’autre joueur."
      }
    },
    "errors": {
      "nick": {
        "required": "Le pseudo est requis.",
        "tooShort": "Le pseudo est trop court.",
        "tooLong": "Le pseudo est trop long.",
        "invalid": "Pseudo invalide."
      },
      "render3d": {
        "failed": "Impossible de lancer la vue 3D. Retour au mode 2D."
      }
    }
  }
};
  window.translations = translations;

function deepGet(obj, key) {
    const segs = String(key || "").split(".");
    let cur = obj;
    for (const s of segs) {
      if (!cur || typeof cur !== "object") return undefined;
      cur = cur[s];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    const repl = function (_, k) {
      const v = vars[k];
      return v === undefined || v === null ? "" : String(v);
    };
    let out = String(str).replace(/\$\{(\w+)\}/g, repl);
    out = out.replace(/\{(\w+)\}/g, repl);
    return out;
  }

  function tr(lang, key, vars) {
    const L = translations[lang] || translations.ar || {};
    const A = translations.ar || {};
    let out = deepGet(L, key);
    if (typeof out !== "string") out = deepGet(A, key);
    if (typeof out !== "string") out = String(key || "");
    return interpolate(out, vars);
  }

  function currentLang() {
    const l = (document.documentElement && document.documentElement.lang) || "";
    return translations[l] ? l : "ar";
  }

  window.t = function (key, vars) {
    return tr(currentLang(), key, vars);
  };

  window.tr = function (key, fallback, vars) {
    try {
      const v = window.t(key, vars);
      if (!v || v === key) return fallback != null ? fallback : v;
      return v;
    } catch (_) {
      return fallback != null ? fallback : String(key || "");
    }
  };

  function applyI18nDom(root, lang) {
    const scope = root || document;
    const useLang = translations[lang] ? lang : currentLang();
    const get = (key, vars) => tr(useLang, key, vars);

    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      const val = get(k);
      if (el.tagName === 'META') el.setAttribute('content', val);
      else el.textContent = val;
    });
    scope.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const k = el.getAttribute('data-i18n-html');
      if (!k) return;
      el.innerHTML = get(k);
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
      const k = el.getAttribute('data-i18n-aria-label');
      if (k) el.setAttribute('aria-label', get(k));
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const k = el.getAttribute('data-i18n-title');
      if (k) el.setAttribute('title', get(k));
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      if (k) el.setAttribute('placeholder', get(k));
    });
    scope.querySelectorAll('[data-i18n-alt]').forEach((el) => {
      const k = el.getAttribute('data-i18n-alt');
      if (k) el.setAttribute('alt', get(k));
    });

    try {
      document.documentElement.classList.remove('lang-ar', 'lang-en', 'lang-fr');
      document.documentElement.classList.add('lang-' + useLang);
      document.documentElement.setAttribute('lang', useLang);
      document.documentElement.setAttribute('dir', useLang === 'ar' ? 'rtl' : 'ltr');
    } catch (_) {}

    return useLang;
  }

  window.I18N = window.I18N || {};
  window.I18N.getLang = currentLang;
  window.I18N.translate = function (key, vars, fallback, lang) {
    try {
      const v = tr(translations[lang] ? lang : currentLang(), key, vars);
      if (!v || v === key) return fallback != null ? fallback : v;
      return v;
    } catch (_) {
      return fallback != null ? fallback : String(key || '');
    }
  };
  window.I18N.text = function (key, vars, lang) {
    try {
      return window.I18N.translate(key, vars, String(key || ''), lang);
    } catch (_) {
      return String(key || '');
    }
  };
  window.I18N.translateArgs = function (key, fallbackOrVars, varsMaybe, lang) {
    let fallback = null;
    let vars = null;
    if (fallbackOrVars && typeof fallbackOrVars === 'object' && !Array.isArray(fallbackOrVars)) {
      vars = fallbackOrVars;
    } else {
      fallback = fallbackOrVars;
      vars = varsMaybe;
    }
    return window.I18N.translate(key, vars, fallback, lang);
  };
  window.I18N.apply = function (root, lang) {
    return applyI18nDom(root || document, lang);
  };
  window.I18N.setLang = function (lang, root) {
    const useLang = translations[lang] ? lang : 'ar';
    try { document.documentElement.setAttribute('lang', useLang); } catch (_) {}
    return applyI18nDom(root || document, useLang);
  };

  function applyExtras() {
    const lang = currentLang();
    const langSel = document.getElementById("langSel");
    if (langSel && langSel.options) {
      for (const opt of langSel.options) {
        if (opt.value === "ar") opt.textContent = tr(lang, "langs.ar");
        else if (opt.value === "en") opt.textContent = tr(lang, "langs.en");
        else if (opt.value === "fr") opt.textContent = tr(lang, "langs.fr");
      }
    }

  }

  let scheduled = false;
  function applyDir() {
    const lang = currentLang();
    const dir = String(lang || "")
      .toLowerCase()
      .startsWith("ar")
      ? "rtl"
      : "ltr";
    const langShort = String(lang || "en")
      .toLowerCase()
      .startsWith("ar")
      ? "ar"
      : String(lang || "")
            .toLowerCase()
            .startsWith("fr")
        ? "fr"
        : "en";
    try {
      document.documentElement.setAttribute("lang", langShort);
    } catch (_) {}
    try {
      if (document.body) document.body.setAttribute("lang", langShort);
    } catch (_) {}

    try {
      document.documentElement.setAttribute("dir", dir);
    } catch (_) {}
    try {
      if (document.body) document.body.setAttribute("dir", dir);
    } catch (_) {}
    try {
      if (document.body) document.body.classList.toggle("lang-ar", dir === "rtl");
    } catch (_) {}
  }
  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    (window.requestAnimationFrame || window.setTimeout)(function () {
      scheduled = false;
      applyDir();

      /*
       * Keep DOM translations synchronized when i18n.js loads after the shell,
       * when the language is changed, or when caching changes script execution
       * order.
       */
      try {
        applyI18nDom(document, currentLang());
      } catch (_) {}

      applyExtras();
      try {
        if (window.LogMgr && typeof window.LogMgr.retranslate === "function")
          window.LogMgr.retranslate();
      } catch (_) {}
      try {
        if (window.Modal && typeof window.Modal.setDir === "function") window.Modal.setDir();
      } catch (_) {}
    }, 0);
  }

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          scheduleApply();
        },
        { once: true },
      );
    } else {
      scheduleApply();
    }

    const mo1 = new MutationObserver(function () {
      scheduleApply();
    });
    mo1.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang"],
    });

    const mo2 = new MutationObserver(function () {
      scheduleApply();
    });
    if (document.body) {
      mo2.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          if (document.body) mo2.observe(document.body, { childList: true, subtree: true });
        },
        { once: true },
      );
    }
  }

  init();
})();
