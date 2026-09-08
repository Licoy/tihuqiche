const { openOffline } = require('./features.cjs');

async function verifyMobileHeader(page, check, size, locale = 'zh') {
  check(`${size} keeps the complete ${locale} brand and domain`, await page.locator('.brand').innerText(), `${locale === 'en' ? 'Pelican Pedal' : '鹈鹕骑车'}\ntihuqiche.com`);
  const layout = await page.evaluate(() => {
    const brand = document.querySelector('.brand'), actions = document.querySelector('.top-actions');
    const b = brand.getBoundingClientRect(), a = actions.getBoundingClientRect();
    const inside = r => r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    const controls = [...actions.querySelectorAll('button,a,select')].filter(el => el.getClientRects().length && !el.hidden);
    const boxes = controls.map(el => el.getBoundingClientRect());
    const domain = brand.querySelector('.brand-sub'), d = domain.getBoundingClientRect(), style = getComputedStyle(domain);
    const name = brand.querySelector('.brand-name'), n = name.getBoundingClientRect();
    return {
      fits: inside(b) && inside(a) && document.documentElement.scrollWidth <= innerWidth,
      sameRow: Math.abs((b.top + b.bottom - a.top - a.bottom) / 2) <= 2 && Math.min(b.bottom, a.bottom) > Math.max(b.top, a.top),
      separate: b.right <= a.left && boxes.every((r, i) => boxes.slice(i + 1).every(next => r.right <= next.left || next.right <= r.left)),
      domain: domain.textContent.trim() === 'tihuqiche.com' && inside(d) && d.left >= b.left && d.right <= b.right && d.top >= b.top && d.bottom <= b.bottom && style.visibility === 'visible' && Number(style.opacity) > 0 && domain.scrollWidth <= domain.clientWidth,
      brandText: inside(n) && n.left >= b.left && n.right <= b.right && n.top >= b.top && n.bottom <= b.bottom && n.right <= a.left && name.scrollWidth <= name.clientWidth && getComputedStyle(name).visibility === 'visible' && Number(getComputedStyle(name).opacity) > 0,
      compact: controls.length === (game.mode === 'home' && innerWidth > 370 ? 5 : 4) && boxes.every(r => inside(r) && r.width >= 30 && r.width <= 32 && r.height >= 30 && r.height <= 32),
      actionable: controls.every((el, i) => {
        const r = boxes[i], hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !el.disabled && !!el.getAttribute('aria-label') && (hit === el || el.contains(hit));
      }),
    };
  });
  for (const [name, passed] of Object.entries(layout)) check(`${size} compact header ${name}`, passed);
}

async function finishTransitions(page) {
  await page.evaluate(() => document.getAnimations().forEach(animation => { if (Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish(); }));
}

async function focusStyle(locator) {
  return locator.evaluate(el => {
    const s = getComputedStyle(el);
    return { outline: s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0,
      border: [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth],
      shadow: s.boxShadow, background: s.backgroundColor, color: s.color, borderColor: s.borderColor,
      filter: s.filter, decoration: s.textDecorationLine };
  });
}

async function verifyDesktopTheme(page, check) {
  const theme = page.locator('#theme'), shell = page.locator('.theme-control');
  check('desktop theme is icon-only with a full-size selectable control', await shell.evaluate(el => {
    const r = el.getBoundingClientRect(), select = el.querySelector('select'), s = select.getBoundingClientRect();
    const css = getComputedStyle(select), icon = el.querySelector('svg').getBoundingClientRect();
    return Math.abs(r.width - 44) <= 1 && Math.abs(r.height - 44) <= 1 && Math.abs(s.width - r.width) <= 2 && Math.abs(s.height - r.height) <= 2
      && s.left >= r.left && s.right <= r.right && s.top >= r.top && s.bottom <= r.bottom
      && (css.opacity === '0' || css.color === 'rgba(0, 0, 0, 0)') && css.pointerEvents !== 'none' && !select.disabled
      && icon.width > 0 && icon.left >= r.left && icon.right <= r.right;
  }));
  check('theme retains three real labelled options', await theme.locator('option').evaluateAll(options => options.map(o => [o.value, o.textContent.trim(), o.disabled])),
    [['system', '跟随系统', false], ['light', '浅色', false], ['dark', '深色', false]]);
  const unfocused = await focusStyle(shell);
  await theme.click(); await page.keyboard.press('Escape'); await finishTransitions(page);
  check('clicking theme adds no outer focus ring', (await focusStyle(theme)).outline && (await focusStyle(shell)).outline);
  check('theme focus does not thicken its border or add a shadow ring',
    { border: (await focusStyle(shell)).border, shadow: (await focusStyle(shell)).shadow }, { border: unfocused.border, shadow: unfocused.shadow });
  for (const value of ['dark', 'light']) {
    await theme.selectOption(value);
    await page.waitForFunction(value => document.documentElement.dataset.theme === value, value, { polling: 50 });
    check(`compact theme applies ${value}`, await theme.inputValue(), value);
  }
  await theme.selectOption('system');
}

async function verifyFocusFlow(page, check) {
  const sound = page.locator('#sound');
  await page.mouse.move(0, 0); await sound.evaluate(el => el.blur()); await finishTransitions(page);
  const plain = await focusStyle(sound), pressed = await sound.getAttribute('aria-pressed');
  await sound.click(); await finishTransitions(page);
  const clicked = await focusStyle(sound);
  check('ordinary button click adds no outline or thicker border', clicked.outline && JSON.stringify(clicked.border) === JSON.stringify(plain.border) && clicked.shadow === plain.shadow);
  check('sound aria-pressed reflects the actual toggle', await sound.getAttribute('aria-pressed'), String(pressed !== 'true'));
  await sound.click();
  const opener = page.locator('#wardrobe-open-0');
  await opener.click();
  const first = page.locator('#wardrobe .wardrobe-tabs button').first();
  check('wardrobe receives initial focus without an outer ring', await first.evaluate(el => el === document.activeElement) && (await focusStyle(first)).outline);
  await page.locator('#wardrobe .wardrobe-options button').nth(1).click();
  check('outfit selection keeps genuine aria-pressed state', await page.locator('#wardrobe .wardrobe-options button').evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-pressed'))), ['false', 'true']);
  await first.focus(); await page.keyboard.press('Shift+Tab');
  check('wardrobe Shift+Tab wraps to the last visible focusable control', await page.locator('#wardrobe').evaluate(dialog => {
    const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
      .filter(el => el.getClientRects().length && !el.closest('[inert]') && getComputedStyle(el).visibility === 'visible');
    return controls.length > 1 && document.activeElement === controls.at(-1);
  }));
  await page.keyboard.press('Tab');
  check('wardrobe Tab wraps back to first control', await first.evaluate(el => el === document.activeElement));
  await page.keyboard.press('Tab');
  const second = page.locator('#wardrobe .wardrobe-tabs button').nth(1);
  check('wardrobe Tab advances and stays inside', await second.evaluate(el => el === document.activeElement && !!el.closest('#wardrobe')));
  await page.mouse.move(0, 0); await finishTransitions(page);
  const keyboard = await focusStyle(second);
  await second.evaluate(el => el.blur()); await finishTransitions(page);
  const blurred = await focusStyle(second);
  check('keyboard focus retains a visible non-outline cue', keyboard.outline && JSON.stringify(keyboard) !== JSON.stringify(blurred));
  await second.focus(); await page.keyboard.press('Escape');
  check('Escape closes wardrobe and restores opener focus', await page.locator('#wardrobe').isHidden() && await opener.evaluate(el => el === document.activeElement));
}

async function verifyDesktopRoutes({ browser, target, check, errors }) {
  const { LEVELS } = await import('../src/levels.js');
  const { emptySave } = await import('../src/storage.js');
  const fixture = emptySave(); fixture.records.campaign.unlocked = LEVELS.length;
  const { context, page } = await openOffline(browser, target, errors, { seedStorage: { 'pelican-pedal-run-v3': JSON.stringify(fixture) } });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1920, height: 1080 }]) {
      await page.setViewportSize(viewport);
      for (const locale of ['zh', 'en']) {
        if (await page.locator('html').getAttribute('lang') !== (locale === 'zh' ? 'zh-CN' : 'en')) await page.locator('#language').click();
        const label = `${viewport.width}x${viewport.height} ${locale}`;
        await page.locator('#routes').evaluate(el => { el.scrollTop = 0; });
        await page.locator('.route[data-level="0"]').click();
        await page.mouse.move(0, 0); await finishTransitions(page);
        const layout = await page.evaluate(() => {
          const menu = document.querySelector('#home'), grid = document.querySelector('#routes'), bounds = menu.getBoundingClientRect();
          const inside = element => {
            const r = element.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && r.top >= bounds.top && r.bottom <= bounds.bottom && r.left >= 0 && r.right <= innerWidth;
          };
          const gridBounds = grid.getBoundingClientRect(), cards = [...grid.children];
          return {
            visible: ['#home h1', '#start', '#help-open'].every(selector => inside(document.querySelector(selector))),
            stable: menu.scrollTop === 0 && menu.scrollHeight <= menu.clientHeight + 1,
            allRoutes: cards.length === 12 && cards.every(card => { const r = card.getBoundingClientRect(); return inside(card) && r.top >= gridBounds.top && r.bottom <= gridBounds.bottom; }),
            noScroll: grid.scrollHeight <= grid.clientHeight + 1 && grid.scrollWidth <= grid.clientWidth + 1,
            compactWidth: bounds.width <= 901 && bounds.width > Math.min(innerWidth * .55, 800),
            threeRows: getComputedStyle(grid).gridTemplateColumns.split(' ').length === 4 && new Set(cards.map(card => Math.round(card.offsetTop))).size === 3,
          };
        });
        for (const [name, passed] of Object.entries(layout)) check(`${label} desktop route list ${name}`, passed);
        const last = page.locator(`.route[data-level="${LEVELS.length - 1}"]`);
        await last.click();
        check(`${label} can directly select the final city without scrolling`, await page.evaluate(index =>
          app.selected.value === index && document.querySelector('#routes').scrollTop === 0 && document.querySelector('#home').scrollTop === 0, LEVELS.length - 1));
        await page.locator('#wardrobe-open-0').click();
        await page.locator('#wardrobe .wardrobe-tabs button').nth(6).click();
        check(`${label} wardrobe shows every vehicle and its actions without scrolling`, await page.locator('.wardrobe-panel').evaluate(panel => {
          const bounds = panel.getBoundingClientRect();
          const controls = [...panel.querySelectorAll('.wardrobe-options button, #wardrobe-save, #wardrobe-cancel')];
          return panel.scrollHeight <= panel.clientHeight + 1 && controls.length === 10 && controls.every(control => {
            const r = control.getBoundingClientRect(); return r.top >= bounds.top && r.bottom <= bounds.bottom && r.left >= bounds.left && r.right <= bounds.right;
          });
        }));
        await page.locator('#wardrobe-cancel').click();
      }
    }
  } finally { await context.close(); }
}

async function verifyControlsUi({ browser, target, check, errors }) {
  await verifyDesktopRoutes({ browser, target, check, errors });
  const { context, page } = await openOffline(browser, target, errors, { viewport: { width: 1440, height: 900 } });
  try {
    await verifyDesktopTheme(page, check);
    for (const viewport of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      check(`${viewport.width} preview tools have at least 12px breathing room`, await page.evaluate(() => {
        const canvas = document.querySelector('#home-rider-preview').getBoundingClientRect();
        const tools = document.querySelector('#rider-entry .home-rider-preview-tools').getBoundingClientRect();
        return canvas.width > 0 && canvas.height > 0 && tools.height > 0 && tools.top - canvas.bottom >= 12 && tools.bottom <= innerHeight;
      }));
    }
    await verifyFocusFlow(page, check);
  } finally { await context.close(); }
}

module.exports = { verifyMobileHeader, verifyControlsUi, verifyDesktopRoutes };
