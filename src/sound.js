export function createSound({ enabled, notify }) {
  let audio = null;
  function tone(kind) {
    if (!enabled.value) return;
    if (!audio) {
      try { audio = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (error) { console.warn('Audio initialization failed', error); enabled.value = false; notify('audioError'); return; }
    }
    if (audio.state === 'suspended') audio.resume().catch(error => { console.warn('Audio resume failed', error); notify('audioResume'); });
    const notes = { fish: [740, 1100, .09], jump: [280, 650, .15], duck: [350, 150, .12], hit: [140, 45, .25], shield: [580, 1300, .3], win: [520, 1040, .55], move: [210, 280, .04] };
    const [a, b, duration] = notes[kind], oscillator = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime;
    oscillator.type = kind === 'hit' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(a, time); oscillator.frequency.exponentialRampToValueAtTime(b, time + duration);
    gain.gain.setValueAtTime(.0001, time); gain.gain.exponentialRampToValueAtTime(.095, time + .008); gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(time); oscillator.stop(time + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  return { tone, get audio() { return audio; }, dispose() { return audio?.close(); } };
}
