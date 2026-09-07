<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faArrowRight, faCheck } from '@fortawesome/free-solid-svg-icons';
import { computed, inject, ref, watch } from 'vue';
import { LEVELS } from '../levels.js';
import { buildShareText, copyShare, shareUrl } from '../share.js';
import ModalFrame from './ModalFrame.vue';
import ResultCard from './ResultCard.vue';
const { state, copy, locale, t, levelName, startRun, goHome, resumeGame, endRun, helpOpen, wardrobeOpen } = inject('app');
const resultOpen = computed(() => ['won', 'lost', 'ended'].includes(state.mode));
const last = computed(() => state.level === LEVELS.length - 1);
const resultKey = computed(() => state.mode === 'ended' ? 'ended' : state.mode === 'won' ? last.value ? 'all' : 'won' : 'lost');
const description = computed(() => state.mode === 'won' && !last.value ? t('wonDesc', { name: levelName(state.level + 1) }) : copy.value[`${resultKey.value}Desc`]);
const manual = ref(''), copyStatus = ref(''), copying = ref(false);
watch(() => state.result, () => { manual.value = ''; copyStatus.value = ''; copying.value = false; });
function restart() { startRun({ gameMode: state.gameMode, levelIndex: state.level, seed: state.seed }); }
function next() {
  if (state.mode !== 'won') { restart(); return; }
  if (last.value) goHome();
  else startRun({ gameMode: state.gameMode, levelIndex: state.level + 1 });
}
async function share(kind) {
  const result = state.result;
  const text = kind === 'link' ? shareUrl(locale.value) : buildShareText(result, locale.value);
  copying.value = true; manual.value = ''; copyStatus.value = '';
  try { await copyShare(text); if (state.result === result && resultOpen.value) copyStatus.value = 'copied'; }
  catch (error) { console.warn('Share copy failed', error); if (state.result === result && resultOpen.value) { copyStatus.value = 'copyError'; manual.value = text; } }
  finally { if (state.result === result) copying.value = false; }
}
</script>
<template>
  <ModalFrame id="pause-screen" :open="state.mode === 'paused' && !helpOpen && !wardrobeOpen" labelledby="pause-title" @escape="resumeGame"><div class="panel"><div class="panel-tag">{{ copy.pauseTag }}</div><h2 id="pause-title">{{ copy.pauseTitle }}</h2><p>{{ copy.pauseDesc }}</p><button id="resume" class="primary" @click="resumeGame"><span>{{ copy.resume }}</span><span aria-hidden="true"><FontAwesomeIcon :icon="faArrowRight" /></span></button><button id="restart" class="secondary" @click="restart">{{ copy.restart }}</button><button v-if="state.gameMode === 'endless'" id="end-run" class="secondary" @click="endRun">{{ copy.endRun }}</button><button class="secondary" @click="helpOpen = true">{{ copy.helpOpen }}</button><button id="quit" class="secondary" @click="goHome">{{ copy.home }}</button></div></ModalFrame>
  <ModalFrame id="result" :open="resultOpen && !helpOpen && !wardrobeOpen" labelledby="result-title"><div v-if="state.result" class="panel result-panel"><ResultCard :result="state.result" :title="copy[`${resultKey}Title`]" /><p id="result-desc">{{ description }}</p><p v-if="state.recordSaved === false" class="save-error" role="status">{{ copy.notSaved }}</p><div class="share-actions"><button id="copy-challenge" class="secondary" :disabled="copying" @click="share('text')">{{ copy.copyText }}</button><button id="copy-link" class="secondary" :disabled="copying" @click="share('link')">{{ copy.copyLink }}</button></div><p v-if="copyStatus" role="status" class="copy-status">{{ copy[copyStatus] }}</p><label v-if="manual" class="manual-copy">{{ copy.manualCopy }}<textarea readonly :value="manual" @focus="$event.target.select()"></textarea></label><button id="next" class="primary" @click="next"><span id="next-label">{{ state.mode === 'won' ? last ? copy.again : copy.next : copy.retry }}</span><span aria-hidden="true"><FontAwesomeIcon :icon="faArrowRight" /></span></button><button id="result-home" class="secondary" @click="goHome">{{ copy.home }}</button></div></ModalFrame>
  <ModalFrame id="help" :open="helpOpen" labelledby="help-title" @escape="helpOpen = false"><div class="panel"><div class="panel-tag">{{ copy.helpTag }}</div><h2 id="help-title">{{ copy.helpTitle }}</h2><div v-for="row in copy.helpRows" :key="row[0]" class="help-row"><strong>{{ row[0] }}</strong><span>{{ row[1] }}</span></div><p class="help-note">{{ copy.helpNote }}</p><button id="help-close" class="primary" @click="helpOpen = false"><span>{{ copy.understood }}</span><span aria-hidden="true"><FontAwesomeIcon :icon="faCheck" /></span></button></div></ModalFrame>
</template>
