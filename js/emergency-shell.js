(function () {
  "use strict";

  const BUILD_VERSION = "__DHAMET_BUILD__";
  window.DHAMET2_BUILD_VERSION = BUILD_VERSION;
  try { console.info("Dhamet2 build", BUILD_VERSION); } catch (_) {}

  const SESSION_KEY = "dhamet2.anonymous.session.v1";
  const AUTH_BROWSER_KEY = "dhamet2.auth.browser.v4";
  const BROWSER_SESSION_COOKIE = "dhamet2_browser_session";
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

  function isPhoneLike() {
    const w = Math.max(0, window.innerWidth || 0);
    const h = Math.max(0, window.innerHeight || 0);
    const sw = Math.max(0, (window.screen && window.screen.width) || 0);
    const sh = Math.max(0, (window.screen && window.screen.height) || 0);
    const screenShort = Math.min(sw || w, sh || h) || Math.min(w, h);
    let ua = "";
    let touch = 0;
    try {
      touch = Math.max(0, navigator.maxTouchPoints || 0);
      ua = String(navigator.userAgent || navigator.vendor || "");
    } catch (_) {}
    if (/Android.+Mobile|iPhone|iPod|Windows Phone|Opera Mini|IEMobile|Mobile Safari/i.test(ua)) return true;
    if (/iPad|Tablet|Silk|Android(?!.*Mobile)/i.test(ua)) return screenShort <= 1024;
    if (/Windows NT|Macintosh|X11|CrOS|Linux x86_64/i.test(ua)) return touch > 0 && screenShort > 0 && screenShort <= 600;
    return touch > 0 && screenShort > 0 && screenShort <= 600;
  }

  function publicLanguage() {
    const lang = String(getLang() || "ar").toLowerCase();
    return lang.startsWith("fr") ? "fr" : (lang.startsWith("ar") ? "ar" : "en");
  }

  function publicUrl(kind) {
    const lang = publicLanguage();
    let legalBase = "https://ouglsoft.com/legal/dhamet";
    if (lang === "ar") legalBase += "/ar";
    else if (lang === "fr") legalBase += "/fr";
    if (kind === "rules") return legalBase + "/rules.html";
    if (kind === "privacy") return legalBase + "/privacy-policy.html";
    if (kind === "terms") return legalBase + "/terms-of-use.html";
    if (kind === "contact") {
      if (lang === "ar") return "https://ouglsoft.com/ar/pages/contact.html";
      if (lang === "fr") return "https://ouglsoft.com/fr/pages/contact.html";
      return "https://ouglsoft.com/pages/contact.html";
    }
    return "https://ouglsoft.com";
  }

  function getPublicLinks() {
    return [
      { href: publicUrl("terms"), key: "pages.nav.terms", shortKey: "pages.navShort.terms", external: true, legalKind: "terms" },
      { href: publicUrl("privacy"), key: "pages.nav.privacy", shortKey: "pages.navShort.privacy", external: true, legalKind: "privacy" },
      { href: publicUrl("rules"), key: "pages.nav.rules", shortKey: "pages.nav.rules", external: true, legalKind: "rules" },
      { href: publicUrl("contact"), key: "pages.nav.contact", shortKey: "pages.navShort.contact", external: true, legalKind: "contact" }
    ];
  }

  function getFooterText() {
    const year = new Date().getFullYear();
    try {
      if (window.I18N && typeof window.I18N.text === "function") return window.I18N.text("pages.footer.text", { year });
    } catch (_) {}
    return "© " + year + " العُقل للبرمجيات / El Ougl Software SARL — جميع الحقوق محفوظة";
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
  function withTimeout(promise, timeoutMs, code) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error(code || "firebase-operation-timeout"));
      }, Math.max(500, Number(timeoutMs || 7000)));
      Promise.resolve(promise).then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }
  function randomSessionId() {
    try {
      if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
        const bytes = new Uint8Array(18);
        globalThis.crypto.getRandomValues(bytes);
        return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
      }
    } catch (_) {}
    return String(Date.now()) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
  function readCookie(name) {
    try {
      const prefix = encodeURIComponent(name) + "=";
      const rows = String(document.cookie || "").split(/;\s*/);
      for (const row of rows) if (row.indexOf(prefix) === 0) return decodeURIComponent(row.slice(prefix.length));
    } catch (_) {}
    return "";
  }
  function ensureBrowserSessionId() {
    let id = readCookie(BROWSER_SESSION_COOKIE);
    if (id) return id;
    id = randomSessionId();
    try {
      const secure = location && location.protocol === "https:" ? "; Secure" : "";
      document.cookie = encodeURIComponent(BROWSER_SESSION_COOKIE) + "=" + encodeURIComponent(id) + "; Path=/; SameSite=Lax" + secure;
    } catch (_) {}
    return id;
  }
  function readBrowserAuthMarker() {
    try {
      const raw = localStorage.getItem(AUTH_BROWSER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
  function markBrowserAuth(user, browserSessionId) {
    try {
      localStorage.setItem(AUTH_BROWSER_KEY, JSON.stringify({
        sessionId: String(browserSessionId || ""),
        uid: String((user && user.uid) || ""),
        ts: Date.now(),
      }));
    } catch (_) {}
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
  let ensureAnonymousPromise = null;

  function waitForInitialAuthState(auth, timeoutMs) {
    return new Promise((resolve) => {
      let settled = false;
      let unsubscribe = null;
      const finish = (user) => {
        if (settled) return;
        settled = true;
        try { if (unsubscribe) unsubscribe(); } catch (_) {}
        resolve(user || null);
      };
      try {
        unsubscribe = auth.onAuthStateChanged((user) => finish(user), () => finish(auth.currentUser || null));
      } catch (_) {
        finish(auth.currentUser || null);
        return;
      }
      setTimeout(() => finish(auth.currentUser || null), Math.max(500, Number(timeoutMs || 3500)));
    });
  }

  async function signInFreshAnonymous(auth, browserSessionId) {
    try { await withTimeout(auth.signOut(), 4000, "anonymous-signout-timeout"); } catch (_) {}
    const result = await withTimeout(auth.signInAnonymously(), 9000, "anonymous-signin-timeout");
    const user = result && result.user ? result.user : auth.currentUser;
    if (!user || !user.isAnonymous) throw new Error("anonymous-auth-failed");
    try { await withTimeout(user.getIdToken(true), 7000, "anonymous-token-timeout"); } catch (_) {}
    markBrowserAuth(user, browserSessionId);
    return user;
  }

  async function ensureAnonymous() {
    if (ensureAnonymousPromise) return ensureAnonymousPromise;
    ensureAnonymousPromise = (async () => {
      if (!initFirebase()) throw new Error("firebase-unavailable");
      const auth = firebase.auth();
      // Firebase LOCAL persistence shares one anonymous UID between tabs. A
      // first-party session cookie scopes that UID to the current browser
      // session, so a full browser restart receives a fresh guest identity.
      const browserSessionId = ensureBrowserSessionId();
      try {
        await withTimeout(auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL), 4000, "auth-persistence-timeout");
      } catch (_) {}

      let user = await waitForInitialAuthState(auth, 4000);
      const marker = readBrowserAuthMarker();
      const markerMatches = !!(
        marker && marker.sessionId && marker.uid && user &&
        String(marker.sessionId) === String(browserSessionId) &&
        String(marker.uid) === String(user.uid)
      );
      let tokenHealthy = false;
      if (user && user.isAnonymous && markerMatches) {
        try {
          await withTimeout(user.getIdToken(true), 7000, "anonymous-token-timeout");
          tokenHealthy = true;
        } catch (_) {
          tokenHealthy = false;
        }
      }
      if (!tokenHealthy) user = await signInFreshAnonymous(auth, browserSessionId);
      if (!user || !user.isAnonymous) throw new Error("anonymous-auth-failed");

      try { firebase.database().goOnline(); } catch (_) {}
      markBrowserAuth(user, browserSessionId);
      writeSession(user);
      return user;
    })().finally(() => { ensureAnonymousPromise = null; });
    return ensureAnonymousPromise;
  }

  async function resetAnonymous() {
    if (!initFirebase()) throw new Error("firebase-unavailable");
    const auth = firebase.auth();
    ensureAnonymousPromise = null;
    const browserSessionId = ensureBrowserSessionId();
    try { await withTimeout(auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL), 4000, "auth-persistence-timeout"); } catch (_) {}
    const user = await signInFreshAnonymous(auth, browserSessionId);
    try { firebase.database().goOnline(); } catch (_) {}
    markBrowserAuth(user, browserSessionId);
    writeSession(user);
    return user;
  }

  window.ZIconManifest = [
    "assets/icons/users/user1.png", "assets/icons/users/user2.png", "assets/icons/users/user3.png",
    "assets/icons/users/user4.png", "assets/icons/users/user5.png", "assets/icons/users/user6.png",
    "assets/icons/users/user7.png", "assets/icons/users/user8.png", "assets/icons/users/user9.png",
    "assets/icons/users/user11.png", "assets/icons/users/user12.png",
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
    isPhoneLike,
    getAllowedUserIcons: () => window.ZIconManifest.slice(),
    sanitizeUserIconPath: (value) => {
      let clean = String(value || "").replace(/^(?:\.\.\/)+/, "").replace(/^\/+/, "");
      if (/^assets\/icons\/users\/user10\.png$/i.test(clean)) clean = "assets/icons/users/autouser2.png";
      return window.ZIconManifest.includes(clean) ? clean : DEFAULT_ICON;
    }
  });
  window.ZShell = Object.assign(window.ZShell || {}, {
    getLang, setLang,
    getPublicLinks,
    getFooterText,
    createStartPlayButton: () => null
  });
  window.ZAuth = Object.freeze({ initFirebase, ensureAnonymous, resetAnonymous, readSession, writeSession, firebaseConfigReady });
  window.DhametEmergency = Object.freeze({ ensureAnonymous, resetAnonymous, readSession, randomNick });

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
