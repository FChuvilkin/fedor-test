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
- `app.js` — shared script. Auth state (`localStorage.ft_user`), click tracking stub, Amplitude SDK and Experiment code go here.

## Conventions
- Every interactive element gets an `id` and a `data-track="event_name"` attribute, plus `data-*` props. `app.js` logs these on click; swap the stub for `amplitude.track()` when wiring the SDK.
- `href="#"` links are dead links; `app.js` prevents navigation on them.
- `.logged-in-only` / `.logged-out-only` classes toggle markup per auth state.
- Masthead, primary nav, burger drawer and search overlay are rendered by `renderHeader()` in `app.js` into `<div id="site-header" data-current="..." data-compact="true">`. Do not hand-write the masthead in pages.
- Save buttons: `<button class="save-btn" data-article="slug">` (lists) or `class="rail-save"` (article share rail). State in `localStorage.ft_saved`.
- myFT topic buttons: `<a class="myft-btn" data-topic="Name">`. State in `localStorage.ft_topics`; Global Economy, World and Companies are followed by default.

## Run
Open `index.html` in a browser, or `python3 -m http.server` from the repo root.

## Hosting
Will be hosted on GitHub Pages from the `master` branch root.
