const { devices } = require('playwright');
const { openOffline, waitForGame, rideToFinish } = require('./features.cjs');
const key = 'pelican-game-settings-v1';

async function waitForMasterGain(page, value) {
  // Native AudioParam.value reflects the next audio rendering block, not the DOM input callback.
  await page.waitForFunction(expected => Math.abs(settingsAudioGains[0].gain.value - expected) < 1e-6, value, { polling: 5, timeout: 200 });
}

async function verifySoundSelector(page, check, label) {
  check(`${label} sound style text and preview fit their own column`, await page.locator('.settings-sound-style').evaluate(row => {
    const select = row.querySelector('select'), button = row.querySelector('button'), r = row.getBoundingClientRect();
    const s = select.getBoundingClientRect(), b = button.getBoundingClientRect(), css = getComputedStyle(select);
    const context = document.createElement('canvas').getContext('2d'); context.font = css.font;
    const textWidth = Math.max(...[...select.options].map(option => context.measureText(option.textContent).width));
    return s.width >= 140 && textWidth <= s.width - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight) - 32
      && s.left >= r.left && s.right <= b.left && b.right <= r.right;
  }));
}

async function verifyAudioSettings(page, check) {
  // Observe real WebAudio nodes; every call still reaches the browser's native audio implementation.
  await page.evaluate(() => {
    window.settingsAudioGains = []; window.settingsAudioOscillators = [];
    const gain = AudioContext.prototype.createGain, oscillator = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createGain = function(...args) { const node = gain.apply(this, args); settingsAudioGains.push(node); return node; };
    AudioContext.prototype.createOscillator = function(...args) { const node = oscillator.apply(this, args); settingsAudioOscillators.push(node); return node; };
  });
  for (const [style, waves] of [['classic', ['sine']], ['arcade', ['square']], ['bell', ['sine', 'sine']], ['soft', ['triangle']]]) {
    await page.locator('#settings-sound-style').selectOption(style);
    const before = await page.evaluate(() => settingsAudioOscillators.length);
    await page.locator('#settings-preview').click();
    await page.waitForFunction(() => audio?.state === 'running', null, { polling: 50 });
    check(`${style} preview uses its actual browser oscillators`, await page.evaluate(index => settingsAudioOscillators.slice(index).map(node => node.type), before), waves);
  }
  const volume = page.locator('#settings-volume'); await volume.focus(); await volume.press('Home');
  for (let i = 0; i < 7; i++) await volume.press('ArrowRight');
  await waitForMasterGain(page, .35);
  check('volume slider changes the live master gain immediately', await page.evaluate(() => [app.settings.volume, settingsAudioGains[0].gain.value]).then(values => values.map(value => Math.round(value * 100))), [35, 35]);
  await page.locator('#settings-sound-enabled').uncheck();
  await waitForMasterGain(page, 0);
  check('mute silences already-created audio and disables preview', await page.evaluate(() => [soundEnabled, settingsAudioGains[0].gain.value]), [false, 0]);
  check('muted sound preview is unavailable', await page.locator('#settings-preview').isDisabled());
  await page.locator('#settings-sound-enabled').check();
  await waitForMasterGain(page, .35);
  check('unmute restores the selected master volume', Math.round(await page.evaluate(() => settingsAudioGains[0].gain.value) * 100), 35);
}

async function verifySettingsFailure(page, check) {
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  await page.evaluate(key => {
    window.settingsSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Test storage full', 'QuotaExceededError'); return settingsSetItem.call(this, name, value); };
  }, key);
  try {
    await page.locator('#settings-shadows').check();
    check('failed save applies settings for this session and reports the failure', await page.evaluate(() => app.settings.shadows && renderer.shadowMap.enabled && app.settingsError.value === 'settingsSaveError'));
    check('settings save failure is visible inside the modal', await page.locator('#settings [role="alert"]').isVisible());
    check('failed settings write leaves the previous bytes unchanged', await page.evaluate(key => localStorage.getItem(key), key), raw);
  } finally { await page.evaluate(() => { Storage.prototype.setItem = settingsSetItem; delete window.settingsSetItem; }); }
  await page.locator('#settings-shadows').uncheck();
  check('a later successful setting change clears the save error', await page.locator('#settings [role="alert"]').count(), 0);
}

async function verifyRunSettings(page, check) {
  await page.locator('#settings-done').click();
  await page.locator('[data-mode="items"]').click(); await page.locator('#start').click();
  check('settings entry is home-only', await page.locator('#settings-open').isHidden());
  const markers = () => page.evaluate(() => {
    const all = entities.flatMap(entity => entity.mesh.children), arrows = all.filter(node => node.userData.assistMarker);
    return { arrows: arrows.length, hidden: arrows.every(node => !node.visible), question: all.some(node => node.userData.courseMarker && !node.userData.assistMarker && node.visible) };
  });
  let state = await markers();
  check('disabled assistance hides generated arrows but keeps item questions', state.arrows > 0 && state.hidden && state.question);
  await page.evaluate(() => app.setSetting('assistMarkers', true)); state = await markers();
  check('assistance applies to existing course markers', state.arrows > 0 && !state.hidden && state.question);
  await page.evaluate(() => app.setSetting('assistMarkers', false));
  await page.evaluate(() => startRun({ gameMode: 'items', levelIndex: 0, seed: 73129 })); state = await markers();
  check('newly regenerated courses preserve the disabled assistance preference', state.arrows > 0 && state.hidden && state.question);
  await rideToFinish(page, { fishTarget: 1 });
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Space');
  check('disabled speed lines stay hidden during a real boost', await page.evaluate(() => game.players[0].boosting && $('speed-wind').hidden));
  await page.evaluate(() => app.setSetting('speedLines', true));
  check('speed line preference reveals the active boost immediately', await page.locator('#speed-wind').isVisible());
  await page.locator('#pause').click(); check('pause hides speed lines', await page.locator('#speed-wind').isHidden());
  await page.locator('#resume').click(); check('resuming a fueled boost restores speed lines', await page.locator('#speed-wind').isVisible());
  await rideToFinish(page, { seconds: .6 });
  await page.keyboard.press('ArrowRight');
  check('empty fuel stops the boost and its speed lines', await page.evaluate(() => !game.players[0].boosting && game.players[0].fishBalance === 0 && $('speed-wind').hidden));
}

async function verifyMobileSettings({ browser, target, check, errors }) {
  const { context, page } = await openOffline(browser, target, errors, { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport); await page.locator('#settings-open').tap();
      const label = `${viewport.width}x${viewport.height}`;
      check(`${label} settings panel fits the mobile viewport`, await page.locator('.settings-panel').evaluate(panel => {
        const r = panel.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
      }));
      await verifySoundSelector(page, check, label);
      for (const id of ['settings-volume', 'settings-assistMarkers', 'settings-speedLines', 'settings-ambientLife', 'settings-shadows', 'settings-done']) {
        const control = page.locator(`#${id}`); await control.scrollIntoViewIfNeeded();
        check(`${label} ${id} remains accessible through panel scrolling`, await control.evaluate(element => {
          const r = element.getBoundingClientRect(), panel = element.closest('.settings-panel').getBoundingClientRect();
          return r.top >= panel.top && r.bottom <= panel.bottom && r.left >= panel.left && r.right <= panel.right;
        }));
      }
      await page.locator('#settings-done').tap();
      check(`${label} closing settings restores its home opener`, await page.evaluate(() => !app.settingsOpen.value && document.activeElement.id === 'settings-open'));
    }
  } finally { await context.close(); }
}

async function verifySettingsUi(options) {
  const { browser, target, check, errors } = options;
  const { context, page } = await openOffline(browser, target, errors, { viewport: { width: 1280, height: 720 } });
  try {
    await page.locator('#settings-open').click();
    check('settings modal opens with background inert and contained focus', await page.evaluate(() => app.settingsOpen.value && !!$('home').closest('[inert]') && $('settings').contains(document.activeElement)));
    check('desktop settings use the full 760px width and two columns without scrolling', await page.locator('.settings-panel').evaluate(panel => Math.abs(panel.getBoundingClientRect().width - 760) <= 1 && panel.scrollHeight <= panel.clientHeight + 1 && getComputedStyle(panel.querySelector('.settings-columns')).gridTemplateColumns.split(' ').length === 2));
    await verifySoundSelector(page, check, 'desktop');
    await page.locator('#settings-volume').focus(); await page.keyboard.press('Space');
    check('settings keyboard interaction cannot start gameplay', await page.evaluate(() => game.mode === 'home' && app.settingsOpen.value));
    await verifyAudioSettings(page, check);
    for (const setting of ['assistMarkers', 'speedLines', 'ambientLife', 'shadows']) await page.locator(`#settings-${setting}`).uncheck();
    check('visual settings immediately update the live world', await page.evaluate(() => !renderer.shadowMap.enabled && !app.settings.ambientLife && !scene.getObjectByName('ambient-birds').visible));
    const expected = { soundEnabled: true, soundStyle: 'soft', volume: .35, assistMarkers: false, speedLines: false, ambientLife: false, shadows: false };
    check('real browser storage contains the complete versioned settings', await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), { version: 1, settings: expected });
    await page.keyboard.press('Escape');
    check('Escape closes settings and returns focus to the opener', await page.evaluate(() => !app.settingsOpen.value && document.activeElement.id === 'settings-open'));
    await page.reload(); await waitForGame(page);
    check('saved game settings survive a real page reload', await page.evaluate(() => ({ ...app.settings })), expected);
    await page.locator('#settings-open').click(); await verifySettingsFailure(page, check); await verifyRunSettings(page, check);
  } finally { await context.close(); }
  const corrupt = await openOffline(browser, target, errors, { seedStorage: { [key]: '{broken-settings' } });
  try {
    check('corrupt settings are reported without overwriting the stored source', await corrupt.page.evaluate(key => app.settingsError.value === 'settingsReadError' && localStorage.getItem(key) === '{broken-settings', key));
    await corrupt.page.locator('#settings-open').click(); check('corrupt settings also show an actionable modal message', await corrupt.page.locator('#settings [role="alert"]').isVisible());
  } finally { await corrupt.context.close(); }
  await verifyMobileSettings(options);
}

module.exports = { verifySettingsUi };
