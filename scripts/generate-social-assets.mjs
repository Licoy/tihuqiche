import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const directory = new URL('../public/', import.meta.url);
await mkdir(directory, { recursive: true });
const logo = (await readFile(new URL('../src/assets/pelican-logo.png', import.meta.url))).toString('base64');
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
try {
  const page = await browser.newPage();
  const assets = await page.evaluate(async source => {
    const image = new Image();
    image.src = `data:image/png;base64,${source}`;
    await image.decode();
    const draw = (width, height) => {
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      return [canvas, canvas.getContext('2d')];
    };
    const icons = Object.fromEntries([48, 96, 128].map(size => {
      const [canvas, context] = draw(size, size);
      const scale = size / Math.max(image.width, image.height);
      context.drawImage(image, (size - image.width * scale) / 2, (size - image.height * scale) / 2, image.width * scale, image.height * scale);
      return [size === 128 ? 'pelican-mark.png' : `favicon-${size}.png`, canvas.toDataURL('image/png').split(',')[1]];
    }));
    const [card, context] = draw(1200, 630);
    context.fillStyle = '#f5f2e8'; context.fillRect(0, 0, 1200, 630);
    context.fillStyle = '#d9e9df'; context.beginPath(); context.arc(915, 320, 244, 0, Math.PI * 2); context.fill();
    const scale = 450 / Math.max(image.width, image.height);
    context.drawImage(image, 915 - image.width * scale / 2, 320 - image.height * scale / 2, image.width * scale, image.height * scale);
    context.fillStyle = '#214c48'; context.font = '700 28px Arial'; context.fillText('TIHUQICHE.COM', 76, 114);
    context.font = '700 82px Georgia'; context.fillText('Pelican', 72, 260); context.fillText('Pedal Run', 72, 350);
    context.font = '26px Arial'; context.fillText('A long beak. A little bike.', 76, 421); context.fillText('Six routes. A world to explore.', 76, 460);
    context.fillStyle = '#447970'; context.font = '700 20px Arial'; context.fillText('FREE 3D CYCLING GAME', 76, 550);
    return { ...icons, 'share-image.png': card.toDataURL('image/png').split(',')[1] };
  }, logo);
  for (const [name, data] of Object.entries(assets)) {
    const target = name === 'pelican-mark.png' ? new URL('../src/assets/pelican-mark.png', import.meta.url) : new URL(name, directory);
    await writeFile(target, Buffer.from(data, 'base64'));
  }
  const png = Buffer.from(assets['favicon-48.png'], 'base64');
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header[6] = 48; header[7] = 48;
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  await writeFile(new URL('favicon.ico', directory), Buffer.concat([header, png]));
  console.log('Generated 128px UI logo, 48px + 96px PNG favicon, ICO and 1200×630 social card from the existing logo');
} finally {
  await browser.close();
}
