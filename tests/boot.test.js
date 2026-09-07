import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { decodeImage, runBootTasks, waitForPageResources } from '../src/boot-tasks.js';

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('real tasks advance progress only on completion and all are required', async () => {
  const images = deferred(), fonts = deferred(), frame = deferred(), progress = [];
  let done = false;
  const pending = runBootTasks([
    { name: 'images', run: () => images.promise },
    { name: 'fonts', run: () => fonts.promise },
    { name: 'frame', run: () => frame.promise },
  ], value => progress.push(value)).then(() => { done = true; });
  assert.deepEqual(progress, [{ completed: 0, total: 3 }]);
  frame.resolve(); await tick();
  assert.equal(progress.at(-1).completed, 1); assert.equal(done, false);
  images.resolve(); await tick();
  assert.equal(progress.at(-1).completed, 2); assert.equal(done, false);
  fonts.resolve(); await pending;
  assert.deepEqual(progress.at(-1), { completed: 3, total: 3 }); assert.equal(done, true);
});

test('a rejected task retains its cause and late completions never report success', async () => {
  const image = deferred(), frame = deferred(), progress = [];
  const pending = runBootTasks([
    { name: 'outfit image', run: () => image.promise },
    { name: 'frame', run: () => frame.promise },
  ], value => progress.push(value));
  const failure = new Error('PNG decode failed');
  image.reject(failure);
  await assert.rejects(pending, error => error.cause === failure && /outfit image/.test(error.message));
  frame.resolve(); await tick();
  assert.deepEqual(progress, [{ completed: 0, total: 2 }]);
});

test('synchronous initialization failures reject and an empty task set cannot succeed', async () => {
  await assert.rejects(runBootTasks([{ name: 'WebGL', run() { throw new Error('unsupported'); } }], () => {}), /WebGL: unsupported/);
  await assert.rejects(runBootTasks([], () => {}), /requires readiness/);
});

test('page resources wait for load, including a page already complete', async () => {
  const page = new EventTarget(); page.document = { readyState: 'interactive' };
  let done = false;
  const pending = waitForPageResources(page).then(() => { done = true; });
  await tick(); assert.equal(done, false);
  page.dispatchEvent(new Event('load')); await pending; assert.equal(done, true);
  page.document.readyState = 'complete'; await waitForPageResources(page);
});

test('image readiness waits for decode and rejects corrupt or empty pixels', async () => {
  const decoded = deferred(); let done = false;
  const pending = decodeImage({ decode: () => decoded.promise, naturalWidth: 128, naturalHeight: 128 }).then(() => { done = true; });
  await tick(); assert.equal(done, false); decoded.resolve(); await pending;
  await assert.rejects(decodeImage({ decode: async () => { throw new Error('corrupt'); } }), /corrupt/);
  await assert.rejects(decodeImage({ decode: async () => {}, naturalWidth: 0, naturalHeight: 0 }), /no decoded pixels/);
});

// Execute the actual pre-bundle bootstrap in a small DOM surface, without a browser.
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][1][1];
function bootEnvironment({ path = '/', saved = null, language = 'zh-CN' } = {}) {
  const elements = Object.fromEntries(['loading', 'boot-name', 'boot-status', 'boot-detail', 'boot-retry', 'boot-progress', 'app'].map(id => [id, {
    hidden: false, dataset: {}, setAttribute() {}, contains(target) { return target === elements['boot-retry']; },
  }]));
  const root = { dataset: { boot: 'loading' }, hasAttribute() { return 'boot' in this.dataset; }, removeAttribute() { delete this.dataset.boot; } };
  const listeners = {};
  class Script {} class Link {}
  const window = { addEventListener(name, listener) { listeners[name] = listener; } };
  vm.runInNewContext(bootstrap, {
    window, document: { documentElement: root, getElementById: id => elements[id] },
    location: { pathname: path }, localStorage: { getItem: () => saved }, navigator: { language },
    HTMLScriptElement: Script, HTMLLinkElement: Link, console,
  });
  window.__pelicanBoot.render();
  return { boot: window.__pelicanBoot, elements, listeners, root, Script, Link };
}

test('native loader preserves unknown progress, locale precedence and complete/error latch', () => {
  const { boot, elements, root } = bootEnvironment({ path: '/en/', saved: 'zh' });
  assert.equal(boot.locale, 'en'); assert.equal(elements['boot-name'].textContent, 'Pelican Pedal');
  assert.equal(elements.loading.dataset.stage, 'module'); assert.equal(elements['boot-progress'].value, undefined);
  boot.complete(); assert.equal(elements.loading.hidden, false); assert.equal(elements.app.inert, true);
  boot.progress({ completed: 1, total: 2 }); boot.complete(); assert.equal(elements.loading.hidden, false);
  boot.progress({ completed: 2, total: 2 }); boot.complete(); assert.equal(elements.loading.hidden, true);
  assert.equal(elements.app.inert, false); assert.equal(root.dataset.boot, undefined);
  boot.fail(new Error('Context lost')); assert.equal(elements.loading.hidden, false);
  assert.match(elements['boot-detail'].textContent, /Context lost/); assert.equal(elements['boot-retry'].hidden, false);
  boot.progress({ completed: 2, total: 2 }); boot.complete(); assert.equal(elements.loading.hidden, false);
  assert.equal(bootEnvironment({ saved: 'zh', language: 'en-US' }).boot.locale, 'zh');
  assert.equal(bootEnvironment({ language: 'en-US' }).boot.locale, 'en');
});

test('entry/CSS failures stay visible, while icons and links are not required resources', () => {
  for (const type of ['script', 'css']) {
    const { boot, listeners, elements, Script, Link } = bootEnvironment();
    const target = type === 'script' ? new Script() : new Link();
    target.rel = 'stylesheet'; target.src = '/entry.js'; target.href = '/app.css';
    listeners.error({ target }); boot.progress({ completed: 1, total: 1 }); boot.complete();
    assert.equal(elements.loading.hidden, false); assert.match(elements['boot-detail'].textContent, /Resource failed/);
  }
  const { listeners, elements, Link } = bootEnvironment();
  const target = new Link(); target.rel = 'icon'; listeners.error({ target });
  assert.equal(elements['boot-retry'].hidden, true);
});

test('boot captures background keyboard shortcuts but permits retry keyboard defaults', () => {
  const { listeners, elements, boot } = bootEnvironment();
  function key(target, name, modifiers = {}) {
    const event = { target, key: name, ...modifiers, stopped: false, prevented: false,
      stopImmediatePropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; } };
    listeners.keydown(event); return event;
  }
  assert.equal(key({}, ' ').prevented, true);
  const retry = key(elements['boot-retry'], 'Enter'); assert.equal(retry.stopped, true); assert.equal(retry.prevented, false);
  assert.equal(key({}, 'Tab').prevented, false);
  const refresh = key({}, 'r', { metaKey: true });
  assert.equal(refresh.prevented, false); assert.equal(refresh.stopped, true);
  boot.progress({ completed: 1, total: 1 }); boot.complete(); assert.equal(key({}, ' ').stopped, false);
});

test('Vue copy preserves reload wording and generic resource help', async () => {
  const { messages } = await import('../src/locales.js');
  for (const locale of ['zh', 'en']) {
    const { boot, elements } = bootEnvironment({ saved: locale });
    boot.setCopy(messages[locale]); boot.fail(new Error('Image decode failed'));
    assert.equal(elements['boot-name'].textContent, messages[locale].brand);
    assert.equal(elements['boot-retry'].textContent, locale === 'zh' ? '重新加载' : 'Reload');
    assert.doesNotMatch(elements['boot-detail'].textContent, /硬件加速|hardware acceleration/);
  }
});

test('production CSS transform is nonblocking and offline CSS is untouched', async () => {
  const { default: configure } = await import('../vite.config.js');
  const plugins = configure({ mode: 'production' }).plugins;
  const transform = plugins.find(plugin => plugin.name === 'nonblocking-startup-css').transformIndexHtml;
  const css = '<link rel="stylesheet" crossorigin href="/assets/app.css">';
  const icon = '<link rel="icon" href="/favicon.ico">';
  const output = transform.handler(css + icon);
  assert.equal(transform.order, 'post');
  assert.match(output, /media="print" onload="this.media='all'"/);
  assert.ok(output.includes(`<noscript>${css}</noscript>`));
  assert.ok(output.endsWith(icon));
  assert.equal(configure({ mode: 'offline' }).plugins.some(plugin => plugin.name === 'nonblocking-startup-css'), false);
});
