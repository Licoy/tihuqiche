<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ open: Boolean, labelledby: { type: String, required: true }, returnFocusId: { type: String, default: '' } });
const emit = defineEmits(['escape']);
const root = ref(null);
let previous;
watch(() => props.open, async open => {
  if (open) {
    previous = document.activeElement; await nextTick();
    root.value?.querySelector('button:not(:disabled),select,input,textarea,[tabindex="0"]')?.focus({ preventScroll: true });
  } else {
    await nextTick();
    const target = props.returnFocusId ? document.getElementById(props.returnFocusId) : previous;
    if (target?.isConnected && !target.closest('[inert],[hidden]')) target.focus({ preventScroll: true });
  }
});
function keys(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); emit('escape'); }
  if (event.key !== 'Tab') return;
  event.stopPropagation();
  const controls = [...root.value.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[inert]'));
  if (!controls.length) { event.preventDefault(); root.value.focus(); return; }
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && (document.activeElement === first || !root.value.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && (document.activeElement === last || !root.value.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}
onUnmounted(() => { previous = null; });
</script>
<template><section ref="root" class="overlay" :hidden="!open" :inert="!open" role="dialog" aria-modal="true" :aria-labelledby="labelledby" tabindex="-1" @keydown="keys"><slot /></section></template>
