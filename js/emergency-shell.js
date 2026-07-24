(function () {
  "use strict";

  const SESSION_KEY = "dhamet2.anonymous.session.v1";
  const LANG_KEY = "zamat.lang";
  const NICK_KEY = "zamat.nick";
  const ICON_KEY = "zamat.icon";
  const DEFAULT_ICON = "assets/icons/users/autouser1.png";

  function pagePrefix() {
    try { return String(location.pathname || "").includes("/pages/") ? "../" : ""; }
    catch (_) { return ""; }
  }
  function assetUrl(path) {
    const value = String(path || "").replace(/^\/+/, "");
    return pagePrefix() + value;
  }
  function getLang() {
    try { return localStorage.getItem(LANG_KEY) || document.documentElement.lang || "ar"; }
    catch (_) { return document.documentElement.lang || "ar"; }
  }
  function setLang(lang) {
    const value = ["ar", "en", "fr"].includes(String(lang)) ? String(lang) : "ar";
    try { localStorage.setItem(LANG_KEY, value); } catch (_) {}
    document.documentElement.lang = value;
    document.documentElement.dir = value === "ar" ? "rtl" : "ltr";
    try { window.I18N && window.I18N.apply && window.I18N.apply(document, value); } catch (_) {}
    return value;
  }
  function randomNick(uid) {
    const suffix = String(uid || "guest").replace(/[^a-z0-9]/gi, "").slice(-5).toUpperCase() || Math.floor(1000 + Math.random() * 9000);
    return "ضيف " + suffix;
  }
  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const user = window.firebase && firebase.auth ? firebase.auth().currentUser : null;
    if (!user || !user.isAnonymous) return null;
    let nickname = "";
    try { nickname = localStorage.getItem(NICK_KEY) || ""; } catch (_) {}
    if (!nickname) nickname = randomNick(user.uid);
    let icon = DEFAULT_ICON;
    try { icon = localStorage.getItem(ICON_KEY) || DEFAULT_ICON; } catch (_) {}
    return { kind: "guest", uid: user.uid, nickname, nick: nickname, icon, anonymous: true };
  }
  function writeSession(user) {
    if (!user || !user.uid) return null;
    let nickname = "";
    try { nickname = localStorage.getItem(NICK_KEY) || ""; } catch (_) {}
    if (!nickname) {
      nickname = randomNick(user.uid);
      try { localStorage.setItem(NICK_KEY, nickname); } catch (_) {}
    }
    let icon = DEFAULT_ICON;
    try {
      icon = localStorage.getItem(ICON_KEY) || DEFAULT_ICON;
      localStorage.setItem(ICON_KEY, icon);
    } catch (_) {}
    const session = { kind: "guest", uid: user.uid, nickname, nick: nickname, icon, anonymous: true };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
    return session;
  }
  function firebaseConfigReady(config) {
    const value = config && typeof config === "object" ? config : {};
    const required = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
    return required.every((key) => {
      const field = String(value[key] || "").trim();
      return field && !field.includes("REPLACE_WITH_");
    });
  }
  function initFirebase() {
    if (!firebaseConfigReady(window.firebaseConfig)) {
      throw new Error("firebase-config-required");
    }
    if (!window.firebase || !firebase.initializeApp) return false;
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.firebaseConfig);
      return !!(firebase.auth && firebase.database);
    } catch (error) {
      if (error && error.message === "firebase-config-required") throw error;
      return false;
    }
  }
  async function ensureAnonymous() {
    if (!initFirebase()) throw new Error("firebase-unavailable");
    const auth = firebase.auth();
    try { await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); } catch (_) {}
    let user = auth.currentUser;
    if (user && !user.isAnonymous) {
      await auth.signOut();
      user = null;
    }
    if (!user) {
      const result = await auth.signInAnonymously();
      user = result && result.user ? result.user : auth.currentUser;
    }
    if (!user) throw new Error("anonymous-auth-failed");
    writeSession(user);
    return user;
  }

  window.ZIconManifest = [
    "assets/icons/users/user1.png", "assets/icons/users/user2.png", "assets/icons/users/user3.png",
    "assets/icons/users/user4.png", "assets/icons/users/user5.png", "assets/icons/users/user6.png",
    "assets/icons/users/user7.png", "assets/icons/users/user8.png", "assets/icons/users/user9.png",
    "assets/icons/users/user10.png", "assets/icons/users/user11.png", "assets/icons/users/user12.png",
    "assets/icons/users/user13.png", "assets/icons/users/user14.png", "assets/icons/users/user15.png",
    "assets/icons/users/user16.png", "assets/icons/users/user17.png", "assets/icons/users/user18.png",
    "assets/icons/users/user19.png", "assets/icons/users/user20.png",
    "assets/icons/users/autouser1.png", "assets/icons/users/autouser2.png"
  ];
  window.ZCommon = Object.assign(window.ZCommon || {}, {
    qs: (selector, root) => (root || document).querySelector(selector),
    qsa: (selector, root) => Array.from((root || document).querySelectorAll(selector)),
    pageAssetPrefix: pagePrefix,
    pageAssetUrl: assetUrl,
    getLang,
    getAllowedUserIcons: () => window.ZIconManifest.slice(),
    sanitizeUserIconPath: (value) => {
      const clean = String(value || "").replace(/^(?:\.\.\/)+/, "").replace(/^\/+/, "");
      return window.ZIconManifest.includes(clean) ? clean : DEFAULT_ICON;
    }
  });
  window.ZShell = Object.assign(window.ZShell || {}, {
    getLang, setLang,
    getPublicLinks: () => [],
    getFooterText: () => "",
    createStartPlayButton: () => null
  });
  window.ZAuth = Object.freeze({ initFirebase, ensureAnonymous, readSession, writeSession, firebaseConfigReady });
  window.DhametEmergency = Object.freeze({ ensureAnonymous, readSession, randomNick });

  document.documentElement.classList.add("auth-pending");
  const ready = ensureAnonymous()
    .then(() => { document.documentElement.classList.remove("auth-pending"); document.documentElement.classList.add("auth-ready"); })
    .catch((error) => {
      document.documentElement.classList.remove("auth-pending");
      document.documentElement.classList.add("auth-failed");
      const target = document.getElementById("emergencyAuthStatus");
      if (target) {
        target.textContent = error && error.message === "firebase-config-required"
          ? "لم تُضبط إعدادات مشروع Firebase الخاص بـ dhamet2 بعد."
          : "تعذر الاتصال بخدمة اللعب الاحتياطية. أعد المحاولة لاحقًا.";
      }
      console.error("Anonymous Firebase initialization failed", error);
    });
  window.DhametEmergencyReady = ready;
})();
