import test from 'node:test';
import assert from 'node:assert/strict';
import QRCode from 'qrcode';
import { buildShareText, shareUrl, copyShare } from '../src/share.js';
import { SHARE_QR } from '../src/share-qr.js';
import { renderSeo } from '../src/seo.js';
import { LEVELS } from '../src/levels.js';

const run = overrides => ({ gameMode: 'campaign', levelIndex: 0, score: 1000, distance: 600.9,
  fishCollected: 35, fishBalance: 15, outcome: 'won', ...overrides });

test('official URLs never use the current host or file path', () => {
  assert.equal(shareUrl('zh'), 'https://tihuqiche.com/');
  assert.equal(shareUrl('en'), 'https://tihuqiche.com/en/');
  assert.throws(() => shareUrl('fr'), /language/);
});

test('all bilingual modes include result score, cumulative fish, distance and official URL', () => {
  for (const locale of ['zh', 'en']) for (const gameMode of ['campaign', 'endless', 'duo', 'items']) {
    const result = Object.freeze(run({ gameMode, levelIndex: gameMode === 'endless' ? null : 0 }));
    const text = buildShareText(result, locale);
    for (const part of ['1000', '600', '35', shareUrl(locale)]) assert.ok(text.includes(part), part);
    assert.ok(!text.includes('600.9'));
    assert.match(text, locale === 'en' ? /Campaign|Endless|Local Co-op/ : /闯关模式|无尽模式|双人合作|道具闯关/);
    if (gameMode === 'duo') assert.match(text, locale === 'en' ? /^We teamed up/ : /^我们.*合作/);
    else assert.match(text, locale === 'en' ? /^I scored/ : /^我在/);
    assert.equal(result.fishBalance, 15);
  }
});

test('failed games can share, invalid results are rejected explicitly', () => {
  assert.match(buildShareText(run({ outcome: 'lost' }), 'zh'), /1000/);
  for (const patch of [{ score: -1 }, { score: 2.4 }, { score: Infinity }, { distance: NaN },
    { fishCollected: -1 }, { fishCollected: 1.1 }, { levelIndex: LEVELS.length }, { levelIndex: null },
    { gameMode: 'bad' }, { gameMode: 'endless', levelIndex: 0 }]) {
    assert.throws(() => buildShareText(run(patch), 'en'), /Invalid/);
  }
  assert.throws(() => buildShareText(null, 'en'), /Invalid/);
});

test('clipboard passes exact text and only resolves after the real API resolves', async t => {
  let complete; let received;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'navigator', descriptor) : delete globalThis.navigator);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: {
    writeText: text => { received = text; return new Promise(resolve => { complete = resolve; }); },
  } } });
  let done = false;
  const operation = copyShare('exact text').then(() => { done = true; });
  await Promise.resolve();
  assert.equal(received, 'exact text'); assert.equal(done, false);
  complete(); await operation; assert.equal(done, true);
});

test('clipboard absence, denial and empty content reject, never report false success', async t => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  t.after(() => descriptor ? Object.defineProperty(globalThis, 'navigator', descriptor) : delete globalThis.navigator);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  await assert.rejects(copyShare('hello'), /Clipboard unavailable/);
  await assert.rejects(copyShare('  '), /empty/);
  const denied = new Error('Permission denied');
  globalThis.navigator.clipboard = { writeText: async () => { throw denied; } };
  await assert.rejects(copyShare('hello'), error => error === denied);
});

test('checked-in inline QR artifacts match real generator output for both official addresses', async () => {
  for (const locale of ['zh', 'en']) {
    const expected = await QRCode.toString(shareUrl(locale), { type: 'svg', errorCorrectionLevel: 'M',
      margin: 4, width: 160, color: { dark: '#000000ff', light: '#ffffffff' } });
    assert.equal(SHARE_QR[locale], expected);
    assert.match(expected, /width="160"/);
    assert.match(expected, /#ffffff/);
    assert.match(expected, /#000000/);
    assert.doesNotMatch(expected, /<(?:image|script)\b|href=/);
  }
  assert.notEqual(SHARE_QR.zh, SHARE_QR.en);
});


test('bilingual SEO shares canonical URLs and declares single-player and local co-op', () => {
  for (const locale of ['zh', 'en']) {
    const html = renderSeo(locale);
    assert.ok(html.includes(`<link rel="canonical" href="${shareUrl(locale)}">`));
    const json = html.match(/<script id="game-schema" type="application\/ld\+json">(.*?)<\/script>/)[1];
    const schema = JSON.parse(json);
    assert.equal(schema.url, shareUrl(locale));
    assert.deepEqual(schema.playMode, ['https://schema.org/SinglePlayer', 'https://schema.org/MultiPlayer', 'https://schema.org/CoOp']);
    assert.equal(schema.hasPart.length, LEVELS.length);
    assert.deepEqual(schema.hasPart.map(part => part.name), LEVELS.map(level => locale === 'en' ? level.en : level.name));
    assert.match(schema.description, locale === 'en' ? /local keyboard co-op on PC/ : /电脑本地键盘双人合作/);
    assert.equal(schema.isAccessibleForFree, true);
  }
});
