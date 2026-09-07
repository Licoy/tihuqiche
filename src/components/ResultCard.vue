<script setup>
import { inject } from 'vue';
import { SHARE_QR } from '../share-qr.js';
import { RIDER_OPTIONS } from '../appearance.js';
import logo from '../assets/pelican-mark.png';
const props = defineProps({ result: { type: Object, required: true }, title: { type: String, required: true } });
const { copy, locale, levelName } = inject('app');
function outfit(player) { return ['identity', 'skin', 'vehicle'].map(key => RIDER_OPTIONS[key].find(option => option.id === player.appearance[key])[locale.value]).join(' · '); }
</script>
<template>
  <article class="result-card">
    <div class="result-brand"><img :src="logo" :alt="copy.logo" width="40" height="40"><b>{{ copy.brand }}</b><span v-if="result.isNewRecord" class="record-label">{{ copy.newRecord }}</span></div>
    <div id="result-eyebrow" class="panel-tag">{{ copy.modes[result.gameMode] }}<template v-if="result.levelIndex !== null"> · {{ levelName(result.levelIndex) }}</template></div>
    <h2 id="result-title">{{ title }}</h2>
    <div v-if="result.stars !== null" id="stars" class="stars" :aria-label="`${result.stars} / 3`">{{ '★'.repeat(result.stars) }}<span class="empty-star">{{ '☆'.repeat(3 - result.stars) }}</span></div>
    <div class="result-main-score"><b id="result-score">{{ result.score }}</b><span>{{ result.gameMode === 'duo' ? copy.teamScore : copy.totalScore }}</span></div>
    <div class="stats"><div><b id="result-distance">{{ Math.floor(result.distance) }}</b><span>{{ copy.rideStat }}</span></div><div><b id="result-fish">{{ result.fishCollected }}</b><span>{{ copy.fishStat }}</span></div></div>
    <div class="result-riders"><div v-for="player in result.players" :key="player.id"><b v-if="result.gameMode === 'duo'">P{{ player.id + 1 }} · {{ player.score }} · {{ copy.statuses[player.status] }}</b><span>{{ outfit(player) }}</span></div></div>
    <div class="result-share"><div class="share-qr" role="img" :aria-label="copy.qrLabel" v-html="SHARE_QR[locale]"></div><div><b>tihuqiche.com</b><p>{{ copy.screenshot }}</p></div></div>
  </article>
</template>
