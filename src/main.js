import { createApp } from 'vue';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import App from './App.vue';
import { failBoot } from './boot.js';
import './styles/base.css';
import './styles/game.css';
import './styles/responsive.css';

config.autoAddCss = false;
const app = createApp(App, { initialLocale: window.__pelicanBoot.locale });
app.config.errorHandler = (error) => {
  console.error('Application error', error);
  failBoot(error);
};
try { app.mount('#app'); }
catch (error) { console.error('Application mount failed', error); failBoot(error); }
