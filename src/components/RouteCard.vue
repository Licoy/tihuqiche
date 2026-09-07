<script setup>
import { computed, inject } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faUmbrellaBeach, faTree, faLandmark, faSun, faSkull, faCity, faLock } from '@fortawesome/free-solid-svg-icons';
import { LEVELS } from '../levels.js';

const props = defineProps({ index: { type: Number, required: true } });
const { selected, save, copy, locale, levelName, selectLevel } = inject('app');
const icons = [faUmbrellaBeach, faTree, faLandmark, faSun, faSkull, faCity];
const level = computed(() => LEVELS[props.index]);
const locked = computed(() => props.index >= save.unlocked);
const label = computed(() => `${levelName(props.index)} · ${locked.value ? copy.value.unlockHint : (locale.value === 'zh' ? level.value.tag : level.value.tagEn)}`);
</script>

<template>
  <button class="route" :class="[level.id, { active: selected === index, locked }]" :disabled="locked" :aria-pressed="selected === index" :aria-label="label" :title="label" :data-level="index" @click="selectLevel(index)">
    <span class="route-art" aria-hidden="true"><span class="route-number">{{ String(index + 1).padStart(2, '0') }}</span><FontAwesomeIcon :icon="icons[index]" /><span class="route-horizon"></span></span>
    <span class="route-copy"><span class="route-name">{{ levelName(index) }}</span><span class="route-state"><FontAwesomeIcon v-if="locked" :icon="faLock" />{{ locked ? copy.locked : save.stars[index] ? '★'.repeat(save.stars[index]) : copy.ready }}</span></span>
  </button>
</template>
