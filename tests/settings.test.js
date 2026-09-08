import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GAME_SETTINGS, SOUND_STYLES, createGameSettings, validateGameSettings } from '../src/game-settings.js';

afterEach(() => { delete globalThis.localStorage; mock.restoreAll(); });

test('settings defaults are complete and validation returns an independent plain object', () => {
  assert.deepEqual(DEFAULT_GAME_SETTINGS, { soundEnabled: true, soundStyle: 'classic', volume: .65,
    assistMarkers: true, speedLines: true, ambientLife: true, shadows: true });
  assert.ok(Object.isFrozen(DEFAULT_GAME_SETTINGS)); assert.ok(Object.isFrozen(SOUND_STYLES));
  const input = Object.freeze({ ...DEFAULT_GAME_SETTINGS });
  const validated = validateGameSettings(input);
  assert.deepEqual(validated, input); assert.notEqual(validated, input);
  for (const soundStyle of SOUND_STYLES) assert.equal(validateGameSettings({ ...input, soundStyle }).soundStyle, soundStyle);
  for (const volume of [0, .35, 1]) assert.equal(validateGameSettings({ ...input, volume }).volume, volume);
});

test('partial, extra and invalid game settings are rejected without coercion', () => {
  for (const value of [null, [], {}, { ...DEFAULT_GAME_SETTINGS, extra: true },
    { ...DEFAULT_GAME_SETTINGS, volume: '0.5' }, { ...DEFAULT_GAME_SETTINGS, volume: -1 },
    { ...DEFAULT_GAME_SETTINGS, volume: 1.01 }, { ...DEFAULT_GAME_SETTINGS, volume: NaN },
    { ...DEFAULT_GAME_SETTINGS, volume: Infinity }, { ...DEFAULT_GAME_SETTINGS, soundStyle: '__proto__' },
    ...['soundEnabled', 'assistMarkers', 'speedLines', 'ambientLife', 'shadows'].map(key => ({ ...DEFAULT_GAME_SETTINGS, [key]: 1 }))]) {
    assert.throws(() => validateGameSettings(value), /Invalid/);
  }
});

test('invalid setting mutations leave live state untouched and never reach persistence', () => {
  const notices = [], store = createGameSettings(code => notices.push(code));
  for (const [key, value] of [['unknown', true], ['volume', '1'], ['soundStyle', 'unknown'], ['shadows', null]]) {
    assert.throws(() => store.setSetting(key, value), /Invalid|Unknown/);
    assert.deepEqual({ ...store.settings }, DEFAULT_GAME_SETTINGS);
  }
  assert.deepEqual(notices, []);
});

test('denied storage is explicit while user changes still apply to the current session', () => {
  const warnings = mock.method(console, 'warn', () => {}), notices = [];
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
  const store = createGameSettings(code => notices.push(code));
  assert.equal(store.init(), false); assert.equal(store.error.value, 'settingsReadError');
  assert.deepEqual({ ...store.settings }, DEFAULT_GAME_SETTINGS);
  assert.equal(store.setSetting('volume', .3), false); assert.equal(store.settings.volume, .3);
  assert.equal(store.error.value, 'settingsSaveError');
  assert.deepEqual(notices, ['settingsReadError', 'settingsSaveError']); assert.equal(warnings.mock.callCount(), 2);
});

test('corrupt or unsupported stored settings are reported and never overwritten during read', () => {
  mock.method(console, 'warn', () => {});
  for (const raw of ['{broken', JSON.stringify({ version: 2, settings: DEFAULT_GAME_SETTINGS }),
    JSON.stringify({ version: 1, settings: { volume: .5 } }),
    JSON.stringify({ version: 1, settings: DEFAULT_GAME_SETTINGS, extra: true })]) {
    const notices = []; let writes = 0;
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => raw, setItem: () => { writes++; throw new Error('Read must not write'); },
    } });
    const store = createGameSettings(code => notices.push(code));
    assert.equal(store.init(), false); assert.equal(writes, 0);
    assert.deepEqual({ ...store.settings }, DEFAULT_GAME_SETTINGS); assert.deepEqual(notices, ['settingsReadError']);
  }
});
