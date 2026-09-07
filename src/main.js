import { createApp } from 'vue';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
import App from './App.vue';
import './styles/base.css';
import './styles/game.css';
import './styles/responsive.css';

config.autoAddCss = false;
const app = createApp(App, { initialLocale: location.pathname.startsWith('/en/') ? 'en' : 'zh' });
app.config.errorHandler = (error) => {
  console.error('Application error', error);
  const loading = document.getElementById('loading');
  loading.hidden = false;
  loading.textContent = `${error.message} — ${document.documentElement.lang.startsWith('zh') ? '请刷新页面重试' : 'Please reload the page'}`;
};
app.mount('#app');
