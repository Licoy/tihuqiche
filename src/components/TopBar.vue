<script setup>
import { inject } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { faVolumeHigh, faVolumeXmark, faSun, faMoon, faDesktop, faPause } from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/pelican-mark.png?inline';

const { state, copy, theme, locale, soundEnabled, setTheme, setLocale, toggleSound, pauseGame } = inject('app');
const themeIcons = { system: faDesktop, light: faSun, dark: faMoon };
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <img class="brand-mark" :src="logo" :alt="copy.logo" width="60" height="60">
      <div><div class="brand-name">{{ copy.brand }}</div><div class="brand-sub">tihuqiche.com</div></div>
    </div>
    <nav class="top-actions" :aria-label="copy.brand">
      <a id="github" class="small-btn github-link" :hidden="state.mode !== 'home'" href="https://github.com/Licoy/tihuqiche" target="_blank" rel="noopener noreferrer" :aria-label="copy.github" :title="copy.github">
        <FontAwesomeIcon :icon="faGithub" /><span>GitHub</span>
      </a>
      <button id="sound" class="small-btn icon-btn" :aria-pressed="soundEnabled" :aria-label="soundEnabled ? copy.soundOn : copy.soundOff" :title="soundEnabled ? copy.soundOn : copy.soundOff" @click="toggleSound">
        <FontAwesomeIcon :icon="soundEnabled ? faVolumeHigh : faVolumeXmark" />
      </button>
      <label class="small-btn theme-control" :title="`${copy.theme}: ${copy[theme]}`">
        <FontAwesomeIcon :icon="themeIcons[theme]" />
        <select id="theme" :value="theme" :aria-label="copy.theme" @change="setTheme($event.target.value)">
          <option value="system">{{ copy.system }}</option><option value="light">{{ copy.light }}</option><option value="dark">{{ copy.dark }}</option>
        </select>
      </label>
      <button id="language" class="small-btn language-btn" :aria-label="copy.switchLanguage" :title="copy.switchLanguage" @click="setLocale(locale === 'zh' ? 'en' : 'zh')">{{ locale === 'zh' ? 'EN' : '中' }}</button>
      <button id="pause" class="small-btn icon-btn" :hidden="state.mode !== 'playing'" :aria-label="copy.pause" :title="copy.pause" @click="pauseGame"><FontAwesomeIcon :icon="faPause" /></button>
    </nav>
  </header>
</template>
