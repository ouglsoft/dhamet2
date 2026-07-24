(function () {
  "use strict";

  const MAIN_MODE_URL = "https://ouglsoft.com/dhamet/pages/mode.html";

  function readStoredTheme() {
    let theme = null;
    try {
      const rawSession = sessionStorage.getItem("zamat.settings.v1");
      const rawLocal = localStorage.getItem("zamat.settings.v1");
      const raw = rawSession || rawLocal;
      const parsed = raw && JSON.parse(raw);
      theme = parsed && parsed.theme;
    } catch (_) {}
    if (theme !== "dark" && theme !== "light") {
      try { theme = localStorage.getItem("zamat.theme"); } catch (_) {}
    }
    return theme === "dark" ? "dark" : "light";
  }

  function applyTheme() {
    try { document.documentElement.classList.toggle("dark", readStoredTheme() === "dark"); } catch (_) {}
  }

  function tr(key, fallback) {
    try {
      if (window.I18N && typeof window.I18N.text === "function") {
        return window.I18N.text(key, null, document.documentElement.lang || "ar") || fallback;
      }
      if (window.I18N && typeof window.I18N.translateArgs === "function") {
        return window.I18N.translateArgs(key) || fallback;
      }
    } catch (_) {}
    return fallback;
  }

  function currentLang() {
    try {
      if (window.ZShell && typeof window.ZShell.getLang === "function") return window.ZShell.getLang() || "ar";
    } catch (_) {}
    return document.documentElement.lang || "ar";
  }

  function createLanguageSelect() {
    const select = document.createElement("select");
    select.id = "zLangSel";
    select.className = "z-lang-select";
    select.setAttribute("data-i18n-aria-label", "ui.language");
    select.setAttribute("data-i18n-title", "ui.language");
    [
      ["ar", "langs.ar", "العربية"],
      ["en", "langs.en", "English"],
      ["fr", "langs.fr", "Français"]
    ].forEach(([code, key, label]) => {
      const option = document.createElement("option");
      option.value = code;
      option.setAttribute("data-i18n", key);
      option.textContent = label;
      select.appendChild(option);
    });
    select.value = currentLang();
    select.addEventListener("change", function () {
      try { window.ZShell && window.ZShell.setLang && window.ZShell.setLang(select.value); } catch (_) {}
      syncPublicLinks();
      syncTopbarText();
    });
    return select;
  }

  function publicLinks() {
    try { return window.ZShell && window.ZShell.getPublicLinks ? window.ZShell.getPublicLinks("..") : []; }
    catch (_) { return []; }
  }

  function syncPublicLinks() {
    const map = {};
    publicLinks().forEach((item) => { map[item.legalKind] = item.href; });
    document.querySelectorAll("[data-ouglsoft-link]").forEach((node) => {
      const kind = node.getAttribute("data-ouglsoft-link");
      if (map[kind]) node.href = map[kind];
    });
  }

  function syncTopbarText() {
    const title = document.querySelector(".z-topbar-title-link");
    if (title) title.textContent = tr("game.title", "لعبة ظامت الموريتانية");
    const home = document.querySelector(".z-nav-home");
    if (home) home.textContent = tr("buttons.home", "الرئيسية");
    document.querySelectorAll(".z-topbar [data-i18n]").forEach((node) => {
      const key = node.getAttribute("data-i18n");
      if (!key) return;
      const value = tr(key, node.textContent || "");
      if (value) node.textContent = value;
    });
    const select = document.getElementById("zLangSel");
    if (select) select.value = currentLang();
  }

  function buildTopbar() {
    const header = document.createElement("header");
    header.className = "z-topbar";

    const inner = document.createElement("div");
    inner.className = "z-topbar-inner";

    const navWrap = document.createElement("div");
    navWrap.className = "z-topbar-nav";
    const toggle = document.createElement("button");
    toggle.className = "z-nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("data-i18n-aria-label", "aria.menu");
    toggle.innerHTML = '<span class="z-hamburger" aria-hidden="true"><span></span></span>';

    const nav = document.createElement("nav");
    nav.className = "z-nav";
    nav.setAttribute("data-i18n-aria-label", "aria.primaryNav");
    const home = document.createElement("a");
    home.className = "z-nav-home";
    home.href = "https://ouglsoft.com";
    home.setAttribute("data-i18n", "buttons.home");
    home.textContent = "الرئيسية";
    nav.appendChild(home);
    publicLinks().forEach((item) => {
      const link = document.createElement("a");
      link.href = item.href;
      link.setAttribute("data-ouglsoft-link", item.legalKind || "");
      link.setAttribute("data-i18n", item.key);
      link.textContent = item.key;
      nav.appendChild(link);
    });
    navWrap.append(toggle, nav);

    const titleWrap = document.createElement("div");
    titleWrap.className = "z-topbar-title";
    const title = document.createElement("a");
    title.className = "z-topbar-title-link z-nav-home-title";
    title.href = MAIN_MODE_URL;
    title.setAttribute("data-i18n", "game.title");
    title.textContent = "لعبة ظامت الموريتانية";
    titleWrap.appendChild(title);

    const right = document.createElement("div");
    right.className = "z-topbar-right";
    const langMount = document.createElement("div");
    langMount.className = "z-topbar-lang";
    langMount.id = "zTopbarLangMount";
    langMount.appendChild(createLanguageSelect());
    const account = document.createElement("div");
    account.className = "z-topbar-account";
    account.id = "zAccountArea";
    account.innerHTML = '<div class="z-acc-desktop"><a class="btn small secondary z-acc-btn" href="https://ouglsoft.com/dhamet/index.html" data-i18n="topbar.login">تسجيل الدخول</a></div>';
    right.append(langMount, account);

    inner.append(navWrap, titleWrap, right);
    header.appendChild(inner);

    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      const open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (event) {
      if (!header.contains(event.target)) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
    return header;
  }

  function isPhone() {
    try { return !!(window.ZCommon && window.ZCommon.isPhoneLike && window.ZCommon.isPhoneLike()); }
    catch (_) { return false; }
  }

  function ensureDesktopShell() {
    if (!document.body) return;
    document.body.classList.add("z-page-body", "z-home-page");
    if (/\/game\.html$/i.test(location.pathname)) document.body.classList.add("z-game-page");
    const mobile = isPhone();
    document.body.classList.toggle("z-has-topbar", !mobile);
    let topbar = document.querySelector(".z-topbar");
    if (!mobile && !topbar) {
      topbar = buildTopbar();
      document.body.insertBefore(topbar, document.body.firstChild);
    }
    if (mobile && topbar) topbar.remove();
    syncPublicLinks();
    syncTopbarText();
    const refresh = document.getElementById("btnLobbyManualRefresh");
    if (refresh && !refresh.__dhametRefreshBound) {
      refresh.__dhametRefreshBound = true;
      refresh.addEventListener("click", function () { location.reload(); });
    }
    try { window.I18N && window.I18N.apply && window.I18N.apply(document, currentLang()); } catch (_) {}
  }

  applyTheme();
  try {
    if (window.ZCommon && window.ZCommon.isPhoneLike && window.ZCommon.isPhoneLike()) {
      document.documentElement.classList.add("z-mobile-preinit");
    }
  } catch (_) {}

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureDesktopShell, { once: true });
  else ensureDesktopShell();
  window.addEventListener("resize", ensureDesktopShell, { passive: true });
  window.addEventListener("pageshow", function () { applyTheme(); ensureDesktopShell(); }, { passive: true });

  window.DhametVisualShell = Object.freeze({ refresh: ensureDesktopShell, applyTheme });
})();
