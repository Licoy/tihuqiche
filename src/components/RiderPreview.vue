<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { createPreviewAutoResume } from '../preview-auto-resume.js';
const props = defineProps({ id: { type: String, required: true }, active: Boolean, label: String, resumeAfter: { type: Number, default: 0 } });
const emit = defineEmits(['attach', 'rotate', 'auto']);
const canvas = ref(null);
const autoResume = props.resumeAfter > 0 ? createPreviewAutoResume({ delay: props.resumeAfter, onAuto: value => emit('auto', value) }) : null;
let dragging = null;
function startDrag(event) {
  if (!props.active || event.button !== 0 || dragging) return;
  event.preventDefault(); event.currentTarget.focus();
  autoResume?.pause();
  dragging = { id: event.pointerId, x: event.clientX, target: event.currentTarget };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function drag(event) {
  if (!dragging || event.pointerId !== dragging.id) return;
  emit('rotate', (event.clientX - dragging.x) * .01); dragging.x = event.clientX;
}
function endDrag(event) {
  if (!dragging || (event && event.pointerId !== dragging.id)) return;
  const { target, id } = dragging; dragging = null;
  if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
  if (props.active) autoResume?.idle();
}
function keyRotate(event) {
  if (!props.active) return;
  if (['ArrowLeft', 'ArrowRight'].includes(event.code)) {
    event.preventDefault(); event.stopPropagation(); if (event.type === 'keyup') return; emit('rotate', (event.code === 'ArrowLeft' ? -1 : 1) * Math.PI / 12);
    autoResume?.pause(); if (!dragging) autoResume?.idle();
  } else if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); event.stopPropagation(); }
}
function sync() { endDrag(); autoResume?.clear(); if (props.active && autoResume) emit('auto', true); emit('attach', props.active ? canvas.value : null); }
watch(() => props.active, sync, { flush: 'post' });
onMounted(sync);
onBeforeUnmount(() => { endDrag(); autoResume?.clear(); emit('attach', null); });
</script>
<template>
  <canvas ref="canvas" :id="id" class="rider-preview-canvas" tabindex="0" :aria-label="label" @pointerdown="startDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag" @lostpointercapture="endDrag" @blur="endDrag()" @keydown="keyRotate" @keyup="keyRotate"></canvas>
</template>
