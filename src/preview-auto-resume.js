// One idle timer, separate from the renderer's animation loop.
export function createPreviewAutoResume({ delay, onAuto }) {
  let timer;
  function clear() { clearTimeout(timer); timer = undefined; }
  function pause() { clear(); onAuto(false); }
  function idle() {
    clear();
    timer = setTimeout(() => { timer = undefined; onAuto(true); }, delay);
  }
  return { pause, idle, clear };
}
