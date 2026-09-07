import { messages } from './locales.js';
import { LEVELS } from './levels.js';
import { shareUrl } from './share.js';

const origin = 'https://tihuqiche.com';
const canonical = shareUrl;
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

function metadata(locale) {
  const text = messages[locale];
  return {
    description: text.description,
    'og:type': 'website', 'og:site_name': text.brand,
    'og:locale': locale === 'en' ? 'en_US' : 'zh_CN',
    'og:locale:alternate': locale === 'en' ? 'zh_CN' : 'en_US',
    'og:title': text.title, 'og:description': text.description, 'og:url': canonical(locale),
    'og:image': `${origin}/share-image.png`, 'og:image:width': '1200', 'og:image:height': '630',
    'og:image:type': 'image/png', 'og:image:alt': 'Pelican Pedal Run — a pelican riding a bicycle',
    'twitter:card': 'summary_large_image', 'twitter:title': text.title, 'twitter:description': text.description,
    'twitter:image': `${origin}/share-image.png`, 'twitter:image:alt': 'Pelican Pedal Run — a pelican riding a bicycle',
  };
}

function structuredData(locale) {
  return {
    '@context': 'https://schema.org', '@type': 'VideoGame', name: messages[locale].title,
    description: messages[locale].description, url: canonical(locale), image: `${origin}/share-image.png`,
    inLanguage: locale === 'en' ? 'en' : 'zh-CN', genre: ['Adventure', 'Cycling'],
    applicationCategory: 'GameApplication', operatingSystem: 'Any WebGL-compatible browser',
    gamePlatform: 'Web browser', playMode: ['https://schema.org/SinglePlayer', 'https://schema.org/MultiPlayer', 'https://schema.org/CoOp'], isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    hasPart: LEVELS.map(level => ({ '@type': 'Thing', name: locale === 'en' ? level.en : level.name })),
  };
}

export function renderSeo(locale) {
  const tags = Object.entries(metadata(locale)).map(([key, value]) =>
    `<meta ${key.startsWith('og:') ? 'property' : 'name'}="${key}" content="${escape(value)}">`);
  return [
    '<!--seo:start-->', `<title>${escape(messages[locale].title)}</title>`, ...tags,
    `<link rel="canonical" href="${canonical(locale)}">`,
    `<link rel="alternate" hreflang="zh-CN" href="${canonical('zh')}">`,
    `<link rel="alternate" hreflang="en" href="${canonical('en')}">`,
    `<link rel="alternate" hreflang="x-default" href="${canonical('zh')}">`,
    `<script id="game-schema" type="application/ld+json">${JSON.stringify(structuredData(locale)).replaceAll('<', '\\u003c')}</script>`,
    '<!--seo:end-->',
  ].join('\n');
}

export function syncSeo(locale) {
  document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  document.title = messages[locale].title;
  for (const [key, value] of Object.entries(metadata(locale))) {
    document.querySelector(`meta[${key.startsWith('og:') ? 'property' : 'name'}="${key}"]`).content = value;
  }
  document.querySelector('link[rel="canonical"]').href = canonical(locale);
  document.querySelector('#game-schema').textContent = JSON.stringify(structuredData(locale));
}
