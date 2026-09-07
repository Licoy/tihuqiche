import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const template = read('src/index.html');
const engine = read('vendor/three/three.min.js');
const modules = ['world', 'rider', 'course', 'game', 'input'];
const code = modules.map(name => read(`src/${name}.js`)).join('\n');
const engineMarker = '<!-- THREE_ENGINE -->';
const codeMarker = '// GAME_CODE';
const logoMarker = '__PELICAN_LOGO__';
const logo = readFileSync(new URL('src/assets/pelican-logo.png', root)).toString('base64');

assert.equal(template.split(engineMarker).length, 2, '模板必须包含一个引擎占位符');
assert.equal(template.split(codeMarker).length, 2, '模板必须包含一个游戏代码占位符');
assert.equal(template.split(logoMarker).length, 2, '模板必须包含一个 Logo 占位符');
assert(!/<\/script/i.test(engine + code), '内嵌代码中不能包含 script 结束标签');
new Script(engine, { filename: 'vendor/three/three.min.js' });
new Script(code, { filename: 'game.js' });

const licenses = read('LICENSE') + '\nThree.js 0.160.1\n' + read('vendor/three/LICENSE');
assert(!licenses.includes('-->'), '许可证不能提前结束 HTML 注释');
// A single-file artifact is intentional: the game and engine remain portable offline.
const html = template
  .replace(logoMarker, () => `data:image/png;base64,${logo}`)
  .replace(engineMarker, () => `<!--\n${licenses}\n-->\n<script>${engine}</script>`)
  .replace(codeMarker, () => code);
// Canonical links describe the page URL; they do not load external resources.
const resourceHTML = html
  .replace(/<link\b[^>]*>/gi, tag => /\brel=["']canonical["']/i.test(tag) ? '' : tag)
  .replace(/<img\b[^>]*\bsrc="data:image\/png;base64,[A-Za-z0-9+/=]+"[^>]*>/gi, '');
assert(!/<(?:script|link|img|audio|video)\b[^>]*\b(?:src|href)\s*=/i.test(resourceHTML), '构建产物必须内嵌所有资源');
assert(!html.includes(engineMarker) && !html.includes(codeMarker) && !html.includes(logoMarker), '不能遗留模板占位符');

mkdirSync(new URL('dist/', root), { recursive: true });
const destination = new URL('dist/index.html', root);
writeFileSync(destination, html);
console.log(`Built ${fileURLToPath(destination)} (${Buffer.byteLength(html).toLocaleString('en-US')} bytes, fully embedded)`);
