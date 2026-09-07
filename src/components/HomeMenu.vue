<script setup>
import { inject } from 'vue';
import { LEVELS } from '../levels.js';
import RouteCard from './RouteCard.vue';

const { state, selected, save, copy, locale, t, levelName, startLevel, helpOpen } = inject('app');
</script>

<template>
  <main id="home" :hidden="state.mode !== 'home'">
    <h1>{{ copy.headline[0] }}{{ locale === 'en' ? ' ' : '' }}<br v-if="locale === 'en'"><span>{{ copy.headline[1] }}</span></h1>
    <p class="intro">{{ copy.intro[0] }}<br>{{ copy.intro[1] }}</p>
    <div class="route-caption">{{ copy.routes }}</div>
    <div id="routes" class="routes"><RouteCard v-for="(_, index) in LEVELS" :key="LEVELS[index].id" :index="index" /></div>
    <button id="start" class="primary" @click="startLevel(selected)"><span>{{ copy.start }}</span><span aria-hidden="true">↗</span></button>
    <div class="home-bottom"><span id="best">{{ save.best[selected] ? t('best', { score: save.best[selected] }) : copy.journey }}</span><button id="help-open" class="text-btn" @click="helpOpen = true">{{ copy.helpOpen }}</button></div>
  </main>
  <div id="scene-caption" class="scene-caption" :hidden="state.mode !== 'home'"><b>{{ String(selected + 1).padStart(2, '0') }} / {{ levelName(selected) }}</b><span>{{ locale === 'zh' ? LEVELS[selected].tag : LEVELS[selected].tagEn }}</span></div>
</template>
