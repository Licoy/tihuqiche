<script setup>
import { inject } from 'vue';
import { SOUND_STYLES } from '../game-settings.js';
import ModalFrame from './ModalFrame.vue';
const { copy, settings, settingsError, settingsOpen, closeSettings, setSetting, previewSound } = inject('app');
const visualSettings = ['assistMarkers', 'speedLines', 'ambientLife', 'shadows'];
</script>

<template>
  <ModalFrame id="settings" class="settings-overlay" :open="settingsOpen" labelledby="settings-title" return-focus-id="settings-open" @escape="closeSettings">
    <div class="panel settings-panel">
      <div class="settings-heading"><h2 id="settings-title">{{ copy.settingsTitle }}</h2><button id="settings-close" class="small-btn" :aria-label="copy.settingsClose" @click="closeSettings">×</button></div>
      <p class="settings-note">{{ copy.settingsNote }}</p>
      <div class="settings-columns">
      <fieldset class="settings-group"><legend>{{ copy.settingsAudio }}</legend>
        <label class="settings-switch" for="settings-sound-enabled"><span><strong>{{ copy.settingsSound }}</strong><small>{{ copy.settingsSoundNote }}</small></span><input id="settings-sound-enabled" type="checkbox" :checked="settings.soundEnabled" @change="setSetting('soundEnabled', $event.target.checked)"></label>
        <label class="settings-label" for="settings-sound-style">{{ copy.settingsStyle }}</label>
        <div class="settings-sound-style"><select id="settings-sound-style" :value="settings.soundStyle" @change="setSetting('soundStyle', $event.target.value)"><option v-for="style in SOUND_STYLES" :key="style" :value="style">{{ copy.soundStyles[style] }}</option></select><button id="settings-preview" class="secondary" :disabled="!settings.soundEnabled || settings.volume === 0" @click="previewSound">{{ copy.settingsPreview }}</button></div>
        <label class="settings-volume" for="settings-volume"><span>{{ copy.settingsVolume }}</span><output for="settings-volume">{{ Math.round(settings.volume * 100) }}%</output></label>
        <input id="settings-volume" type="range" min="0" max="1" step="0.05" :value="settings.volume" @input="setSetting('volume', Number($event.target.value))">
      </fieldset>
      <fieldset class="settings-group"><legend>{{ copy.settingsVisual }}</legend>
        <label v-for="key in visualSettings" :key="key" class="settings-switch" :for="`settings-${key}`"><span><strong>{{ copy[key] }}</strong><small>{{ copy[`${key}Note`] }}</small></span><input :id="`settings-${key}`" type="checkbox" :checked="settings[key]" @change="setSetting(key, $event.target.checked)"></label>
      </fieldset>
      </div>
      <p v-if="settingsError" class="settings-error" role="alert">{{ copy[settingsError] }}</p>
      <button id="settings-done" class="primary" @click="closeSettings">{{ copy.settingsDone }}</button>
    </div>
  </ModalFrame>
</template>

<style src="../styles/settings.css"></style>
