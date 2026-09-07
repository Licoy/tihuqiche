const path = require('node:path');
const { devices } = require('playwright');
const { verifyPreviewProjection } = require('./helpers-visual.cjs');
const { verifyHomePreview, verifyOutfitThumbnails } = require('./home-preview.cjs');
const { openOffline, rideToFinish, waitForGame } = require('./features.cjs');

async function choose(page, category, option) {
  const panel = page.locator('#wardrobe');
  await panel.locator('.wardrobe-tabs').getByRole('button', { name: category, exact: true }).click();
  await panel.locator('.wardrobe-options').getByRole('button', { name: option, exact: true }).click();
}

async function verifyWardrobe(page, check, artifacts) {
  await page.evaluate(() => goHome());
  await page.locator('[data-mode="duo"]').click();
  await page.locator('#wardrobe-open-0').click();
  await verifyOutfitThumbnails(page, check);
  const original = await page.evaluate(() => riders.map(r => r.getConfig()));
  await choose(page, '角色', 'MM'); await choose(page, '皮肤', '淡粉');
  await choose(page, '帽子', '棒球帽'); await choose(page, '围巾', '短围巾');
  await choose(page, '眼镜', '圆框眼镜'); await choose(page, '衣服', '骑行上衣');
  await choose(page, '载具', '滑板车');
  await page.locator('#wardrobe .wardrobe-colours').getByRole('button', { name: '海洋蓝', exact: true }).click();
  check('wardrobe controls preview real P1 model configuration', await page.evaluate(() => {
    const p = riders[0].getConfig(); return [p.identity, p.skin, p.hat, p.scarf, p.glasses, p.clothes, p.vehicle, p.vehicleColor];
  }), ['mm', 'pink', 'cap', 'short', 'round', 'jersey', 'scooter', 'blue']);
  await verifyPreviewProjection(page, check, artifacts);
  check('P1 live preview does not change P2', await page.evaluate(() => riders[1].getConfig()), original[1]);
  check('preview does not commit appearance before save', await page.evaluate(() => app.appearance.players[0]), original[0]);
  await page.locator('#wardrobe .wardrobe-tabs button').first().focus();
  await page.keyboard.press('Space');
  check('Space inside wardrobe does not start a run', await page.evaluate(() => game.mode), 'home');
  await page.keyboard.press('Escape');
  check('Escape cancels wardrobe and restores both model configs', await page.evaluate(() => riders.map(r => r.getConfig())), original);
  check('wardrobe cancellation returns focus to its opener', await page.evaluate(() => document.activeElement.id), 'wardrobe-open-0');
  await page.locator('#wardrobe-open-0').click(); await choose(page, '载具', '摩托车');
  await page.locator('#wardrobe-save').click();
  check('saved outfit is applied and closes the modal', await page.evaluate(() => !app.wardrobeOpen.value && app.appearance.players[0].vehicle === 'motorcycle' && riders[0].getConfig().vehicle === 'motorcycle'));
  await page.reload(); await waitForGame(page);
  check('wardrobe save restores the real model on reload', await page.evaluate(() => riders[0].getConfig().vehicle), 'motorcycle');
  await page.locator('[data-mode="duo"]').click(); await page.locator('#wardrobe-open-1').click();
  await choose(page, '载具', '电瓶车'); await page.locator('#wardrobe-save').click();
  check('P2 outfit persists separately from P1', await page.evaluate(() => JSON.parse(localStorage.getItem('pelican-pedal-appearance-v1')).players.map(p => p.vehicle)), ['motorcycle', 'ebike']);
  await page.locator('#wardrobe-open-0').click(); await choose(page, '载具', '自行车');
  // Inject only a browser storage failure; saving still calls the actual app/storage code.
  await page.evaluate(() => {
    window.savedSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === 'pelican-pedal-appearance-v1') throw new DOMException('Test storage full', 'QuotaExceededError');
      return window.savedSetItem.call(this, key, value);
    };
  });
  try {
    await page.locator('#wardrobe-save').click();
    check('failed wardrobe write leaves an actionable visible error', await page.locator('#wardrobe [role="alert"]').isVisible());
    check('failed save retains draft and preserves committed model configuration', await page.evaluate(() =>
      app.wardrobeOpen.value && app.wardrobeDraft.value.vehicle === 'bicycle' && app.appearance.players[0].vehicle === 'motorcycle'));
  } finally { await page.evaluate(() => { Storage.prototype.setItem = window.savedSetItem; delete window.savedSetItem; }); }
  await page.locator('#wardrobe-cancel').click();
}

async function verifySharing(page, check) {
  await page.evaluate(() => { goHome(); selectMode('items'); startRun({ gameMode: 'items', levelIndex: 0, seed: 73129 }); });
  const result = await rideToFinish(page);
  check('share card displays the immutable result score', Number(await page.locator('#result-score').innerText()), result.result.score);
  const qr = page.getByRole('img', { name: '扫码打开鹈鹕骑车官网' });
  check('result QR is local SVG with an accessible name', await qr.evaluate(el => el.tagName.toLowerCase() === 'svg' || Boolean(el.querySelector('svg'))));
  check('result QR preserves a scannable 128px minimum', await qr.evaluate(el => { const r = el.getBoundingClientRect(); return r.width >= 128 && r.height >= 128; }));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: '复制挑战文案', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#result .copy-status')?.textContent.includes('已复制'), null, { polling: 50 });
  const text = await page.evaluate(() => navigator.clipboard.readText());
  check('actual browser clipboard receives this result and production URL', text.includes(String(result.result.score))
    && text.includes(String(result.result.fishCollected)) && text.includes('道具闯关') && text.includes('https://tihuqiche.com/') && !text.includes('file:'));
  await page.getByRole('button', { name: '复制游戏链接', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#result .copy-status')?.textContent.includes('已复制'), null, { polling: 50 });
  check('copy-link button writes only the canonical URL', await page.evaluate(() => navigator.clipboard.readText()), 'https://tihuqiche.com/');
  // Exercise rejection and missing-API UI; never substitute a successful clipboard write.
  for (const failure of ['rejected', 'unavailable']) {
    await page.evaluate(kind => {
      window.clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: kind === 'unavailable' ? undefined : {
        writeText: async () => { throw new DOMException('Test permission denied', 'NotAllowedError'); },
      } });
    }, failure);
    try {
      await page.getByRole('button', { name: '复制挑战文案', exact: true }).click();
      const manual = page.getByRole('textbox', { name: '可手动复制的分享文字' });
      check(`${failure} clipboard exposes manual share text`, await manual.inputValue(), text);
      check(`${failure} clipboard reports the problem visibly`, (await page.locator('#result').innerText()).includes('无法自动复制'));
      await manual.focus(); await page.keyboard.press('Tab');
      check(`${failure} manual-copy field participates in modal focus containment`, await page.evaluate(() => $('result').contains(document.activeElement)));
    } finally {
      await page.evaluate(() => {
        if (window.clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', window.clipboardDescriptor);
        else delete navigator.clipboard;
        delete window.clipboardDescriptor;
      });
    }
  }
  await page.locator('#result-home').click(); await page.locator('#language').click();
  await page.locator('[data-mode="endless"]').click(); await page.locator('#start').click();
  await rideToFinish(page, { seconds: 4 }); await page.locator('#pause').click();
  await page.getByRole('button', { name: 'Finish and score', exact: true }).click();
  check('English share card contains no untranslated Chinese', !/[\u3400-\u9fff]/.test(await page.locator('#result').innerText()));
  await page.getByRole('button', { name: 'Copy challenge', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#result .copy-status')?.textContent.includes('Copied'), null, { polling: 50 });
  const english = await page.evaluate(() => navigator.clipboard.readText());
  check('English challenge uses endless mode and English production URL', english.includes('Endless') && english.includes('https://tihuqiche.com/en/'));
}

async function verifyMobile(options) {
  const { browser, target, errors, check, artifacts } = options;
  const { context, page } = await openOffline(browser, target, errors, { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const requests = []; page.on('request', r => requests.push(r.url()));
  try {
    await page.locator('[data-mode="duo"]').tap(); await page.locator('#start').tap();
    check('mobile co-op start stays home and explains the computer requirement', await page.evaluate(() => game.mode === 'home'
      && $('toast').textContent.includes('双人骑行需要电脑和键盘')));
    await page.locator('[data-mode="items"]').tap(); await page.locator('#start').tap();
    const charged = await rideToFinish(page, { fishTarget: 10 });
    check('mobile can collect boost charge through normal riding', charged.mode, 'playing');
    await page.evaluate(() => { pauseGame(); resumeGame(); });
    const balance = await page.evaluate(() => game.players[0].fishBalance);
    await page.locator('#touch [data-action="boost"]').tap();
    check('mobile boost control activates real boost and spends fish', await page.evaluate(() => [game.players[0].boostRemaining, game.players[0].fishBalance]), [2.5, balance - 10]);
    check('all six item-mode touch controls retain 44px targets inside viewport', await page.locator('#touch [data-action]').evaluateAll(buttons => buttons.length === 6 && buttons.every(button => {
      const r = button.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
    })));
    check('item HUD is clear of the top bar and touch controls', await page.evaluate(() => {
      const header = document.querySelector('.topbar').getBoundingClientRect(), touch = $('touch').getBoundingClientRect();
      const stage = document.querySelector('.stage-panel').getBoundingClientRect(), counters = document.querySelector('.player-counters').getBoundingClientRect();
      const separated = stage.right <= counters.left || counters.right <= stage.left || stage.bottom <= counters.top || counters.bottom <= stage.top;
      return separated && Math.min(stage.top, counters.top) >= header.bottom && Math.max(stage.bottom, counters.bottom) < touch.top;
    }));
    const result = await rideToFinish(page, { useItems: true });
    check('mobile boosted item run completes with real physics', result.mode, 'won');
    await page.locator('.result-card').scrollIntoViewIfNeeded();
    check('portrait result card can be captured fully in one screenshot', await page.locator('.result-card').evaluate(el => {
      const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    }));
    check('mobile share QR and card have no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(artifacts, 'upgrade-mobile-result.png') });
    await page.locator('#result-home').tap(); await page.locator('#wardrobe-open-0').tap();
    await choose(page, '载具', '滑板车');
    await verifyPreviewProjection(page, check, artifacts, true);
    check('mobile wardrobe is usable without horizontal scrolling', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#wardrobe-save').tap();
    check('mobile wardrobe commits its selected vehicle', await page.evaluate(() => app.appearance.players[0].vehicle), 'scooter');
    check('mobile upgrades require no network resources', requests.filter(url => url !== target), []);
  } finally { await context.close(); }
}

async function verifyUpgradeUI(options) {
  const { page, check } = options;
  await page.evaluate(() => goHome());
  check('home offers all four modes', await page.locator('[data-mode]').evaluateAll(buttons => buttons.map(b => b.dataset.mode)), ['campaign', 'endless', 'duo', 'items']);
  await verifyHomePreview(page, check);
  await verifyWardrobe(page, check, options.artifacts);
  await verifySharing(page, check);
  await verifyMobile(options);
}
module.exports = { verifyUpgradeUI };
