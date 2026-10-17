const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  pentatonic: [0, 3, 5, 7, 10, 12]
};

export function createSonifier(onStatus = () => {}) {
  let audioContext = null;
  let master = null;
  let muted = true;
  let volume = 0.28;
  let mode = 'melodic';
  let preset = 'triangle';
  let scaleName = 'pentatonic';
  let voiceLimit = 6;
  let voices = [];
  let lastMinimal = -Infinity;
  let minimalToggle = false;
  let denseCompareCount = 0;

  async function enable() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) { onStatus('Web Audio is unavailable in this browser.'); return false; }
    if (!audioContext) {
      audioContext = new AudioContextClass();
      master = audioContext.createGain();
      master.gain.value = volume * 0.38;
      master.connect(audioContext.destination);
    }
    await audioContext.resume();
    muted = false;
    master.gain.setTargetAtTime(volume * 0.38, audioContext.currentTime, 0.015);
    onStatus('Sound on');
    return true;
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (master && audioContext) master.gain.setTargetAtTime(muted ? 0 : volume * 0.38, audioContext.currentTime, 0.015);
    if (muted) stopAll();
    onStatus(muted ? 'Sound muted' : 'Sound on');
  }

  function setVolume(value) {
    volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (master && audioContext && !muted) master.gain.setTargetAtTime(volume * 0.38, audioContext.currentTime, 0.02);
  }

  function setMode(value) { if (['melodic', 'percussive', 'minimal'].includes(value)) mode = value; }
  function setPreset(value) { if (['sine', 'triangle', 'square', 'sawtooth'].includes(value)) preset = value; }
  function setScale(value) { if (SCALES[value]) scaleName = value; }

  function play(kind, value = 50, density = 1) {
    if (muted || !audioContext || !master) return;
    const now = audioContext.currentTime;
    if (density >= 30 && kind === 'compare') {
      denseCompareCount += 1;
      if (denseCompareCount % Math.ceil(density / 15) !== 0) return;
    }
    if (mode === 'minimal') {
      if (kind === 'compare' && minimalToggle) { minimalToggle = false; return; }
      minimalToggle = !minimalToggle;
      if (now - lastMinimal < Math.max(0.045, 0.2 / Math.max(1, density))) return;
      lastMinimal = now;
    }
    while (voices.length >= voiceLimit) {
      const oldest = voices.shift();
      try { oldest.stop(now); } catch { /* already ended */ }
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const normalized = Math.max(0, Math.min(1, Number(value) / 100));
    const scale = SCALES[scaleName];
    const degree = Math.min(scale.length - 1, Math.floor(normalized * scale.length));
    const melodic = 196 * 2 ** (scale[degree] / 12);
    const percussivePitch = ({ compare: 470, swap: 155, write: 690, visit: 330, frontier: 270, path: 780, done: 880, edge: 520 })[kind] || 360;
    oscillator.type = preset;
    oscillator.frequency.setValueAtTime(mode === 'percussive' ? percussivePitch : melodic, now);
    if (mode === 'percussive' && ['swap', 'write', 'path', 'done'].includes(kind)) oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, percussivePitch * 0.68), now + 0.11);
    const peak = mode === 'minimal' ? 0.12 : mode === 'percussive' ? 0.22 : 0.16;
    const duration = kind === 'done' ? 0.24 : mode === 'minimal' ? 0.065 : mode === 'percussive' ? 0.12 : 0.09;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain); gain.connect(master);
    oscillator.start(now); oscillator.stop(now + duration + 0.015);
    voices.push(oscillator);
    oscillator.onended = () => { voices = voices.filter(voice => voice !== oscillator); gain.disconnect(); };
  }

  function stopAll() {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    voices.forEach(voice => { try { voice.stop(now); } catch { /* already ended */ } });
    voices = [];
  }

  return {
    enable, setMuted, setVolume, setMode, setPreset, setScale, play, stopAll,
    get muted() { return muted; },
    get enabled() { return Boolean(audioContext); },
    async close() { stopAll(); if (audioContext) await audioContext.close(); audioContext = null; master = null; }
  };
}
