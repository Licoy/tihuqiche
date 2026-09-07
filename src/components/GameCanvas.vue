<script setup>
import { inject, onMounted, onUnmounted, ref } from 'vue';
import { createGame } from '../game.js';
const app = inject('app'), canvas = ref(null), emit = defineEmits(['ready']);
const { copy } = app;
let engine;
onMounted(() => {
  try {
    engine = createGame(canvas.value, app);
    if (window.__PELICAN_TEST__ === true) window.__pelicanTest = engine;
    emit('ready', engine);
  } catch (error) {
    console.error('Game initialization failed', error);
    app.error.value = { title: 'errorTitle', description: 'errorHelp', detail: error.message };
  }
});
onUnmounted(() => { engine?.dispose(); if (window.__pelicanTest === engine) delete window.__pelicanTest; });
</script>

<template><canvas id="scene" ref="canvas" :aria-label="copy.canvas" tabindex="-1"></canvas></template>
