<script setup>
import { computed, inject } from 'vue';
const { state, copy, action, isMobile } = inject('app');
const player = computed(() => state.players[0]);
function act(type) { action({ playerId: 0, type }); }
</script>
<template>
  <div id="controls" :hidden="state.mode !== 'playing' || isMobile"><template v-if="state.gameMode === 'duo'">{{ copy.duoKeys }}</template><template v-else><span class="keyset"><kbd>← →</kbd>{{ copy.move }}</span><span class="keyset"><kbd>↑ W</kbd>{{ copy.jump }}</span><span class="keyset"><kbd>↓ S</kbd>{{ copy.duck }}</span><span class="keyset"><kbd>{{ copy.space }}</kbd>{{ copy.boost }}</span><span v-if="state.gameMode === 'items'" class="keyset"><kbd>E</kbd>{{ copy.useItem }}</span></template><span class="keyset"><kbd>P</kbd>{{ copy.pauseShort }}</span></div>
  <div v-if="player" id="touch" class="touch-controls" :hidden="state.mode !== 'playing' || state.gameMode === 'duo' || !isMobile">
    <div class="touch-pair"><button v-for="type in ['left', 'right']" :key="type" :data-action="type" :aria-label="copy[type]" @pointerdown.prevent="act(type)" @click="$event.detail === 0 && act(type)">{{ type === 'left' ? '←' : '→' }}</button></div>
    <div class="touch-pair touch-actions"><button data-action="boost" class="action-touch" :disabled="player.fishBalance < 10 || player.boostRemaining > 0" @pointerdown.prevent="act('boost')" @click="$event.detail === 0 && act('boost')">»<small>{{ copy.boost }}</small></button><button v-if="state.gameMode === 'items'" data-action="item" class="action-touch" :disabled="!player.itemSlot || (player.itemSlot === 'shield' && player.shield)" :aria-label="player.itemSlot ? copy.items[player.itemSlot] : copy.emptySlot" @pointerdown.prevent="act('item')" @click="$event.detail === 0 && act('item')">✦<small>{{ copy.useItem }}</small></button><button v-for="type in ['duck', 'jump']" :key="type" :data-action="type" class="action-touch" :aria-label="copy[type]" @pointerdown.prevent="act(type)" @click="$event.detail === 0 && act(type)">{{ type === 'jump' ? '↑' : '↓' }}<small>{{ copy[type] }}</small></button></div>
  </div>
</template>
