import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeImage, runBootTasks, waitForPageResources } from '../src/boot-tasks.js';

const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const source = await readFile(new URL('../src/boot.js', import.meta.url), 'utf8');
const catalogSource = await readFile(new URL('../src/outfit-thumbnails.js', import.meta.url), 'utf8');
const imports = [...catalogSource.matchAll(/import (\w+) from '(.+\.png)(?:\?inline)?';/g)];
const dataUrl = async file => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;
const catalogFor = new Function(...imports.map(([, name]) => name), `${catalogSource.replace(/^import .*;\n/gm, '').replace('export const', 'const')}\nreturn OUTFIT_THUMBNAILS;`);
const assets = {
  online: { images: imports.map(([, , file]) => `/src/${file.replace(/^\.\//, '')}`), logo: '/src/assets/pelican-mark.png' },
  offline: {
    images: await Promise.all(imports.map(([, , file]) => dataUrl(new URL(`../src/${file}`, import.meta.url)))),
    logo: await dataUrl(new URL('../src/assets/pelican-mark.png', import.meta.url)),
  },
};

// Exercise the actual startup orchestration with controlled resource promises, not GPU output.
function fixture({ format = 'online', foreign = false, imageGate, frameGate } = {}) {
  const { logo, images } = assets[format], catalog = catalogFor(...images);
  const pending = deferred(), events = { progress: [], completed: 0, failures: [], decoded: [], logs: [] };
  const document = {
    images: foreign ? [{ decode: () => pending.promise, naturalWidth: 1, naturalHeight: 1 }] : [],
    fonts: { ready: foreign ? pending.promise : Promise.resolve() },
    querySelectorAll: selector => { assert.equal(selector, 'link[rel="stylesheet"][data-boot-required]'); return []; },
  };
  const window = { document, __pelicanBoot: {
    setCopy() {}, progress: value => events.progress.push(value),
    complete: () => events.completed++, fail: error => events.failures.push(error),
  } };
  class Image {
    naturalWidth = 128;
    naturalHeight = 128;
    decode() { events.decoded.push(this.src); return this.src === logo && imageGate ? imageGate.promise : Promise.resolve(); }
  }
  const dependencies = { logo, OUTFIT_THUMBNAILS: catalog, decodeImage, runBootTasks, waitForPageResources, Image, document, window, console: { error: (...args) => events.logs.push(args) } };
  const finish = new Function(...Object.keys(dependencies), `${source.replace(/^import .*;\n/gm, '').replaceAll('export ', '')}\nreturn finishBoot;`)(...Object.values(dependencies));
  return { events, urls: [...new Set([logo, ...images])], start: () => finish({ whenReady: () => frameGate ? frameGate.promise : Promise.resolve() }, {}) };
}

test('startup finishes with game resources ready even if injected images and fonts never settle', async () => {
  for (const format of ['online', 'offline']) {
    const { events, start, urls } = fixture({ format, foreign: true });
    const finished = start();
    await tick();
    const progress = events.progress.at(-1);
    assert.equal(events.completed, 1, `${format} startup stuck at ${progress.completed}/${progress.total} on unrelated page resources`);
    await finished;
    assert.deepEqual(events.failures, []);
    assert.deepEqual(events.decoded, urls);
    assert.equal(new Set(events.decoded).size, events.decoded.length);
  }
});

test('startup still waits for its own logo decode and the real engine readiness promise', async () => {
  for (const gate of ['imageGate', 'frameGate']) {
    const pending = deferred();
    const { events, start } = fixture({ [gate]: pending });
    const finished = start();
    await tick();
    assert.equal(events.completed, 0);
    assert.ok(events.progress.at(-1).completed < events.progress.at(-1).total);
    pending.resolve(); await finished;
    assert.equal(events.completed, 1); assert.deepEqual(events.failures, []);
  }
});

test('a required image failure still reports an error instead of revealing the game', async () => {
  const pending = deferred();
  const { events, start } = fixture({ imageGate: pending });
  const finished = start(); pending.reject(new Error('Logo decode failed')); await finished;
  assert.equal(events.completed, 0); assert.equal(events.failures.length, 1);
  assert.match(events.failures[0].message, /Logo decode failed/);
  assert.equal(events.logs.length, 1); assert.equal(events.logs[0][0], 'Boot failed');
});
