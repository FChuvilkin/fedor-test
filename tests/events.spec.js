// Part 2 of the user's ask: walk Demo flow.md end to end and assert each Amplitude event and its properties.
const { test, expect } = require('@playwright/test');
const { own, TAXONOMY, captureAmplitude, expectArticleShape, watchHealth } = require('./helpers');

const EMAIL = 'demo@example.com';

// Wait for the URL and for app.js to have run, so listeners exist before the test types or clicks.
async function arrived(page, re) { await expect(page).toHaveURL(re); await page.waitForLoadState('load'); }

test('demo flow fires the agreed taxonomy with the right properties', async ({ page }) => {
  const problems = watchHealth(page);
  const amp = await captureAmplitude(page);

  // ---- Part 1: Sign in ----
  await page.goto('/index.html');
  let home = await amp.waitFor('Home Page Viewed');
  expect(home.event_properties.source).toBe('direct');
  expect(home.user_id).toBeUndefined();
  expect(Array.isArray(home.event_properties.articles)).toBe(true);
  expect(home.event_properties.articles).toHaveLength(6);
  expectArticleShape(home.event_properties.articles[0]);
  expect(home.event_properties.articles[0]).toMatchObject({ article_id: 'bolsonaro-lead', position: 1, section: 'Home', topic: 'Brazilian politics' });
  expect(home.event_properties.articles.map((a) => a.position)).toEqual([1, 2, 3, 4, 5, 6]);

  // Scroll the full homepage: every titled section fires Section Viewed once
  const sectionTitles = await page.locator('main > section .section-title').evaluateAll((els) => els.map((el) => el.textContent.trim()));
  for (let y = 0; y < 12000; y += 400) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(40); }
  await amp.waitFor('Section Viewed', sectionTitles.length);
  const sections = amp.named('Section Viewed');
  expect(sections.map((e) => e.event_properties.section_name)).toEqual(sectionTitles.map((t) => t.trim()));
  expect(sections.map((e) => e.event_properties.position)).toEqual(sectionTitles.map((_, i) => i + 1));
  const top = sections[0].event_properties;
  expect(top.section_name).toBe('Top stories');
  expect(top.articles).toHaveLength(6);
  top.articles.forEach(expectArticleShape);
  expect(top.articles[2]).toMatchObject({ article_id: 'diesel-coercion', article_type: 'opinion', paywalled: true, author: 'Alan Beattie', topic: 'Oil' });
  const opinion = sections.find((e) => e.event_properties.section_name === 'Opinion').event_properties;
  expect(opinion.articles.every((a) => a.article_type === 'opinion')).toBe(true);
  // One Section Viewed per section, no duplicates after extra scrolling
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => window.scrollTo(0, 6000));
  await page.waitForTimeout(500);
  expect(amp.named('Section Viewed')).toHaveLength(sectionTitles.length);

  await page.locator('#nav-signin').click();
  const started = await amp.waitFor('Sign In Started');
  expect(own(started.event_properties)).toEqual({ sign_in_type: 'email', location: 'header' });
  await arrived(page, /login\.html/);

  await page.locator('#email').pressSequentially(EMAIL);
  const emailTyped = await amp.waitFor('Email Typed');
  expect(own(emailTyped.event_properties)).toEqual({});
  await page.locator('#email-next').click();
  await expect(page.locator('#password-form')).toBeVisible();
  expect(amp.named('Email Typed')).toHaveLength(1);

  await page.locator('#password').pressSequentially('secret');
  await amp.waitFor('Password Typed');
  await page.locator('#password-submit').click();
  await arrived(page, /passkey\.html/);
  const signedIn = await amp.waitFor('Signed In Completed');
  expect(own(signedIn.event_properties)).toEqual({ sign_in_type: 'email' });
  expect(signedIn.user_id).toBe(EMAIL);
  const idSignIn = await amp.waitForIdentify((e) => e.user_properties && e.user_properties.$set && e.user_properties.$set.sign_in_type === 'email');
  expect(idSignIn.user_id).toBe(EMAIL);
  expect(idSignIn.user_properties.$set).toMatchObject({ sign_in_type: 'email', saved_article_count: 0, edition: 'international', followed_topics: ['Global Economy', 'World', 'Companies'] });
  expect(idSignIn.user_properties.$set.logged_in).toBeUndefined();

  await page.locator('#passkey-not-now').click();
  await arrived(page, /index\.html/);
  const skipped = await amp.waitFor('Passkey Skipped');
  expect(own(skipped.event_properties)).toEqual({});
  expect(skipped.user_id).toBe(EMAIL);
  await amp.waitForIdentify((e) => e.user_properties && e.user_properties.$set && e.user_properties.$set.passkey_enabled === false);

  home = await amp.waitFor('Home Page Viewed', 2);
  expect(home.event_properties.source).toBe('post_passkey');
  expect(home.user_id).toBe(EMAIL);
  await expect(page.locator('#nav-account')).toBeVisible();

  // ---- Part 2: Navigate and save ----
  await page.locator('#menu-btn').click();
  await page.locator('.chev[data-section="world"]').click();
  await page.locator('#drawer a[data-item="Global Economy"]').click();
  await arrived(page, /global-economy\.html/);
  const stream = await amp.waitFor('Stream Viewed');
  expect(stream.event_properties).toMatchObject({ stream_name: 'Global Economy', parent_section: 'World', topic_followed: true });
  expect(stream.event_properties.articles).toHaveLength(5);
  stream.event_properties.articles.forEach(expectArticleShape);
  expect(stream.event_properties.articles[1]).toMatchObject({ article_id: 'firstft-bolsonaro', article_type: 'newsletter', position: 2, topic: 'FirstFT', paywalled: false });
  expect(stream.event_properties.articles[0]).toMatchObject({ article_id: 'diesel-coercion', article_type: 'opinion', author: 'Alan Beattie', paywalled: true });

  const saveBtn = page.locator('.save-btn[data-article="firstft-bolsonaro"]');
  await saveBtn.click();
  const saved = await amp.waitFor('Article Saved');
  expectArticleShape(saved.event_properties);
  expect(saved.event_properties).toMatchObject({ article_id: 'firstft-bolsonaro', article_type: 'newsletter', location: 'stream', position: 2, section: 'World' });
  expect(saved.user_id).toBe(EMAIL);
  await amp.waitForIdentify((e) => e.user_properties && e.user_properties.$set && e.user_properties.$set.saved_article_count === 1);

  await saveBtn.click();
  const unsaved = await amp.waitFor('Article Unsaved');
  expect(unsaved.event_properties).toMatchObject({ article_id: 'firstft-bolsonaro', location: 'stream', position: 2 });
  await amp.waitForIdentify((e) => e.user_properties && e.user_properties.$set && e.user_properties.$set.saved_article_count === 0);

  // ---- Part 3: Read and share ----
  await page.locator('a[data-track="headline_click"][href="firstft.html"]').click();
  await arrived(page, /firstft\.html/);
  const viewed = await amp.waitFor('Article Viewed');
  expectArticleShape(viewed.event_properties);
  expect(viewed.event_properties).toMatchObject({ source: 'stream', article_id: 'firstft-bolsonaro', article_type: 'newsletter', section: 'World', topic: 'Global Economy', author: 'Gordon Smith', paywalled: false });
  expect(amp.named('75% Scrolled')).toHaveLength(0);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const scrolled = await amp.waitFor('75% Scrolled');
  expect(scrolled.event_properties).toMatchObject({ scroll_depth: 75, article_id: 'firstft-bolsonaro', article_type: 'newsletter' });
  expect(typeof scrolled.event_properties.time_on_page_seconds).toBe('number');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  expect(amp.named('75% Scrolled')).toHaveLength(1);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.share-rail a[data-provider="X"]').click();
  const shared = await amp.waitFor('Article Shared');
  expectArticleShape(shared.event_properties);
  expect(shared.event_properties).toMatchObject({ share_channel: 'twitter', article_id: 'firstft-bolsonaro' });

  // ---- Part 4: Search ----
  await page.locator('#search-btn').click();
  await page.locator('#search-input').pressSequentially('Dalio');
  await expect(page.locator('#search-suggest')).toHaveClass(/open/);
  await page.locator('#search-form button[type="submit"]').click();
  await arrived(page, /search\.html\?q=Dalio/);
  const submitted = await amp.waitFor('Search Submitted');
  expect(own(submitted.event_properties)).toEqual({ search_query: 'Dalio', location: 'overlay', suggestion_used: false });
  const results = await amp.waitFor('Search Results Viewed');
  expect(own(results.event_properties)).toEqual({ search_query: 'Dalio', results_count: 5, sort: 'relevance', filter: 'all' });

  await page.locator('a[data-track="search_result_click"][data-rank="1"]').click();
  await arrived(page, /article-dalio\.html/);
  const dalio = await amp.waitFor('Article Viewed', 2);
  expect(dalio.event_properties).toMatchObject({ source: 'search_results', article_id: 'china-tribute', article_type: 'opinion', section: 'Opinion', author: 'Ray Dalio', paywalled: true });

  // ---- Reset ----
  await page.locator('#nav-account').click();
  await arrived(page, /account\.html/);
  await page.locator('#sign-out').click();
  await arrived(page, /index\.html/);
  const signedOut = await amp.waitFor('Signed Out');
  expect(own(signedOut.event_properties)).toEqual({});
  expect(signedOut.user_id).toBe(EMAIL);
  home = await amp.waitFor('Home Page Viewed', 3);
  expect(home.event_properties.source).toBe('post_sign_out');
  expect(home.user_id).toBeUndefined();
  await expect(page.locator('#nav-signin')).toBeVisible();

  // ---- Taxonomy guard: only the 16 agreed events, nothing UI-level, leaks through ----
  const names = [...new Set(amp.custom().map((e) => e.event_type))];
  for (const n of names) expect(TAXONOMY).toContain(n);
  for (const n of ['Sign In Started', 'Email Typed', 'Password Typed', 'Signed In Completed', 'Passkey Skipped', 'Signed Out', 'Home Page Viewed',
    'Section Viewed', 'Stream Viewed', 'Article Viewed', 'Article Saved', 'Article Unsaved', 'Article Shared', '75% Scrolled', 'Search Submitted', 'Search Results Viewed']) {
    expect(names, `expected "${n}" to have fired during the demo flow`).toContain(n);
  }
  for (const e of amp.events) {
    expect(e.event_properties && e.event_properties.logged_in).toBeUndefined();
    if (e.event_type !== '$identify') expect(e.user_properties && e.user_properties.$set && e.user_properties.$set.logged_in).toBeUndefined();
  }
  expect(problems).toEqual([]);
});

test('other Sign In Started sources and the paywall carry the right properties', async ({ page }) => {
  const amp = await captureAmplitude(page);
  await page.goto('/article.html');
  const viewed = await amp.waitFor('Article Viewed');
  expect(viewed.event_properties).toMatchObject({ source: 'direct', article_id: 'bolsonaro-lead', paywalled: true });
  await page.locator('.paywall a[data-track="sign_in_click"]').click();
  const paywall = await amp.waitFor('Sign In Started');
  expect(own(paywall.event_properties)).toEqual({ sign_in_type: 'email', location: 'paywall' });
  await page.locator('a[data-track="login_social_click"][data-provider="google"]').click();
  const google = await amp.waitFor('Sign In Started', 2);
  expect(own(google.event_properties)).toEqual({ sign_in_type: 'google', location: 'login_page' });
});

test('search suggestion click is a Search Submitted with suggestion_used true', async ({ page }) => {
  const amp = await captureAmplitude(page);
  await page.goto('/index.html');
  await page.locator('#search-btn').click();
  await page.locator('#search-input').fill('Dalio');
  await page.locator('#search-suggest a[data-track="search_related_click"]').click();
  await arrived(page, /search\.html\?q=Ray%20Dalio/);
  const submitted = await amp.waitFor('Search Submitted');
  expect(own(submitted.event_properties)).toEqual({ search_query: 'Ray Dalio', location: 'overlay', suggestion_used: true });
  const results = await amp.waitFor('Search Results Viewed');
  expect(results.event_properties.search_query).toBe('Ray Dalio');
});

test('home page source reflects how it was reached', async ({ page }) => {
  const amp = await captureAmplitude(page);
  await page.goto('/global-economy.html');
  await page.locator('#site-header a.logo').click();
  const viaLogo = await amp.waitFor('Home Page Viewed');
  expect(viaLogo.event_properties.source).toBe('logo');
  await page.locator('#menu-btn').click();
  await page.locator('#drawer a[data-section="home"]').click();
  const viaMenu = await amp.waitFor('Home Page Viewed', 2);
  expect(viaMenu.event_properties.source).toBe('menu_home');
});
