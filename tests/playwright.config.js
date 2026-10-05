// Serves the repo root with Python's http.server and runs the specs against it in Chromium.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  timeout: 60000,
  expect: { timeout: 8000 },
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1280, height: 800 } },
  webServer: { command: 'python3 -m http.server 4173 --directory ..', url: 'http://127.0.0.1:4173/index.html', reuseExistingServer: true },
  reporter: 'list'
});
