const { openOffline, rideToFinish } = require('./features.cjs');

async function start(page, gameMode) {
  await page.evaluate(mode => { goHome(); selectMode(mode); startRun({ gameMode: mode, levelIndex: 0, seed: 73129 }); }, gameMode);
  await page.locator('#scene').focus();
}

async function verifyBoost(page, check) {
  await start(page, 'campaign');
  await page.keyboard.press('Space');
  check('Space without fish does not jump or accelerate', await page.evaluate(() => {
    const p = game.players[0]; return [p.vy, p.boosting, p.fishBalance];
  }), [0, false, 0]);
  const collected = await rideToFinish(page, { fishTarget: 10 });
  check('real route pickups fuel boost before the finish', collected.mode === 'playing' && collected.fish >= 10);
  const before = await page.evaluate(() => ({ ...game.players[0] }));
  await page.keyboard.press('Space');
  check('keyboard starts continuous boost without a ten-fish purchase', await page.evaluate(() => {
    const p = game.players[0]; return [p.fishBalance, p.fishCollected, p.boosting, p.vy];
  }), [before.fishBalance, before.fishCollected, true, 0]);
  await rideToFinish(page, { seconds: .5 });
  check('half a second burns exactly two fish from actual pickups', await page.evaluate(() => {
    const p = game.players[0]; return [p.fishCollected - p.fishBalance, p.boosting];
  }), [2, true]);
  await page.keyboard.press('Space');
  check('second keypress stops the continuous boost', await page.evaluate(() => game.players[0].boosting), false);
  await rideToFinish(page, { seconds: .5 });
  check('stopping preserves fuel', await page.evaluate(() => game.players[0].fishCollected - game.players[0].fishBalance), 2);
  await page.keyboard.press('Space'); await page.keyboard.press('Escape');
  const paused = await page.evaluate(() => JSON.stringify(game.players));
  await page.evaluate(() => { for (let i = 0; i < 360; i++) step(1 / 120); });
  check('paused boost freezes distance and all player timers', await page.evaluate(() => JSON.stringify(game.players)), paused);
  await page.locator('#resume').click();
  await rideToFinish(page, { seconds: .5 });
  await page.keyboard.press('Space');
  const result = await rideToFinish(page);
  check('boosted campaign still finishes by real physics', [result.mode, result.hp, result.stars], ['won', 3, 3]);
  check('spent fish remain in result score and persisted record', await page.evaluate(() => {
    const r = game.result, p = r.players[0];
    return p.fishCollected - p.fishBalance === 4 && r.score === Math.floor(p.distance) + p.fishCollected * 25 + p.hp * 150
      && save.records.campaign.best[0] === r.score;
  }));
  check('result snapshot is detached and frozen', await page.evaluate(() => Object.isFrozen(game.result)
    && Object.isFrozen(game.result.players) && Object.isFrozen(game.result.players[0]) && game.result.players[0] !== game.players[0]));
}

async function verifyDuo(page, check, artifacts) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForFunction(() => camera.aspect === innerWidth / innerHeight, null, { polling: 50 });
  await start(page, 'duo');
  await page.keyboard.press('a'); await page.keyboard.press('Numpad6');
  check('WASD and numpad move separate players', await page.evaluate(() => game.players.map(p => p.lane)), [0, 2]);
  await page.keyboard.press('w'); await page.keyboard.press('Numpad8');
  check('both seats can jump from their own physical keys', await page.evaluate(() => game.players.every(p => p.vy > 0)));
  await start(page, 'duo');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('NumLock'); await page.keyboard.press('Numpad6');
  check('P2 arrows and numpad with NumLock toggled never steer P1', await page.evaluate(() => game.players.map(p => p.lane)), [1, 1]);
  await page.keyboard.press('NumLock');
  await start(page, 'duo');
  const opening = await page.evaluate(() => {
    // The opening seven fish are on the centre lane, before the first obstacle.
    for (let i = 0; i < 384; i++) step(1 / 120);
    return { players: game.players };
  });
  check('simultaneous same-lane pickups are shared exactly once', opening.players.map(p => p.fishCollected).sort((a, b) => a - b), [3, 4]);
  check('cooperative players have independent fish balances', opening.players.every(p => p.fishCollected === p.fishBalance));
  const charged = await rideToFinish(page, { fishTarget: 12 });
  check('P1 charges a boost through actual cooperative pickups', charged.mode === 'playing' && charged.players[0].fishBalance >= 10);
  const p2 = charged.players[1].fishBalance;
  await page.keyboard.press('Space');
  check('P1 boost leaves P2 fish untouched', await page.evaluate(() => [game.players[0].boosting, game.players[1].boosting, game.players[1].fishBalance]), [true, false, p2]);
  await rideToFinish(page, { seconds: 2 });
  check('independent boost separates riders and engages catchup', await page.evaluate(() => {
    const [a, b] = game.players; return a.distance > b.distance && b.catchupBonus > 0 && a.distance - b.distance <= 22;
  }));
  await require('./helpers-visual.cjs').renderScene(page);
  check('both active players have visible identity markers inside the viewport', await page.evaluate(() =>
    game.markers.length === 2 && game.markers.every(p => p.visible && p.x >= 0 && p.x <= innerWidth && p.y >= 0 && p.y <= innerHeight)));
  await require('./helpers-visual.cjs').verifyDuoProjection(page, check, artifacts);
  const result = await rideToFinish(page);
  check('cooperative route completes with both seats alive', result.mode === 'won' && result.result.players.every(p => p.status === 'finished' && p.hp === 3));
  check('cooperative score is the sum of each actual personal result', result.result.score, result.result.players.reduce((sum, p) => sum + p.score, 0));
  check('cooperative stars and progress are saved separately', await page.evaluate(() =>
    save.records.duo.unlocked === 2 && save.records.duo.best[0] === game.result.score && save.records.items.unlocked === 1));
  await page.locator('#next').click();
  check('cooperative next stage resets both players', await page.evaluate(() => game.gameMode === 'duo' && game.level === 1
    && game.players.every(p => p.hp === 3 && p.fishCollected === 0 && p.fishBalance === 0 && p.status === 'running')));

  // Position real actors at real obstacles, as in the original collision regressions.
  // Never fabricate health loss, player terminal states, result or progress.
  await start(page, 'duo');
  check('one physical obstacle damages both seats independently', await page.evaluate(() => {
    const e = entities.find(e => e.type === 'crate');
    for (const p of game.players) { p.distance = e.at; p.x = (e.lane - 1) * 3.4; p.lane = e.lane; }
    game.distance = e.at; collide(); return game.players.map(p => p.hp);
  }), [2, 2]);
  await start(page, 'duo');
  await page.evaluate(() => {
    for (const e of entities.filter(e => e.type === 'crate').slice(0, 3)) {
      const p = game.players[0]; p.invincible = 0; p.distance = e.at; p.x = (e.lane - 1) * 3.4; p.lane = e.lane;
      game.distance = e.at; collide();
    }
    step(1 / 120);
  });
  check('one downed player does not prematurely end cooperative play', await page.evaluate(() => [game.mode, game.players[0].status, game.players[1].hp]), ['playing', 'downed', 3]);
  const survivor = await rideToFinish(page);
  check('the survivor can finish without reviving the downed seat', survivor.result.players.map(p => p.status), ['downed', 'finished']);
  check('downed seat gets no completion health award', survivor.result.players[0].score,
    Math.floor(survivor.result.players[0].distance) + survivor.result.players[0].fishCollected * 25);
  check('one survivor still wins and excludes the full-health star', [survivor.mode, survivor.stars], ['won', 1 + (survivor.result.fishCollected >= 50 ? 1 : 0)]);
}

async function verifyEndless(page, check) {
  await start(page, 'endless');
  const seed = await page.evaluate(() => game.seed);
  const first = await page.evaluate(() => entities.map(({ type, lane, at }) => ({ type, lane, at })));
  const run = await rideToFinish(page, { seconds: 320 });
  check('endless streams past six kilometres without finishing or damage', run.mode === 'playing' && run.distance > 6000 && run.hp === 3);
  check('endless speed reaches the documented ceiling', run.players[0].speed, 32);
  check('endless entity window remains bounded after long real simulation', await page.evaluate(() =>
    entities.length > 0 && entities.length < 200 && entities.every(e => e.at >= game.distance - 21 && e.at <= game.distance + 280)));
  await page.locator('#pause').click();
  await page.locator('#restart').click();
  check('endless retry preserves seed and initial generated course', await page.evaluate(() => ({ seed: game.seed, entities: entities.map(({ type, lane, at }) => ({ type, lane, at })) })), { seed, entities: first });
  await rideToFinish(page, { seconds: 4 });
  await page.locator('#pause').click();
  await page.locator('#end-run').click();
  check('retired endless run settles without stars or health bonus', await page.evaluate(() => {
    const r = game.result, p = r.players[0]; return game.mode === 'ended' && r.stars === null && r.reason === 'retired'
      && r.score === Math.floor(p.distance) + p.fishCollected * 25 && save.records.endless.bestScore === r.score;
  }));
  const result = await page.evaluate(() => JSON.stringify(game.result));
  await page.evaluate(() => { endRun(); step(1); collide(); });
  check('repeated end and physics calls preserve the settled result', await page.evaluate(() => JSON.stringify(game.result)), result);
}

async function verifyItems(page, check) {
  await start(page, 'items');
  // Collect a generated box through the actual physics; test effects separately in A's unit suite.
  const got = await page.evaluate(() => {
    for (let i = 0; i < 20000 && game.mode === 'playing' && !game.players[0].itemSlot; i++) {
      const p = game.players[0], obstacles = entities.filter(e => ['hurdle', 'gate', 'crate'].includes(e.type));
      const next = obstacles.filter(e => e.at > p.distance - 2).sort((a, b) => a.at - b.at)[0];
      if (next && next.at - p.distance < 30) {
        const blocked = obstacles.filter(e => e.at === next.at).map(e => e.lane);
        const lane = [0, 1, 2].find(l => !blocked.includes(l));
        if (lane === undefined) throw new Error('Item route has no safe lane');
        if (lane !== p.lane) action({ playerId: 0, type: lane < p.lane ? 'left' : 'right' });
      }
      step(1 / 120);
    }
    return game.players[0].itemSlot;
  });
  check('safe route collects an actual generated item box', ['shield', 'magnet', 'double', 'clear'].includes(got));
  await page.keyboard.press('e');
  check('E key consumes a usable item through game input', await page.evaluate(() => game.players[0].itemSlot), null);
  const result = await rideToFinish(page, { useItems: true });
  check('item mode still has a real collision-free completion route', [result.mode, result.hp, result.stars], ['won', 3, 3]);
  check('item result and record use cumulative fish plus actual item bonus', await page.evaluate(() => {
    const r = game.result, p = r.players[0]; return r.score === Math.floor(p.distance) + p.fishCollected * 25 + p.bonusScore + p.hp * 150
      && save.records.items.best[0] === r.score && save.records.items.unlocked === 2;
  }));
}

async function verifyUpgrades(options) {
  const { browser, target, errors, check } = options;
  const { context, page } = await openOffline(browser, target, errors);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  try {
    await verifyBoost(page, check);
    await verifyDuo(page, check, options.artifacts);
    await require('./helpers-visual.cjs').verifyAirPause(page, check, options.artifacts);
    await verifyEndless(page, check);
    await verifyItems(page, check);
    const { verifyUpgradeUI } = require('./upgrades-ui.cjs');
    await verifyUpgradeUI({ ...options, page });
    check('all upgrade flows remain offline without extra requests', requests.filter(url => url !== target), []);
  } finally { await context.close(); }
}
module.exports = { verifyUpgrades };
