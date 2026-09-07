<script setup>
import { computed, inject } from 'vue';
import { LEVELS } from '../levels.js';
const { state, copy, t, levelName, startLevel, goHome, resumeGame, helpOpen } = inject('app');
const won = computed(() => state.mode === 'won');
const last = computed(() => state.level === LEVELS.length - 1);
const resultKey = computed(() => won.value ? last.value ? 'all' : 'won' : 'lost');
const stars = computed(() => won.value ? 1 + Number(state.hp === 3) + Number(state.fish >= 25) : 0);
const score = computed(() => Math.floor(state.distance) + state.fish * 25 + (won.value ? state.hp * 150 : 0));
const description = computed(() => won.value && !last.value ? t('wonDesc', { name: levelName(state.level + 1) }) : copy.value[`${resultKey.value}Desc`]);
function next() {
  if (won.value && last.value) goHome();
  else startLevel(won.value ? state.level + 1 : state.level);
}
</script>

<template>
  <section id="pause-screen" class="overlay" :hidden="state.mode !== 'paused'" role="dialog" aria-modal="true" aria-labelledby="pause-title"><div class="panel"><div class="panel-tag">{{ copy.pauseTag }}</div><h2 id="pause-title">{{ copy.pauseTitle }}</h2><p>{{ copy.pauseDesc }}</p><button id="resume" class="primary" @click="resumeGame"><span>{{ copy.resume }}</span><span aria-hidden="true">→</span></button><button id="restart" class="secondary" @click="startLevel(state.level)">{{ copy.restart }}</button><button id="quit" class="secondary" @click="goHome">{{ copy.home }}</button></div></section>
  <section id="result" class="overlay" :hidden="!['won', 'lost'].includes(state.mode)" role="dialog" aria-modal="true" aria-labelledby="result-title"><div class="panel"><div id="result-eyebrow" class="panel-tag">{{ copy[`${resultKey}Tag`] }}</div><div id="stars" class="stars">{{ '★'.repeat(stars) }}<span class="empty-star">{{ '☆'.repeat(3 - stars) }}</span></div><h2 id="result-title">{{ copy[`${resultKey}Title`] }}</h2><p id="result-desc">{{ description }}</p><div class="stats"><div><b id="result-distance">{{ Math.floor(state.distance) }}</b><span>{{ copy.rideStat }}</span></div><div><b id="result-fish">{{ state.fish }}</b><span>{{ copy.fishStat }}</span></div><div><b id="result-score">{{ score }}</b><span>{{ copy.scoreStat }}</span></div></div><button id="next" class="primary" @click="next"><span id="next-label">{{ won ? last ? copy.again : copy.next : copy.retry }}</span><span aria-hidden="true">→</span></button><button id="result-home" class="secondary" @click="goHome">{{ copy.home }}</button></div></section>
  <section id="help" class="overlay" :hidden="!helpOpen" role="dialog" aria-modal="true" aria-labelledby="help-title"><div class="panel"><div class="panel-tag">{{ copy.helpTag }}</div><h2 id="help-title">{{ copy.helpTitle }}</h2><div v-for="row in copy.helpRows" :key="row[0]" class="help-row"><strong>{{ row[0] }}</strong><span>{{ row[1] }}</span></div><p class="help-note">{{ copy.helpNote }}</p><button id="help-close" class="primary" @click="helpOpen = false"><span>{{ copy.understood }}</span><span aria-hidden="true">✓</span></button></div></section>
</template>
