// FT — Fedor Testing. Shared script. Amplitude Analytics + Web Experiment code goes here.

var FT = (function () {
  var USER = 'ft_user', SAVED = 'ft_saved', TOPICS = 'ft_topics';
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

  // Placeholder: swap for amplitude.track() once the SDK is wired in.
  function track(name, props) { console.log('[track]', name, props || {}); }

  function toast(msg) {
    var el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  return { getUser: getUser, setUser: setUser, clearUser: clearUser, isSaved: isSaved, toggleSaved: toggleSaved,
           isFollowed: isFollowed, toggleTopic: toggleTopic, track: track, toast: toast };
})();

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
    if (!q) { e.preventDefault(); return; }
    FT.track('search', { query: q, page: document.body.dataset.page });
  });
}

// ---------- Save (bookmark) buttons and myFT topic buttons ----------
function bookmark(filled) {
  return '<svg viewBox="0 0 20 26" aria-hidden="true"><path d="M2 1h16v24l-8-6-8 6z" fill="' + (filled ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"/></svg>';
}
function initSaveButtons() {
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
    btn.addEventListener('click', function () { paint(FT.toggleSaved(id)); });
  });
}

function initTopicButtons() {
  document.querySelectorAll('.myft-btn').forEach(function (btn) {
    var topic = btn.dataset.topic;
    function paint(on) { btn.classList.toggle('added', on); btn.textContent = on ? 'Added' : 'Add to myFT'; btn.dataset.track = on ? 'topic_unfollow' : 'topic_follow'; }
    paint(FT.isFollowed(topic));
    btn.addEventListener('click', function (e) { e.preventDefault(); paint(FT.toggleTopic(topic)); });
  });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', function () {
  var page = document.body.dataset.page;
  var user = FT.getUser();
  if (user) document.body.classList.add('logged-in');

  var mount = document.getElementById('site-header');
  if (mount) renderHeader(mount);
  initSaveButtons();
  initTopicButtons();

  var pv = { page: page, logged_in: !!user };
  if (document.body.dataset.article) pv.article_title = document.body.dataset.article;
  var q = new URLSearchParams(location.search).get('q');
  if (q) pv.query = q;
  FT.track('page_view', pv);

  // Dead links (href="#") must not jump the page. Anything with data-track is logged with its data-* attrs.
  document.addEventListener('click', function (e) {
    var el = e.target.closest('a, button');
    if (!el) return;
    if (el.getAttribute('href') === '#') e.preventDefault();
    if (el.dataset.track) {
      var props = { page: page, text: el.textContent.trim().slice(0, 80) };
      Object.keys(el.dataset).forEach(function (k) { if (k !== 'track') props[k] = el.dataset[k]; });
      FT.track(el.dataset.track, props);
      if (el.dataset.track === 'share_click') FT.toast('Shared to ' + el.dataset.provider + ' (mock)');
    }
  });

  // ---- Search results page: reflect the query ----
  if (page === 'search') {
    var query = q || '';
    document.getElementById('results-input').value = query;
    document.querySelectorAll('.q-echo').forEach(function (el) { el.textContent = query; });
    document.title = 'Search results for "' + query + '" | Financial Times — Fedor Testing';
    document.querySelectorAll('.sort .seg button').forEach(function (b) {
      b.addEventListener('click', function () { document.querySelectorAll('.sort .seg button').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); });
    });
  }

  // ---- Sign-in flow: step 1 (email) → step 2 (password) → passkey prompt → home ----
  if (page === 'login') {
    if (user) { location.replace('index.html'); return; }
    var emailForm = document.getElementById('email-form');
    var passwordForm = document.getElementById('password-form');
    var emailInput = document.getElementById('email');
    var pending = sessionStorage.getItem('ft_login_email');

    function showPasswordStep(email) {
      sessionStorage.setItem('ft_login_email', email);
      document.getElementById('email-readonly').value = email;
      emailForm.classList.add('hidden');
      passwordForm.classList.remove('hidden');
      document.getElementById('password').focus();
      FT.track('login_step_view', { step: 'password' });
    }

    if (pending) showPasswordStep(pending); else { emailInput.focus(); FT.track('login_step_view', { step: 'email' }); }

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
      var pw = document.getElementById('password').value;
      if (!pw) { field.classList.add('invalid'); return; }
      field.classList.remove('invalid');
      var email = sessionStorage.getItem('ft_login_email');
      FT.setUser({ email: email, keepSignedIn: document.getElementById('keep-signed-in').checked, signedInAt: new Date().toISOString() });
      sessionStorage.removeItem('ft_login_email');
      FT.track('login_success', { email: email });
      location.href = 'passkey.html';
    });
  }

  if (page === 'passkey') {
    if (!user) { location.replace('login.html'); return; }
    document.getElementById('passkey-email').value = user.email;
    document.getElementById('passkey-setup').addEventListener('click', function () { FT.track('passkey_setup_complete', {}); });
    document.getElementById('passkey-not-now').addEventListener('click', function () {
      FT.track('passkey_dismissed', { do_not_show_again: document.getElementById('passkey-dismiss').checked });
    });
  }

  if (page === 'account') {
    if (!user) { location.replace('login.html'); return; }
    document.getElementById('account-email').textContent = user.email;
    document.getElementById('sign-out').addEventListener('click', function () { FT.clearUser(); FT.track('sign_out', {}); });
  }
});
