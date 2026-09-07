<script setup>
import { computed, inject } from 'vue';
import { LEVELS } from '../levels.js';

const { state, copy, t, levelName } = inject('app');
const active = computed(() => state.mode !== 'home');
const progress = computed(() => Math.min(100, state.distance / LEVELS[state.level].length * 100));
</script>

<template>
  <div id="hud" :hidden="!active">
    <div class="stage-panel"><div class="stage-top"><b id="level-name">{{ String(state.level + 1).padStart(2, '0') }} {{ levelName(state.level) }}</b><span id="stage-count">{{ state.level + 1 }} / {{ LEVELS.length }}</span></div><div class="progress" role="progressbar" :aria-label="levelName(state.level)" :aria-valuenow="Math.floor(state.distance)" :aria-valuemax="LEVELS[state.level].length" aria-valuemin="0"><div id="progress" :style="{ width: `${progress}%` }"></div></div><div class="distance"><span id="distance">{{ Math.floor(state.distance) }} m</span><span id="destination">{{ LEVELS[state.level].length }} m</span></div></div>
    <div class="counters"><div class="fish-counter"><i class="fish-icon" aria-hidden="true"></i><span id="fish" :aria-label="`${copy.fishStat}: ${state.fish}`">{{ state.fish }}</span></div><div id="hearts" class="hearts" :aria-label="t('hp', { hp: state.hp })">{{ '♥'.repeat(state.hp) }}<span class="empty-heart" aria-hidden="true">{{ '♡'.repeat(3 - state.hp) }}</span></div><div id="speed" class="speed">{{ Math.round(state.speed * 3.6) }} KM/H</div></div>
  </div>
  <div id="shield" class="shield-indicator" :hidden="!active || !state.shield">{{ copy.shield }}</div>
</template>
