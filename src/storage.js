import { LEVELS } from './levels.js';
import { defaultRiderConfig, validateRiderConfig } from './appearance.js';

const SAVE_KEY = 'pelican-pedal-run-v3';
const APPEARANCE_KEY = 'pelican-pedal-appearance-v1';
const campaignRecord = () => ({ unlocked: 1, best: LEVELS.map(() => 0), stars: LEVELS.map(() => 0) });
const natural = value => Number.isSafeInteger(value) && value >= 0;
export const emptySave = () => ({ version: 3, records: {
  campaign: campaignRecord(), duo: campaignRecord(), items: campaignRecord(), endless: { bestScore: 0 },
} });

function validateRecord(value, count = LEVELS.length) {
  if (!value || !Number.isInteger(value.unlocked) || value.unlocked < 1 || value.unlocked > count
    || !Array.isArray(value.best) || value.best.length !== count || !Array.from(value.best).every(natural)
    || !Array.isArray(value.stars) || value.stars.length !== count
    || !Array.from(value.stars).every(n => Number.isInteger(n) && n >= 0 && n <= 3)) {
    throw new Error('Invalid cycling progress record');
  }
  return { unlocked: value.unlocked, best: [...value.best], stars: [...value.stars] };
}

function validateSave(value) {
  if (value?.version !== 3 || !natural(value.records?.endless?.bestScore)) {
    throw new Error('Invalid cycling v3 save');
  }
  return { version: 3, records: {
    campaign: validateRecord(value.records.campaign), duo: validateRecord(value.records.duo),
    items: validateRecord(value.records.items), endless: { bestScore: value.records.endless.bestScore },
  } };
}

export function parseSave(raw, version = 3) {
  const value = JSON.parse(raw);
  if (version === 3) return validateSave(value);
  if (version !== 1 && version !== 2) throw new Error('Unsupported cycling save version');
  const count = version === 1 ? 3 : LEVELS.length;
  const old = validateRecord(value, count);
  const save = emptySave();
  save.records.campaign.best.splice(0, count, ...old.best);
  save.records.campaign.stars.splice(0, count, ...old.stars);
  save.records.campaign.unlocked = version === 1 && old.stars[2] > 0 ? 4 : old.unlocked;
  return save;
}

function report(notify, code, error) {
  console.warn(`Cycling storage: ${code}`, error);
  notify(code);
}

export function readSave(notify) {
  for (const version of [3, 2, 1]) {
    let raw;
    try { raw = localStorage.getItem(`pelican-pedal-run-v${version}`); }
    catch (error) {
      report(notify, 'readError', error);
      return { save: emptySave(), writable: false, error: 'unavailable' };
    }
    if (raw === null) continue;
    try { return { save: parseSave(raw, version), writable: true, error: null }; }
    catch (error) {
      report(notify, 'readError', error);
      return { save: emptySave(), writable: false, error: 'corrupt' };
    }
  }
  return { save: emptySave(), writable: true, error: null };
}

export function writeSave(save, notify) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(validateSave(save)));
    return true;
  } catch (error) { report(notify, 'writeError', error); return false; }
}

function validateResult(result) {
  if (!result || !['campaign', 'endless', 'duo', 'items'].includes(result.gameMode)
    || !natural(result.score) || !['won', 'lost', 'ended'].includes(result.outcome)) {
    throw new Error('Invalid cycling result');
  }
  if (result.gameMode === 'endless') {
    if (result.levelIndex !== null || result.stars !== null || result.outcome === 'won') {
      throw new Error('Invalid endless result');
    }
  } else if (!Number.isInteger(result.levelIndex) || result.levelIndex < 0 || result.levelIndex >= LEVELS.length
    || !Number.isInteger(result.stars) || result.stars < 0 || result.stars > 3
    || result.outcome === 'ended' || (result.outcome === 'won' ? result.stars < 1 : result.stars !== 0)) {
    throw new Error('Invalid campaign result');
  }
}

export function updateProgress(save, result) {
  validateResult(result);
  const next = validateSave(save);
  const record = next.records[result.gameMode];
  if (result.gameMode === 'endless') record.bestScore = Math.max(record.bestScore, result.score);
  else {
    const index = result.levelIndex;
    if (index >= record.unlocked) throw new Error('Cannot record a locked cycling level');
    record.best[index] = Math.max(record.best[index], result.score);
    if (result.outcome === 'won') {
      record.stars[index] = Math.max(record.stars[index], result.stars);
      record.unlocked = Math.max(record.unlocked, Math.min(LEVELS.length, index + 2));
    }
  }
  return next;
}

export const emptyAppearance = () => ({ version: 1, players: [defaultRiderConfig(0), defaultRiderConfig(1)] });

function validateAppearance(value) {
  if (value?.version !== 1 || !Array.isArray(value.players) || value.players.length !== 2) {
    throw new Error('Invalid cycling appearance save');
  }
  return { version: 1, players: Array.from(value.players, config => validateRiderConfig(config)) };
}

export function readAppearance(notify) {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    return raw === null ? emptyAppearance() : validateAppearance(JSON.parse(raw));
  } catch (error) {
    report(notify, 'appearanceReadError', error);
    return emptyAppearance();
  }
}

export function writeAppearance(appearance, notify) {
  try {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify(validateAppearance(appearance)));
    return true;
  } catch (error) { report(notify, 'appearanceWriteError', error); return false; }
}
