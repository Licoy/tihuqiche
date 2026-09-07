import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build, createServer } from 'vite';
import { renderSeo } from '../src/seo.js';
import { messages } from '../src/locales.js';
import { LEVELS } from '../src/levels.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(`${root}${path}`, 'utf8');
const licenses = await read('LICENSE') + '\nThree.js 0.160.1\n' + await read('vendor/three/LICENSE');
assert(!licenses.includes('-->'), '许可证不能提前结束 HTML 注释');

function pageHtml({ template, markup, locale, offline = false }) {
  assert(template.includes('<!--app-html-->'), '页面必须保留预渲染占位符');
  return template.replace(/<html lang="[^"]*"/, `<html lang="${locale === 'en' ? 'en' : 'zh-CN'}"`)
    .replace(/<!--seo:start-->[\s\S]*?<!--seo:end-->/, () => renderSeo(locale))
    .replace('<!--app-html-->', () => markup)
    .replace('</body>', () => `${offline ? `<!--\n${licenses}\n-->` : '<!-- License notices: /LICENSE.txt -->'}\n</body>`);
}

function imageUrls(result) {
  const online = new Map();
  const offline = new Map();
  for (const { output } of [result].flat()) {
    for (const asset of output) {
      if (asset.type !== 'asset' || !asset.fileName.endsWith('.png')) continue;
      for (const original of asset.originalFileNames) {
        online.set(`/${original}`, `/${asset.fileName}`);
        offline.set(`/${original}`, `data:image/png;base64,${Buffer.from(asset.source).toString('base64')}`);
      }
    }
  }
  return { online, offline };
}

function resolveImages(markup, urls) {
  return markup.replace(/\bsrc="(\/src\/assets\/[^"]+)"/g, (_, source) => {
    assert(urls.has(source), `预渲染图片缺少构建映射: ${source}`);
    return `src="${urls.get(source)}"`;
  });
}

async function assertOnlineImages(html) {
  assert(!html.includes('data:image/'), '在线 HTML 不能内嵌图片');
  assert(!html.includes('/src/'), '在线 HTML 不能引用源目录');
  for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
    const source = tag.match(/\bsrc="([^"]+)"/)?.[1];
    assert(source?.startsWith('/assets/'), `在线图片必须使用根路径构建资源: ${tag}`);
    await readFile(`${root}dist${source}`);
  }
}

const urls = imageUrls(await build({ root }));
for (const source of ['pelican-mark.png', ...(await readdir(`${root}src/assets/outfits`)).filter(name => name.endsWith('.png')).map(name => `outfits/${name}`)]) {
  const url = urls.online.get(`/src/assets/${source}`);
  assert(url && /^\/assets\/.+-[\w-]+\.png$/.test(url), `图片必须输出带 hash 的独立文件: ${source}`);
  assert.deepEqual(await readFile(`${root}dist${url}`), await readFile(`${root}src/assets/${source}`), `图片构建映射内容必须一致: ${source}`);
}
await writeFile(`${root}dist/LICENSE.txt`, licenses);
const template = await read('dist/index.html');
const server = await createServer({ root, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
let chineseMarkup;
try {
  const { render } = await server.ssrLoadModule('/src/entry-server.js');
  for (const locale of ['zh', 'en']) {
    const markup = await render(locale);
    if (locale === 'zh') chineseMarkup = markup;
    const html = pageHtml({ template, markup: resolveImages(markup, urls.online), locale });
    await assertOnlineImages(html);
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
  let offline = pageHtml({ template: await read('dist/.offline/index.html'), markup: resolveImages(chineseMarkup, urls.offline), locale: 'zh', offline: true });
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
