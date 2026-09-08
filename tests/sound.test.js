import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { reactive, ref } from 'vue';
import { createSound, createToneVoices } from '../src/sound.js';
import { DEFAULT_GAME_SETTINGS, SOUND_STYLES } from '../src/game-settings.js';

afterEach(() => { delete globalThis.window; mock.restoreAll(); });

test('all four sound styles generate distinct playable synthesis voices for every game event', () => {
  for (const kind of ['fish', 'jump', 'duck', 'hit', 'shield', 'win', 'move']) {
    const signatures = new Set();
    for (const style of SOUND_STYLES) {
      const voices = createToneVoices(kind, style); signatures.add(JSON.stringify(voices));
      assert.ok(voices.length >= 1 && voices.length <= 2);
      for (const voice of voices) {
        assert.ok(['sine', 'square', 'triangle', 'sawtooth'].includes(voice.type));
        assert.ok([voice.from, voice.to, voice.duration, voice.attack, voice.peak].every(value => Number.isFinite(value) && value > 0));
        assert.ok(voice.from < 20000 && voice.to < 20000); assert.ok(voice.attack < voice.duration);
        assert.ok(voice.peak < .1); assert.ok(['step', 'hold', 'slide'].includes(voice.transition));
      }
    }
    assert.equal(signatures.size, 4, kind);
  }
});

test('arcade steps, bell harmonics and soft attacks differ from the original sliding sine', () => {
  const [classic] = createToneVoices('shield', 'classic'), [arcade] = createToneVoices('shield', 'arcade');
  const bells = createToneVoices('shield', 'bell'), [soft] = createToneVoices('shield', 'soft');
  assert.deepEqual([classic.type, classic.transition], ['sine', 'slide']);
  assert.deepEqual([arcade.type, arcade.transition], ['square', 'step']);
  assert.equal(bells.length, 2); assert.ok(bells.every(voice => voice.transition === 'hold'));
  assert.ok(bells[1].from > bells[0].from * 2.7); assert.ok(bells[1].duration < bells[0].duration);
  assert.equal(soft.type, 'triangle'); assert.equal(soft.attackCurve, 'linear');
  assert.ok(soft.from < classic.from && soft.attack > classic.attack);
  classic.from = 1; assert.equal(createToneVoices('shield', 'classic')[0].from, 580);
  assert.throws(() => createToneVoices('missing'), /Unknown sound/);
  assert.throws(() => createToneVoices('fish', '__proto__'), /Unknown sound style/);
});

test('muted or zero-volume sounds allocate no AudioContext and disposal stays idempotent', () => {
  const enabled = ref(false), settings = reactive({ ...DEFAULT_GAME_SETTINGS }), notices = [];
  const sound = createSound({ enabled, settings, notify: code => notices.push(code) });
  sound.tone('fish'); assert.equal(sound.audio, null);
  settings.volume = 0; enabled.value = true; sound.preview(); assert.equal(sound.audio, null);
  assert.deepEqual(notices, []); sound.dispose(); sound.dispose();
  assert.throws(() => sound.tone('fish'), /disposed/);
});

test('audio initialization failure disables sound and reports the existing explicit error', () => {
  const warnings = mock.method(console, 'warn', () => {}), enabled = ref(true), notices = [];
  globalThis.window = { AudioContext: class { constructor() { throw new Error('Audio unavailable'); } } };
  const sound = createSound({ enabled, notify: code => notices.push(code) });
  sound.preview();
  assert.equal(sound.audio, null); assert.equal(enabled.value, false);
  assert.deepEqual(notices, ['audioError']); assert.equal(warnings.mock.callCount(), 1); sound.dispose();
});
