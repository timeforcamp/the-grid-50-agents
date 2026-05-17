/**
 * NEON://OVERRIDE — Ambient Menu Track
 * =====================================
 * Key: A minor (Am7 / Am9 pads)
 * Texture: slow synth pads, filtered rain noise, distant city hum
 * Tempo: ~64 BPM (very slow swell cycle ~7.5s)
 * Loops: forever
 *
 * Usage:
 *   const menu = new MenuTrack();
 *   menu.start();   // begin ambient loop
 *   menu.stop();    // fade out and stop
 *
 * Melody outline (Am pentatonic pad layers):
 *   Bar 1: A2 → C3 → E3  (root swell)
 *   Bar 2: G3 → E3 → A3  (tension, 7th)
 *   Bar 3: A3 → C4 → E4  (octave rise)
 *   Bar 4: G4 → E4 → A4  (resolution fall)
 *   Repeat — crossfade seamless
 */

export class MenuTrack {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.running = false;
    this._nodes = [];
  }

  start() {
    if (this.running) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0.8, this.ctx.currentTime + 4);
    this.masterGain.connect(this.ctx.destination);

    this.running = true;
    this._startPads();
    this._startRainNoise();
    this._startCityHum();
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    const now = this.ctx.currentTime;
    this.masterGain.gain.linearRampToValueAtTime(0, now + 3);
    setTimeout(() => {
      this._nodes.forEach(n => { try { n.stop(); } catch (e) {} });
      this.ctx.close();
    }, 3500);
  }

  // ─── SYNTH PADS ────────────────────────────────────────────────────────────
  _startPads() {
    // Am7 chord tones (Hz): A2, C3, E3, G3, A3, C4, E4, G4
    const amChord = [110, 130.81, 164.81, 196.00, 220, 261.63, 329.63, 392.00];
    const swellPeriod = 7.5; // seconds per swell cycle

    amChord.forEach((freq, i) => {
      // Each note gets 2–3 slightly detuned oscillators (ensemble/pad effect)
      const detunes = [-7, 0, 7];
      detunes.forEach(detune => {
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.detune.value = detune;

        // Low-pass filter: warm pad sound
        filter.type = 'lowpass';
        filter.frequency.value = 800 + i * 60;
        filter.Q.value = 1.2;

        // Gentle LFO on filter frequency (slow breath)
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08 + i * 0.005; // very slow, offset per voice
        lfoGain.gain.value = 120;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
        this._nodes.push(lfo);

        // Volume envelope: slow swell, staggered per voice
        const baseVol = 0.04 - i * 0.002; // higher notes quieter
        const offset = (i * swellPeriod) / amChord.length;

        gainNode.gain.value = 0;
        this._scheduleSwell(gainNode, baseVol, swellPeriod, offset);

        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start();
        this._nodes.push(osc);
      });
    });
  }

  _scheduleSwell(gainNode, peak, period, offset) {
    if (!this.running) return;
    const ctx = this.ctx;
    const halfPeriod = period / 2;

    const tick = (startTime) => {
      if (!this.running) return;
      const t0 = startTime + offset;
      gainNode.gain.setValueAtTime(0, t0);
      gainNode.gain.linearRampToValueAtTime(peak, t0 + halfPeriod);
      gainNode.gain.linearRampToValueAtTime(0, t0 + period);
      setTimeout(() => tick(startTime + period), period * 1000 - 100);
    };
    tick(ctx.currentTime);
  }

  // ─── FILTERED RAIN NOISE ───────────────────────────────────────────────────
  _startRainNoise() {
    const bufferSize = this.ctx.sampleRate * 3; // 3-second noise buffer, looped
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    // Bandpass filter to shape "rain" — center ~2kHz, narrow-ish
    const bp1 = this.ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = 2200;
    bp1.Q.value = 0.8;

    // Second softer highpass to add air
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1500;
    hp.Q.value = 0.5;

    // Slow LFO on rain level — adds subtle variation
    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0.06;

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.03; // ~30s cycle, very slow
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain);
    lfoGain.connect(rainGain.gain);
    lfo.start();
    this._nodes.push(lfo);

    noiseSource.connect(bp1);
    bp1.connect(hp);
    hp.connect(rainGain);
    rainGain.connect(this.masterGain);

    noiseSource.start();
    this._nodes.push(noiseSource);
  }

  // ─── DISTANT CITY HUM ──────────────────────────────────────────────────────
  // Two harmonics: 60Hz (electrical grid) + 180Hz (third harmonic)
  // + very low sub rumble at 28Hz
  _startCityHum() {
    const humFreqs = [28, 60, 180];
    const humVols  = [0.03, 0.025, 0.012];

    humFreqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();

      osc.type = freq < 50 ? 'sine' : 'sine';
      osc.frequency.value = freq;
      // Slight random detune for "imperfect" city feel
      osc.detune.value = (Math.random() - 0.5) * 4;

      lp.type = 'lowpass';
      lp.frequency.value = freq * 3;
      lp.Q.value = 0.5;

      gainNode.gain.value = humVols[i];

      osc.connect(lp);
      lp.connect(gainNode);
      gainNode.connect(this.masterGain);

      osc.start();
      this._nodes.push(osc);
    });
  }
}

// ─── Standalone auto-play (when loaded as a script tag) ──────────────────────
if (typeof window !== 'undefined' && document.currentScript?.dataset?.autoplay) {
  const track = new MenuTrack();
  document.addEventListener('click', () => track.start(), { once: true });
  window.__menuTrack = track;
}
