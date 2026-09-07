async function previewPixels(page, frozen = false) {
  return page.evaluate(frozen => {
    // Run the entire held RAF callback, including the separate home-preview pass.
    if (!frozen || !window.previewTestTime) window.previewTestTime = performance.now();
    testFrame(window.previewTestTime);
    const canvas = document.querySelector('#home-rider-preview');
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261, foreground = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      hash = Math.imul(hash ^ pixels[i], 16777619);
      hash = Math.imul(hash ^ pixels[i + 1], 16777619);
      hash = Math.imul(hash ^ pixels[i + 2], 16777619);
      if (pixels[i + 3] && Math.abs(pixels[i] - pixels[0]) + Math.abs(pixels[i + 1] - pixels[1]) + Math.abs(pixels[i + 2] - pixels[2]) > 30) foreground++;
    }
    return { hash: hash >>> 0, foreground, width: canvas.width, height: canvas.height };
  }, frozen);
}

async function verifyHomePreview(page, check) {
  const viewport = page.viewportSize();
  for (const size of [{ width: 1280, height: 720 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await page.waitForFunction(() => camera.aspect === innerWidth / innerHeight, null, { polling: 50 });
    check(`${size.width}x${size.height} home content is centred or fully scroll-accessible`, await page.locator('#home').evaluate(home => {
      home.scrollTop = 0;
      const box = home.getBoundingClientRect(), children = [...home.children].filter(el => el.getClientRects().length);
      const first = children[0], last = children.at(-1);
      const top = first.getBoundingClientRect().top - parseFloat(getComputedStyle(first).marginTop);
      const bottom = last.getBoundingClientRect().bottom + parseFloat(getComputedStyle(last).marginBottom);
      if (home.scrollHeight <= home.clientHeight + 1) return Math.abs((top + bottom - box.top - box.bottom) / 2) <= 2;
      home.scrollTop = home.scrollHeight;
      const end = last.getBoundingClientRect().bottom;
      const accessible = top >= box.top && end <= box.bottom + 1 && home.scrollTop > 0 && ['auto', 'scroll'].includes(getComputedStyle(home).overflowY);
      home.scrollTop = 0; return accessible;
    }));
    check(`${size.width}x${size.height} large home preview is a drawn 2D canvas`, await page.locator('#rider-entry.home-rider-large').isVisible()
      && (await previewPixels(page)).foreground > 100);
  }
  await page.locator('[data-mode="duo"]').click();
  const configs = await page.evaluate(() => JSON.stringify(app.appearance.players));
  for (const seat of [1, 0]) {
    await page.locator('.home-rider-seats button').nth(seat).click();
    await previewPixels(page);
    check(`P${seat + 1} preview switches without changing outfits`, await page.evaluate(() => ({ seat: app.state.homePreviewPlayer, configs: JSON.stringify(app.appearance.players) })), { seat, configs });
  }
  const auto = page.locator('#rider-entry .home-rider-preview-tools button');
  if (await page.evaluate(() => app.state.homePreviewAuto)) await auto.click();
  const before = await previewPixels(page);
  const canvas = page.locator('#home-rider-preview');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * 2 / 3, box.y + box.height / 2, { steps: 5 }); await page.mouse.up();
  check('drag rotates the actual canvas and disables auto rotation', (await previewPixels(page, true)).hash !== before.hash && await page.evaluate(() => app.state.homePreviewAuto === false));
  await auto.click();
  const start = await previewPixels(page);
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(50); await previewPixels(page); }
  check('auto rotation changes the actual canvas', (await previewPixels(page)).hash !== start.hash && await page.evaluate(() => app.state.homePreviewAuto === true));
  await page.locator('[data-mode="campaign"]').click();
  await page.setViewportSize(viewport);
}

async function verifyOutfitThumbnails(page, check) {
  const tabs = page.locator('#wardrobe .wardrobe-tabs button');
  check('all seven outfit categories have thumbnail controls', await tabs.count(), 7);
  for (let i = 0; i < 7; i++) {
    await tabs.nth(i).click();
    const images = page.locator('#wardrobe .outfit-thumb');
    await images.evaluateAll(images => Promise.all(images.map(image => image.decode())));
    check(`outfit category ${i + 1} and every option use decoded inline PNGs`, await page.locator('#wardrobe .wardrobe-tabs button, #wardrobe .wardrobe-options button').evaluateAll(buttons => buttons.every(button => {
      const image = button.querySelector('img.outfit-thumb');
      return image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0 && image.src.startsWith('data:image/png;base64,');
    })));
  }
}

module.exports = { verifyHomePreview, verifyOutfitThumbnails };
