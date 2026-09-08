<script setup>
import { computed, inject } from 'vue';
const { state, settings } = inject('app');
const active = computed(() => settings.speedLines && state.mode === 'playing'
  && state.players.some(player => player.status === 'running' && player.boosting));
const rays = Array.from({ length: 16 }, (_, index) => ({
  '--rise': `${(index - 7.5) * 4.8}vh`,
  '--angle': `${(7.5 - index) * 3.5}deg`,
  '--delay': `${-index * .073}s`,
  '--duration': `${.46 + index % 4 * .065}s`,
}));
</script>

<template>
  <div id="speed-wind" :hidden="!active" aria-hidden="true">
    <div v-for="side in ['left', 'right']" :key="side" class="wind-side" :class="`wind-${side}`">
      <i v-for="(style, index) in rays" :key="index" class="wind-ray" :style="style"></i>
    </div>
  </div>
</template>

<style>
#speed-wind { position: fixed; z-index: 1; inset: 0; overflow: hidden; pointer-events: none; mask-image: linear-gradient(90deg, #000 0 22%, transparent 38% 62%, #000 78% 100%); }
.wind-side { position: absolute; inset: 0 auto 0 0; width: 50%; overflow: hidden; }
.wind-right { left: 50%; transform: scaleX(-1); }
.wind-ray { position: absolute; left: 90%; top: 46%; width: clamp(90px, 17vw, 300px); height: 3px; border-radius: 50%; background: linear-gradient(90deg, transparent, #fffbe9); transform-origin: right center; rotate: var(--angle); animation: wind-pass var(--duration) var(--delay) linear infinite; }
.wind-ray:nth-child(3n) { height: 4px; }
#speed-wind[hidden] .wind-ray { animation: none; }
@keyframes wind-pass {
  0% { opacity: 0; transform: translate3d(0, 0, 0) scaleX(.25); }
  25% { opacity: .95; }
  80% { opacity: .8; }
  100% { opacity: 0; transform: translate3d(-52vw, var(--rise), 0) scaleX(1.8); }
}
@media (prefers-reduced-motion: reduce) { #speed-wind { display: none; } }
</style>
