// Tiny WebAudio synth for PRISMKEEP: no audio files, just shaped oscillator
// blips — a glass tick when a shard turns, a chime when a lantern catches,
// a zap when a moth burns, a low toll when the shadow feeds. Everything is
// guarded so the game stays silent rather than broken without audio.

let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

function blip(freqA, freqB, dur, type = 'sine', vol = 1, when = 0) {
  if (!ctx || !master) return;
  try {
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqA, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + dur);
    g.gain.setValueAtTime(vol * 0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* silence is fine */ }
}

export const sfx = {
  tick() { blip(1250, 700, 0.07, 'triangle', 0.7); },
  chime() { blip(880, 1320, 0.22, 'sine', 0.8); blip(1320, 1760, 0.3, 'sine', 0.5, 0.05); },
  zap() { blip(1600, 120, 0.16, 'sawtooth', 0.55); },
  thud() { blip(160, 55, 0.3, 'sine', 1); },
  scramble() { blip(300, 900, 0.18, 'square', 0.4); blip(900, 300, 0.18, 'square', 0.4, 0.1); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => blip(f, f, 0.34, 'sine', 0.8, i * 0.09)); },
  over() { [392, 330, 262, 196].forEach((f, i) => blip(f, f * 0.94, 0.4, 'triangle', 0.8, i * 0.13)); },
  bossDown() { blip(1400, 60, 0.7, 'sawtooth', 0.8); [784, 988, 1175, 1568].forEach((f, i) => blip(f, f, 0.4, 'sine', 0.7, 0.25 + i * 0.1)); },
};
