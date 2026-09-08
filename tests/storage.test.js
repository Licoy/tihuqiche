import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { emptySave, parseSave, readSave, writeSave, updateProgress, emptyAppearance, readAppearance, writeAppearance } from '../src/storage.js';
import { LEVELS } from '../src/levels.js';

const key = 'pelican-pedal-run-v3';
const appearanceKey = 'pelican-pedal-appearance-v1';
let data, notices, warnings;
const notify = code => notices.push(code);
const old = count => ({ unlocked: count, best: Array(count).fill(123), stars: Array(count).fill(3) });
const result = (overrides = {}) => ({ gameMode: 'campaign', levelIndex: 0, score: 800, stars: 3, outcome: 'won', ...overrides });

beforeEach(t => {
  data = new Map(); notices = []; warnings = [];
  t.mock.method(console, 'warn', (...args) => warnings.push(args));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: name => data.get(name) ?? null,
    setItem: (name, value) => data.set(name, value),
  } });
});
afterEach(() => { delete globalThis.localStorage; });

test('empty records and appearances have independent players, arrays and modes', () => {
  const save = emptySave();
  save.records.campaign.best[0] = 20;
  assert.equal(save.records.duo.best[0], 0);
  assert.equal(emptySave().records.campaign.best[0], 0);
  const appearance = emptyAppearance();
  assert.equal(appearance.players[0].identity, 'gg');
  assert.equal(appearance.players[1].identity, 'mm');
  appearance.players[0].hatColor = 'green';
  assert.equal(appearance.players[1].hatColor, 'blue');
  assert.equal(readSave(notify).writable, true);
  assert.equal(data.size, 0);
});

test('v1 and v2 migrate only campaign, do not write on read, preserve old keys', () => {
  for (const version of [1, 2]) {
    data.clear();
    const legacyKey = `pelican-pedal-run-v${version}`;
    const raw = JSON.stringify(old(version === 1 ? 3 : 6));
    data.set(legacyKey, raw);
    const loaded = readSave(notify);
    assert.equal(loaded.error, null);
    const count = version === 1 ? 3 : 6;
    assert.equal(loaded.save.records.campaign.unlocked, count + 1);
    assert.deepEqual(loaded.save.records.campaign.best, [...Array(count).fill(123), ...Array(LEVELS.length - count).fill(0)]);
    assert.deepEqual(loaded.save.records.duo, emptySave().records.duo);
    assert.equal(data.has(key), false);
    assert.deepEqual(readSave(notify), loaded);
    assert.equal(writeSave(loaded.save, notify), true);
    assert.equal(data.get(legacyKey), raw);
    assert.deepEqual(readSave(notify), loaded);
  }
});

test('v1 unfinished third level does not unlock fourth', () => {
  const value = old(3); value.stars[2] = 0;
  assert.equal(parseSave(JSON.stringify(value), 1).records.campaign.unlocked, 3);
});

test('six-level v3 saves expand every mode without changing historical scores or source data', () => {
  const legacy = { version: 3, records: { campaign: old(6), duo: old(6), items: old(6), endless: { bestScore: 4321 } } };
  legacy.records.duo.unlocked = 3;
  legacy.records.duo.stars = [3, 2, 0, 0, 0, 0];
  legacy.records.items.stars[5] = 0;
  const raw = JSON.stringify(legacy);
  data.set(key, raw);
  const loaded = readSave(notify);
  assert.equal(loaded.error, null);
  assert.equal(loaded.save.records.campaign.unlocked, 7);
  assert.equal(loaded.save.records.duo.unlocked, 3);
  assert.equal(loaded.save.records.items.unlocked, 6);
  assert.deepEqual(loaded.save.records.endless, legacy.records.endless);
  for (const mode of ['campaign', 'duo', 'items']) {
    assert.deepEqual(loaded.save.records[mode].best.slice(0, 6), legacy.records[mode].best);
    assert.deepEqual(loaded.save.records[mode].stars.slice(0, 6), legacy.records[mode].stars);
    assert.deepEqual(loaded.save.records[mode].best.slice(6), Array(6).fill(0));
    assert.deepEqual(loaded.save.records[mode].stars.slice(6), Array(6).fill(0));
  }
  assert.equal(data.get(key), raw);
  assert.deepEqual(notices, []);
  assert.equal(writeSave(loaded.save, notify), true);
  assert.deepEqual(readSave(notify), loaded);
  const next = updateProgress(loaded.save, result({ levelIndex: 6 }));
  assert.equal(next.records.campaign.unlocked, 8);
  assert.equal(next.records.campaign.best[6], 800);
  assert.equal(loaded.save.records.campaign.best[6], 0);
});

test('legacy save lengths stay explicit and mixed v3 record lengths are rejected', () => {
  for (const count of [3, 5, 7, 11, 13]) {
    const records = { campaign: old(count), duo: old(count), items: old(count), endless: { bestScore: 0 } };
    assert.throws(() => parseSave(JSON.stringify({ version: 3, records })), /Invalid/);
  }
  const mixed = emptySave(); mixed.records.duo = old(6);
  assert.throws(() => parseSave(JSON.stringify(mixed)), /Invalid/);
  assert.throws(() => parseSave(JSON.stringify(old(12)), 2), /Invalid/);
  const incomplete = old(6); incomplete.stars[5] = 0;
  assert.equal(parseSave(JSON.stringify(incomplete), 2).records.campaign.unlocked, 6);
});

test('v3 takes precedence and corrupt newest existing key cannot fall back or change data', () => {
  data.set('pelican-pedal-run-v2', JSON.stringify(old(6)));
  data.set(key, JSON.stringify(emptySave()));
  assert.equal(readSave(notify).save.records.campaign.unlocked, 1);
  for (const raw of ['{', 'null', '{}', JSON.stringify({ ...emptySave(), version: 4 })]) {
    data.set(key, raw);
    const before = [...data];
    assert.equal(readSave(notify).error, 'corrupt');
    assert.equal(readSave(notify).writable, false);
    assert.deepEqual([...data], before);
  }
  data.delete(key);
  data.set('pelican-pedal-run-v2', '{}');
  data.set('pelican-pedal-run-v1', JSON.stringify(old(3)));
  assert.equal(readSave(notify).error, 'corrupt');
  assert.ok(notices.every(code => code === 'readError'));
  assert.ok(warnings.length > 0);
});

test('unavailable localStorage is explicit and disables progress writes', () => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
  assert.deepEqual(readSave(notify), { save: emptySave(), writable: false, error: 'unavailable' });
  assert.equal(writeSave(emptySave(), notify), false);
  assert.deepEqual(notices, ['readError', 'writeError']);
});

test('invalid progress records and rejected writes cannot overwrite existing data', () => {
  data.set(key, 'keep');
  for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, null]) {
    const save = emptySave(); save.records.campaign.best[0] = value;
    assert.equal(writeSave(save, notify), false);
    assert.equal(data.get(key), 'keep');
  }
  const save = emptySave(); save.records.items.stars.pop();
  assert.throws(() => parseSave(JSON.stringify(save)), /Invalid/);
  assert.throws(() => parseSave('{}', 7), /Unsupported/);
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(writeSave(emptySave(), notify), false);
  assert.equal(notices.at(-1), 'writeError');
});

test('updateProgress returns an independent save and preserves all input data', () => {
  const save = emptySave();
  const snapshot = structuredClone(save);
  const run = Object.freeze(result());
  const next = updateProgress(save, run);
  assert.deepEqual(save, snapshot);
  assert.equal(next.records.campaign.best[0], 800);
  assert.equal(next.records.campaign.stars[0], 3);
  assert.equal(next.records.campaign.unlocked, 2);
  assert.notEqual(next.records.duo.best, save.records.duo.best);
  const lost = updateProgress(next, result({ score: 900, stars: 0, outcome: 'lost' }));
  assert.equal(lost.records.campaign.best[0], 900);
  assert.equal(lost.records.campaign.stars[0], 3);
  assert.equal(lost.records.campaign.unlocked, 2);
  assert.deepEqual(updateProgress(lost, result({ score: 1 })), lost);
});

test('each mode records independently, final level is capped, endless never unlocks', () => {
  let save = emptySave();
  for (const gameMode of ['campaign', 'duo', 'items']) {
    for (let levelIndex = 0; levelIndex < LEVELS.length; levelIndex++) {
      save = updateProgress(save, result({ gameMode, levelIndex }));
    }
    assert.equal(save.records[gameMode].unlocked, LEVELS.length);
  }
  const before = structuredClone(save);
  save = updateProgress(save, result({ gameMode: 'endless', levelIndex: null, stars: null, outcome: 'ended', score: 999 }));
  assert.equal(save.records.endless.bestScore, 999);
  assert.deepEqual(save.records.campaign, before.records.campaign);
  assert.equal(updateProgress(save, result({ gameMode: 'endless', levelIndex: null, stars: null, outcome: 'lost', score: 1 })).records.endless.bestScore, 999);
});

test('invalid or locked results throw rather than mutate progress', () => {
  const save = emptySave();
  const cases = [{ gameMode: 'other' }, { score: -1 }, { score: 1.2 }, { levelIndex: LEVELS.length },
    { levelIndex: 1 }, { stars: 4 }, { stars: 0 }, { outcome: 'lost', stars: 1 },
    { outcome: 'ended' }, { gameMode: 'endless', levelIndex: null, stars: null },
    { gameMode: 'endless', levelIndex: 0, stars: null, outcome: 'lost' }];
  for (const patch of cases) assert.throws(() => updateProgress(save, result(patch)), /Invalid|locked/);
  assert.deepEqual(save, emptySave());
});

test('appearance roundtrips independently; corrupt input warns without overwriting', () => {
  data.set(key, 'broken-progress');
  const appearance = emptyAppearance(); appearance.players[1].vehicle = 'scooter';
  assert.equal(writeAppearance(appearance, notify), true);
  assert.deepEqual(readAppearance(notify), appearance);
  assert.equal(data.get(key), 'broken-progress');
  for (const raw of ['{', '{}', JSON.stringify({ version: 1, players: [] }),
    JSON.stringify({ version: 1, players: [{ ...appearance.players[0], vehicle: 'spaceship' }, appearance.players[1]] })]) {
    data.set(appearanceKey, raw);
    assert.deepEqual(readAppearance(notify), emptyAppearance());
    assert.equal(data.get(appearanceKey), raw);
    assert.equal(notices.at(-1), 'appearanceReadError');
  }
});

test('invalid or unavailable appearance writes return false without touching the draft', () => {
  const appearance = emptyAppearance();
  const before = structuredClone(appearance);
  assert.equal(writeAppearance({ version: 2, players: appearance.players }, notify), false);
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.equal(writeAppearance(appearance, notify), false);
  assert.deepEqual(appearance, before);
  assert.deepEqual(notices, ['appearanceWriteError', 'appearanceWriteError']);
});


test('sparse arrays cannot serialize as corrupt null-filled progress or appearance data', () => {
  const save = emptySave(); save.records.duo.best = new Array(LEVELS.length);
  assert.equal(writeSave(save, notify), false);
  assert.equal(data.has(key), false);
  assert.equal(writeAppearance({ version: 1, players: new Array(2) }, notify), false);
  assert.equal(data.has(appearanceKey), false);
  assert.deepEqual(notices, ['writeError', 'appearanceWriteError']);
});
