# FT — Fedor Testing

A static mock of the Financial Times site, built for testing Amplitude Analytics and Web Experiment. Not affiliated with the Financial Times.

## Pages
- `index.html` — homepage (logged-out and logged-in states)
- `login.html` — sign in, step 1 (email) and step 2 (password)
- `passkey.html` — "Set up a passkey" prompt shown after sign in
- `account.html` — My Account, with sign out
- `article.html` — news article with paywall for logged-out users
- `global-economy.html` — World › Global Economy stream with Save buttons and myFT topic follow
- `firstft.html` — FirstFT newsletter article: share rail, topics sidebar, Latest on World, Comments
- `search.html` — search results page, reads `?q=`
- `article-dalio.html` — Ray Dalio opinion article reached from search
- `styles.css` — shared styles
- `app.js` — shared script. Auth state, click tracking stub, Amplitude hooks go here.

## The journey
1. Open `index.html` logged out. Header shows **Subscribe** and **Sign In**.
2. Click **Sign In**, enter an email, click **Next**.
3. Enter any password, click **Sign in**.
4. On the passkey screen click **Not now**.
5. You are back on the homepage, logged in. Header shows **My Account** and the secondary nav (FT Digital Edition, Portfolio, myFT).
6. Open the burger menu, expand **World**, click **Global Economy**.
7. Click **Save** on the second article. The button turns red and a myFT popover appears. Click again to unsave.
8. Open the FirstFT article, scroll to Comments, go back up and click the **X** share button.
9. Click the search icon, type "Dalio", press Search. Open the first result.
10. **My Account → Sign out** resets the state.

Saved articles live in `localStorage.ft_saved`, followed topics in `localStorage.ft_topics`. The masthead, nav, burger drawer and search overlay are rendered by `app.js` into `<div id="site-header">` on each page.

Login state lives in `localStorage` under `ft_user`. Every tracked element has a `data-track` attribute; clicks are logged to the console until the Amplitude SDK is wired in.

## Run
Open `index.html` directly in a browser, or `python3 -m http.server` from the repo root.
