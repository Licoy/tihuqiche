<script setup>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faFish, faHeart, faInfinity } from '@fortawesome/free-solid-svg-icons';
import { computed, inject } from 'vue';
import { LEVELS } from '../levels.js';
import { BOOST_FISH_PER_SECOND } from '../rules.js';
const { state, copy, t, levelName, action } = inject('app');
const active = computed(() => state.mode !== 'home');
const endless = computed(() => state.gameMode === 'endless');
const progress = computed(() => endless.value ? 0 : Math.min(100, state.distance / LEVELS[state.level].length * 100));
</script>
<template>
  <div id="hud" :hidden="!active" :class="{ 'duo-hud': state.gameMode === 'duo' }">
    <div class="stage-panel"><div class="stage-top"><b id="level-name">{{ copy.modes[state.gameMode] }}<template v-if="!endless"> · {{ levelName(state.level) }}</template></b><span id="stage-count"><span v-if="endless" :aria-label="copy.modes.endless" role="img"><FontAwesomeIcon :icon="faInfinity" aria-hidden="true" /></span><template v-else>{{ state.level + 1 }} / {{ LEVELS.length }}</template></span></div><div v-if="!endless" class="progress" role="progressbar" :aria-label="levelName(state.level)" :aria-valuenow="Math.floor(state.distance)" :aria-valuemax="LEVELS[state.level].length" aria-valuemin="0"><div id="progress" :style="{ width: `${progress}%` }"></div></div><div class="distance"><span id="distance">{{ Math.floor(state.distance) }} m</span><span id="destination"><span v-if="endless" :aria-label="copy.modes.endless" role="img"><FontAwesomeIcon :icon="faInfinity" aria-hidden="true" /></span><template v-else>{{ LEVELS[state.level].length }} m</template></span></div></div>
    <div class="player-counters"><section v-for="player in state.players" :key="player.id" class="counters" :data-player="player.id">
      <b v-if="state.gameMode === 'duo'">P{{ player.id + 1 }} · {{ copy.statuses[player.status] }}</b>
      <div class="fish-counter"><FontAwesomeIcon :icon="faFish" class="fish-icon" aria-hidden="true" /><span :id="player.id === 0 ? 'fish' : 'fish-p2'" :aria-label="`${copy.fishStat}: ${player.fishCollected}`">{{ player.fishCollected }}</span></div>
      <div :id="player.id === 0 ? 'hearts' : 'hearts-p2'" class="hearts" :aria-label="t('hp', { hp: player.hp })"><FontAwesomeIcon v-for="heart in 3" :key="heart" :icon="faHeart" :class="{ 'empty-heart': heart > player.hp }" aria-hidden="true" /></div>
      <div :id="player.id === 0 ? 'speed' : 'speed-p2'" class="speed">{{ Math.round(player.speed * 3.6) }} KM/H · {{ Math.floor(player.distance) }} m</div>
      <div v-if="player.shield" :id="player.id === 0 ? 'shield' : 'shield-p2'" class="player-effect">{{ copy.shield }}</div><div v-if="player.catchupBonus > 0" class="player-effect">{{ copy.catchup }}</div>
      <button class="boost-control" :data-boost-player="player.id" :disabled="state.mode !== 'playing' || player.status !== 'running' || !player.boosting && player.fishBalance === 0" :title="copy.chargeNote" :aria-pressed="player.boosting" @click="action({ playerId: player.id, type: 'boost' })"><span>{{ player.boosting ? copy.stopBoost : copy.boost }} · {{ player.fishBalance }}</span><small>{{ t('boostFuel', { seconds: Math.max(0, player.fishBalance / BOOST_FISH_PER_SECOND - player.boostElapsed).toFixed(1) }) }}</small></button>
      <button v-if="state.gameMode === 'items'" class="item-control" :disabled="state.mode !== 'playing' || !player.itemSlot || (player.itemSlot === 'shield' && player.shield)" @click="action({ playerId: player.id, type: 'item' })">{{ player.itemSlot ? copy.items[player.itemSlot] : copy.emptySlot }} <kbd>E</kbd></button>
      <div v-if="player.magnetRemaining > 0" class="player-effect">{{ copy.items.magnet }} {{ Math.ceil(player.magnetRemaining) }}s</div><div v-if="player.doubleRemaining > 0" class="player-effect">{{ copy.items.double }} {{ Math.ceil(player.doubleRemaining) }}s</div>
    </section></div>
  </div>
  <template v-if="active && state.gameMode === 'duo'"><span v-for="marker in state.markers" :key="marker.id" class="rider-marker" :hidden="!marker.visible" :style="{ left: `${marker.x}px`, top: `${marker.y}px` }">P{{ marker.id + 1 }}</span></template>
</template>
