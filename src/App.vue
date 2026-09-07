<script setup>
import { computed, nextTick, onMounted, onUnmounted, provide, reactive, ref, watch } from 'vue';
import TopBar from './components/TopBar.vue';
import HomeMenu from './components/HomeMenu.vue';
import GameCanvas from './components/GameCanvas.vue';
import GameHud from './components/GameHud.vue';
import GameControls from './components/GameControls.vue';
import GameOverlays from './components/GameOverlays.vue';
import { LEVELS } from './levels.js';
import { messages, translate } from './locales.js';
import { createPreferences } from './preferences.js';
import { emptySave, readSave } from './storage.js';
import { initialGameState } from './game.js';

const props = defineProps({ initialLocale: { type: String, default: 'zh' } });
const state = reactive(initialGameState()), save = reactive(emptySave());
const selected = ref(0), helpOpen = ref(false), soundEnabled = ref(true), hitFlash = ref(0);
const ready = ref(false), error = ref(null), toastData = ref(null);
let engine, toastTimer;
const preferences = createPreferences(props.initialLocale, notify);
const { locale, dark } = preferences;
const copy = computed(() => messages[locale.value]);
const t = (key, values) => translate(locale.value, key, values);
const levelName = index => locale.value === 'zh' ? LEVELS[index].name : LEVELS[index].en;
const toastMessage = computed(() => {
  if (!toastData.value) return '';
  const { key, values, tip } = toastData.value;
  const current = key === 'stageToast' ? { ...values, name: levelName(values.number - 1) } : values;
  return t(key, current) + (tip ? `\n${t(tip)}` : '');
});
function clearToast() { clearTimeout(toastTimer); toastData.value = null; }
function notify(key, values = {}, tip) {
  clearTimeout(toastTimer); toastData.value = { key, values, tip };
  toastTimer = setTimeout(clearToast, key.endsWith('Error') ? 4500 : 3500);
}
function closeHelp() { helpOpen.value = false; }
const modalOpen = computed(() => helpOpen.value || ['paused', 'won', 'lost'].includes(state.mode));
const app = {
  state, save, selected, helpOpen, soundEnabled, hitFlash, ready, error, copy, t, levelName, notify, clearToast, closeHelp,
  ...preferences,
  selectLevel: index => engine.selectLevel(index), startLevel: index => engine.startLevel(index),
  goHome: () => engine.goHome(), pauseGame: () => engine.pauseGame(), resumeGame: () => engine.resumeGame(),
  action: type => engine.action(type), toggleSound: () => engine.toggleSound(),
};
provide('app', app);
function connected(value) { engine = value; ready.value = true; }
watch(helpOpen, async value => { await nextTick(); document.getElementById(value ? 'help-close' : 'help-open')?.focus({ preventScroll: true }); });
watch(dark, value => {
  document.documentElement.dataset.theme = value ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value ? '#142b2c' : '#bce6db');
  engine?.setAppearance();
});
watch(locale, () => engine?.setLanguage());
watch(() => state.mode, mode => document.body.classList.toggle('playing', mode !== 'home'));
onMounted(() => {
  preferences.init();
  Object.assign(save, readSave(notify)); selected.value = save.unlocked - 1;
  engine?.selectLevel(selected.value);
  engine?.setAppearance(); engine?.setLanguage();
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light';
});
onUnmounted(() => { preferences.dispose(); clearToast(); document.body.classList.remove('playing'); });
</script>

<template>
  <GameCanvas @ready="connected" />
  <div id="shade" aria-hidden="true"></div>
  <div id="hitflash" :style="{ opacity: hitFlash }" aria-hidden="true"></div>
  <div :inert="modalOpen || !ready || Boolean(error)">
    <TopBar />
    <HomeMenu />
    <GameHud />
    <GameControls />
  </div>
  <GameOverlays />
  <div id="toast" role="status" aria-live="polite" :class="{ show: toastData }">{{ toastMessage }}</div>
  <div id="loading" class="loading" :hidden="ready && !error" :role="error ? 'alert' : 'status'">
    <h2>{{ error ? copy[error.title] : copy.loadingTitle }}</h2>
    <p>{{ error ? copy[error.description] : copy.loading }}</p>
    <p v-if="error?.detail">{{ error.detail }}</p>
  </div>
</template>
