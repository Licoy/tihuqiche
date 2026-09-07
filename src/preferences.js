import { computed, ref } from 'vue';
import { syncSeo } from './seo.js';

export function createPreferences(initialLocale, notify) {
  const locale = ref(initialLocale), theme = ref('system'), systemDark = ref(false);
  const dark = computed(() => theme.value === 'system' ? systemDark.value : theme.value === 'dark');
  let media;
  function persist(key, value) {
    try { localStorage.setItem(`pelican-${key}`, value); }
    catch (error) { console.warn('Could not save preferences', error); notify('preferencesError'); }
  }
  function applyLocale(value) {
    locale.value = value;
    if (location.protocol !== 'file:') history.replaceState(null, '', `${value === 'en' ? '/en/' : '/'}${location.search}${location.hash}`);
    syncSeo(value);
  }
  function setLocale(value) {
    if (!['zh', 'en'].includes(value)) throw new Error('Unsupported language');
    applyLocale(value); persist('locale', value);
  }
  function setTheme(value) {
    if (!['system', 'light', 'dark'].includes(value)) throw new Error('Unsupported appearance');
    theme.value = value; persist('theme', value);
  }
  const changed = event => { systemDark.value = event.matches; };
  function init() {
    media = matchMedia('(prefers-color-scheme: dark)'); systemDark.value = media.matches;
    media.addEventListener('change', changed);
    let savedLocale, savedTheme;
    try { savedLocale = localStorage.getItem('pelican-locale'); savedTheme = localStorage.getItem('pelican-theme'); }
    catch (error) { console.warn('Could not read preferences', error); notify('preferencesError'); }
    if (['system', 'light', 'dark'].includes(savedTheme)) theme.value = savedTheme;
    const detected = (navigator.languages?.[0] || navigator.language).toLowerCase().startsWith('zh') ? 'zh' : 'en';
    // A shared English URL is explicit; on the root URL a saved choice precedes the device language.
    applyLocale(location.pathname.startsWith('/en/') ? 'en' : ['zh', 'en'].includes(savedLocale) ? savedLocale : detected);
  }
  return { locale, theme, dark, setLocale, setTheme, init, dispose: () => media?.removeEventListener('change', changed) };
}
