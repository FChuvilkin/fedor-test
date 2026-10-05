// Part 1 of the user's ask: make sure the website itself runs well before checking analytics.
const { test, expect } = require('@playwright/test');
const { captureAmplitude, watchHealth } = require('./helpers');

const PUBLIC_PAGES = ['index.html', 'login.html', 'article.html', 'global-economy.html', 'firstft.html', 'search.html?q=Dalio', 'article-dalio.html'];

for (const path of PUBLIC_PAGES) {
  test(`${path} loads cleanly`, async ({ page }) => {
    const problems = watchHealth(page);
    await captureAmplitude(page);
    await page.goto('/' + path);
    await expect(page.locator('body')).toBeVisible();
    // Amplitude SDK and config loaded and initialised with a key
    expect(await page.evaluate(() => typeof window.amplitude.track)).toBe('function');
    expect(await page.evaluate(() => !!(window.FT_CONFIG && window.FT_CONFIG.AMPLITUDE_API_KEY))).toBe(true);
    if (!/login/.test(path)) await expect(page.locator('#menu-btn')).toBeVisible();
    await page.waitForTimeout(300);
    expect(problems).toEqual([]);
  });
}

test('logged-out header shows Subscribe and Sign In, hides My Account', async ({ page }) => {
  await captureAmplitude(page);
  await page.goto('/index.html');
  await expect(page.locator('#nav-subscribe')).toBeVisible();
  await expect(page.locator('#nav-signin')).toBeVisible();
  await expect(page.locator('#nav-account')).toBeHidden();
  await expect(page.locator('.secondary.logged-in-only')).toBeHidden();
});

test('passkey and account pages redirect to login when logged out', async ({ page }) => {
  await captureAmplitude(page);
  await page.goto('/passkey.html');
  await expect(page).toHaveURL(/login\.html/);
  await page.goto('/account.html');
  await expect(page).toHaveURL(/login\.html/);
});

test('dead links do not navigate or jump', async ({ page }) => {
  await captureAmplitude(page);
  await page.goto('/index.html');
  await page.locator('.ticker a.tick').first().click();
  await expect(page).toHaveURL(/index\.html$/);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('burger drawer opens, World expands, Global Economy links to the stream', async ({ page }) => {
  await captureAmplitude(page);
  await page.goto('/index.html');
  await page.locator('#menu-btn').click();
  await expect(page.locator('#drawer')).toHaveClass(/open/);
  await page.locator('.chev[data-section="world"]').click();
  await page.locator('#drawer a[data-item="Global Economy"]').click();
  await expect(page).toHaveURL(/global-economy\.html/);
  await expect(page.locator('.myft-btn[data-topic="Global Economy"]')).toHaveText('Added');
});

test('save button toggles state and persists across reload', async ({ page }) => {
  await captureAmplitude(page);
  await page.goto('/global-economy.html');
  const btn = page.locator('.save-btn[data-article="firstft-bolsonaro"]');
  await expect(btn).toHaveText(/Save$/);
  await btn.click();
  await expect(btn).toHaveClass(/saved/);
  await expect(page.locator('.save-pop.open')).toBeVisible();
  await page.reload();
  await expect(page.locator('.save-btn[data-article="firstft-bolsonaro"]')).toHaveClass(/saved/);
  await page.locator('.save-btn[data-article="firstft-bolsonaro"]').click();
  await expect(page.locator('.save-btn[data-article="firstft-bolsonaro"]')).not.toHaveClass(/saved/);
});

test('search overlay shows suggestions and submits to results page', async ({ page }) => {
  await captureAmplitude(page);
  await page.goto('/index.html');
  await page.locator('#search-btn').click();
  await page.locator('#search-input').fill('Dalio');
  await expect(page.locator('#search-suggest')).toHaveClass(/open/);
  await expect(page.locator('#search-suggest')).toContainText('Related Pages');
  await page.locator('#search-form button[type="submit"]').click();
  await expect(page).toHaveURL(/search\.html\?q=Dalio/);
  await expect(page.locator('#results-input')).toHaveValue('Dalio');
  await expect(page.locator('a[data-track="search_result_click"][data-rank="1"]')).toHaveText("China's tribute system and the new world order");
});
