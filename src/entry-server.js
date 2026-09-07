import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { config } from '@fortawesome/fontawesome-svg-core';
import App from './App.vue';

config.autoAddCss = false;

export function render(locale) {
  return renderToString(createSSRApp(App, { initialLocale: locale }));
}
