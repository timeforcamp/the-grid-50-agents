/**
 * NEON://OVERRIDE — Game Over Sting
 * ===================================
 * Duration: ~4 bars @ 80 BPM ≈ 6 seconds
 *
 * Structure (melodic/textural arc):
 *   Bar 1 (0.0–1.5s): Detuned glissando DOWN
 *                      Sawtooth chord (A4+E4) sweeps from 440Hz → 55Hz
 *                      Three detuned voices for width/grit
 *   Bar 2 (1.5–3.0s): Glitch crackle burst
 *                      White noise fired in rhythmic micro-bursts (8–12 hits)
 *                      Bandpass-shaped for digital "static" texture
 *   Bar 3 (3.0–4.5s): Low boom lands
 *                      Sine sub at A1 (55Hz) — sharp attack, long exponential decay
 *                      Pitch-slides down from 80Hz → 38Hz (tuned "thud")
 *   Bar 4 (4.5–6.0s): Tail / reverb bleed
 *                      Everything decays into silence, filtered high-end shimmer
 *
 * Solfège note on the glissando:
 *   Starts on la4 (A4, 440Hz) — the tonic of our Am — then slides down
 *   two octaves through sol→mi→re→do→si→la to reach A2 (110Hz),
 *   landing on A1 (55Hz) for the final boom. It's a falling "death spiral"
 *   through the A natural minor scale, detuned for grit.
 *
 * Usage:
 *   import { playGameOver } from './gameover.js';
 *   playGameOver();                         // fire once on game-over event
 *   playGameOver({ volume: 0.9 });          // optional config
 */

export function playGameOver(options = {}) {
  const { volume = 0.85 } = options;

  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = volume;
  master.connect(ctx.destination);

  const now = ctx.currentTime;

  _glissando(ctx, master, now);
  _glitchCrackle(ctx, master, now + 1.5);
  _lowBoom(ctx, master, now + 3.0);
  _shimmerTail(ctx, master, now + 4.2);

  // Auto-close context after sting completes
  setTimeout(() => ctx.close(), 7000);
}

// ─── BAR 1: DETUNED GLISSANDO DOWN ─────────────────────────────────────────
function _glissando(ctx, out, t) {
  // Three detuned sawtooth voices for gritty, wide sound
  const detunes = [-14, 0, 14]; // cents apart
  detunes.forEach((detune, i) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    // Start high (A4 = 440Hz), glide to low A1 (55Hz) over 1.4 seconds
    osc.frequency.setValueAtTime(440 + detune * 0.5, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 1.4);
    osc.detune.value = detune;

    // Low-pass opens then closes — filter sweep mirrors pitch fall
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3500, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 1.4);
    filter.Q.value = 2.5;

    // Envelope: snap on, decay through the glide
    gainNode.gain.setValueAtTime(0, t);
    gainNode.gain.linearRampToValueAtTime(0.22 - i * 0.02, t + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(out);

    osc.start(t);
    osc.stop(t + 1.6);
  });

  // Extra: a second voice doing the same glide but starting at E4 (329Hz)
  // — this creates a minor 5th harmony that collapses to unison at the bottom
  const osc5 = ctx.createOscillator();
  const gain5 = ctx.createGain();
  const filt5 = ctx.createBiquadFilter();

  osc5.type = 'sawtooth';
  osc5.frequency.setValueAtTime(329.63, t);
  osc5.frequency.exponentialRampToValueAtTime(55, t + 1.4); // converges to unison
  osc5.detune.value = -5;

  filt5.type = 'lowpass';
  filt5.frequency.setValueAtTime(2000, t);
  filt5.frequency.exponentialRampToValueAtTime(150, t + 1.4);

  gain5.gain.setValueAtTime(0, t);
  gain5.gain.linearRampToValueAtTime(0.14, t + 0.02);
  gain5.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

  osc5.connect(filt5);
  filt5.connect(gain5);
  gain5.connect(out);
  osc5.start(t);
  osc5.stop(t + 1.6);
}

// ─── BAR 2: GLITCH CRACKLE ──────────────────────────────────────────────────
function _glitchCrackle(ctx, out, t) {
  // Fire 10–14 micro-bursts of bandpass noise at irregular intervals
  const numBursts = 12;
  const burstDuration = 0.03; // each crackle is 30ms
  const burstSpacing  = 1.4 / numBursts; // spread across 1.4 seconds

  // Shared noise buffer for efficiency
  const bufSamples = Math.floor(ctx.sampleRate * burstDuration * 2);
  const noiseBuf = ctx.createBuffer(1, bufSamples, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSamples; i++) {
    d[i] = Math.random() * 2 - 1;
  }

  for (let i = 0; i < numBursts; i++) {
    // Stagger: roughly evenly spaced but with human-feel jitter
    const jitter = (Math.random() - 0.5) * burstSpacing * 0.4;
    const burstTime = t + i * burstSpacing + jitter;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;

    // Bandpass centered at random glitch freq (2k–8k): digital artifact feel
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2000 + Math.random() * 6000;
    bp.Q.value = 3 + Math.random() * 6;

    const g = ctx.createGain();
    // Volume: louder in the middle of the burst sequence, like a cascade
    const envShape = Math.sin((i / numBursts) * Math.PI); // bell curve
    g.gain.setValueAtTime(0, burstTime);
    g.gain.linearRampToValueAtTime(0.35 * (0.5 + envShape * 0.5), burstTime + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, burstTime + burstDuration);

    src.connect(bp);
    bp.connect(g);
    g.connect(out);

    src.start(burstTime);
    src.stop(burstTime + burstDuration + 0.01);
  }
}

// ─── BAR 3: LOW BOOM ────────────────────────────────────────────────────────
function _lowBoom(ctx, out, t) {
  // Tuned sub-kick: sine wave pitch-slides from 80Hz → 38Hz ("punchy thud")
  // Landing on ~38Hz = below A1, sub-bass territory
  const sub = ctx.createOscillator();
  const subGain = ctx.createGain();

  sub.type = 'sine';
  sub.frequency.setValueAtTime(80, t);
  sub.frequency.exponentialRampToValueAtTime(38, t + 0.8);

  subGain.gain.setValueAtTime(0, t);
  subGain.gain.linearRampToValueAtTime(0.9, t + 0.01); // sharp attack
  subGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5); // long decay tail

  sub.connect(subGain);
  subGain.connect(out);
  sub.start(t);
  sub.stop(t + 2.6);

  // Distortion layer: add harmonic content so boom cuts on small speakers too
  const distOsc = ctx.createOscillator();
  const distGain = ctx.createGain();
  const distFilter = ctx.createBiquadFilter();

  distOsc.type = 'sawtooth';
  distOsc.frequency.setValueAtTime(55, t); // A1
  distOsc.frequency.exponentialRampToValueAtTime(40, t + 0.6);

  distFilter.type = 'lowpass';
  distFilter.frequency.value = 300;
  distFilter.Q.value = 0.5;

  distGain.gain.setValueAtTime(0, t);
  distGain.gain.linearRampToValueAtTime(0.18, t + 0.015);
  distGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

  distOsc.connect(distFilter);
  distFilter.connect(distGain);
  distGain.connect(out);
  distOsc.start(t);
  distOsc.stop(t + 2.0);
}

// ─── BAR 4: SHIMMER TAIL ────────────────────────────────────────────────────
function _shimmerTail(ctx, out, t) {
  // Ghostly high-end remnant: detuned triangle waves fading to nothing
  // Interval: minor 2nd cluster (A4 + Bb4) for dissonance / dread
  const freqs = [440, 466.16, 493.88]; // A4, Bb4, B4 — tritone-adjacent shimmer

  freqs.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const hp = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = (i - 1) * 8;

    hp.type = 'highpass';
    hp.frequency.value = 1200;

    gainNode.gain.setValueAtTime(0.07, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc.connect(hp);
    hp.connect(gainNode);
    gainNode.connect(out);

    osc.start(t);
    osc.stop(t + 2.0);
  });
}
