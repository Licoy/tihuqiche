import { LEVELS } from './levels.js';

const modes = {
  zh: { campaign: '闯关模式', endless: '无尽模式', duo: '双人合作', items: '道具闯关' },
  en: { campaign: 'Campaign', endless: 'Endless', duo: 'Local Co-op', items: 'Item Campaign' },
};

export function shareUrl(locale) {
  if (locale !== 'zh' && locale !== 'en') throw new Error('Unsupported sharing language');
  return locale === 'en' ? 'https://tihuqiche.com/en/' : 'https://tihuqiche.com/';
}

export function buildShareText(result, locale) {
  const url = shareUrl(locale);
  if (!result || !Object.hasOwn(modes[locale], result.gameMode)
    || !Number.isSafeInteger(result.score) || result.score < 0
    || !Number.isFinite(result.distance) || result.distance < 0
    || !Number.isSafeInteger(result.fishCollected) || result.fishCollected < 0) {
    throw new Error('Invalid result for sharing');
  }
  const endless = result.gameMode === 'endless';
  if (endless ? result.levelIndex !== null : !Number.isInteger(result.levelIndex)
    || result.levelIndex < 0 || result.levelIndex >= LEVELS.length) {
    throw new Error('Invalid share level');
  }
  const duo = result.gameMode === 'duo';
  const level = endless ? '' : ` · ${locale === 'en' ? LEVELS[result.levelIndex].en : LEVELS[result.levelIndex].name}`;
  const mode = `${modes[locale][result.gameMode]}${level}`;
  const distance = Math.floor(result.distance);
  if (locale === 'en') {
    return `${duo ? 'We teamed up and scored' : 'I scored'} ${result.score} points in Pelican Pedal Run (${mode})! `
      + `${distance} meters ridden and ${result.fishCollected} fish collected. `
      + `${duo ? 'Grab a friend and ride together' : 'Ride with my long-beaked buddy and try to beat my score'}: ${url}`;
  }
  return `${duo ? '我们' : '我'}在《鹈鹕骑车》的【${mode}】${duo ? '合作' : ''}拿下了 ${result.score} 分！`
    + `一路骑过 ${distance} 米，收集 ${result.fishCollected} 条小鱼，`
    + `${duo ? '一人一只鹈鹕，一路鸡飞鱼跳，叫上你的搭子，也来骑一程' : '来和我的长嘴搭子比一场'}：${url}`;
}

export async function copyShare(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('Share text must not be empty');
  if (!globalThis.navigator?.clipboard?.writeText) throw new Error('Clipboard unavailable; copy the text manually');
  await globalThis.navigator.clipboard.writeText(text);
}
