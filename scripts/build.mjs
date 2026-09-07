import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import { renderSeo } from '../src/seo.js';
import { messages } from '../src/locales.js';
import { LEVELS } from '../src/levels.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(`${root}${path}`, 'utf8');
const licenses = await read('LICENSE') + '\nThree.js 0.160.1\n' + await read('vendor/three/LICENSE');
assert(!licenses.includes('-->'), '许可证不能提前结束 HTML 注释');

function pageHtml({ template, markup, locale }) {
  assert(template.includes('<!--app-html-->'), '页面必须保留预渲染占位符');
  return template.replace(/<html lang="[^"]*"/, `<html lang="${locale === 'en' ? 'en' : 'zh-CN'}"`)
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => renderSeo(locale))
    .replace('<!--app-html-->', () => markup)
    .replace('</body>', () => `<!--\n${licenses}\n-->\n</body>`);
}

await build({ root });
const template = await read('dist/index.html');
const server = await createServer({ root, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
let chineseMarkup;
try {
  const { render } = await server.ssrLoadModule('/src/entry-server.js');
  for (const locale of ['zh', 'en']) {
    const markup = await render(locale);
    if (locale === 'zh') chineseMarkup = markup;
    const html = pageHtml({ template, markup, locale });
    assert(html.includes(messages[locale].title), '静态页面必须含对应语言标题');
    for (const level of LEVELS) assert(html.includes(locale === 'en' ? level.en : level.name), '静态页面必须含全部关卡');
    const directory = `${root}dist/${locale === 'en' ? 'en/' : ''}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`${directory}index.html`, html);
  }
} finally {
  await server.close();
}

const offlineDirectory = `${root}dist/.offline`;
try {
  await build({ root, mode: 'offline', build: { outDir: offlineDirectory, copyPublicDir: false } });
  let offline = pageHtml({ template: await read('dist/.offline/index.html'), markup: chineseMarkup, locale: 'zh' });
  for (const filename of ['favicon-48.png', 'favicon-96.png', 'favicon.ico']) {
    const data = (await readFile(`${root}public/${filename}`)).toString('base64');
    offline = offline.replaceAll(`href="./${filename}"`, `href="data:image/${filename.endsWith('.ico') ? 'x-icon' : 'png'};base64,${data}"`);
  }
  const resources = offline.match(/<(?:script|img|link|audio|video)\b[^>]*>/gi) || [];
  for (const tag of resources) {
    if (/<link\b/i.test(tag) && /rel="(?:canonical|alternate)"/.test(tag)) continue;
    const url = tag.match(/\b(?:src|href)="([^"]+)"/);
    assert(!url || url[1].startsWith('data:'), `离线包包含外部资源: ${tag.slice(0, 120)}`);
  }
  assert(!offline.includes('<!--app-html-->'), '离线包不能遗留模板占位符');
  await writeFile(`${root}dist/offline.html`, offline);
  console.log(`Built Chinese + English static pages and offline.html (${Buffer.byteLength(offline).toLocaleString('en-US')} bytes)`);
} finally {
  await rm(offlineDirectory, { recursive: true, force: true });
}
