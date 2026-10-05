// Captures everything the Amplitude Browser SDK tries to send, so tests assert on the real payloads
// without anything reaching Amplitude. Remote-config and other *.amplitude.com calls get an empty 200.
const { expect } = require('@playwright/test');
const zlib = require('zlib');

// SDK 2.47 gzips request bodies; fall back to plain JSON if a body is not compressed.
function parseBody(req) {
  const buf = req.postDataBuffer();
  if (!buf) return {};
  const raw = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf;
  return JSON.parse(raw.toString('utf8'));
}

const TAXONOMY = [
  'Sign In Started', 'Email Typed', 'Password Typed', 'Signed In Completed', 'Passkey Skipped', 'Signed Out',
  'Home Page Viewed', 'Section Viewed', 'Stream Viewed', 'Article Viewed', 'Article Saved', 'Article Unsaved',
  'Article Shared', 'Article Read', 'Search Submitted', 'Search Results Viewed'
];

async function captureAmplitude(page) {
  const events = [];
  await page.route(/https:\/\/(?!cdn\.)[a-z0-9.-]*amplitude\.com\//, async (route) => {
    const req = route.request();
    if (/api2\.amplitude\.com\/2\/httpapi/.test(req.url()) && req.method() === 'POST') {
      const body = parseBody(req);
      for (const e of body.events || []) events.push(e);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: 200, events_ingested: (body.events || []).length, payload_size_bytes: 0, server_upload_time: Date.now() }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  const SDK_EVENTS = ['$identify', 'session_start', 'session_end'];
  const custom = () => events.filter((e) => !e.event_type.startsWith('[Amplitude]') && !SDK_EVENTS.includes(e.event_type));
  const named = (name) => events.filter((e) => e.event_type === name);
  const identifies = () => events.filter((e) => e.event_type === '$identify');

  // Wait until `count` events with this name have been received, return the latest.
  async function waitFor(name, count = 1) {
    await page.evaluate(() => window.amplitude && window.amplitude.flush()).catch(() => {});
    await expect.poll(() => named(name).length, { message: `waiting for ${count}x "${name}"` }).toBeGreaterThanOrEqual(count);
    return named(name)[count - 1];
  }
  async function waitForIdentify(pred) {
    await page.evaluate(() => window.amplitude && window.amplitude.flush()).catch(() => {});
    await expect.poll(() => identifies().some(pred)).toBe(true);
    return identifies().filter(pred).pop();
  }
  return { events, custom, named, identifies, waitFor, waitForIdentify };
}

// Shared article property shape, so every article-bearing event is checked the same way.
function expectArticleShape(obj) {
  expect(typeof obj.article_id).toBe('string');
  expect(obj.article_id.length).toBeGreaterThan(0);
  expect(typeof obj.article_title).toBe('string');
  expect(['news', 'opinion', 'newsletter']).toContain(obj.article_type);
  expect(typeof obj.section).toBe('string');
  expect(typeof obj.paywalled).toBe('boolean');
}

// Watch a page for console errors and failed (non-Amplitude) network requests.
function watchHealth(page) {
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => { if (!/amplitude\.com/.test(r.url())) problems.push('requestfailed: ' + r.url()); });
  page.on('response', (r) => { if (r.status() >= 400 && !/amplitude\.com/.test(r.url())) problems.push(`http ${r.status()}: ${r.url()}`); });
  return problems;
}

// Event properties without the SDK's own [Amplitude] page-URL enrichment keys.
function own(props) {
  const out = {};
  for (const k of Object.keys(props || {})) if (!k.startsWith('[Amplitude]') && k !== 'referrer' && k !== 'referring_domain') out[k] = props[k];
  return out;
}

module.exports = { own, TAXONOMY, captureAmplitude, expectArticleShape, watchHealth };
