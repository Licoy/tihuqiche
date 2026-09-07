<script setup>
import { inject } from 'vue';
const { state, copy, action } = inject('app');
</script>

<template>
  <div id="controls" :hidden="state.mode !== 'playing'"><span class="keyset"><kbd>←</kbd><kbd>→</kbd>{{ copy.move }}</span><span class="keyset"><kbd>↑</kbd><kbd>{{ copy.space }}</kbd>{{ copy.jump }}</span><span class="keyset"><kbd>↓</kbd>{{ copy.duck }}</span><span class="keyset"><kbd>P</kbd>{{ copy.pauseShort }}</span></div>
  <div id="touch" class="touch-controls" :hidden="state.mode !== 'playing'"><div class="touch-pair"><button data-action="left" :aria-label="copy.left" @pointerdown.prevent="action('left')" @click="$event.detail === 0 && action('left')">←</button><button data-action="right" :aria-label="copy.right" @pointerdown.prevent="action('right')" @click="$event.detail === 0 && action('right')">→</button></div><div class="touch-pair"><button data-action="duck" class="action-touch" :aria-label="copy.duck" @pointerdown.prevent="action('duck')" @click="$event.detail === 0 && action('duck')">↓<small>{{ copy.duck }}</small></button><button data-action="jump" class="action-touch" :aria-label="copy.jump" @pointerdown.prevent="action('jump')" @click="$event.detail === 0 && action('jump')">↑<small>{{ copy.jump }}</small></button></div></div>
</template>
