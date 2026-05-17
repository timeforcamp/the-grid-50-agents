/**
 * NEON://OVERRIDE — CHASE / ACTION TRACK
 * Key: A minor (Am) — compatible with main theme (Am / Dm)
 * BPM: 140
 * Style: Cyberpunk dark techno — heavy kick, arpeggiated bass, distorted lead
 *
 * Usage:
 *   Chase.play()   — starts the loop (called on first powerup or 1000m)
 *   Chase.stop()   — fades out and stops
 *
 * Exports: window.Chase
 */

(function () {
  "use strict";

  const BPM = 140;
  const BEAT = 60 / BPM;          // seconds per beat
  const BAR  = BEAT * 4;          // 4/4 time

  // --- Am scale frequencies (A2=110 Hz) ---
  const NOTE = {
    A2:  110.00,
    C3:  130.81,
    D3:  146.83,
    E3:  164.81,
    G3:  196.00,
    A3:  220.00,
    C4:  261.63,
    D4:  293.66,
    E4:  329.63,
    G4:  392.00,
    A4:  440.00,
  };

  // Arpeggiated bass pattern — Am7 → Dm → Am → Em
  const ARP_PATTERN = [
    [NOTE.A2, NOTE.C3, NOTE.E3, NOTE.G3],   // Am7
    [NOTE.D3, NOTE.A2, NOTE.D3, NOTE.A2],   // Dm
    [NOTE.A2, NOTE.E3, NOTE.A2, NOTE.C3],   // Am
    [NOTE.E3, NOTE.G3, NOTE.E3, NOTE.A2],   // Em
  ];

  // Distorted lead melody — dark, stabby
  const LEAD_PATTERN = [
    NOTE.A4, null, NOTE.G4, NOTE.E4,
    NOTE.C4, NOTE.D4, null, NOTE.E4,
    NOTE.A3, null, NOTE.C4, NOTE.G3,
    NOTE.A3, NOTE.D4, null, null,
  ];

  let ctx = null;
  let masterGain = null;
  let schedulerTimer = null;
  let isPlaying = false;
  let nextNoteTime = 0;
  let arpStep = 0;
  let leadStep = 0;
  let barCount = 0;

  // ---- Utility ----

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctx;
  }

  function dbToGain(db) {
    return Math.pow(10, db / 20);
  }

  // ---- Synthesisers ----

  /**
   * Heavy kick drum — sine body + pitched white noise transient + distortion
   */
  function scheduleKick(time) {
    const ac = getCtx();

    // Sine body
    const osc = ac.createOscillator();
    const oscGain = ac.createGain();
    const dist = ac.createWaveShaper();

    osc.type = "sine";
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);

    oscGain.gain.setValueAtTime(2.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    // Distortion curve
    const curve = makeDistortionCurve(180);
    dist.curve = curve;
    dist.oversample = "4x";

    osc.connect(dist);
    dist.connect(oscGain);
    oscGain.connect(masterGain);

    osc.start(time);
    osc.stop(time + 0.5);

    // Click transient
    const clickBuf = ac.createBuffer(1, ac.sampleRate * 0.04, ac.sampleRate);
    const clickData = clickBuf.getChannelData(0);
    for (let i = 0; i < clickData.length; i++) {
      clickData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clickData.length, 4);
    }
    const clickSrc = ac.createBufferSource();
    clickSrc.buffer = clickBuf;
    const clickGain = ac.createGain();
    clickGain.gain.setValueAtTime(1.2, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    const clickFilter = ac.createBiquadFilter();
    clickFilter.type = "bandpass";
    clickFilter.frequency.value = 3000;
    clickFilter.Q.value = 0.8;
    clickSrc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(masterGain);
    clickSrc.start(time);
  }

  /**
   * Snare — noise burst + tone
   */
  function scheduleSnare(time) {
    const ac = getCtx();

    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ac.createBufferSource();
    noise.buffer = noiseBuf;

    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.value = 2200;
    noiseFilter.Q.value = 0.7;

    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.9, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(time);

    // Tone layer
    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
    const oscGain = ac.createGain();
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  /**
   * Closed hi-hat
   */
  function scheduleHat(time, open) {
    const ac = getCtx();

    const noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ac.createBufferSource();
    noise.buffer = noiseBuf;

    const filter = ac.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = open ? 7000 : 9000;

    const gain = ac.createGain();
    const decay = open ? 0.08 : 0.03;
    gain.gain.setValueAtTime(open ? 0.35 : 0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    noise.start(time);
  }

  /**
   * Arpeggiated bass — sawtooth through lowpass
   */
  function scheduleArp(freq, time) {
    const ac = getCtx();

    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = freq;

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(400, time + BEAT * 0.6);
    filter.Q.value = 5;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + BEAT * 0.55);

    const compressor = ac.createDynamicsCompressor();
    compressor.threshold.value = -12;
    compressor.ratio.value = 6;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(compressor);
    compressor.connect(masterGain);

    osc.start(time);
    osc.stop(time + BEAT * 0.6);
  }

  /**
   * Distorted lead — square wave → waveshaper → filter
   */
  function scheduleLead(freq, time) {
    const ac = getCtx();

    const osc = ac.createOscillator();
    osc.type = "square";
    osc.frequency.value = freq;

    // Slight detune for thickness
    const osc2 = ac.createOscillator();
    osc2.type = "sawtooth";
    osc2.frequency.value = freq * 1.005;

    const merge = ac.createGain();
    merge.gain.value = 0.5;

    osc.connect(merge);
    osc2.connect(merge);

    const dist = ac.createWaveShaper();
    dist.curve = makeDistortionCurve(320);
    dist.oversample = "4x";

    const filter = ac.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq * 2.5;
    filter.Q.value = 3;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + BEAT * 0.8);

    merge.connect(dist);
    dist.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + BEAT);
    osc2.stop(time + BEAT);
  }

  /**
   * Sub bass pad — slow sine pad underneath for fullness
   */
  function scheduleSubPad(freq, time, duration) {
    const ac = getCtx();
    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq / 2;   // one octave down

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.18, time + 0.05);
    gain.gain.setValueAtTime(0.18, time + duration - 0.1);
    gain.gain.linearRampToValueAtTime(0.0, time + duration);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  // ---- Distortion curve helper ----
  function makeDistortionCurve(amount) {
    const samples = 256;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  // ---- Scheduler ----

  function scheduleBar(time) {
    const bar = barCount % ARP_PATTERN.length;
    const arpNotes = ARP_PATTERN[bar];

    for (let beat = 0; beat < 4; beat++) {
      const beatTime = time + beat * BEAT;

      // --- Kick: beats 1 & 3, plus extra 16th on beat 3.5 for urgency ---
      if (beat === 0 || beat === 2) {
        scheduleKick(beatTime);
      }
      if (beat === 2) {
        scheduleKick(beatTime + BEAT * 0.5);  // off-beat kick stab
      }

      // --- Snare: beats 2 & 4 ---
      if (beat === 1 || beat === 3) {
        scheduleSnare(beatTime);
      }

      // --- Hi-hats: every 8th note, open on offbeats when bar > 0 ---
      scheduleHat(beatTime, false);
      scheduleHat(beatTime + BEAT * 0.5, barCount > 0 && beat % 2 === 1);

      // --- Arpeggiated bass: 16th-note arpeggio across each beat ---
      for (let s = 0; s < 4; s++) {
        const arpTime = beatTime + s * (BEAT / 4);
        scheduleArp(arpNotes[(beat * 4 + s) % arpNotes.length], arpTime);
      }

      // --- Lead: every 2 beats (8th-note hits), pattern-based ---
      const leadIdx = (bar * 4 + beat) % LEAD_PATTERN.length;
      const leadFreq = LEAD_PATTERN[leadIdx];
      if (leadFreq) {
        scheduleLead(leadFreq, beatTime);
      }
    }

    // Sub pad on root note each bar
    scheduleSubPad(NOTE.A2, time, BAR);

    barCount++;
  }

  function scheduler() {
    if (!isPlaying) return;
    const ac = getCtx();
    const LOOK_AHEAD = 0.15;  // seconds

    while (nextNoteTime < ac.currentTime + LOOK_AHEAD) {
      scheduleBar(nextNoteTime);
      nextNoteTime += BAR;
    }

    schedulerTimer = setTimeout(scheduler, 50);
  }

  // ---- Public API ----

  const Chase = {
    play() {
      if (isPlaying) return;

      const ac = getCtx();
      if (ac.state === "suspended") ac.resume();

      masterGain = ac.createGain();
      masterGain.gain.value = 0.0;
      masterGain.connect(ac.destination);

      // Fade in
      masterGain.gain.linearRampToValueAtTime(0.85, ac.currentTime + 0.5);

      isPlaying = true;
      barCount = 0;
      arpStep = 0;
      leadStep = 0;
      nextNoteTime = ac.currentTime + 0.05;

      scheduler();
    },

    stop() {
      if (!isPlaying) return;
      isPlaying = false;
      clearTimeout(schedulerTimer);

      if (masterGain) {
        const ac = getCtx();
        masterGain.gain.setValueAtTime(masterGain.gain.value, ac.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.0, ac.currentTime + 1.2);
        setTimeout(() => {
          try { masterGain.disconnect(); } catch (_) {}
          masterGain = null;
        }, 1400);
      }
    },

    isPlaying() {
      return isPlaying;
    },
  };

  window.Chase = Chase;
})();
