# CLAUDE.md

## What this is
FT (Fedor Testing): a mock two-page news site styled like a broadsheet financial paper. Its purpose is to test Amplitude Analytics and Amplitude Web Experiment. It is not a real product.

## Keep it simple
- Plain HTML, CSS and vanilla JS. No frameworks, bundlers, package managers or build steps.
- No images, fonts or external assets beyond what is already here. Placeholders are fine.
- Do not add tooling, tests, linters or CI unless explicitly asked.

## Files
- `index.html` — home page
- `article.html` — article page
- `styles.css` — shared styles
- `app.js` — shared script. Amplitude SDK and Experiment code go here.

## Run
Open `index.html` in a browser, or `python3 -m http.server` from the repo root.

## Hosting
Will be hosted on GitHub Pages from the `master` branch root.
