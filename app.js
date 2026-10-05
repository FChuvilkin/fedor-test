// FT — Fedor Testing. Shared script: auth state, site chrome, Amplitude Analytics.
//
// Amplitude events follow the agreed taxonomy (Title Case, Noun + Past-Tense Verb):
//   Sign In Started, Email Typed, Password Typed, Signed In Completed, Passkey Skipped, Signed Out,
//   Home Page Viewed, Section Viewed, Stream Viewed, Article Viewed, Article Saved, Article Unsaved,
//   Article Shared, 75% Scrolled, Search Submitted, Search Results Viewed.
// Raw data-track clicks are console-logged only (FT.log) and never sent to Amplitude.

var FT = (function () {
  var USER = 'ft_user', SAVED = 'ft_saved', TOPICS = 'ft_topics', EDITION = 'ft_edition', SOURCE = 'ft_source';
  var DEFAULT_TOPICS = ['Global Economy', 'World', 'Companies'];

  function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
  function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  function getUser() { return read(USER, null); }
  function setUser(user) { write(USER, user); }
  function clearUser() { localStorage.removeItem(USER); }

  function savedIds() { return read(SAVED, []); }
  function isSaved(id) { return savedIds().indexOf(id) !== -1; }
  function toggleSaved(id) {
    var ids = savedIds(), i = ids.indexOf(id);
    if (i === -1) ids.push(id); else ids.splice(i, 1);
    write(SAVED, ids);
    return i === -1;
  }

  function topics() { return read(TOPICS, DEFAULT_TOPICS.slice()); }
  function isFollowed(t) { return topics().indexOf(t) !== -1; }
  function toggleTopic(t) {
    var ts = topics(), i = ts.indexOf(t);
    if (i === -1) ts.push(t); else ts.splice(i, 1);
    write(TOPICS, ts);
    return i === -1;
  }

  function edition() { return read(EDITION, 'international'); }
  function setEdition(e) { write(EDITION, e); identifyUser(); }

  // Navigation source: set before leaving a page, read by the next page's *Viewed event.
  function setSource(v) { sessionStorage.setItem(SOURCE, v); }
  function takeSource(fallback) { var v = sessionStorage.getItem(SOURCE); sessionStorage.removeItem(SOURCE); return v || fallback; }

  // ---------- Amplitude Browser SDK ----------
  var amp = window.amplitude;
  var apiKey = window.FT_CONFIG && window.FT_CONFIG.AMPLITUDE_API_KEY;
  var enabled = !!(amp && apiKey);

  function init() {
    if (!enabled) { console.warn('[FT] Amplitude disabled: SDK not loaded or AMPLITUDE_API_KEY missing in config.js'); return; }
    var user = getUser();
    amp.init(apiKey, user ? user.email : undefined, {
      serverZone: 'US',
      autocapture: { elementInteractions: false, formInteractions: false }
    });
    // Send whatever is queued before the browser leaves the page.
    window.addEventListener('pagehide', function () { amp.setTransport('beacon'); amp.flush(); });
  }

  function track(name, props) {
    props = props || {};
    console.log('[amplitude]', name, props);
    if (enabled) amp.track(name, props);
  }
  function log(name, props) { console.debug('[ui]', name, props || {}); }

  function identifyUser(extra) {
    if (!enabled) return;
    var id = new amp.Identify();
    id.set('saved_article_count', savedIds().length);
    id.set('followed_topics', topics());
    id.set('edition', edition());
    Object.keys(extra || {}).forEach(function (k) { id.set(k, extra[k]); });
    amp.identify(id);
  }
  function signIn(email, type) {
    setUser({ email: email, signedInAt: new Date().toISOString() });
    if (enabled) amp.setUserId(email);
    identifyUser({ sign_in_type: type });
  }
  function signOut() { clearUser(); if (enabled) amp.reset(); }

  // Send queued events now, then run `go` (usually a navigation). Falls through after 800ms if the network is slow.
  function flushThen(go) {
    if (!enabled) return go();
    var done = false;
    function fin() { if (!done) { done = true; go(); } }
    var r = amp.flush();
    (r && r.promise ? r.promise : Promise.resolve()).then(fin, fin);
    setTimeout(fin, 800);
  }
  // Delay an anchor's navigation until queued events are sent. Dead links are left alone.
  function navAfterFlush(e, el) {
    if (el.tagName !== 'A' || el.getAttribute('href') === '#') return;
    e.preventDefault();
    var href = el.href;
    flushThen(function () { location.href = href; });
  }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  return { getUser: getUser, setUser: setUser, clearUser: clearUser, isSaved: isSaved, toggleSaved: toggleSaved,
           isFollowed: isFollowed, toggleTopic: toggleTopic, setEdition: setEdition, setSource: setSource, takeSource: takeSource,
           init: init, track: track, log: log, toast: toast, flushThen: flushThen, navAfterFlush: navAfterFlush, identifyUser: identifyUser, signIn: signIn, signOut: signOut };
})();

// ---------- Article metadata ----------
// Stable ids for articles that have their own page or a Save button; everything else gets a slug of its title.
var ARTICLE_IDS = {
  'Flávio Bolsonaro takes commanding lead in Brazil election': 'bolsonaro-lead',
  "FirstFT: Flávio Bolsonaro secures early lead in Brazil's election": 'firstft-bolsonaro',
  "China's tribute system and the new world order": 'china-tribute',
  "Trump's diesel export coercion will not strengthen the US": 'diesel-coercion',
  "Bond turbulence means it's time for the ECB to put QT on hold": 'ecb-qt',
  'Euro slides to 17-month low against dollar': 'euro-low',
  'US employment growth slowed sharply in September': 'us-jobs'
};
function slug(t) { return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60); }
function text(el) { return el ? el.textContent.trim().replace(/\s+/g, ' ') : ''; }

// Build one item of an `articles` object array from a headline link in a list or grid.
function articleFromLink(a, section, position) {
  var title = text(a);
  var box = a.closest('.card, .teaser, .lead-grid > div') || a.parentNode;
  var opinion = a.classList.contains('quote') || a.parentNode.classList.contains('quote') || section === 'Opinion';
  var art = {
    article_id: ARTICLE_IDS[title] || slug(title),
    article_title: title,
    article_type: /^FirstFT/.test(title) ? 'newsletter' : (opinion ? 'opinion' : 'news'),
    section: section,
    paywalled: !!box.querySelector('.tag.premium'),
    position: position
  };
  var kicker = box.querySelector('.kicker'), author = box.querySelector('.author');
  if (kicker) art.topic = text(kicker);
  if (author) art.author = text(author);
  return art;
}
function articlesIn(root, section) {
  return Array.prototype.map.call(root.querySelectorAll('a[data-track="headline_click"]'), function (a, i) { return articleFromLink(a, section, i + 1); });
}
// Shared article properties for the article page we are on (from <body data-*>).
function currentArticle() {
  var d = document.body.dataset;
  return { article_id: d.articleId, article_title: d.article, article_type: d.articleType, section: d.section,
           topic: d.topic, author: d.author, paywalled: d.paywalled === 'true' };
}
var SHARE_CHANNELS = { X: 'twitter', Facebook: 'facebook', LinkedIn: 'linkedin', Share: 'link' };

// ---------- Shared chrome ----------
var NAV = [['home','Home','index.html'],['world','World','#'],['us','US','#'],['companies','Companies','#'],['tech','Tech','#'],['markets','Markets','#'],['climate','Climate','#'],['opinion','Opinion','#'],['lex','Lex','#'],['work-careers','Work & Careers','#'],['life-arts','Life & Arts','#'],['how-to-spend-it','How to Spend It','#'],['stocks-game','Stocks Game','#']];
var DRAWER = [
  ['World', ['Middle East war','Global Economy','UK','US','China','Africa','Asia Pacific','Emerging Markets','Europe','War in Ukraine','Americas']],
  ['US', ['US Economy','US Companies','US Politics & Policy']],
  ['Companies', ['Energy','Financials','Health','Industrials','Media','Professional Services','Retail & Consumer','Tech Sector','Telecoms','Transport']],
  ['Tech', ['Artificial intelligence','Semiconductors','Cyber Security','Social Media','Tech start-ups']],
  ['Markets', ['Alphaville','Markets Data','Capital Markets','Commodities','Currencies','Equities']],
  ['Climate', null], ['Opinion', ['Columnists','The FT View','Lex','Letters']], ['Lex', null],
  ['Work & Careers', ['Business School Rankings','Business Education','Entrepreneurship','Recruitment']],
  ['Life & Arts', ['Arts','Books','Food & Drink','FT Magazine','Style','Travel']],
  ['Personal Finance', ['Property & Mortgages','Investments','Pensions','Tax']],
  ['How To Spend It', null], ['Special Reports', null]
];
var SUB_LINKS = { 'Global Economy': 'global-economy.html' };

function renderHeader(mount) {
  var current = mount.dataset.current || '';
  var compact = mount.dataset.compact === 'true';
  var navHtml = NAV.map(function (n) {
    return '<li><a href="' + n[2] + '"' + (n[0] === current ? ' class="current"' : '') + ' data-track="nav_click" data-section="' + n[0] + '">' + n[1] + '</a></li>';
  }).join('');
  var drawerHtml = DRAWER.map(function (d) {
    var slug = d[0].toLowerCase().replace(/[^a-z]+/g, '-');
    var sub = d[1] ? '<button class="chev" data-track="menu_section_toggle" data-section="' + slug + '" aria-label="Expand ' + d[0] + '"></button><ul class="sub">' +
      d[1].map(function (s) { return '<li><a href="' + (SUB_LINKS[s] || '#') + '" data-track="menu_link_click" data-section="' + slug + '" data-item="' + s + '">' + s + '</a></li>'; }).join('') + '</ul>' : '';
    return '<li><a href="#" data-track="menu_link_click" data-section="' + slug + '">' + d[0] + '</a>' + sub + '</li>';
  }).join('');

  mount.innerHTML =
    '<header class="masthead' + (compact ? ' compact' : '') + '"><div class="wrap">' +
      '<div class="left"><button class="icon-btn" id="menu-btn" data-track="menu_open" aria-label="Menu">&#9776;</button>' +
      '<button class="icon-btn" id="search-btn" data-track="search_open" aria-label="Search">&#128269;</button>' +
      (compact ? '' : '<a class="ask-ft logged-out-only" href="#" id="ask-ft" data-track="ask_ft_click">&#10024; Ask FT</a>') + '</div>' +
      '<a class="logo" href="index.html" data-track="logo_click">Financial Times</a>' +
      '<div class="right"><a class="btn logged-out-only" href="#" id="nav-subscribe" data-track="subscribe_click" data-location="header">Subscribe</a>' +
      '<a class="account-link logged-out-only" href="login.html" id="nav-signin" data-track="sign_in_click" data-location="header">&#128100; Sign In</a>' +
      '<a class="account-link logged-in-only" href="account.html" id="nav-account" data-track="my_account_click">&#128100; My Account</a></div>' +
    '</div></header>' +
    '<div class="search-bar" id="search-bar"><form class="row" id="search-form" action="search.html" method="get">' +
      '<input type="search" name="q" id="search-input" placeholder="Search the FT" autocomplete="off">' +
      '<button type="submit" class="btn btn-teal" data-track="search_submit">&#128269; Search</button>' +
      '<a href="#" class="close" id="search-close" data-track="search_close">Close</a><div class="ad">PGIM</div></form>' +
      '<div class="search-suggest" id="search-suggest"></div></div>' +
    '<nav class="primary-nav"><div class="wrap"><ul>' + navHtml + '</ul>' +
      '<ul class="secondary logged-in-only"><li><a href="#" data-track="nav_click" data-section="digital-edition">FT Digital Edition</a></li>' +
      '<li><a href="#" data-track="nav_click" data-section="portfolio">Portfolio</a></li><li><a href="#" data-track="nav_click" data-section="myft">myFT</a></li></ul>' +
    '</div></nav>';

  var extra = document.createElement('div');
  extra.innerHTML =
    '<div class="overlay" id="overlay"></div>' +
    '<aside class="drawer" id="drawer" aria-label="Site menu">' +
      '<div class="drawer-head"><button class="icon-btn" id="drawer-close" data-track="menu_close" aria-label="Close menu">&#10005;</button>' +
      '<div class="edition">Edition: <span>International</span> | <a href="#" data-track="edition_switch" data-edition="uk">UK</a></div></div>' +
      '<div class="drawer-title">Top sections</div>' +
      '<ul><li class="active"><a href="index.html" data-track="menu_link_click" data-section="home">Home</a></li>' + drawerHtml + '</ul>' +
    '</aside><div class="toast" id="toast"></div>';
  document.body.appendChild(extra);

  // Drawer behaviour
  var drawer = document.getElementById('drawer'), overlay = document.getElementById('overlay');
  function openDrawer() { drawer.classList.add('open'); overlay.classList.add('open'); }
  function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('open'); }
  document.getElementById('menu-btn').addEventListener('click', openDrawer);
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', function (e) {
    var chev = e.target.closest('.chev');
    if (chev) chev.parentNode.classList.toggle('open');
  });

  // Search behaviour
  var bar = document.getElementById('search-bar'), input = document.getElementById('search-input'), suggest = document.getElementById('search-suggest');
  document.getElementById('search-btn').addEventListener('click', function () { bar.classList.add('open'); input.focus(); });
  document.getElementById('search-close').addEventListener('click', function () { bar.classList.remove('open'); suggest.classList.remove('open'); input.value = ''; });
  input.addEventListener('input', function () {
    var q = input.value.trim();
    if (!q) { suggest.classList.remove('open'); return; }
    var url = 'search.html?q=' + encodeURIComponent(q);
    suggest.innerHTML = '<h4>Top results for</h4><a class="link" href="' + url + '" data-track="search_suggestion_click" data-query="' + q + '">' + q + '</a>' +
      '<div class="cols"><div><h4>Related Pages</h4><div class="pages"><a href="search.html?q=Ray%20Dalio" data-track="search_related_click" data-item="Ray Dalio">Ray Dalio</a></div></div>' +
      '<div><h4>Securities</h4><table><tr><td>Tullow Oil PLC</td><td>TLW:LSE</td></tr><tr><td>Zhejiang Digital Culture Technology Group Co., Ltd.</td><td>600633:SHH</td></tr>' +
      '<tr><td>Caisse regionale de Credit Agricole Mutuel d\'Ille-et-Vilaine</td><td>CIV:PAR</td></tr><tr><td>Banco di Desio e della Brianza S.p.A.</td><td>BDB:MIL</td></tr>' +
      '<tr><td>Daily Journal Corporation</td><td>DJCO:NAQ</td></tr></table><p><a class="link" href="#" data-track="search_securities_all">See all matching securities</a></p></div></div>';
    suggest.classList.add('open');
  });
  document.getElementById('search-form').addEventListener('submit', function (e) {
    var q = input.value.trim();
    e.preventDefault();
    if (!q) return;
    FT.track('Search Submitted', { search_query: q, location: 'overlay', suggestion_used: false });
    var form = this;
    FT.flushThen(function () { form.submit(); });
  });
}

// ---------- Save (bookmark) buttons and myFT topic buttons ----------
function bookmark(filled) {
  return '<svg viewBox="0 0 20 26" aria-hidden="true"><path d="M2 1h16v24l-8-6-8 6z" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"/></svg>';
}
function trackSave(saved, art, location) {
  FT.track(saved ? 'Article Saved' : 'Article Unsaved', Object.assign({ location: location }, art));
  FT.identifyUser();
}
function initSaveButtons() {
  var teasers = Array.prototype.slice.call(document.querySelectorAll('.teaser'));
  document.querySelectorAll('.save-btn').forEach(function (btn) {
    var id = btn.dataset.article;
    function paint(saved) {
      btn.classList.toggle('saved', saved);
      btn.innerHTML = bookmark(saved) + (saved ? 'Saved' : 'Save');
      btn.dataset.track = saved ? 'article_unsave' : 'article_save';
    }
    paint(FT.isSaved(id));
    btn.addEventListener('click', function () {
      var saved = FT.toggleSaved(id);
      paint(saved);
      var teaser = btn.closest('.teaser'), link = teaser && teaser.querySelector('a[data-track="headline_click"]');
      var art = link ? articleFromLink(link, 'World', teasers.indexOf(teaser) + 1) : { article_id: id };
      trackSave(saved, art, 'stream');
      var pop = btn.parentNode.querySelector('.save-pop');
      if (pop) {
        if (saved) { pop.classList.add('open'); clearTimeout(pop._t); pop._t = setTimeout(function () { pop.classList.remove('open'); }, 6000); }
        else pop.classList.remove('open');
      }
    });
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('.save-pop .x')) e.target.closest('.save-pop').classList.remove('open');
  });
  document.querySelectorAll('.rail-save').forEach(function (btn) {
    var id = btn.dataset.article;
    function paint(saved) { btn.classList.toggle('saved', saved); btn.innerHTML = bookmark(saved) + (saved ? 'Saved' : 'Save'); btn.dataset.track = saved ? 'article_unsave' : 'article_save'; }
    paint(FT.isSaved(id));
    btn.addEventListener('click', function () { var saved = FT.toggleSaved(id); paint(saved); trackSave(saved, currentArticle(), 'share_rail'); });
  });
}

function initTopicButtons() {
  document.querySelectorAll('.myft-btn').forEach(function (btn) {
    var topic = btn.dataset.topic;
    function paint(on) { btn.classList.toggle('added', on); btn.textContent = on ? 'Added' : 'Add to myFT'; btn.dataset.track = on ? 'topic_unfollow' : 'topic_follow'; }
    paint(FT.isFollowed(topic));
    btn.addEventListener('click', function (e) { e.preventDefault(); paint(FT.toggleTopic(topic)); FT.identifyUser(); });
  });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', function () {
  var page = document.body.dataset.page;
  var user = FT.getUser();
  if (user) document.body.classList.add('logged-in');
  FT.init();

  var mount = document.getElementById('site-header');
  if (mount) renderHeader(mount);
  initSaveButtons();
  initTopicButtons();

  var q = new URLSearchParams(location.search).get('q');

  // Dead links (href="#") must not jump the page. Every data-track click is console-logged; a few map to Amplitude events.
  var ARTICLE_SOURCES = { stream: 'stream', 'latest-world': 'latest_on_world' };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;
    if (el.getAttribute('href') === '#') e.preventDefault();
    var t = el.dataset.track;
    if (!t) return;
    var props = { page: page, text: el.textContent.trim().slice(0, 80) };
    Object.keys(el.dataset).forEach(function (k) { if (k !== 'track') props[k] = el.dataset[k]; });
    FT.log(t, props);

    switch (t) {
      case 'sign_in_click':
        FT.track('Sign In Started', { sign_in_type: 'email', location: el.dataset.location === 'header' ? 'header' : 'paywall' });
        FT.navAfterFlush(e, el); break;
      case 'login_social_click':
        FT.track('Sign In Started', { sign_in_type: el.dataset.provider, location: 'login_page' }); break;
      case 'login_passwordless_click':
        FT.track('Sign In Started', { sign_in_type: 'passwordless', location: 'login_page' }); break;
      case 'share_click':
        FT.track('Article Shared', Object.assign({ share_channel: SHARE_CHANNELS[el.dataset.provider] || el.dataset.provider.toLowerCase() }, currentArticle()));
        FT.toast('Shared to ' + el.dataset.provider + ' (mock)'); break;
      case 'search_suggestion_click':
      case 'search_related_click':
        FT.track('Search Submitted', { search_query: el.dataset.query || el.dataset.item, location: page === 'search' ? 'results_page' : 'overlay', suggestion_used: true });
        FT.navAfterFlush(e, el); break;
      case 'edition_switch':
        FT.setEdition(el.dataset.edition); break;
      // Where the next page's *Viewed event came from
      case 'logo_click': FT.setSource('logo'); break;
      case 'nav_click': if (el.dataset.section === 'home') FT.setSource('nav_home'); break;
      case 'menu_link_click': if (el.dataset.section === 'home') FT.setSource('menu_home'); break;
      case 'account_back_home': FT.setSource('account_back_home'); break;
      case 'headline_click': case 'video_click': FT.setSource(ARTICLE_SOURCES[el.dataset.section] || page); break;
      case 'most_read_click': FT.setSource('most_read'); break;
      case 'search_result_click': FT.setSource('search_results'); break;
    }
  });

  // ---- Home: lead articles ride on Home Page Viewed, every titled section fires Section Viewed once it scrolls into view ----
  if (page === 'home') {
    var sections = Array.prototype.slice.call(document.querySelectorAll('main > section.section'));
    FT.track('Home Page Viewed', { source: FT.takeSource('direct'), articles: articlesIn(sections[0], 'Home') });
    var titled = sections.filter(function (s) { return s.querySelector('.section-title'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var name = text(en.target.querySelector('.section-title'));
        FT.track('Section Viewed', { section_name: name, position: titled.indexOf(en.target) + 1, articles: articlesIn(en.target, name) });
      });
    }, { rootMargin: '0px 0px -30% 0px' });
    titled.forEach(function (s) { io.observe(s); });
  }

  // ---- Topic stream ----
  if (page === 'global-economy') {
    FT.track('Stream Viewed', {
      stream_name: text(document.querySelector('.stream-title h1')), parent_section: 'World',
      topic_followed: FT.isFollowed('Global Economy'), articles: articlesIn(document.querySelector('.stream-grid'), 'World')
    });
  }

  // ---- Article: view, then 75% scroll once ----
  if (page === 'article') {
    var art = currentArticle(), openedAt = Date.now(), scrolled = false;
    FT.track('Article Viewed', Object.assign({ source: FT.takeSource('direct') }, art));
    function onScroll() {
      if (scrolled) return;
      var h = document.documentElement.scrollHeight;
      if ((window.scrollY + window.innerHeight) / h < 0.75) return;
      scrolled = true;
      window.removeEventListener('scroll', onScroll);
      FT.track('75% Scrolled', Object.assign({ scroll_depth: 75, time_on_page_seconds: Math.round((Date.now() - openedAt) / 1000) }, art));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---- Search results page: reflect the query ----
  if (page === 'search') {
    var query = q || '';
    document.getElementById('results-input').value = query;
    document.querySelectorAll('.q-echo').forEach(function (el) { el.textContent = query; });
    document.title = 'Search results for "' + query + '" | Financial Times — Fedor Testing';
    document.querySelectorAll('.sort .seg button').forEach(function (b) {
      b.addEventListener('click', function () { document.querySelectorAll('.sort .seg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
    });
    FT.track('Search Results Viewed', {
      search_query: query, results_count: document.querySelectorAll('a[data-track="search_result_click"]').length,
      sort: document.querySelector('.sort .seg .on').dataset.sort, filter: 'all'
    });
    document.getElementById('results-form').addEventListener('submit', function (e) {
      var nq = document.getElementById('results-input').value.trim();
      e.preventDefault();
      if (!nq) return;
      FT.track('Search Submitted', { search_query: nq, location: 'results_page', suggestion_used: false });
      var form = this;
      FT.flushThen(function () { form.submit(); });
    });
  }

  // ---- Sign-in flow: step 1 (email) → step 2 (password) → passkey prompt → home ----
  if (page === 'login') {
    if (user) { location.replace('index.html'); return; }
    var emailForm = document.getElementById('email-form');
    var passwordForm = document.getElementById('password-form');
    var emailInput = document.getElementById('email');
    var passwordInput = document.getElementById('password');
    var pending = sessionStorage.getItem('ft_login_email');

    function once(input, name) {
      var fired = false;
      input.addEventListener('input', function () { if (!fired && input.value) { fired = true; FT.track(name); } });
    }
    once(emailInput, 'Email Typed');
    once(passwordInput, 'Password Typed');

    function showPasswordStep(email) {
      sessionStorage.setItem('ft_login_email', email);
      document.getElementById('email-readonly').value = email;
      emailForm.classList.add('hidden');
      passwordForm.classList.remove('hidden');
      passwordInput.focus();
    }

    if (pending) showPasswordStep(pending); else emailInput.focus();

    emailForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailInput.value.trim();
      var field = document.getElementById('email-field');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { field.classList.add('invalid'); return; }
      field.classList.remove('invalid');
      showPasswordStep(email);
    });

    passwordForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var field = document.getElementById('password-field');
      if (!passwordInput.value) { field.classList.add('invalid'); return; }
      field.classList.remove('invalid');
      var email = sessionStorage.getItem('ft_login_email');
      sessionStorage.removeItem('ft_login_email');
      FT.signIn(email, 'email');
      FT.track('Signed In Completed', { sign_in_type: 'email' });
      FT.setSource('post_sign_in');
      FT.flushThen(function () { location.href = 'passkey.html'; });
    });
  }

  if (page === 'passkey') {
    if (!user) { location.replace('login.html'); return; }
    document.getElementById('passkey-email').value = user.email;
    document.getElementById('passkey-setup').addEventListener('click', function (e) {
      FT.identifyUser({ passkey_enabled: true }); FT.setSource('post_passkey'); FT.navAfterFlush(e, this);
    });
    document.getElementById('passkey-not-now').addEventListener('click', function (e) {
      FT.track('Passkey Skipped');
      FT.identifyUser({ passkey_enabled: false });
      FT.setSource('post_passkey');
      FT.navAfterFlush(e, this);
    });
  }

  if (page === 'account') {
    if (!user) { location.replace('login.html'); return; }
    document.getElementById('account-email').textContent = user.email;
    document.getElementById('sign-out').addEventListener('click', function (e) {
      e.preventDefault();
      FT.track('Signed Out');
      FT.setSource('post_sign_out');
      FT.flushThen(function () { FT.signOut(); location.href = 'index.html'; });
    });
  }
});
