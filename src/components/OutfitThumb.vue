<script setup>
import { computed } from 'vue';
import { OUTFIT_THUMBNAILS } from '../outfit-thumbnails.js';
const props = defineProps({ category: { type: String, required: true }, option: String, small: Boolean });
const src = computed(() => props.option ? OUTFIT_THUMBNAILS.options[props.category][props.option] : OUTFIT_THUMBNAILS.category[props.category]);
</script>

<template><img class="outfit-thumb" :class="{ 'outfit-thumb-small': small }" :src="src" :width="small ? 32 : 56" :height="small ? 32 : 56" alt="" aria-hidden="true" draggable="false"></template>
