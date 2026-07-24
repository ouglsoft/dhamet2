# نشر Dhamet2

راجع دليل التسليم الخارجي `DHAMET_FINAL_DEPLOYMENT_GUIDE_V2.md` للخطوات الكاملة.

1. أنشئ مشروع Firebase جديدًا مستقلًا عن مشروع `dhamet.ouglsoft.com`.
2. فعّل Anonymous Authentication وأنشئ Realtime Database في Locked mode.
3. إعداد Web ومعرف المشروع `dhamet2` مضافان بالفعل في `js/firebase.config.js` و`.firebaserc`.
4. انشر القواعد: `firebase deploy --only database`.
5. نفذ `npm test && npm run build`.
6. اربط المستودع الجديد بـCloudflare Pages، ومجلد الإخراج `_site`.
7. اختبر نطاق Pages المؤقت، ثم أضف `dhamet2.ouglsoft.com`.
