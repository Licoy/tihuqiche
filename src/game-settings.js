import { reactive, ref } from 'vue';

export const SOUND_STYLES = Object.freeze(['classic', 'arcade', 'bell', 'soft']);
export const DEFAULT_GAME_SETTINGS = Object.freeze({
  soundEnabled: true, soundStyle: 'classic', volume: .65,
  assistMarkers: true, speedLines: true, ambientLife: true, shadows: true,
});
const STORAGE_KEY = 'pelican-game-settings-v1';
const keys = Object.keys(DEFAULT_GAME_SETTINGS);

export function validateGameSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length
    || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError('Invalid game settings');
  for (const key of keys) {
    const valid = key === 'soundStyle' ? SOUND_STYLES.includes(value[key]) : key === 'volume'
      ? Number.isFinite(value[key]) && value[key] >= 0 && value[key] <= 1 : typeof value[key] === 'boolean';
    if (!valid) throw new RangeError(`Invalid game setting: ${key}`);
  }
  return { ...value };
}

export function createGameSettings(notify) {
  const settings = reactive({ ...DEFAULT_GAME_SETTINGS }), error = ref(null);
  function report(code, cause) {
    error.value = code; console.warn('Could not persist game settings', cause); notify(code); return false;
  }
  function init() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const record = JSON.parse(raw);
        if (record?.version !== 1 || Object.keys(record).length !== 2 || !Object.hasOwn(record, 'settings')) throw new Error('Invalid game settings version');
        Object.assign(settings, validateGameSettings(record.settings));
      }
      error.value = null; return true;
    } catch (cause) { return report('settingsReadError', cause); }
  }
  function setSetting(key, value) {
    if (!keys.includes(key)) throw new RangeError(`Unknown game setting: ${key}`);
    const next = validateGameSettings({ ...settings, [key]: value });
    Object.assign(settings, next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, settings: next }));
      error.value = null; return true;
    } catch (cause) { return report('settingsSaveError', cause); }
  }
  return { settings, error, init, setSetting };
}
