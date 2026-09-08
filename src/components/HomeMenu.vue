<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { computed, inject } from 'vue';
import { LEVELS } from '../levels.js';
import HomeRiderCard from './HomeRiderCard.vue';
import RouteCard from './RouteCard.vue';
const { state, selected, selectedMode, save, copy, locale, t, startRun, selectMode, helpOpen, isMobile, notify } = inject('app');
const best = computed(() => selectedMode.value === 'endless' ? save.records.endless.bestScore : save.records[selectedMode.value].best[selected.value]);
function start() {
  if (selectedMode.value === 'duo' && isMobile.value) { notify('mobileDuo'); return; }
  startRun({ gameMode: selectedMode.value, levelIndex: selected.value });
}
</script>
<template>
  <main id="home" :hidden="state.mode !== 'home'">
    <div class="home-intro"><h1>{{ copy.headline[0] }}{{ locale === 'en' ? ' ' : '' }}<br v-if="locale === 'en'"><span>{{ copy.headline[1] }}</span></h1>
    <p class="intro">{{ copy.intro[0] }}<br>{{ copy.intro[1] }}</p></div>
    <div class="mode-picker" :aria-label="copy.modeLabel"><button v-for="(label, mode) in copy.modes" :key="mode" :data-mode="mode" :aria-pressed="selectedMode === mode" @click="selectMode(mode)">{{ label }}</button></div>
    <p class="mode-note">{{ copy.modeNotes[selectedMode] }}</p>
    <p v-if="selectedMode === 'duo'" class="duo-instructions">{{ isMobile ? copy.mobileDuo : copy.duoKeys }}</p>
    <template v-if="selectedMode !== 'endless'"><div class="route-caption">{{ copy.routes }}</div><div id="routes" class="routes"><RouteCard v-for="(_, index) in LEVELS" :key="LEVELS[index].id" :index="index" /></div></template>
    <p v-else class="endless-route">{{ copy.endlessRoute }}</p>
    <button id="start" class="primary" @click="start"><span>{{ copy.start }}</span><span aria-hidden="true"><FontAwesomeIcon :icon="faArrowRight" /></span></button>
    <div class="home-bottom"><span id="best">{{ best ? t(selectedMode === 'endless' ? 'endlessBest' : 'best', { score: best }) : copy.journey }}</span><button id="help-open" class="text-btn" @click="helpOpen = true">{{ copy.helpOpen }}</button></div>
  </main>
  <HomeRiderCard />
</template>
