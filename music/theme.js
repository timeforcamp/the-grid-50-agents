/**
 * NEON://OVERRIDE — Main Theme
 * Synthwave, 120 BPM, Key: Am, 16-bar procedural loop
 * Web Audio API — no external files required
 *
 * Usage:
 *   Theme.play()   // start the loop
 *   Theme.stop()   // fade out and stop
 *   Theme.isPlaying() // returns boolean
 *
 * @author BPM (beat-producer jammer)
 */

(function () {
  'use strict';

  const BPM          = 120;
  const BEAT         = 60 / BPM;          // 0.5s per beat
  const BAR          = BEAT * 4;           // 2.0s per bar
  const LOOKAHEAD    = 0.12;               // schedule 120ms ahead
  const SCHED_MS     = 50;                 // scheduler fires every 50ms

  // ── Frequency table (Hz) ─────────────────────────────────────────────────
  const F = {
    A1:55.00, C2:65.41, E2:82.41, F2:87.31, G2:98.00,
    A2:110.00, C3:130.81, E3:164.81, F3:174.61, G3:196.00,
    A3:220.00, B3:246.94, C4:261.63, D4:293.66, E4:329.63,
    F4:349.23, G4:392.00, A4:440.00, B4:493.88, C5:523.25,
    E5:659.25, G5:783.99,
  };

  // ── Chord voicings (3-note close position) ──────────────────────────────
  //    Am: A C E   F: F A C   C: C E G   G: G B D   E: E B E (power + 5th)
  const CHORDS = {
    Am: [F.A3, F.C4, F.E4],
    F:  [F.F3, F.A3, F.C4],
    C:  [F.C4, F.E4, F.G4],
    G:  [F.G3, F.B3, F.D4],
    E:  [F.E3, F.B3, F.E4],  // E major — cinematic tension in B section
  };

  // ── 16-bar chord + bass sequence ────────────────────────────────────────
  //    A section (1-8):  Am Am F F C C G G
  //    B section (9-16): Am E Am E F G Am Am
  const CHORD_SEQ = [
    'Am','Am','F','F','C','C','G','G',
    'Am','E','Am','E','F','G','Am','Am',
  ];

  const BASS_SEQ = [
    F.A2, F.A2, F.F2, F.F2,
    F.C2, F.C2, F.G2, F.G2,
    F.A2, F.E2, F.A2, F.E2,
    F.F2, F.G2, F.A2, F.A2,
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let ctx         = null;
  let masterBus   = null;
  let timer       = null;
  let nextTime    = 0;
  let barCount    = 0;
  let playing     = false;

  // ── DSP Helpers ──────────────────────────────────────────────────────────

  /** Plate-style reverb via synthetic impulse response */
  function buildReverb(ac, seconds = 2.4, decay = 2.8) {
    const conv    = ac.createConvolver();
    const sr      = ac.sampleRate;
    const len     = sr * seconds;
    const buf     = ac.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    conv.buffer = buf;
    return conv;
  }

  /** Dotted-8th delay (0.375s at 120bpm) */
  function buildDelay(ac) {
    const dly  = ac.createDelay(1.0);
    const fb   = ac.createGain();
    const wet  = ac.createGain();
    dly.delayTime.value = BEAT * 0.75; // dotted 8th
    fb.gain.value       = 0.30;
    wet.gain.value      = 0.18;
    dly.connect(fb);
    fb.connect(dly);
    dly.connect(wet);
    return { dly, wet };
  }

  function buildCompressor(ac) {
    const c = ac.createDynamicsCompressor();
    c.threshold.value = -18;
    c.knee.value      = 8;
    c.ratio.value     = 4;
    c.attack.value    = 0.003;
    c.release.value   = 0.22;
    return c;
  }

  // ── Drum Synthesis ────────────────────────────────────────────────────────

  /** 808-style kick: sine frequency sweep + click transient */
  function kick(ac, dest, t) {
    // Body
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(44, t + 0.09);
    g.gain.setValueAtTime(1.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    osc.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + 0.49);

    // Click
    const clk = ac.createOscillator();
    const cg  = ac.createGain();
    clk.type  = 'square';
    clk.frequency.value = 900;
    cg.gain.setValueAtTime(0.35, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    clk.connect(cg); cg.connect(dest);
    clk.start(t); clk.stop(t + 0.02);
  }

  /** Retrowave snare: bandpass noise + tonal crack */
  function snare(ac, dest, t) {
    const sr  = ac.sampleRate;
    const len = Math.floor(sr * 0.20);
    const buf = ac.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const flt = ac.createBiquadFilter();
    flt.type      = 'bandpass';
    flt.frequency.value = 2800;
    flt.Q.value   = 0.85;
    const ng = ac.createGain();
    ng.gain.setValueAtTime(1.0, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.20);
    noise.connect(flt); flt.connect(ng); ng.connect(dest);
    noise.start(t); noise.stop(t + 0.21);

    // Tonal body
    const osc = ac.createOscillator();
    const og  = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.07);
    og.gain.setValueAtTime(0.55, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(og); og.connect(dest);
    osc.start(t); osc.stop(t + 0.13);
  }

  /** Layered clap: 3 offset noise bursts = retrowave "smack" */
  function clap(ac, dest, t) {
    for (let i = 0; i < 3; i++) {
      const off = i * 0.011;
      const sr  = ac.sampleRate;
      const len = Math.floor(sr * 0.10);
      const buf = ac.createBuffer(1, len, sr);
      const d   = buf.getChannelData(0);
      for (let j = 0; j < len; j++) d[j] = Math.random() * 2 - 1;
      const n  = ac.createBufferSource();
      n.buffer = buf;
      const f  = ac.createBiquadFilter();
      f.type   = 'bandpass';
      f.frequency.value = 1100 + i * 500;
      f.Q.value = 1.1;
      const g  = ac.createGain();
      g.gain.setValueAtTime(0.38, t + off);
      g.gain.exponentialRampToValueAtTime(0.001, t + off + 0.10);
      n.connect(f); f.connect(g); g.connect(dest);
      n.start(t + off); n.stop(t + off + 0.11);
    }
  }

  /** Closed/open hi-hat: highpass-filtered white noise */
  function hihat(ac, dest, t, open = false) {
    const sr   = ac.sampleRate;
    const dur  = open ? 0.28 : 0.055;
    const len  = Math.floor(sr * dur * 1.2);
    const buf  = ac.createBuffer(1, len, sr);
    const d    = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    const n = ac.createBufferSource();
    n.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type  = 'highpass';
    hp.frequency.value = 7500;
    const pk = ac.createBiquadFilter();
    pk.type  = 'peaking';
    pk.frequency.value = 10500;
    pk.gain.value = 5;
    const g = ac.createGain();
    g.gain.setValueAtTime(open ? 0.30 : 0.20, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(hp); hp.connect(pk); pk.connect(g); g.connect(dest);
    n.start(t); n.stop(t + dur + 0.01);
  }

  // ── Synth Synthesis ───────────────────────────────────────────────────────

  /** Detuned twin-saw pad — the classic synthwave wash */
  function sawPad(ac, dest, freqs, t, dur, vol = 0.10) {
    freqs.forEach((freq, idx) => {
      [-6, 6].forEach(dt => {
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value    = dt + idx * 3;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.10);
        g.gain.setValueAtTime(vol, t + dur - 0.12);
        g.gain.linearRampToValueAtTime(0, t + dur + 0.06);
        osc.connect(g); g.connect(dest);
        osc.start(t); osc.stop(t + dur + 0.08);
      });
    });
  }

  /** Square pad one octave up — adds harmonic shimmer */
  function squarePad(ac, dest, freqs, t, dur, vol = 0.055) {
    freqs.forEach(freq => {
      const osc = ac.createOscillator();
      const lp  = ac.createBiquadFilter();
      const g   = ac.createGain();
      osc.type  = 'square';
      osc.frequency.value = freq * 2;
      lp.type   = 'lowpass';
      lp.frequency.value = 3500;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.18);
      g.gain.setValueAtTime(vol * 0.7, t + dur - 0.15);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.08);
      osc.connect(lp); lp.connect(g); g.connect(dest);
      osc.start(t); osc.stop(t + dur + 0.1);
    });
  }

  /** Sub bass: filtered sine, follows root */
  function subBass(ac, dest, freq, t, dur) {
    const osc = ac.createOscillator();
    const lp  = ac.createBiquadFilter();
    const g   = ac.createGain();
    osc.type  = 'sine';
    osc.frequency.value  = freq;
    lp.type   = 'lowpass';
    lp.frequency.value   = 180;
    lp.Q.value = 2.0;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.90, t + 0.025);
    g.gain.setValueAtTime(0.85, t + dur - 0.09);
    g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  /** Lead arp: filtered saw with envelope decay — 8th note pulse */
  function arpNote(ac, dest, freq, t, dur, vol = 0.12) {
    const osc = ac.createOscillator();
    const lp  = ac.createBiquadFilter();
    const g   = ac.createGain();
    osc.type  = 'sawtooth';
    osc.frequency.value  = freq;
    lp.type   = 'lowpass';
    lp.frequency.setValueAtTime(3200, t);
    lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    lp.Q.value = 4;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(dest);
    osc.start(t); osc.stop(t + dur + 0.01);
  }

  // ── Bar Scheduler ─────────────────────────────────────────────────────────

  function scheduleBar(idx, t) {
    const n      = idx % 16;
    const chord  = CHORDS[CHORD_SEQ[n]];
    const bass   = BASS_SEQ[n];
    const inB    = n >= 8;

    // ── Harmonic layers ──
    sawPad(ctx, masterBus, chord, t, BAR - 0.02);
    squarePad(ctx, masterBus, chord, t, BAR - 0.02);
    subBass(ctx, masterBus, bass, t, BAR * 0.93);

    // ── Arp: 8th notes through chord tones + root octave ──
    const arpSeq = [...chord, chord[0] * 2];
    arpSeq.forEach((freq, i) => {
      const at = t + i * BEAT * 0.5;
      if (at < t + BAR - 0.05) {
        arpNote(ctx, masterBus, freq * 2, at, BEAT * 0.44, inB ? 0.14 : 0.10);
      }
    });

    // ── Drums: 4 beats ──
    for (let b = 0; b < 4; b++) {
      const bt = t + b * BEAT;

      // Kick on 1 & 3; ghost kick on 2.5 in B section
      if (b === 0 || b === 2) kick(ctx, masterBus, bt);
      if (inB && b === 1)     kick(ctx, masterBus, bt + BEAT * 0.5);

      // Snare on 2 & 4 with clap layer from bar 5+
      if (b === 1 || b === 3) {
        snare(ctx, masterBus, bt);
        if (n >= 4) clap(ctx, masterBus, bt + 0.006);
      }

      // Hi-hats: closed on every 8th, open hat on upbeat of beat 4
      hihat(ctx, masterBus, bt, false);
      hihat(ctx, masterBus, bt + BEAT * 0.5, b === 3);
    }
  }

  function loop() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleBar(barCount, nextTime);
      nextTime += BAR;
      barCount++;
    }
    timer = setTimeout(loop, SCHED_MS);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  window.Theme = {

    play() {
      if (playing) return;
      ctx = new (window.AudioContext || window.webkitAudioContext)();

      // Signal chain: masterBus → compressor ─┬─► destination
      //                          masterBus → reverb → destination
      //                          masterBus → delay  → destination

      masterBus = ctx.createGain();
      masterBus.gain.value = 0.72;

      const comp = buildCompressor(ctx);
      masterBus.connect(comp);
      comp.connect(ctx.destination);

      const rev = buildReverb(ctx);
      const revGain = ctx.createGain();
      revGain.gain.value = 0.28;
      masterBus.connect(rev);
      rev.connect(revGain);
      revGain.connect(ctx.destination);

      const { dly, wet } = buildDelay(ctx);
      masterBus.connect(dly);
      wet.connect(ctx.destination);

      barCount  = 0;
      nextTime  = ctx.currentTime + 0.08;
      playing   = true;
      loop();
    },

    stop() {
      if (!playing) return;
      clearTimeout(timer);
      timer = null;
      if (masterBus) {
        masterBus.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      }
      setTimeout(() => {
        if (ctx) { ctx.close(); ctx = null; }
        masterBus = null;
      }, 1200);
      playing  = false;
      barCount = 0;
    },

    isPlaying() { return playing; },
  };

})();
