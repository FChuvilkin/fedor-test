# CLAUDE.md

## What this is
FT (Fedor Testing): a mock two-page news site styled like a broadsheet financial paper. Its purpose is to test Amplitude Analytics and Amplitude Web Experiment. It is not a real product.

## Keep it simple
- Plain HTML, CSS and vanilla JS. No frameworks, bundlers, package managers or build steps.
- No images, fonts or external assets beyond what is already here. Placeholders are fine.
- Do not add tooling, tests, linters or CI unless explicitly asked.

## Files
- `index.html` — home page (logged-out and logged-in states)
- `login.html` — sign in: step 1 email, step 2 password (same page, JS toggles)
- `passkey.html` — "Set up a passkey" prompt after sign in
- `account.html` — My Account with sign out
- `article.html` — news article, paywall shown to logged-out users
- `global-economy.html` — topic stream page (World › Global Economy) with Save buttons
- `firstft.html` — FirstFT newsletter article with share rail, topics sidebar, Latest on World, Comments
- `search.html` — search results, reads `?q=`
- `article-dalio.html` — opinion article reached from search
- `styles.css` — shared styles
- `app.js` — shared script. Auth state (`localStorage.ft_user`), site chrome, Amplitude Browser SDK wiring and the event taxonomy.
- `config.js` — sets `window.FT_CONFIG.AMPLITUDE_API_KEY`. Committed on purpose: browser keys are public and GitHub Pages needs it.
- `tests/` — Playwright suite (`site.spec.js` smoke tests, `events.spec.js` asserts every Amplitude event in the demo flow). The only tooling in the repo; it was explicitly requested.

## Conventions
- Every interactive element gets an `id` and a `data-track="event_name"` attribute, plus `data-*` props. `app.js` console-logs these on click (`FT.log`) but does NOT send them to Amplitude.
- Amplitude receives only the 16 taxonomy events listed at the top of `app.js` (Title Case, Noun + Past-Tense Verb) via `FT.track`. Add new events there, not as raw clicks. Every article-bearing event carries an `articles` object array (entries built by `articlesIn()` or `currentArticle()`); single-article events (Article Viewed/Read/Saved/Unsaved/Shared) nest their one article as `articles: [art]` with `position: 1`, never as flat top-level props.
- Events fired right before a navigation must go through `FT.navAfterFlush` / `FT.flushThen` so the SDK sends them before the page unloads.
- Article pages declare their metadata on `<body data-article-id data-article-type data-section data-topic data-author data-paywalled>`.
- `href="#"` links are dead links; `app.js` prevents navigation on them.
- `.logged-in-only` / `.logged-out-only` classes toggle markup per auth state.
- Masthead, primary nav, burger drawer and search overlay are rendered by `renderHeader()` in `app.js` into `<div id="site-header" data-current="..." data-compact="true">`. Do not hand-write the masthead in pages.
- Save buttons: `<button class="save-btn" data-article="slug">` (lists) or `class="rail-save"` (article share rail). State in `localStorage.ft_saved`.
- myFT topic buttons: `<a class="myft-btn" data-topic="Name">`. State in `localStorage.ft_topics`; Global Economy, World and Companies are followed by default.

## Run
Open `index.html` in a browser, or `python3 -m http.server` from the repo root.

Tests: `cd tests && npm install && npx playwright test`. They intercept all Amplitude requests, so nothing reaches the project.

## Hosting
Will be hosted on GitHub Pages from the `master` branch root.
