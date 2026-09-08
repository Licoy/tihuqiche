<script setup>
import { computed, inject } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faUmbrellaBeach, faTree, faLandmark, faSun, faSkull, faCity, faToriiGate, faTowerObservation, faClock, faBuilding, faSailboat, faBuildingColumns, faLock, faStar } from '@fortawesome/free-solid-svg-icons';
import { LEVELS } from '../levels.js';

const props = defineProps({ index: { type: Number, required: true } });
const { selected, selectedMode, save, copy, locale, levelName, selectLevel } = inject('app');
const icons = [faUmbrellaBeach, faTree, faLandmark, faSun, faSkull, faCity, faToriiGate, faTowerObservation, faClock, faBuilding, faSailboat, faBuildingColumns];
const level = computed(() => LEVELS[props.index]);
const locked = computed(() => props.index >= save.records[selectedMode.value].unlocked);
const label = computed(() => `${levelName(props.index)} · ${locked.value ? copy.value.unlockHint : (locale.value === 'zh' ? level.value.tag : level.value.tagEn)}`);
</script>

<template>
  <button class="route" :style="index >= 6 ? { '--route-sky': level.sky, '--route-ground': level.sea, '--route-icon': level.road } : undefined" :class="[level.id, { active: selected === index, locked }]" :disabled="locked" :aria-pressed="selected === index" :aria-label="label" :title="label" :data-level="index" @click="selectLevel(index)">
    <span class="route-art" aria-hidden="true"><span class="route-number">{{ String(index + 1).padStart(2, '0') }}</span><FontAwesomeIcon :icon="icons[index]" /><span class="route-horizon"></span></span>
    <span class="route-copy"><span class="route-name">{{ levelName(index) }}</span><span class="route-state"><FontAwesomeIcon v-if="locked" :icon="faLock" /><template v-if="locked">{{ copy.locked }}</template><span v-else-if="save.records[selectedMode].stars[index]" :aria-label="`${save.records[selectedMode].stars[index]} / 3`"><FontAwesomeIcon v-for="star in save.records[selectedMode].stars[index]" :key="star" :icon="faStar" aria-hidden="true" /></span><template v-else>{{ copy.ready }}</template></span></span>
  </button>
</template>
