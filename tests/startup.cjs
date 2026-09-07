const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const dist = path.resolve(__dirname, '../dist'), artifacts = path.resolve(__dirname, '../test-results');
async function runCase(browser, origin, scenario) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => errors.push(request.url()));
  page.on('request', request => requests.push(request.url()));
  await context.addInitScript(() => {
    window.startupOrder = [];
    document.addEventListener('load', event => {
      if (event.target.matches?.('link[data-boot-required]')) startupOrder.push('css');
    }, true);
    const observer = new MutationObserver(() => {
      if (document.querySelector('#app[data-v-app]')) { startupOrder.push('vue'); observer.disconnect(); }
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-v-app'] });
  });
  if (scenario.delay) await context.route(`**/assets/*.${scenario.delay}`, async route => {
    await new Promise(resolve => setTimeout(resolve, 500)); await route.continue();
  });
  if (scenario.offline) await context.setOffline(true);
  try {
    await page.goto(scenario.offline ? pathToFileURL(path.join(dist, 'offline.html')).href : origin + (scenario.route || '/'));
    await page.waitForFunction(() => document.getElementById('loading')?.hidden, null, { timeout: 15000 });
    assert.equal(await page.locator('#app').evaluate(element => element.inert), false);
    if (scenario.delay) assert.deepEqual(await page.evaluate(() => startupOrder), scenario.delay === 'js' ? ['css', 'vue'] : ['vue', 'css']);
    await page.waitForFunction(() => {
      const canvas = document.getElementById('home-rider-preview'), pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 4; i < pixels.length; i += 4) if (pixels[i] !== pixels[0] || pixels[i + 1] !== pixels[1]) return true;
      return false;
    });
    if (scenario.name === 'css-first') await page.screenshot({ path: path.join(artifacts, 'startup-local-home.png') });
    await page.locator('#wardrobe-open-0').click();
    assert.equal(await page.locator('#wardrobe-rider-preview').isVisible(), true);
    assert.ok(await page.locator('#wardrobe .outfit-thumb').evaluateAll(images => images.every(image => image.complete && image.naturalWidth === 128)));
    await page.locator('#wardrobe-cancel').click();
    await page.locator('#start').click(); await page.locator('#pause').waitFor({ state: 'visible' });
    assert.equal(await page.locator('body').evaluate(body => body.classList.contains('playing')), true);
    assert.deepEqual(errors, []);
    const pngRequests = requests.filter(url => /\/assets\/[^/]+\.png$/.test(url));
    if (scenario.offline) assert.ok(requests.every(url => !/^https?:/.test(url)));
    else assert.ok(pngRequests.length >= 20);
    console.log(`PASS ${scenario.name}: real load order, drawn model, outfit images and playable game; PNG requests ${pngRequests.length}`);
  } catch (error) {
    await page.screenshot({ path: path.join(artifacts, `startup-${scenario.name}-failure.png`) });
    console.error(await page.locator('#loading').innerText(), errors); throw error;
  } finally { await context.close(); }
}

async function main() {
  fs.mkdirSync(artifacts, { recursive: true });
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(dist, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(dist + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const scenario of [{ name: 'css-first', delay: 'js' }, { name: 'js-first', delay: 'css' }, { name: 'english', route: '/en/' }, { name: 'offline', offline: true }]) await runCase(browser, origin, scenario);
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
