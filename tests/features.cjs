const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const levelData = import(pathToFileURL(path.resolve(__dirname, '../src/levels.js')).href);

async function installTestClock(context) {
  await context.addInitScript(() => {
    window.__PELICAN_TEST__ = true;
    window.requestAnimationFrame = callback => { window.testFrame = callback; return 1; };
    window.$ = id => document.getElementById(id);
    for (const key of ['game', 'save', 'entities', 'startRun', 'selectMode', 'endRun', 'riders', 'startLevel', 'step', 'action', 'collide', 'goHome', 'pauseGame', 'resumeGame', 'updateCamera', 'renderer', 'scene', 'camera', 'rider', 'V', 'updateWorld', 'updateEntities', 'soundEnabled', 'audio', 'app']) {
      Object.defineProperty(window, key, { configurable: true, get: () => window.__pelicanTest?.[key] });
    }
  });
}

async function waitForGame(page) {
  await page.waitForFunction(() => window.__pelicanTest && typeof window.testFrame === 'function', null, { polling: 50 });
  // Startup now waits for an actual rendered frame; advance the held game RAF.
  await page.evaluate(() => testFrame(performance.now()));
  await page.waitForFunction(() => window.__pelicanTest && $('loading')?.hidden && game.mode === 'home', null, { polling: 50 });
}

// Drive only real actions and fixed-step physics; never set health, fish or finish state.
async function rideToFinish(page, options = {}) {
  return page.evaluate(({ seconds = 250, fishTarget = Infinity, boostSeat = null, useItems = false }) => {
    let ticks = 0;
    for (; ticks < seconds * 120 && game.mode === 'playing'; ticks++) {
      if (game.players[0].fishCollected >= fishTarget) break;
      for (const player of game.players.filter(p => p.status === 'running')) {
        if (player.id === boostSeat && !player.boosting && player.fishBalance > 0) action({ playerId: player.id, type: 'boost' });
        if (useItems) action({ playerId: player.id, type: 'item' });
        const obstacles = entities.filter(e => ['hurdle', 'gate', 'crate'].includes(e.type));
        const ahead = obstacles.filter(e => e.at > player.distance - 2).sort((a, b) => a.at - b.at)[0];
        if (ahead && ahead.at - player.distance < 30) {
          const blocked = obstacles.filter(e => e.at === ahead.at).map(e => e.lane);
          const safe = [0, 1, 2].find(lane => !blocked.includes(lane));
          if (safe === undefined) throw new Error('Generated obstacle row has no safe lane');
          if (player.lane !== safe) action({ playerId: player.id, type: player.lane < safe ? 'right' : 'left' });
        }
      }
      step(1 / 120);
    }
    const record = save.records[game.gameMode];
    return { mode: game.mode, level: game.level, distance: game.distance, hp: game.players[0].hp,
      fish: game.players[0].fishCollected, unlocked: record.unlocked, stars: game.result?.stars,
      result: game.result, recordStars: record.stars?.[game.level], players: game.players, ticks };
  }, options);
}

async function openOffline(browser, target, errors, options = {}, legacy) {
  const { seedStorage = {}, ...browserOptions } = options;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN', colorScheme: 'light', ...browserOptions });
  await context.setOffline(true);
  await installTestClock(context);
  await context.addInitScript(entries => {
    for (const [key, value] of Object.entries(entries)) if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, seedStorage);
  if (legacy) await context.addInitScript(value => {
    if (!localStorage.getItem('pelican-pedal-run-v1')) localStorage.setItem('pelican-pedal-run-v1', JSON.stringify(value));
  }, legacy);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(target); await waitForGame(page);
  return { context, page };
}

async function verifyMigration({ browser, target, errors, check }) {
  const { LEVELS } = await levelData;
  for (const finished of [false, true]) {
    const old = { unlocked: 3, best: [1800, 2400, finished ? 3200 : 0], stars: [3, 2, finished ? 3 : 0] };
    const { context, page } = await openOffline(browser, target, errors, {}, old);
    try {
      const padding = Array(LEVELS.length - old.best.length).fill(0);
      const expected = { unlocked: finished ? 4 : 3, best: [...old.best, ...padding], stars: [...old.stars, ...padding] };
      check(`v1 ${finished ? 'completed' : 'uncompleted'} third route migrates without losing scores`, await page.evaluate(() => JSON.parse(JSON.stringify(save.records.campaign))), expected);
      check('legacy progress keeps the correct next-route lock', await page.locator('.route:disabled').count(), LEVELS.length - expected.unlocked);
      await page.evaluate(() => { startLevel(save.records.campaign.unlocked); });
      check('a locked route cannot be started via the game API', await page.evaluate(() => game.mode), 'home');
      await page.locator('#start').click();
      await page.evaluate(() => {
        for (const entity of entities.filter(e => e.type === 'crate').slice(0, 3)) {
          game.players[0].invincible = 0; game.distance = game.players[0].distance = entity.at; game.players[0].x = (entity.lane - 1) * 3.4; collide();
        }
        step(1 / 120);
      });
      check('migrated progress writes v3 and preserves the v1 source', await page.evaluate(count => {
        const current = JSON.parse(localStorage.getItem('pelican-pedal-run-v3')).records.campaign;
        return current.best.length === count && current.stars.length === count && current.unlocked === save.records.campaign.unlocked && localStorage.getItem('pelican-pedal-run-v1') !== null;
      }, LEVELS.length));
      await page.reload(); await waitForGame(page);
      check('v3 reload retains the migrated legacy stars', await page.evaluate(() => save.records.campaign.stars), expected.stars);
    } finally { await context.close(); }
  }
}

async function verifyPreferences({ browser, target, errors, check }) {
  const { context, page } = await openOffline(browser, target, errors);
  try {
    check('Chinese device language is detected', await page.locator('html').getAttribute('lang'), 'zh-CN');
    check('appearance defaults to system', await page.locator('#theme').inputValue(), 'system');
    const lightScene = await page.evaluate(() => scene.background.getHexString());
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { polling: 50 });
    check('system dark mode changes the 3D background', await page.evaluate(() => scene.background.getHexString()) !== lightScene);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, { polling: 50 });
    check('system light mode restores the 3D background', await page.evaluate(() => scene.background.getHexString()), lightScene);
    for (const theme of ['dark', 'light']) {
      await page.locator('#theme').selectOption(theme);
      await page.waitForFunction(value => document.documentElement.dataset.theme === value, theme, { polling: 50 });
      check(`manual ${theme} appearance is persisted`, await page.evaluate(() => localStorage.getItem('pelican-theme')), theme);
      await page.emulateMedia({ colorScheme: theme === 'dark' ? 'light' : 'dark' });
      await page.reload(); await waitForGame(page);
      check(`manual ${theme} survives reload and opposite device appearance`, await page.locator('html').getAttribute('data-theme'), theme);
    }
    await page.locator('#theme').selectOption('system');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark', null, { polling: 50 });
    check('returning to system uses the current device appearance', await page.locator('#theme').inputValue(), 'system');
    await page.locator('#language').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en', null, { polling: 50 });
    check('manual English choice is persisted', await page.evaluate(() => localStorage.getItem('pelican-locale')), 'en');
    await page.reload(); await waitForGame(page);
    check('English overrides a Chinese device after reload', await page.locator('html').getAttribute('lang'), 'en');
    await page.locator('#language').click();
    await page.waitForFunction(() => document.documentElement.lang === 'zh-CN', null, { polling: 50 });
    check('manual Chinese choice is persisted', await page.evaluate(() => localStorage.getItem('pelican-locale')), 'zh');
  } finally { await context.close(); }
}

async function verifyEnglish({ browser, target, errors, check }) {
  const { LEVELS } = await levelData;
  const { messages } = await import(pathToFileURL(path.resolve(__dirname, '../src/locales.js')).href);
  const t = messages.en;
  const { context, page } = await openOffline(browser, target, errors, { locale: 'en-US' });
  try {
    check('English device language is detected', await page.locator('html').getAttribute('lang'), 'en');
    check('English home heading is localized', await page.locator('h1').textContent().then(text => t.headline.every(part => text.includes(part))));
    check('every route has its own style class', await page.locator('.route').evaluateAll((buttons, ids) => buttons.length === ids.length && ids.every((id, index) => buttons[index].classList.contains(id)), LEVELS.map(level => level.id)));
    check('all route names are English', await page.locator('.route-name').allTextContents(), LEVELS.map(level => level.en));
    await page.locator('#help-open').click();
    const help = await page.locator('#help').textContent();
    check('English help translates title, instructions and note', [t.helpTitle, t.helpNote, t.understood, ...t.helpRows.flat()].every(value => help.includes(value)));
    check('English help contains no Chinese text', !/[\u3400-\u9fff]/.test(help));
    await page.locator('#help-close').click(); await page.locator('#start').click();
    check('English HUD includes route name and the full stage count', await page.evaluate(count => $('level-name').textContent.includes('Coral Coast') && $('stage-count').textContent === `1 / ${count}`, LEVELS.length));
    check('English health and touch labels are localized', await page.evaluate(() => $('hearts').getAttribute('aria-label') === '3 health remaining' && document.querySelector('[data-action="left"]').getAttribute('aria-label') === 'Steer left'));
    check('English start toast is localized', await page.locator('#toast').innerText().then(text => text.includes('Route 1') && !/[\u3400-\u9fff]/.test(text)));
    await page.locator('#pause').click();
    const pause = await page.locator('#pause-screen').textContent();
    check('English pause dialog is fully translated', [t.pauseTag, t.pauseTitle, t.pauseDesc, t.resume, t.restart, t.home].every(value => pause.includes(value)));
    await page.locator('#resume').click();
    await page.evaluate(() => { for (const e of entities.filter(e => e.type === 'crate').slice(0, 3)) { game.players[0].invincible = 0; game.distance = game.players[0].distance = e.at; game.players[0].x = (e.lane - 1) * 3.4; collide(); } step(1 / 120); });
    await page.waitForFunction(() => !$('result').hidden, null, { polling: 50 });
    const lost = await page.locator('#result').textContent();
    check('English defeat dialog is fully translated', [t.modes.campaign, t.lostTitle, t.lostDesc, t.retry, t.home, t.rideStat, t.fishStat, t.totalScore].every(value => lost.includes(value)));
    await page.locator('#next').click();
    for (let level = 0; level < LEVELS.length; level++) {
      const result = await rideToFinish(page);
      check(`English route ${level + 1} completes with three health and three stars`, [result.mode, result.hp, result.stars], ['won', 3, 3]);
      await page.waitForFunction(() => !$('result').hidden, null, { polling: 50 });
      const won = await page.locator('#result').textContent();
      check(`English route ${level + 1} victory dialog is translated`, [level === LEVELS.length - 1 ? t.allTitle : t.wonTitle, t.modes.campaign, level === LEVELS.length - 1 ? t.again : t.next, t.home].every(value => won.includes(value)) && !/[\u3400-\u9fff]/.test(won));
      if (level < LEVELS.length - 1) await page.locator('#next').click();
    }
    await page.locator('#result-home').click();
    await page.locator('#language').click(); await page.reload(); await waitForGame(page);
    check('Chinese preference overrides English device after reload', await page.locator('html').getAttribute('lang'), 'zh-CN');
  } finally { await context.close(); }
}

async function verifyOnline({ browser, errors, check }) {
  const dist = path.resolve(__dirname, '../dist');
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filename = path.resolve(dist, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (!filename.startsWith(dist + path.sep) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' })[path.extname(filename)] || 'application/octet-stream');
    response.end(fs.readFileSync(filename));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const context = await browser.newContext({ locale: 'zh-CN', javaScriptEnabled: false });
  try {
    for (const [route, lang, title, routeName] of [['/', 'zh-CN', '鹈鹕', '上海滩'], ['/en/', 'en', 'Pelican', 'The Bund']]) {
      const page = await context.newPage(); await page.goto(origin + route);
      check(`${route} serves static language metadata without JavaScript`, await page.locator('html').getAttribute('lang'), lang);
      check(`${route} has a crawlable title and route text`, (await page.title()).includes(title) && (await page.locator('body').innerText()).includes(routeName));
      check(`${route} has a localized description`, (await page.locator('meta[name="description"]').getAttribute('content')).toLowerCase().includes(title.toLowerCase()));
      check(`${route} has the production canonical URL`, await page.locator('link[rel="canonical"]').getAttribute('href'), `https://tihuqiche.com${route}`);
      for (const language of ['zh-CN', 'en', 'x-default']) check(`${route} includes ${language} alternate URL`, await page.locator(`link[rel="alternate"][hreflang="${language}"]`).count(), 1);
      check(`${route} includes valid game structured data`, await page.locator('script[type="application/ld+json"]').textContent().then(text => { const value = JSON.parse(text); return JSON.stringify(value).includes('Game'); }));
      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      const favicon = await page.locator('link[rel="icon"]').first().getAttribute('href');
      for (const [name, url] of [['share image', image], ['favicon', favicon]]) {
        const asset = new URL(url, origin); const response = await page.request.get(origin + asset.pathname);
        check(`${route} ${name} exists and is nonempty`, response.ok() && (await response.body()).length > 100);
      }
      await page.close();
    }
    const live = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
    try {
      const page = await live.newPage(), requests = [], failures = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => requests.push(request.url()));
      page.on('requestfailed', request => failures.push(request.url()));
      await page.goto(origin + '/en/');
      await page.waitForFunction(() => document.querySelector('#loading')?.hidden);
      check('online entry loads split JavaScript and CSS assets', requests.some(url => /\/assets\/.*\.js(?:\?|$)/.test(url)) && requests.some(url => /\/assets\/.*\.css(?:\?|$)/.test(url)));
      check('online logo is decoded from a standalone image shared with the loader', await page.locator('.brand-mark').evaluate(image => {
        const url = new URL(image.src);
        return image.complete && image.naturalWidth > 0 && url.origin === location.origin && url.pathname.startsWith('/assets/')
          && url.pathname.endsWith('.png') && document.querySelector('.boot-brand img').src === image.src;
      }));
      check('online entry requests standalone outfit PNG files', requests.some(url => /\/assets\/(?:vehicle|hat|skin|identity|scarf|glasses|clothes)-[^/]+\.png(?:\?|$)/.test(url)));
      check('online entry loads all assets without failed requests', failures, []);
      check('online entry renders English UI', await page.locator('#start').innerText().then(text => text.includes('Let’s go for a ride')));
      check('production does not expose the test API or legacy globals', await page.evaluate(() => window.__pelicanTest === undefined && window.game === undefined && window.step === undefined));
    } finally { await live.close(); }
  } finally { await context.close(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}


async function verifyStorageIntegration({ browser, target, errors, check }) {
  const { LEVELS } = await levelData;
  const old = { unlocked: 4, best: [1800, 2400, 3200, 1000, 0, 0], stars: [3, 2, 3, 0, 0, 0] };
  const padding = Array(LEVELS.length - old.best.length).fill(0);
  const expected = { ...old, best: [...old.best, ...padding], stars: [...old.stars, ...padding] };
  const key = 'pelican-pedal-run-v2', raw = JSON.stringify(old);
  const migrated = await openOffline(browser, target, errors, { seedStorage: { [key]: raw } });
  try {
    check('v2 progress expands campaign without changing legacy results', await migrated.page.evaluate(() => save.records.campaign), expected);
    await migrated.page.evaluate(() => startRun({ gameMode: 'items', levelIndex: 0, seed: 27 }));
    const result = await rideToFinish(migrated.page);
    check('new-mode completion after migration preserves legacy campaign records', result.mode, 'won');
    check('v3 write contains separate new-mode results and unchanged v2 bytes', await migrated.page.evaluate(({ key, raw, expected }) => {
      const v3 = JSON.parse(localStorage.getItem('pelican-pedal-run-v3'));
      return localStorage.getItem(key) === raw && JSON.stringify(v3.records.campaign) === JSON.stringify(expected)
        && v3.records.items.best[0] === game.result.score && v3.records.items.unlocked === 2;
    }, { key, raw, expected }));
  } finally { await migrated.context.close(); }
  const corrupt = '{broken-v3';
  const blocked = await openOffline(browser, target, errors, { seedStorage: { 'pelican-pedal-run-v3': corrupt, [key]: raw } });
  try {
    check('corrupt newest save visibly disables automatic persistence', await blocked.page.evaluate(() => !app.saveWritable.value));
    await blocked.page.locator('#start').click();
    const result = await rideToFinish(blocked.page);
    check('a run with corrupt storage can still finish honestly', result.mode, 'won');
    check('corrupt storage stays untouched and result reports unsaved', await blocked.page.evaluate(() => [localStorage.getItem('pelican-pedal-run-v3'), game.recordSaved]), [corrupt, false]);
    check('unsaved result has a visible persistence warning', (await blocked.page.locator('#result').innerText()).includes('本次成绩未保存'));
  } finally { await blocked.context.close(); }
}

async function verifyFeatures(options) {
  await verifyStorageIntegration(options);
  await verifyMigration(options);
  await verifyPreferences(options);
  await verifyEnglish(options);
  await verifyOnline(options);
}
module.exports = { installTestClock, waitForGame, rideToFinish, verifyFeatures, openOffline };
