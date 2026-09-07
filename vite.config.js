import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { renderSeo } from './src/seo.js';

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    { name: 'game-metadata', transformIndexHtml: (html, context) => html.replace('<!--seo-head-->', renderSeo(context.path.startsWith('/en/') ? 'en' : 'zh')) },
    ...(mode !== 'offline' ? [{
      name: 'nonblocking-startup-css',
      apply: 'build',
      transformIndexHtml: { order: 'post', handler: html => html.replace(
        /<link\b[^>]*rel="stylesheet"[^>]*>/g,
        tag => `${tag.replace('<link', '<link media="print" onload="this.media=\'all\'"')}<noscript>${tag}</noscript>`,
      ) },
    }] : []),
    ...(mode === 'offline' ? [viteSingleFile()] : []),
  ],
  build: { target: 'es2022', modulePreload: false },
}));
