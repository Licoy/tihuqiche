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
import { emptyAppearance, readAppearance, writeAppearance, emptySave, readSave } from './storage.js';
import { initialGameState } from './game.js';
import { isMobileDevice } from './input.js';
import Wardrobe from './components/Wardrobe.vue';
import { finishBoot, failBoot } from './boot.js';

const props = defineProps({ initialLocale: { type: String, default: 'zh' } });
const state = reactive(initialGameState()), save = reactive(emptySave());
const selected = ref(0), helpOpen = ref(false), soundEnabled = ref(true), hitFlash = ref(0);
const ready = ref(false), error = ref(null), toastData = ref(null);
const selectedMode = ref('campaign'), saveWritable = ref(true), appearance = reactive(emptyAppearance());
const isMobile = ref(false), wardrobeOpen = ref(false), wardrobeSeat = ref(0), wardrobeDraft = ref(null);
const wardrobeScene = ref(false), wardrobeAuto = ref(true);
let engine, toastTimer, homePreviewCanvas = null, wardrobePreviewCanvas = null;
let resolveEngine;
const engineConnected = new Promise(resolve => { resolveEngine = resolve; });
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
const modalOpen = computed(() => helpOpen.value || wardrobeOpen.value || ['paused', 'won', 'lost', 'ended'].includes(state.mode));
const app = {
  selectedMode, saveWritable, appearance, isMobile, wardrobeOpen, wardrobeSeat, wardrobeDraft, wardrobeScene, wardrobeAuto, openWardrobe, cancelWardrobe, saveWardrobe,
  state, save, selected, helpOpen, soundEnabled, hitFlash, ready, error, copy, t, levelName, notify, clearToast, closeHelp,
  ...preferences,
  selectLevel: index => engine.selectLevel(index), startLevel: index => engine.startLevel(index),
  selectMode: mode => engine.selectMode(mode), startRun: options => engine.startRun(options),
  attachHomePreview: canvas => { homePreviewCanvas = canvas; if (engine) engine.attachHomePreview(canvas); },
  attachWardrobePreview: canvas => { wardrobePreviewCanvas = canvas; if (engine) engine.attachWardrobePreview(canvas); },
  rotateWardrobePreview: delta => engine.rotateWardrobePreview(delta),
  setHomePreviewPlayer: seat => engine.setHomePreviewPlayer(seat),
  rotateHomePreview: delta => engine.rotateHomePreview(delta),
  setHomePreviewAuto: enabled => engine.setHomePreviewAuto(enabled),
  endRun: () => engine.endRun(), previewRider: options => engine.previewRider(options),
  goHome: () => engine.goHome(), pauseGame: () => engine.pauseGame(), resumeGame: () => engine.resumeGame(),
  action: payload => engine.action(payload), toggleSound: () => engine.toggleSound(),
};
function openWardrobe(seat) {
  wardrobeSeat.value = seat; wardrobeDraft.value = { ...appearance.players[seat] };
  wardrobeScene.value = false; wardrobeAuto.value = true; wardrobeOpen.value = true;
  engine.previewRider({ playerId: seat, config: wardrobeDraft.value });
}
function cancelWardrobe() { engine.restoreRiders(); wardrobeOpen.value = false; wardrobeDraft.value = null; }
function saveWardrobe() {
  const next = { version: 1, players: appearance.players.map((config, seat) => ({ ...(seat === wardrobeSeat.value ? wardrobeDraft.value : config) })) };
  if (!writeAppearance(next, notify)) return false;
  Object.assign(appearance, next); engine.restoreRiders(); wardrobeOpen.value = false;
  wardrobeDraft.value = null; notify('appearanceSaved'); return true;
}
provide('app', app);
function connected(value) { engine = value; engine.attachHomePreview(homePreviewCanvas); engine.attachWardrobePreview(wardrobePreviewCanvas); ready.value = true; resolveEngine(); }
watch(dark, value => {
  document.documentElement.dataset.theme = value ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value ? '#142b2c' : '#bce6db');
  engine?.setAppearance();
});
watch(locale, () => engine?.setLanguage());
watch(error, value => {
  if (value) failBoot(new Error(value.detail || copy.value[value.description]), {
    ...copy.value, errorTitle: copy.value[value.title], errorHelp: copy.value[value.description],
  });
}, { flush: 'sync' });
watch(() => state.mode, mode => document.body.classList.toggle('playing', mode !== 'home'));
onMounted(async () => {
  preferences.init();
  const loaded = readSave(notify);
  Object.assign(save, loaded.save); saveWritable.value = loaded.writable;
  Object.assign(appearance, readAppearance(notify)); isMobile.value = isMobileDevice();
  selected.value = save.records.campaign.unlocked - 1;
  await engineConnected;
  engine.restoreRiders();
  engine?.selectLevel(selected.value);
  engine?.setAppearance(); engine?.setLanguage();
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light';
  await nextTick();
  if (!error.value) await finishBoot(engine, copy.value);
});
onUnmounted(() => { preferences.dispose(); clearToast(); document.body.classList.remove('playing'); });
</script>

<template>
  <GameCanvas @ready="connected" />
  <div id="shade" aria-hidden="true"></div>
  <div id="hitflash" :style="{ opacity: hitFlash }" aria-hidden="true"></div>
  <div :hidden="wardrobeOpen" :inert="modalOpen || !ready || Boolean(error)">
    <TopBar />
    <HomeMenu />
    <GameHud />
    <GameControls />
  </div>
  <GameOverlays />
  <Wardrobe />
  <div id="toast" role="status" aria-live="polite" :class="{ show: toastData }">{{ toastMessage }}</div>
</template>
