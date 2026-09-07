import { LEVELS } from './levels.js';

const SAVE_KEY = 'pelican-pedal-run-v2';
export const emptySave = () => ({ unlocked: 1, best: LEVELS.map(() => 0), stars: LEVELS.map(() => 0) });

export function parseSave(raw, legacy = false) {
  const value = JSON.parse(raw);
  const count = legacy ? 3 : LEVELS.length;
  if (!value || !Number.isInteger(value.unlocked) || value.unlocked < 1 || value.unlocked > count
    || !Array.isArray(value.best) || value.best.length !== count || !value.best.every(n => Number.isSafeInteger(n) && n >= 0)
    || !Array.isArray(value.stars) || value.stars.length !== count || !value.stars.every(n => Number.isInteger(n) && n >= 0 && n <= 3)) {
    throw new Error('Invalid cycling save');
  }
  const result = emptySave();
  result.best.splice(0, count, ...value.best);
  result.stars.splice(0, count, ...value.stars);
  result.unlocked = legacy && value.stars[2] > 0 ? 4 : value.unlocked;
  return result;
}

export function readSave(notify) {
  try {
    const current = localStorage.getItem(SAVE_KEY);
    if (current !== null) return parseSave(current);
    const legacy = localStorage.getItem('pelican-pedal-run-v1');
    return legacy === null ? emptySave() : parseSave(legacy, true);
  } catch (error) {
    console.warn('Could not read cycling progress', error);
    notify('readError');
    return emptySave();
  }
}

export function writeSave(save, notify) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
  catch (error) { console.warn('Could not save cycling progress', error); notify('writeError'); }
}
