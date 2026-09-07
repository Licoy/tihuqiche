<script setup>
import { computed, inject, ref, watch } from 'vue';
import { RIDER_OPTIONS, RIDER_COLORS } from '../appearance.js';
import ModalFrame from './ModalFrame.vue';
import RiderPreview from './RiderPreview.vue';
import OutfitThumb from './OutfitThumb.vue';
const { copy, locale, wardrobeOpen, wardrobeSeat, wardrobeDraft, cancelWardrobe, saveWardrobe, previewRider, ready, wardrobeScene, wardrobeAuto, attachWardrobePreview, rotateWardrobePreview } = inject('app');
const category = ref('identity'), failed = ref(false);
const previewActive = computed(() => ready.value && wardrobeOpen.value && !wardrobeScene.value);
const colourCategories = ['hat', 'scarf', 'glasses', 'clothes', 'vehicle'];
watch(wardrobeOpen, open => { if (open) failed.value = false; });
function choose(key, value) {
  wardrobeDraft.value = { ...wardrobeDraft.value, [key]: value };
  previewRider({ playerId: wardrobeSeat.value, config: wardrobeDraft.value });
}
function save() { failed.value = !saveWardrobe(); }
</script>
<template>
  <ModalFrame id="wardrobe" class="wardrobe-overlay" :open="wardrobeOpen" labelledby="wardrobe-title" :return-focus-id="`wardrobe-open-${wardrobeSeat}`" @escape="cancelWardrobe">
    <div v-if="wardrobeDraft" class="panel wardrobe-panel">
      <div class="panel-tag">P{{ wardrobeSeat + 1 }} · {{ wardrobeDraft.identity.toUpperCase() }}</div>
      <h2 id="wardrobe-title">{{ copy.wardrobeTitle }}</h2><p>{{ copy.wardrobeNote }}</p>
      <div class="wardrobe-tabs" :aria-label="copy.wardrobe"><button v-for="(_, key) in RIDER_OPTIONS" :key="key" :aria-pressed="category === key" @click="category = key"><OutfitThumb :category="key" small /><span>{{ copy.categories[key] }}</span></button></div>
      <fieldset class="wardrobe-options"><legend>{{ copy.categories[category] }}</legend><button v-for="option in RIDER_OPTIONS[category]" :key="option.id" :aria-pressed="wardrobeDraft[category] === option.id" @click="choose(category, option.id)"><OutfitThumb :category="category" :option="option.id" /><span>{{ option[locale] }}</span></button></fieldset>
      <fieldset v-if="colourCategories.includes(category)" class="wardrobe-colours"><legend>{{ copy.color }}</legend><button v-for="colour in RIDER_COLORS" :key="colour.id" :aria-pressed="wardrobeDraft[`${category}Color`] === colour.id" @click="choose(`${category}Color`, colour.id)"><i :style="{ backgroundColor: colour.hex }" aria-hidden="true"></i>{{ colour[locale] }}</button></fieldset>

      <p v-if="failed" role="alert" class="save-error">{{ copy.appearanceSaveError }}</p>
      <div class="wardrobe-footer"><button id="wardrobe-scene" class="secondary" :aria-pressed="wardrobeScene" @click="wardrobeScene = !wardrobeScene">{{ wardrobeScene ? copy.backToModel : copy.previewEffect }}</button><button id="wardrobe-save" class="primary" @click="save">{{ copy.saveAppearance }}</button></div><button id="wardrobe-cancel" class="secondary" @click="cancelWardrobe">{{ copy.cancel }}</button>
    </div>
    <section v-show="!wardrobeScene" class="wardrobe-model" :aria-label="copy.riderPreview">
      <RiderPreview id="wardrobe-rider-preview" :active="previewActive" :resume-after="10000" :label="`${copy.rotateHint} · ${copy.rotateKeys}`" @attach="attachWardrobePreview" @rotate="rotateWardrobePreview" @auto="wardrobeAuto = $event" />
      <div class="home-rider-preview-tools"><p>{{ copy.rotateHint }}<small>{{ copy.rotateKeys }}</small></p></div>
    </section>
  </ModalFrame>
</template>
