const path = require('node:path');

async function renderScene(page) {
  await page.evaluate(() => {
    // Settle before the full frame so model transforms, camera and markers share a frame.
    updateCamera(10); testFrame(performance.now());
    if (game.mode === 'playing') updateEntities(0);
    renderer.render(scene, camera);
  });
}

// Project actual visible mesh vertices, not only the rider centre or HUD marker.
async function projectedRiders(page) {
  return page.evaluate(() => {
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    return riders.map(model => {
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity, points = 0;
      model.rider.traverseVisible(node => {
        if (!node.isMesh || !node.geometry.attributes.position) return;
        const vertices = node.geometry.attributes.position;
        for (let i = 0; i < vertices.count; i++) {
          const p = V().fromBufferAttribute(vertices, i).applyMatrix4(node.matrixWorld).project(camera);
          const x = (p.x + 1) * innerWidth / 2, y = (1 - p.y) * innerHeight / 2;
          left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); points++;
        }
      });
      return { left, right, top, bottom, height: bottom - top, points, visible: model.rider.visible };
    });
  });
}

async function verifyDuoProjection(page, check, artifacts) {
  await renderScene(page);
  const bounds = await projectedRiders(page);
  await page.screenshot({ path: path.join(artifacts, 'upgrade-duo-boost-1280x720.png') });
  check('1280x720 dual riders remain fully in view and at least 80px tall', bounds.every(b => b.visible && b.points > 0
    && b.height >= 80 && b.left >= 0 && b.right <= 1280 && b.top >= 0 && b.bottom <= 720));
  check('nearest upcoming obstacle cue is at least 24px tall', await page.evaluate(() => {
    const e = entities.filter(e => ['hurdle', 'gate', 'crate'].includes(e.type) && e.at > game.distance && e.mesh.visible).sort((a, b) => a.at - b.at)[0];
    if (!e) return false;
    const sprite = e.mesh.children.find(child => child.isSprite);
    if (!sprite) return false;
    const centre = sprite.getWorldPosition(V()).applyMatrix4(camera.matrixWorldInverse);
    return sprite.scale.y * innerHeight / (-centre.z * 2 * Math.tan(camera.fov * Math.PI / 360)) >= 24;
  }));
}

async function verifyPreviewProjection(page, check, artifacts, mobile = false) {
  const modelCanvas = page.locator('#wardrobe-rider-preview'), toggle = page.locator('#wardrobe-scene');
  check(`${mobile ? 'mobile' : 'desktop'} wardrobe defaults to the independent model canvas`, await modelCanvas.isVisible() && await toggle.getAttribute('aria-pressed') === 'false');
  await toggle.click();
  check('preview effect switches to the world scene', await modelCanvas.isHidden() && await page.locator('#scene').isVisible() && await toggle.getAttribute('aria-pressed') === 'true');
  await renderScene(page);
  const seat = await page.evaluate(() => app.wardrobeSeat.value);
  const bounds = (await projectedRiders(page))[seat];
  const panel = await page.locator('.wardrobe-panel').boundingBox();
  const viewport = page.viewportSize();
  await page.screenshot({ path: path.join(artifacts, `upgrade-wardrobe-${mobile ? 'mobile' : 'desktop'}.png`) });
  check(`${mobile ? 'mobile' : 'desktop'} outfit model is fully visible outside the menu`, bounds.visible && bounds.points > 0
    && bounds.left >= 0 && bounds.right <= viewport.width && bounds.top >= 0 && bounds.bottom <= viewport.height
    && (bounds.right <= panel.x || bounds.left >= panel.x + panel.width || bounds.bottom <= panel.y || bounds.top >= panel.y + panel.height));
  await toggle.click();
  check('return to model restores the independent canvas', await modelCanvas.isVisible() && await toggle.getAttribute('aria-pressed') === 'false');
}

async function verifyAirPause(page, check, artifacts) {
  await page.evaluate(() => { goHome(); selectMode('campaign'); startRun({ gameMode: 'campaign', levelIndex: 0, seed: 73129 }); action({ playerId: 0, type: 'jump' }); for (let i = 0; i < 30; i++) step(1 / 120); });
  await renderScene(page);
  const before = await page.evaluate(() => ({ height: riders[0].rider.position.y, jump: game.players[0].jumpY }));
  check('jump physics raises the visible model before pause', before.height > 1.18 && before.height === before.jump);
  await page.locator('#pause').click();
  await renderScene(page);
  const bounds = await projectedRiders(page);
  await page.screenshot({ path: path.join(artifacts, 'upgrade-airborne-paused.png') });
  check('rendering a paused airborne rider preserves its actual model height', await page.evaluate(() => ({ height: riders[0].rider.position.y, jump: game.players[0].jumpY })), before);
  check('paused airborne model retains its projected geometry', bounds[0].visible && bounds[0].height > 80);
}
module.exports = { renderScene, verifyDuoProjection, verifyPreviewProjection, verifyAirPause };
