const keyActions = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'duck', s: 'duck', S: 'duck' };

export function bindInput(canvas, api) {
  const { game, app, action, pauseGame, resumeGame } = api;
  const controller = new AbortController(), options = { signal: controller.signal };
  document.addEventListener('keydown', event => {
    if (app.error.value) return;
    const overlay = [...document.querySelectorAll('.overlay')].find(el => !el.hidden);
    if (event.key === 'Tab' && overlay) {
      const buttons = [...overlay.querySelectorAll('button')];
      if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus(); }
    }
    if (event.repeat) return;
    if (app.helpOpen.value) { if (event.key === 'Escape') app.closeHelp(); return; }
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) return;
    if (['p', 'P', 'Escape'].includes(event.key)) {
      if (['playing', 'paused'].includes(game.mode)) { event.preventDefault(); game.mode === 'paused' ? resumeGame() : pauseGame(); }
      return;
    }
    if (game.mode === 'playing' && keyActions[event.key]) {
      if (event.key === ' ' && event.target.closest('button,a')) return;
      event.preventDefault(); action(keyActions[event.key]);
    }
    if (game.mode === 'home' && ['Enter', ' '].includes(event.key) && !event.target.closest('button,a')) {
      event.preventDefault(); api.startLevel(app.selected.value);
    }
  }, options);
  let touchStart = null;
  canvas.addEventListener('pointerdown', event => {
    if (game.mode === 'playing') { touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId }; canvas.setPointerCapture(event.pointerId); }
  }, options);
  canvas.addEventListener('pointerup', event => {
    if (!touchStart || touchStart.id !== event.pointerId) return;
    const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y; touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 23) return;
    action(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'duck' : 'jump');
  }, options);
  canvas.addEventListener('pointercancel', () => { touchStart = null; }, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); }, options);
  window.addEventListener('blur', pauseGame, options);
  window.addEventListener('resize', api.world.resize, options);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); pauseGame(); app.error.value = { title: 'contextLost', description: 'contextHelp' }; }, options);
  return () => controller.abort();
}
