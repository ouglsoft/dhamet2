(function () {
  var Common = window.ZCommon || {};
  var qs = typeof Common.qs === "function" ? Common.qs : function(sel, root) { return (root || document).querySelector(sel); };
  var qsa = typeof Common.qsa === "function" ? Common.qsa : function(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var GAME_LOOP = 0;
  var RESPONSIVE_LOOP = 0;
  var GAME_LAYOUT_OBSERVER = null;
  var GAME_BODY_OBSERVER = null;
  var GAME_LAYOUT_MUTATING = 0;
  // True only after the game DOM has actually been moved into a mobile layout.
  // Routine desktop state refreshes must not remount the sidebar controls.
  var GAME_LAYOUT_MOBILE_ACTIVE = false;
  var GAME_HOME_RECORDS = [];
  var LAST_GAME_MODE = null;
  var MOBILE_PAGES = { lobby: 1, game: 1 };
  var ORIENTATION_REQUEST_TARGET = '';
  var ORIENTATION_REQUEST_TIMER = 0;
  var ORIENTATION_PREF_KEY = 'zamat.mobile.orientation.v1';

  /* Page detection */

  function pathName() {
    return String(location.pathname || '').toLowerCase();
  }

  function pageType() {
    var path = pathName();
    if (path.indexOf('/loby') !== -1) return 'lobby';
    if (path.indexOf('/game') !== -1) return 'game';
    return 'generic';
  }

/* Shared helpers */

  function baseHref() {
    return pathName().indexOf('/pages/') !== -1 ? '..' : '.';
  }

  function currentLang() {
    try {
      if (typeof Common.getLang === 'function') return Common.getLang() || document.documentElement.lang || 'ar';
    } catch (_) {}
    return document.documentElement.lang || 'ar';
  }

  function activityLogTitle() {
    var lang = currentLang();
    if (lang === 'fr') return 'Journal des activités';
    if (lang === 'en') return 'Activity log';
    return 'سجل الأنشطة';
  }

  function isLandscape() {
    try {
      var type = window.screen && window.screen.orientation && window.screen.orientation.type;
      if (typeof type === 'string') {
        if (type.indexOf('landscape') === 0) return true;
        if (type.indexOf('portrait') === 0) return false;
      }
    } catch (_) {}
    try {
      if (window.matchMedia) return !!window.matchMedia('(orientation: landscape)').matches;
    } catch (_) {}
    return (window.innerWidth || 0) > (window.innerHeight || 0);
  }

  function isPhone() {
    try {
      if (typeof Common.isPhoneLike === 'function') return Common.isPhoneLike();
    } catch (_) {}
    return false;
  }


  function navigationIsBackForward() {
    try {
      var entries = performance && typeof performance.getEntriesByType === 'function'
        ? performance.getEntriesByType('navigation')
        : [];
      return !!(entries && entries[0] && entries[0].type === 'back_forward');
    } catch (_) {}
    try { return performance && performance.navigation && performance.navigation.type === 2; } catch (_) {}
    return false;
  }

  function getPreferredOrientation() {
    try {
      var value = String(sessionStorage.getItem(ORIENTATION_PREF_KEY) || '');
      return value === 'landscape' || value === 'portrait' ? value : '';
    } catch (_) { return ''; }
  }

  function setPreferredOrientation(value) {
    try {
      if (value === 'landscape' || value === 'portrait') sessionStorage.setItem(ORIENTATION_PREF_KEY, value);
      else sessionStorage.removeItem(ORIENTATION_PREF_KEY);
    } catch (_) {}
  }

  async function restorePreferredOrientation() {
    if (!isPhone()) return false;
    if (navigationIsBackForward()) {
      setPreferredOrientation('');
      return false;
    }
    var target = getPreferredOrientation();
    if (!target || (target === 'landscape') === isLandscape()) return true;

    ORIENTATION_REQUEST_TARGET = target;
    expireOrientationRequest(target);
    try {
      if (window.screen && screen.orientation && screen.orientation.lock) {
        // A generic landscape lock follows either physical landscape direction.
        // A primary-only landscape lock would pin the interface to one side.
        await screen.orientation.lock(target);
        return true;
      }
    } catch (error) {
      reportOrientationFailure(error);
    }
    clearOrientationRequest(target);
    return false;
  }
  function backTarget() {
    return pageType() === 'lobby' ? 'https://ouglsoft.com/dhamet/pages/mode.html' : '';
  }

  function setLanguage(lang) {
    var nextLang = lang || 'ar';
    var sel = qs('#langSel');
    var applied = false;

    if (sel) {
      try {
        sel.value = nextLang;
        try {
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (_) {
          var ev = document.createEvent('Event');
          ev.initEvent('change', true, true);
          sel.dispatchEvent(ev);
        }
        applied = true;
      } catch (_) {}
    }

    if (!applied) {
      try {
        window.ZShell.setLang(nextLang);
        applied = true;
      } catch (_) {}
    }

    if (!applied) return;
    refreshMobileText();
    syncGameLayout();
  }

  /* Shared mobile chrome */

  function ensureLanguageMenu(menuClass) {
    var menu = document.createElement('div');
    menu.className = menuClass;
    menu.hidden = true;
    ['ar', 'en', 'fr'].forEach(function (lang) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-lang', lang);
      btn.addEventListener('click', function () {
        menu.hidden = true;
        setLanguage(lang);
      });
      menu.appendChild(btn);
    });
    menu.addEventListener('click', function (event) { event.stopPropagation(); });
    return menu;
  }

  function positionLangMenu(button, menu) {
    if (!button || !menu) return;
    try {
      menu.style.position = 'fixed';
      menu.style.right = 'auto';
      var rect = button.getBoundingClientRect();
      menu.hidden = false;
      var width = Math.max(menu.offsetWidth || 0, 132);
      var viewportW = window.innerWidth || document.documentElement.clientWidth || 0;
      var left = rect.left + (rect.width / 2) - (width / 2);
      var maxLeft = Math.max(8, viewportW - width - 8);
      if (left < 8) left = 8;
      if (left > maxLeft) left = maxLeft;
      menu.style.left = left + 'px';
      menu.style.top = (rect.bottom + 6) + 'px';
    } catch (_) {}
  }

  function bindLangButton(button, menu) {
    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var willOpen = !!menu.hidden;
      menu.hidden = !menu.hidden;
      if (willOpen) positionLangMenu(button, menu);
    });
    window.addEventListener('resize', function () {
      if (!menu.hidden) positionLangMenu(button, menu);
    });
    document.addEventListener('click', function (event) {
      if (!menu.hidden && !menu.contains(event.target) && event.target !== button) menu.hidden = true;
    });
  }

  function createShell(options) {
    var root = document.createElement('div');
    var menuClass = options.menuClass;

    root.className = options.rootClass;

    var bar = document.createElement('div');
    bar.className = options.innerClass;

    var langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.className = 'z-mobile-shell-btn is-lang';
    langBtn.innerHTML = '<img src="' + baseHref() + '/assets/icons/globe.svg" alt="" aria-hidden="true">';

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'z-mobile-shell-btn is-back';
    backBtn.setAttribute('data-shell-action', options.backAction || 'back');
    backBtn.innerHTML = '<img class="directional-exit-icon" src="' + baseHref() + '/assets/icons/logout.svg" alt="" aria-hidden="true">';
    if (options.hideBack) backBtn.hidden = true;
    backBtn.addEventListener('click', options.onBack);

    var menu = ensureLanguageMenu(menuClass);
    bindLangButton(langBtn, menu);

    bar.appendChild(langBtn);
    bar.appendChild(backBtn);
    root.appendChild(bar);
    root.appendChild(menu);
    return root;
  }
  function ensureShell() {
    if (!document.body || !document.body.classList.contains('z-mobile-on')) return;
    if (pageType() === 'generic' || pageType() === 'game' || qs('.z-mobile-shell')) return;

    var shell = createShell({
      rootClass: 'z-mobile-shell',
      innerClass: 'z-mobile-shell-spacer',
      menuClass: 'z-mobile-shell-menu',
      hideBack: false,
      backAction: 'back',
      onBack: function (event) {
        var target = backTarget();
        if (!target) return;
        event.preventDefault();
        location.href = target;
      }
    });

    document.body.appendChild(shell);
  }

  function reportOrientationFailure(error) {
    try { console.warn('[Dhamet mobile orientation]', error || 'unsupported'); } catch (_) {}
  }

  function clearOrientationRequest(target) {
    if (target && ORIENTATION_REQUEST_TARGET !== target) return;
    ORIENTATION_REQUEST_TARGET = '';
    if (ORIENTATION_REQUEST_TIMER) {
      clearTimeout(ORIENTATION_REQUEST_TIMER);
      ORIENTATION_REQUEST_TIMER = 0;
    }
  }

  function expireOrientationRequest(target) {
    if (ORIENTATION_REQUEST_TIMER) clearTimeout(ORIENTATION_REQUEST_TIMER);
    ORIENTATION_REQUEST_TIMER = setTimeout(function () {
      clearOrientationRequest(target);
    }, 2600);
  }

  async function exitMobileFullscreen() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    } catch (error) {
      reportOrientationFailure(error);
    }
  }

  async function requestOrientation(kind) {
    var target = kind === 'portrait' ? 'portrait' : 'landscape';
    ORIENTATION_REQUEST_TARGET = target;
    expireOrientationRequest(target);

    // Orientation lock commonly requires fullscreen. Marking the requested
    // target before entering fullscreen prevents the fullscreenchange layout
    // pass from immediately exiting again while landscape lock is pending.
    try {
      var el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch (error) {
      reportOrientationFailure(error);
    }

    try {
      if (screen.orientation && screen.orientation.lock) {
        // Keep fullscreen limited to landscape, but permit both landscape sides.
        await screen.orientation.lock(target);
        return true;
      }
    } catch (error) {
      reportOrientationFailure(error);
    }
    return false;
  }

  async function requestLandscape() {
    var locked = await requestOrientation('landscape');
    if (!locked && !isLandscape()) {
      clearOrientationRequest('landscape');
      await exitMobileFullscreen();
    }
    return locked;
  }

  async function requestPortrait() {
    var locked = await requestOrientation('portrait');
    if (!locked) {
      try {
        if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
      } catch (error) {
        reportOrientationFailure(error);
      }
    }
    // Portrait must never remain fullscreen. A short delay lets the browser
    // finish the orientation change before fullscreen exit releases the lock.
    setTimeout(function () {
      if (!isLandscape()) void exitMobileFullscreen();
      clearOrientationRequest('portrait');
    }, locked ? 180 : 0);
    return locked;
  }

function ensureOrientButton() {
  if (pageType() === 'generic' || qs('.z-mobile-orient')) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'z-mobile-orient';
  btn.innerHTML = '<span class="z-mobile-orient-ico" aria-hidden="true"></span>';
  btn.addEventListener('click', function () {
    var target = isLandscape() ? 'portrait' : 'landscape';
    setPreferredOrientation(target);
    if (target === 'portrait') requestPortrait();
    else requestLandscape();
  });
  document.body.appendChild(btn);
}
  function viewportHeight() {
    var vv = window.visualViewport;
    var h = Math.round((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight || 0);
    return Math.max(0, h);
  }

  function syncViewportMetrics() {
    if (!document.body) return;
    var height = viewportHeight();
    if (height > 0) document.body.style.setProperty('--m-vh', height + 'px');
  }
  /* Shared page scaffolding */
  function restoreLobbyHead() {
    if (pageType() !== 'lobby') return;
    var inner = qs('.z-lobby-inner');
    var head = qs('.z-lobby-head', inner);
    var center = qs('.z-lobby-head-center', head);
    var box = qs('.z-mobile-head-box', inner);
    var bottom = qs('.z-lobby-bottom', inner);
    var inviteControls = qs('#lobbyInviteControls');
    if (!inner || !head || !center) return;
    var title = box ? qs('.z-page-title', box) : null;
    var sub = box ? qs('.z-lobby-subtitle', box) : null;
    if (title && title.parentNode !== center) center.insertBefore(title, center.firstChild || null);
    if (sub && sub.parentNode !== center) center.appendChild(sub);
    if (inviteControls && bottom && inviteControls.parentNode !== bottom) {
      var back = qs('.z-lobby-back', bottom);
      bottom.insertBefore(inviteControls, back || null);
    }
    if (inviteControls) inviteControls.classList.remove('is-mobile-portrait', 'is-mobile-landscape');
    if (box && !box.children.length) box.remove();
  }

  function placeLobbyInviteControls(box) {
    var controls = qs('#lobbyInviteControls');
    if (!controls) return;
    controls.classList.remove('is-mobile-portrait', 'is-mobile-landscape');
    controls.hidden = false;
    controls.removeAttribute('aria-hidden');
    if (isLandscape()) {
      controls.classList.add('is-mobile-landscape');
      if (box && controls.parentNode !== box) box.appendChild(controls);
      return;
    }
    controls.classList.add('is-mobile-portrait');
    var shellBar = qs('.z-mobile-shell .z-mobile-shell-spacer');
    var backBtn = shellBar ? qs('.z-mobile-shell-btn.is-back', shellBar) : null;
    if (shellBar) {
      shellBar.classList.add('has-invite-receive-toggle');
      if (controls.parentNode !== shellBar) shellBar.insertBefore(controls, backBtn || null);
      return;
    }
    if (box && controls.parentNode !== box) box.appendChild(controls);
  }

  function ensureLobbyHead() {
    if (pageType() !== 'lobby' || !document.body || !document.body.classList.contains('z-mobile-on')) return;
    var inner = qs('.z-lobby-inner');
    var head = qs('.z-lobby-head', inner);
    if (!inner || !head) return;
    var title = qs('.z-page-title', head) || qs('.z-page-title', inner);
    var sub = qs('.z-lobby-subtitle', head) || qs('.z-lobby-subtitle', inner);
    if (!title || !sub) return;
    var box = qs('.z-mobile-head-box', inner);
    if (!box) {
      box = document.createElement('div');
      box.className = 'z-mobile-head-box';
      inner.insertBefore(box, head);
    }
    var bar = qs('.z-mobile-lobby-headbar', box);
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'z-mobile-lobby-headbar';
      box.appendChild(bar);
    }
    var texts = qs('.z-mobile-lobby-headtexts', box);
    if (!texts) {
      texts = document.createElement('div');
      texts.className = 'z-mobile-lobby-headtexts';
    }
    if (title.parentNode !== texts) texts.appendChild(title);
    if (sub.parentNode !== texts) texts.appendChild(sub);

    if (isLandscape()) {
      if (texts.parentNode !== box) box.insertBefore(texts, box.firstChild || null);
    } else {
      if (texts.parentNode !== bar) bar.insertBefore(texts, bar.firstChild || null);
    }
    placeLobbyInviteControls(box);
  }
  var AUTH_CARD_RAF = 0;
/* Game page */


  function gameMode() {
    return document.body && document.body.classList.contains('z-spectator') ? 'spectator' : 'pvp';
  }

  function gameBack() {
    try {
      if (gameMode() === 'spectator') {
        var leave = qs('#btnLeaveRoom');
        if (leave) {
          leave.click();
          return;
        }
      }
      var target = qs('#btnEndOnline');
      if (target) {
        target.click();
        return;
      }
    } catch (_) {}
    location.href = 'https://ouglsoft.com/dhamet/pages/mode.html';
  }

  function markGameLayoutMutation(fn) {
    GAME_LAYOUT_MUTATING += 1;
    try {
      return fn();
    } finally {
      window.setTimeout(function () {
        GAME_LAYOUT_MUTATING = Math.max(0, GAME_LAYOUT_MUTATING - 1);
      }, 0);
    }
  }

  function rememberGameHome(node) {
    if (!node) return;
    var currentMarker = node.__zMobileHomeMarker;
    if (currentMarker && currentMarker.parentNode) return;
    if (currentMarker && !currentMarker.parentNode) node.__zMobileHomeMarker = null;
    var parent = node.parentNode;
    if (!parent) return;
    var marker = document.createComment('z-mobile-home:' + (node.id || node.className || node.nodeName));
    parent.insertBefore(marker, node);
    node.__zMobileHomeMarker = marker;
    if (GAME_HOME_RECORDS.indexOf(node) === -1) GAME_HOME_RECORDS.push(node);
  }

  function moveGameNode(node, parent, before) {
    if (!node || !parent) return;
    rememberGameHome(node);
    if (node.parentNode === parent && (!before || node.nextSibling === before)) return;
    if (before && before.parentNode === parent) parent.insertBefore(node, before);
    else parent.appendChild(node);
  }

  function restoreGameNode(node) {
    if (!node) return;
    var marker = node.__zMobileHomeMarker;
    if (marker && marker.parentNode) {
      marker.parentNode.insertBefore(node, marker.nextSibling);
      marker.parentNode.removeChild(marker);
    }
    node.__zMobileHomeMarker = null;
  }

  function restoreAllGameNodes() {
    var records = GAME_HOME_RECORDS.slice();
    GAME_HOME_RECORDS.length = 0;
    records.forEach(restoreGameNode);
  }

  function ensureGameSideLane() {
    if (pageType() !== 'game') return null;
    var lane = qs('.z-mobile-game-side-lane');
    if (lane) return lane;
    lane = document.createElement('div');
    lane.className = 'z-mobile-game-side-lane';
    return lane;
  }

  function ensureGameShell() {
    if (pageType() !== 'game') return null;
    var shell = qs('.z-mobile-game-shell');
    if (shell) return shell;

    return createShell({
      rootClass: 'z-mobile-game-shell',
      innerClass: 'z-mobile-game-shell-inner',
      menuClass: 'z-mobile-game-shell-menu',
      onBack: function (event) {
        event.preventDefault();
        gameBack();
      }
    });
  }

  function ensureGameHead() {
    if (pageType() !== 'game') return null;
    var head = qs('.z-mobile-game-head');
    if (!head) {
      head = document.createElement('div');
      head.className = 'z-mobile-game-head';
    }
    if (!qs('.z-mobile-game-meta', head)) {
      head.innerHTML = [
        '<div class="z-mobile-game-player" data-player="top">',
        '<div class="z-mobile-game-avatar-wrap is-black-piece"><img class="z-mobile-game-avatar" data-avatar="top" src="' + baseHref() + '/assets/icons/users/autouser1.png" alt="" aria-hidden="true"></div>',
        '<div class="z-mobile-game-meta">',
        '<div class="z-mobile-game-name" data-name="top"></div>',
        '<div class="z-mobile-game-presence" data-presence="top"></div>',
        '</div>',
        '</div>',
        '<div class="z-mobile-game-vs">VS</div>',
        '<div class="z-mobile-game-player" data-player="bot">',
        '<div class="z-mobile-game-avatar-wrap is-white-piece"><img class="z-mobile-game-avatar" data-avatar="bot" src="' + baseHref() + '/assets/icons/users/autouser2.png" alt="" aria-hidden="true"></div>',
        '<div class="z-mobile-game-meta">',
        '<div class="z-mobile-game-name" data-name="bot"></div>',
        '<div class="z-mobile-game-presence" data-presence="bot"></div>',
        '</div>',
        '</div>'
      ].join('');
    }
    return head;
  }

  function ensureGameControlsHost() {
    if (pageType() !== 'game') return null;
    var host = qs('.z-mobile-game-controls-host');
    if (host) return host;
    host = document.createElement('div');
    host.className = 'z-mobile-game-controls-host';
    var grid = document.createElement('div');
    grid.className = 'z-mobile-game-controls-grid';
    host.appendChild(grid);
    return host;
  }

  function ensureDrawerChevron(handle) {
    if (!handle) return null;
    var icon = qs('.z-mobile-game-drawer-chevron', handle);
    if (icon) return icon;
    icon = document.createElement('span');
    icon.className = 'z-mobile-game-drawer-chevron';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '▲';
    handle.appendChild(icon);
    return icon;
  }

  function setGameDrawer(open) {
    var drawer = qs('.z-mobile-game-drawer');
    var backdrop = qs('.z-mobile-game-drawer-backdrop');
    if (!drawer) return;
    drawer.classList.toggle('is-open', !!open);
    var handle = qs('.z-mobile-game-drawer-handle', drawer);
    if (handle) {
      handle.setAttribute('aria-expanded', open ? 'true' : 'false');
      handle.setAttribute('data-open', open ? 'true' : 'false');
      var icon = ensureDrawerChevron(handle);
      if (icon) icon.textContent = open ? '▼' : '▲';
    }
    if (backdrop) backdrop.hidden = !(open && !isLandscape());
  }

  function ensureGameDrawer() {
    if (pageType() !== 'game') return null;
    var drawer = qs('.z-mobile-game-drawer');
    if (drawer) return drawer;

    drawer = document.createElement('div');
    drawer.className = 'z-mobile-game-drawer';
    drawer.innerHTML = [
      '<button type="button" class="z-mobile-game-drawer-handle" aria-label="' + window.I18N.translate('aria.drawer', null, 'الدرج', currentLang()) + '"><span class="z-mobile-game-drawer-chevron" aria-hidden="true">▲</span></button>',
      '<div class="z-mobile-game-drawer-body"><div class="z-mobile-game-drawer-content"></div></div>'
    ].join('');

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.className = 'z-mobile-game-drawer-backdrop';
    backdrop.hidden = true;
    backdrop.addEventListener('click', function () { setGameDrawer(false); });
    document.body.appendChild(backdrop);

    var handle = qs('.z-mobile-game-drawer-handle', drawer);
    ensureDrawerChevron(handle);
    handle.setAttribute('aria-expanded', 'false');
    handle.setAttribute('aria-label', window.I18N.translate('aria.drawerToggle', null, 'تبديل الدرج', currentLang()));
    handle.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setGameDrawer(!drawer.classList.contains('is-open'));
    });

    if (!document.__zMobileDrawerOutsideBound) {
      document.__zMobileDrawerOutsideBound = true;
      document.addEventListener('pointerdown', function (event) {
        if (pageType() !== 'game' || !isPhone()) return;
        var current = qs('.z-mobile-game-drawer');
        if (!current || !current.classList.contains('is-open')) return;
        var target = event.target;
        if (!target || current.contains(target)) return;
        setGameDrawer(false);
      }, true);
    }

    return drawer;
  }

  function formatPresenceElapsed(since) {
    var elapsed = Math.max(0, Date.now() - (Number(since) || Date.now()));
    var total = Math.floor(elapsed / 1000);
    var mm = String(Math.floor(total / 60)).padStart(2, '0');
    var ss = String(total % 60).padStart(2, '0');
    return mm + ':' + ss;
  }

  function gameHeaderModel() {
    try {
      if (window.UI && typeof window.UI.getGameHeaderModel === 'function') {
        return window.UI.getGameHeaderModel();
      }
    } catch (_) {}
    return {
      mode: gameMode(),
      activeSide: 'top',
      status: '',
      uiBlocked: false,
      top: { name: '', avatar: '', presence: null },
      bot: { name: '', avatar: '', presence: null }
    };
  }

  function gamePresenceText(presence) {
    if (!presence) return '';
    try {
      if (presence.online) return '(' + window.I18N.translate('online.presence.online', null, 'متصل', currentLang()) + ')';
      var label = window.I18N.translate('online.presence.disconnected', null, 'غير متصل', currentLang());
      return '(' + label + ' ' + formatPresenceElapsed(presence.disconnectedSince) + ')';
    } catch (_) {
      return '';
    }
  }

  function syncGameHead() {
    var head = qs('.z-mobile-game-head');
    if (!head) return;
    var model = gameHeaderModel();
    ['top', 'bot'].forEach(function (side) {
      var name = qs('[data-name="' + side + '"]', head);
      var presence = qs('[data-presence="' + side + '"]', head);
      var avatar = qs('[data-avatar="' + side + '"]', head);
      var wrap = avatar ? avatar.parentElement : null;
      var slot = model && model[side] ? model[side] : {};
      var nextName = String(slot.name || '').trim();
      var nextPresence = gamePresenceText(slot.presence);
      if (name && name.textContent !== nextName) name.textContent = nextName;
      if (presence && presence.textContent !== nextPresence) presence.textContent = nextPresence;
      if (presence) {
        presence.hidden = !nextPresence;
        var onlineNow = !!(slot.presence && slot.presence.online === true);
        var offlineNow = !!(slot.presence && slot.presence.online === false);
        presence.classList.toggle('z-presence-online', onlineNow);
        presence.classList.toggle('z-presence-offline', offlineNow);
      }
      if (avatar) {
        var src = String(slot.avatar || '').trim();
        if (!src && side === 'top') src = baseHref() + '/assets/icons/users/autouser1.png';
        if (src && avatar.getAttribute('src') !== src) avatar.setAttribute('src', src);
        avatar.onerror = function () {
          var fb = this.getAttribute('data-avatar') === 'top' ? 'autouser1.png' : 'autouser2.png';
          this.src = baseHref() + '/assets/icons/users/' + fb;
        };
      }
      if (wrap) {
        var cls = side === 'top' ? 'is-black-piece' : 'is-white-piece';
        if (!wrap.classList.contains(cls)) {
          wrap.classList.remove('is-black-piece', 'is-white-piece');
          wrap.classList.add(cls);
        }
      }
    });
    var active = model.activeSide || 'top';
    qsa('.z-mobile-game-player', head).forEach(function (card) {
      card.classList.toggle('is-active', card.getAttribute('data-player') === active);
    });
    var gm = model.mode || gameMode();
    if (head.getAttribute('data-mode') !== gm) head.setAttribute('data-mode', gm);
    head.classList.toggle('is-ui-blocked', !!model.uiBlocked);
  }

  function gameButtons() {
    if (gameMode() === 'spectator') return [qs('#btnChat')].filter(Boolean);
    return [qs('.timer-row'), qs('.soufla-row'), qs('#btnUndo'), qs('#syncControlWrap'), qs('#btnSettings'), qs('#btnChat'), qs('#btnMic'), qs('#btnSpk')].filter(Boolean);
  }

  function syncKillTile() {
    var row = qs('.timer-row');
    var btn = qs('#btnEndKill');
    if (!row || !btn) return;
    var active = btn.getAttribute('data-chain-active') === 'true';
    row.classList.toggle('is-live', active);
    row.classList.toggle('is-disabled', !active);
  }

  function syncGameControls() {
    var grid = qs('.z-mobile-game-controls-grid');
    if (!grid) return;
    var mode = gameMode();
    if (mode === 'pvp') {
      var syncWrap = qs('#syncControlWrap');
      var syncButton = qs('#btnSync');
      if (syncWrap && syncButton && syncButton.parentNode !== syncWrap) moveGameNode(syncButton, syncWrap);
    }
    var items = gameButtons().filter(function (item) {
      return item && item.id !== 'btnEndOnline' && item.id !== 'btnLeaveRoom';
    });
    Array.prototype.slice.call(grid.children).forEach(function (node) {
      if (items.indexOf(node) === -1) restoreGameNode(node);
    });
    items.forEach(function (item) { moveGameNode(item, grid); });
    if (grid.getAttribute('data-mode') !== mode) grid.setAttribute('data-mode', mode);
    syncKillTile();
  }

  function syncGameDrawer() {
    var drawer = qs('.z-mobile-game-drawer');
    var content = qs('.z-mobile-game-drawer-content', drawer);
    if (!drawer || !content) return;
    var stats = qs('.stats-mobile');
    var log = qs('#log');
    var logPanel = qs('.z-mobile-game-log-panel', content);
    var logTitle = qs('.z-mobile-game-log-title', content);
    if (!logPanel) {
      logPanel = document.createElement('div');
      logPanel.className = 'z-mobile-game-log-panel';
    }
    if (!logTitle) {
      logTitle = document.createElement('div');
      logTitle.className = 'z-mobile-game-log-title';
    }
    logTitle.textContent = activityLogTitle();
    if (stats) moveGameNode(stats, content);
    if (log) {
      if (logTitle.parentNode !== logPanel) logPanel.appendChild(logTitle);
      moveGameNode(log, logPanel);
      if (logPanel.parentNode !== content) content.appendChild(logPanel);
    }
    if (!drawer.classList.contains('is-dragging')) setGameDrawer(drawer.classList.contains('is-open'));
  }

  function placeGameLayout() {
    if (pageType() !== 'game' || !isPhone()) return;
    var app = qs('.app');
    var board = qs('.board-wrap');
    var side = qs('.side');
    if (!app || !board || !side) return;

    var shell = ensureGameShell();
    var head = ensureGameHead();
    var controls = ensureGameControlsHost();
    var drawer = ensureGameDrawer();
    var lane = ensureGameSideLane();

    if (isLandscape()) {
      if (lane && lane.parentNode !== document.body) document.body.appendChild(lane);
      if (shell && lane) moveGameNode(shell, lane);
      if (side && lane) moveGameNode(side, lane);
      if (drawer && lane) moveGameNode(drawer, lane);
      if (head && side) moveGameNode(head, side, side.firstChild);
      if (controls && side) moveGameNode(controls, side);
    } else {
      if (head) moveGameNode(head, app, board);
      if (side) moveGameNode(side, app);
      if (controls) moveGameNode(controls, side, side.firstChild);
      if (shell) moveGameNode(shell, document.body);
      if (drawer) moveGameNode(drawer, document.body);
      if (lane && lane.parentNode) lane.parentNode.removeChild(lane);
    }
  }

  function restoreDesktopGameLayout() {
    if (pageType() !== 'game' || !GAME_LAYOUT_MOBILE_ACTIVE) return;
    markGameLayoutMutation(function () {
      setGameDrawer(false);
      restoreAllGameNodes();
      var body = document.body;
      ['.z-mobile-game-shell', '.z-mobile-game-head', '.z-mobile-game-controls-host', '.z-mobile-game-drawer', '.z-mobile-game-drawer-backdrop'].forEach(function (sel) {
        var node = qs(sel);
        if (node && body && node.parentNode !== body) body.appendChild(node);
      });
      var lane = qs('.z-mobile-game-side-lane');
      if (lane && lane.parentNode) lane.parentNode.removeChild(lane);
      if (body) body.removeAttribute('data-mobile-game-mode');
      try {
        var spectator = gameMode() === 'spectator';
        if (window.ZamatControls && typeof window.ZamatControls.mount === 'function') window.ZamatControls.mount(true, spectator);
      } catch (_) {}
      GAME_LAYOUT_MOBILE_ACTIVE = false;
    });
  }

  function syncGameLayout() {
    if (pageType() !== 'game') return;
    if (!isPhone()) {
      restoreDesktopGameLayout();
      return;
    }
    markGameLayoutMutation(function () {
      GAME_LAYOUT_MOBILE_ACTIVE = true;
      LAST_GAME_MODE = gameMode();
      document.body.setAttribute('data-mobile-game-mode', LAST_GAME_MODE);
      placeGameLayout();
      syncGameHead();
      syncGameControls();
      syncGameDrawer();
    });
  }

  function scheduleGameLayoutSync() {
    if (pageType() !== 'game' || GAME_LOOP) return;
    GAME_LOOP = window.requestAnimationFrame(function () {
      GAME_LOOP = 0;
      syncGameLayout();
    });
  }

  function disconnectGameLayoutObservers() {
    if (GAME_LOOP) {
      try { window.cancelAnimationFrame(GAME_LOOP); } catch (_) {}
      GAME_LOOP = 0;
    }
    if (GAME_LAYOUT_OBSERVER) {
      try { GAME_LAYOUT_OBSERVER.disconnect(); } catch (_) {}
      GAME_LAYOUT_OBSERVER = null;
    }
    if (GAME_BODY_OBSERVER) {
      try { GAME_BODY_OBSERVER.disconnect(); } catch (_) {}
      GAME_BODY_OBSERVER = null;
    }
  }

  function ensureGameLayoutObservers() {
    if (pageType() !== 'game' || !isPhone()) {
      disconnectGameLayoutObservers();
      return;
    }
    var app = qs('.app');
    if (!app) return;
    if (!GAME_LAYOUT_OBSERVER) {
      try {
        GAME_LAYOUT_OBSERVER = new MutationObserver(function () {
          if (GAME_LAYOUT_MUTATING) return;
          scheduleGameLayoutSync();
        });
        GAME_LAYOUT_OBSERVER.observe(app, { childList: true, subtree: true });
      } catch (_) {}
    }
    if (!GAME_BODY_OBSERVER) {
      try {
        GAME_BODY_OBSERVER = new MutationObserver(function () {
          if (GAME_LAYOUT_MUTATING) return;
          var nextMode = gameMode();
          if (nextMode === LAST_GAME_MODE) return;
          scheduleGameLayoutSync();
        });
        GAME_BODY_OBSERVER.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      } catch (_) {}
    }
    scheduleGameLayoutSync();
  }



  /* Dashboard page */
  /* Text and i18n refresh */
  function refreshShellText() {
    qsa('.z-mobile-shell-menu [data-lang], .z-mobile-game-shell-menu [data-lang]').forEach(function (btn) {
      var lang = btn.getAttribute('data-lang');
      btn.textContent = window.I18N.translate('langs.' + lang, null, lang, currentLang());
      btn.classList.toggle('is-active', lang === currentLang());
    });
    qsa('.z-mobile-shell-btn.is-lang, .z-mobile-game-shell .z-mobile-shell-btn.is-lang').forEach(function (btn) {
      btn.setAttribute('aria-label', window.I18N.translate('ui.language', null, 'Language', currentLang()));
    });
    qsa('.z-mobile-shell-btn.is-back, .z-mobile-game-shell .z-mobile-shell-btn.is-back').forEach(function (btn) {
      var actionKey = btn.getAttribute('data-shell-action') === 'logout' ? 'topbar.logout' : 'actions.back';
      var fallback = actionKey === 'topbar.logout' ? 'Sign out' : 'Back';
      btn.setAttribute('aria-label', window.I18N.translate(actionKey, null, fallback, currentLang()));
      btn.setAttribute('title', window.I18N.translate(actionKey, null, fallback, currentLang()));
    });
    var orient = qs('.z-mobile-orient');
    if (orient) {
      var orientLabel = window.I18N.translate('aria.orientationToggle', null, currentLang() === 'ar' ? 'تبديل اتجاه الشاشة' : (currentLang() === 'fr' ? "Changer l’orientation" : 'Change screen orientation'), currentLang());
      orient.setAttribute('aria-label', orientLabel);
      orient.setAttribute('title', orientLabel);
    }
  }

function refreshMobileText() {
    if (!document.body || !document.body.classList.contains('z-mobile-on')) return;
    refreshShellText();
    ensureLobbyHead();
  }


  function clearPreinitState() {
    try {
      document.documentElement.classList.remove('z-mobile-preinit');
    } catch (_) {}
  }

  function reconcileGameFullscreenForOrientation(mobile, orientation) {
    if (!mobile || pageType() !== 'game') return;

    if (ORIENTATION_REQUEST_TARGET === orientation) {
      if (orientation === 'portrait') {
        setTimeout(function () {
          void exitMobileFullscreen();
          clearOrientationRequest('portrait');
        }, 180);
      } else {
        clearOrientationRequest('landscape');
      }
      return;
    }

    // A fullscreenchange event fires before landscape lock has completed.
    // Never exit during that pending request, otherwise the browser releases
    // the lock and snaps back to portrait after a brief landscape flash.
    if (orientation === 'portrait' && ORIENTATION_REQUEST_TARGET !== 'landscape') {
      void exitMobileFullscreen();
    }
  }

  /* Mobile state lifecycle */

  function applyState() {
    if (!document.body) return;
    syncViewportMetrics();
    var mobile = isPhone() && !!MOBILE_PAGES[pageType()];
    var orientation = isLandscape() ? 'landscape' : 'portrait';

    document.body.classList.toggle('z-mobile-on', mobile);
    document.body.classList.toggle('z-mobile-portrait', mobile && orientation === 'portrait');
    document.body.classList.toggle('z-mobile-landscape', mobile && orientation === 'landscape');
    document.body.setAttribute('data-mobile-page', pageType());
    document.body.setAttribute('data-mobile-orientation', orientation);
    document.body.classList.add('z-mobile-layout-ready');
    reconcileGameFullscreenForOrientation(mobile, orientation);

    if (!mobile) {
      restoreLobbyHead();
      restoreDesktopGameLayout();
      qsa('.z-mobile-shell-menu, .z-mobile-game-shell-menu').forEach(function (menu) { menu.hidden = true; });
      disconnectGameLayoutObservers();
      clearPreinitState();
      return;
    }

    ensureShell();
    ensureOrientButton();
    ensureLobbyHead();
    syncGameLayout();
    ensureGameLayoutObservers();
    refreshMobileText();
    clearPreinitState();
  }

  function scheduleResponsiveLayout() {
    if (RESPONSIVE_LOOP) return;
    RESPONSIVE_LOOP = window.requestAnimationFrame(function () {
      RESPONSIVE_LOOP = 0;
      applyState();
    });
  }

  window.Mobile = {
    refresh: refreshMobileText,
    syncGameLayout: scheduleGameLayoutSync,
    syncGameHeadNow: syncGameHead,
    scheduleLayout: scheduleResponsiveLayout,
    restoreDesktopGameLayout: restoreDesktopGameLayout
  };

  function handleViewportChange() {
    scheduleResponsiveLayout();
  }

  function init() {
    applyState();
    void restorePreferredOrientation().then(function () { scheduleResponsiveLayout(); });
    window.addEventListener('resize', scheduleResponsiveLayout, { passive: true });
    window.addEventListener('orientationchange', scheduleResponsiveLayout, { passive: true });
    window.addEventListener('pageshow', function (event) {
      if ((event && event.persisted) || navigationIsBackForward()) setPreferredOrientation('');
      else void restorePreferredOrientation();
      scheduleResponsiveLayout();
    }, { passive: true });
    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
        window.screen.orientation.addEventListener('change', scheduleResponsiveLayout);
      }
    } catch (_) {}
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange, { passive: true });
      window.visualViewport.addEventListener('scroll', handleViewportChange, { passive: true });
    }
    try {
      var observer = new MutationObserver(function () {
        refreshMobileText();
        scheduleResponsiveLayout();
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'dir'] });
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
