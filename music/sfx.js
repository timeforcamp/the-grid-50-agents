/**
 * NEON://OVERRIDE — Procedural SFX Library
 * Web Audio API — no files, all synthesis
 * Cyberpunk chiptune-meets-glitch aesthetic
 * window.SFX — called by the game engine
 */

(function () {
  'use strict';

  let _ctx = null;
  function ctx() {
    if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  /** Utility: create a noise buffer (white noise) */
  function noiseBuffer(ac, duration) {
    const sampleRate = ac.sampleRate;
    const frames = Math.ceil(sampleRate * duration);
    const buf = ac.createBuffer(1, frames, sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Utility: apply gain envelope to a GainNode */
  function env(gain, ac, { a = 0.005, d = 0.05, s = 0.3, r = 0.1, peak = 1 } = {}) {
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + a);
    gain.gain.linearRampToValueAtTime(s * peak, t + a + d);
    gain.gain.setValueAtTime(s * peak, t + a + d);
    gain.gain.linearRampToValueAtTime(0, t + a + d + r);
  }

  /** Utility: waveshaper for bit-crunch / saturation feel */
  function crushCurve(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  const SFX = {
    /**
     * jump() — quick upward pitch sweep, square wave, 80ms
     * Feel: classic chiptune jump, snappy and bright
     */
    jump() {
      const ac = ctx();
      const t = ac.currentTime;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      osc.type = 'square';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.08);

      filter.type = 'highpass';
      filter.frequency.value = 200;

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);

      osc.start(t);
      osc.stop(t + 0.13);
    },

    /**
     * slide() — downward sawtooth glide, 180ms
     * Feel: grinding dash / dash-slide on neon surface
     */
    slide() {
      const ac = ctx();
      const t = ac.currentTime;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();
      const crush = ac.createWaveShaper();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, t);
      filter.frequency.exponentialRampToValueAtTime(600, t + 0.18);
      filter.Q.value = 6;

      crush.curve = crushCurve(20);
      crush.oversample = '2x';

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.2);

      osc.connect(filter);
      filter.connect(crush);
      crush.connect(gain);
      gain.connect(ac.destination);

      osc.start(t);
      osc.stop(t + 0.21);
    },

    /**
     * hack() — rapid glitchy burst: noise + rapid square bursts, 250ms
     * Feel: data being injected, ICE cracking
     */
    hack() {
      const ac = ctx();
      const t = ac.currentTime;

      // Noise layer
      const noiseSrc = ac.createBufferSource();
      noiseSrc.buffer = noiseBuffer(ac, 0.25);
      const noiseFilter = ac.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1800;
      noiseFilter.Q.value = 12;
      const noiseGain = ac.createGain();
      noiseGain.gain.setValueAtTime(0.15, t);
      noiseGain.gain.linearRampToValueAtTime(0, t + 0.25);

      noiseSrc.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ac.destination);
      noiseSrc.start(t);
      noiseSrc.stop(t + 0.26);

      // Glitchy square bursts at different pitches
      const pitches = [330, 440, 660, 220, 550, 880, 165];
      pitches.forEach((freq, i) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        const onset = t + i * 0.032;
        g.gain.setValueAtTime(0, onset);
        g.gain.linearRampToValueAtTime(0.25, onset + 0.005);
        g.gain.linearRampToValueAtTime(0, onset + 0.025);
        o.connect(g);
        g.connect(ac.destination);
        o.start(onset);
        o.stop(onset + 0.03);
      });
    },

    /**
     * hit() — impact thud + noise crack, 120ms
     * Feel: getting struck by an enemy / collision
     */
    hit() {
      const ac = ctx();
      const t = ac.currentTime;

      // Body thud — pitched downward sweep
      const osc = ac.createOscillator();
      const oscGain = ac.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      oscGain.gain.setValueAtTime(0.6, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(oscGain);
      oscGain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.13);

      // Noise crack
      const noiseSrc = ac.createBufferSource();
      noiseSrc.buffer = noiseBuffer(ac, 0.08);
      const nFilter = ac.createBiquadFilter();
      nFilter.type = 'bandpass';
      nFilter.frequency.value = 3200;
      nFilter.Q.value = 1;
      const nGain = ac.createGain();
      nGain.gain.setValueAtTime(0.5, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      noiseSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(ac.destination);
      noiseSrc.start(t);
      noiseSrc.stop(t + 0.08);
    },

    /**
     * pickup() — short ascending 3-note arpeggio, 150ms
     * Feel: grabbing a data shard / credit chip
     */
    pickup() {
      const ac = ctx();
      const t = ac.currentTime;

      [261.63, 329.63, 523.25].forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const on = t + i * 0.05;
        gain.gain.setValueAtTime(0, on);
        gain.gain.linearRampToValueAtTime(0.3, on + 0.005);
        gain.gain.linearRampToValueAtTime(0, on + 0.045);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(on);
        osc.stop(on + 0.05);
      });
    },

    /**
     * powerup() — long rising sweep + shimmer, 300ms
     * Feel: activating a netrunner ability / augment online
     */
    powerup() {
      const ac = ctx();
      const t = ac.currentTime;

      // Main rising sweep
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + 0.28);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(8000, t + 0.28);
      filter.Q.value = 2;

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.25);
      gain.gain.linearRampToValueAtTime(0, t + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.33);

      // Shimmer — high square harmonics
      const osc2 = ac.createOscillator();
      const gain2 = ac.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(880, t + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(3520, t + 0.28);
      gain2.gain.setValueAtTime(0, t + 0.1);
      gain2.gain.linearRampToValueAtTime(0.15, t + 0.15);
      gain2.gain.linearRampToValueAtTime(0, t + 0.32);
      osc2.connect(gain2);
      gain2.connect(ac.destination);
      osc2.start(t + 0.1);
      osc2.stop(t + 0.33);
    },

    /**
     * gameover() — descending minor arpeggio, dark + gritty, 280ms
     * Feel: flatline / jacked out / system failure
     */
    gameover() {
      const ac = ctx();
      const t = ac.currentTime;

      // Descending minor chord notes
      const notes = [523.25, 415.30, 311.13, 185.00];
      notes.forEach((freq, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const filter = ac.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        filter.Q.value = 3;

        const on = t + i * 0.06;
        gain.gain.setValueAtTime(0, on);
        gain.gain.linearRampToValueAtTime(0.3, on + 0.01);
        gain.gain.linearRampToValueAtTime(0.1, on + 0.04);
        gain.gain.linearRampToValueAtTime(0, on + 0.1);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        osc.start(on);
        osc.stop(on + 0.12);
      });

      // Low drone thud at end
      const drone = ac.createOscillator();
      const droneGain = ac.createGain();
      drone.type = 'triangle';
      drone.frequency.setValueAtTime(55, t + 0.22);
      drone.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      droneGain.gain.setValueAtTime(0.5, t + 0.22);
      droneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
      drone.connect(droneGain);
      droneGain.connect(ac.destination);
      drone.start(t + 0.22);
      drone.stop(t + 0.43);
    },

    /**
     * menuSelect() — short blip / click, 60ms
     * Feel: UI navigation, cursor movement on holographic menu
     */
    menuSelect() {
      const ac = ctx();
      const t = ac.currentTime;

      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1320, t + 0.02);

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.005);
      gain.gain.linearRampToValueAtTime(0, t + 0.055);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    },

    /**
     * glitch() — chaotic noise bursts with random pitch stutters, 200ms
     * Feel: reality tearing, matrix hiccup, signal corruption
     */
    glitch() {
      const ac = ctx();
      const t = ac.currentTime;

      // Multiple rapid noise bursts
      for (let i = 0; i < 6; i++) {
        const onset = t + i * 0.03 + (Math.random() * 0.01);
        const dur = 0.012 + Math.random() * 0.018;

        const noiseSrc = ac.createBufferSource();
        noiseSrc.buffer = noiseBuffer(ac, dur + 0.01);
        const filter = ac.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 200 + Math.random() * 5000;
        filter.Q.value = 5 + Math.random() * 10;
        const gn = ac.createGain();
        gn.gain.setValueAtTime(0.4, onset);
        gn.gain.linearRampToValueAtTime(0, onset + dur);

        noiseSrc.connect(filter);
        filter.connect(gn);
        gn.connect(ac.destination);
        noiseSrc.start(onset);
        noiseSrc.stop(onset + dur + 0.005);
      }

      // Random pitch stabs
      for (let i = 0; i < 4; i++) {
        const onset = t + i * 0.045 + Math.random() * 0.02;
        const freq = [110, 220, 440, 880, 1760][Math.floor(Math.random() * 5)];
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = Math.random() > 0.5 ? 'square' : 'sawtooth';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.2, onset);
        g.gain.linearRampToValueAtTime(0, onset + 0.025);
        osc.connect(g);
        g.connect(ac.destination);
        osc.start(onset);
        osc.stop(onset + 0.03);
      }
    },
  };

  window.SFX = SFX;
})();
