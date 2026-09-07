<script setup>
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import RiderPreview from './RiderPreview.vue';
import { RIDER_OPTIONS } from '../appearance.js';
const { state, selectedMode, appearance, copy, locale, ready, wardrobeOpen, isMobile, openWardrobe,
  attachHomePreview, setHomePreviewPlayer, rotateHomePreview, setHomePreviewAuto } = inject('app');
const wide = ref(false);
const seats = computed(() => selectedMode.value === 'duo' ? [0, 1] : [0]);
const activeSeat = computed(() => selectedMode.value === 'duo' ? state.homePreviewPlayer : 0);
const showPreview = computed(() => wide.value && !isMobile.value);
const vehicleName = seat => RIDER_OPTIONS.vehicle.find(option => option.id === appearance.players[seat].vehicle)[locale.value];
let media;
const previewActive = computed(() => ready.value && showPreview.value && state.mode === 'home' && !wardrobeOpen.value);
function resize() { wide.value = media.matches; }
watch(selectedMode, mode => { if (ready.value && mode !== 'duo') setHomePreviewPlayer(0); });
onMounted(() => {
  media = window.matchMedia('(min-width: 701px) and (min-height: 501px)');
  resize(); media.addEventListener('change', resize);
});
onBeforeUnmount(() => media.removeEventListener('change', resize));
</script>

<template>
  <aside id="rider-entry" :class="{ 'home-rider-large': showPreview }" :hidden="state.mode !== 'home'" :aria-label="copy.wardrobe">
    <section class="home-rider-card">
      <div v-show="showPreview" class="home-rider-showcase">
        <header class="home-rider-heading"><h2>{{ copy.riderPreview }}</h2><div v-if="selectedMode === 'duo'" class="home-rider-seats" :aria-label="copy.previewPlayer"><button v-for="seat in seats" :key="seat" class="small-btn" :aria-pressed="activeSeat === seat" @click="setHomePreviewPlayer(seat)">P{{ seat + 1 }}</button></div></header>
        <RiderPreview id="home-rider-preview" :active="previewActive" :label="`${copy.rotateHint} · ${copy.rotateKeys}`" @attach="attachHomePreview" @rotate="rotateHomePreview" />
        <div class="home-rider-preview-tools"><p>{{ copy.rotateHint }}<small>{{ copy.rotateKeys }}</small></p><button class="small-btn" :aria-pressed="state.homePreviewAuto" @click="setHomePreviewAuto(!state.homePreviewAuto)">{{ copy.autoRotate }}</button></div>
      </div>
      <div class="home-rider-outfits">
        <div v-for="seat in seats" :key="seat" class="home-rider-outfit" :class="{ 'preview-selected': activeSeat === seat }">
          <b>{{ selectedMode === 'duo' ? `P${seat + 1} · ` : '' }}{{ appearance.players[seat].identity.toUpperCase() }} · {{ vehicleName(seat) }}</b>
          <button :id="`wardrobe-open-${seat}`" :class="showPreview ? 'primary' : 'small-btn'" @click="openWardrobe(seat)">{{ copy.wardrobe }}{{ selectedMode === 'duo' ? ` · P${seat + 1}` : '' }}</button>
        </div>
      </div>
    </section>
  </aside>
</template>
