/**
 * NEON://OVERRIDE — Vocal Hook Synthesizer
 * "Override — I'm alive, I'm alive, I'm alive."
 *
 * Approximates whispered/vocoded speech via:
 *   - Formant-tuned bandpass filters (F1/F2 per vowel)
 *   - Sawtooth carrier (voiced) + noise carrier (whisper)
 *   - Amplitude envelope per phoneme segment
 *   - Subtle pitch vibrato + glide
 *
 * Usage (browser):
 *   import { VocalHook } from './vocal_hook.js';
 *   const hook = new VocalHook();
 *   hook.play();          // plays the full hook once
 *   hook.loop(true);      // loop it
 *   hook.stop();
 *
 * Usage (Node / test):
 *   node vocal_hook.js    // prints phoneme schedule to console
 */

// ─── Formant Table (F1, F2 in Hz) ────────────────────────────────────────────
// Approximate vowel formants for a baritone/androgynous voice
const FORMANTS = {
  // vowel : [F1,   F2  ]
  'AH':     [800,  1200],   // "Override" O→AH
  'OH':     [450,   800],   // "O" in Override
  'EH':     [600,  1700],   // "e" in Override
  'IY':     [280,  2200],   // "I'm" / "alive"
  'AE':     [700,  1660],   // "a" in alive
  'AY':     [660,  1200],   // diphthong in "alive" / "I"
  'UH':     [640,  1200],   // schwa
  'SIL':    [0,    0   ],   // silence
};

// ─── Phoneme Script ───────────────────────────────────────────────────────────
// Each entry: { text, vowel, pitch (Hz), dur (s), amp }
// "Override — I'm alive, I'm alive, I'm alive."
const PHONEME_SCRIPT = [
  // "O  - ver - ride"
  { text: 'O',    vowel: 'OH',  pitch: 130, dur: 0.18, amp: 0.6  },
  { text: 'ver',  vowel: 'EH',  pitch: 128, dur: 0.14, amp: 0.55 },
  { text: 'ride', vowel: 'AY',  pitch: 132, dur: 0.28, amp: 0.8  },
  { text: '—',    vowel: 'SIL', pitch: 0,   dur: 0.20, amp: 0    },
  // "I'm"
  { text: "I'm",  vowel: 'AY',  pitch: 125, dur: 0.22, amp: 0.65 },
  { text: '—',    vowel: 'SIL', pitch: 0,   dur: 0.06, amp: 0    },
  // "a - live"
  { text: 'a',    vowel: 'UH',  pitch: 118, dur: 0.10, amp: 0.45 },
  { text: 'live', vowel: 'IY',  pitch: 138, dur: 0.30, amp: 0.9  },
  { text: ',',    vowel: 'SIL', pitch: 0,   dur: 0.18, amp: 0    },
  // "I'm alive" (repeat 1)
  { text: "I'm",  vowel: 'AY',  pitch: 130, dur: 0.20, amp: 0.6  },
  { text: '—',    vowel: 'SIL', pitch: 0,   dur: 0.05, amp: 0    },
  { text: 'a',    vowel: 'UH',  pitch: 122, dur: 0.10, amp: 0.45 },
  { text: 'live', vowel: 'IY',  pitch: 142, dur: 0.32, amp: 0.92 },
  { text: ',',    vowel: 'SIL', pitch: 0,   dur: 0.15, amp: 0    },
  // "I'm alive" (repeat 2 — big, final)
  { text: "I'm",  vowel: 'AY',  pitch: 135, dur: 0.22, amp: 0.7  },
  { text: '—',    vowel: 'SIL', pitch: 0,   dur: 0.05, amp: 0    },
  { text: 'a',    vowel: 'UH',  pitch: 128, dur: 0.10, amp: 0.5  },
  { text: 'live', vowel: 'IY',  pitch: 148, dur: 0.50, amp: 1.0  },
  { text: '.',    vowel: 'SIL', pitch: 0,   dur: 0.40, amp: 0    },
];

// ─── VocalHook Class ──────────────────────────────────────────────────────────
export class VocalHook {
  constructor(options = {}) {
    this.whisperRatio  = options.whisperRatio  ?? 0.55;  // 0 = pure voiced, 1 = pure whisper
    this.masterGain    = options.masterGain    ?? 0.4;
    this.reverbWet     = options.reverbWet     ?? 0.45;
    this.vibratoRate   = options.vibratoRate   ?? 5.2;   // Hz
    this.vibratoDepth  = options.vibratoDepth  ?? 3;     // Hz cents

    this._ctx      = null;
    this._looping  = false;
    this._stopFlag = false;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Play the hook once (returns a Promise that resolves when done). */
  async play() {
    this._stopFlag = false;
    this._ctx = this._ctx || new AudioContext();
    if (this._ctx.state === 'suspended') await this._ctx.resume();
    await this._renderHook(this._ctx);
  }

  /** Enable / disable looping. Call play() after to start. */
  loop(enabled = true) {
    this._looping = enabled;
  }

  /** Stop playback. */
  stop() {
    this._stopFlag = true;
    this._looping  = false;
    if (this._ctx) {
      this._ctx.close();
      this._ctx = null;
    }
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  async _renderHook(ctx) {
    const master  = ctx.createGain();
    master.gain.value = this.masterGain;

    const reverb  = await this._buildReverb(ctx);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = this.reverbWet;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1 - this.reverbWet;

    master.connect(dryGain);
    master.connect(reverbGain);
    dryGain.connect(ctx.destination);
    reverbGain.connect(reverb);
    reverb.connect(ctx.destination);

    let t = ctx.currentTime + 0.05; // small start offset

    for (const phoneme of PHONEME_SCRIPT) {
      if (this._stopFlag) break;
      if (phoneme.vowel === 'SIL') {
        t += phoneme.dur;
        continue;
      }
      this._schedulePhoneme(ctx, phoneme, t, master);
      t += phoneme.dur;
    }

    // Wait for the sequence to finish
    const totalDur = PHONEME_SCRIPT.reduce((s, p) => s + p.dur, 0);
    await this._sleep((totalDur + 0.1) * 1000);

    if (this._looping && !this._stopFlag) {
      await this._renderHook(ctx);
    }
  }

  _schedulePhoneme(ctx, phoneme, startTime, destination) {
    const { vowel, pitch, dur, amp } = phoneme;
    const [f1, f2] = FORMANTS[vowel];

    const endTime    = startTime + dur;
    const attackTime = Math.min(0.02, dur * 0.1);
    const releaseTime = Math.min(0.04, dur * 0.2);

    // ── Voiced carrier (sawtooth) ──────────────────────────────────────────
    const sawOsc = ctx.createOscillator();
    sawOsc.type = 'sawtooth';
    sawOsc.frequency.setValueAtTime(pitch, startTime);

    // Vibrato LFO
    const lfo = ctx.createOscillator();
    lfo.frequency.value = this.vibratoRate;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = this.vibratoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(sawOsc.frequency);
    lfo.start(startTime);
    lfo.stop(endTime);

    // ── Whisper carrier (noise) ────────────────────────────────────────────
    const noiseNode  = this._createNoise(ctx, dur);
    noiseNode.start(startTime);
    noiseNode.stop(endTime);

    // ── Voiced gain ────────────────────────────────────────────────────────
    const voicedGain = ctx.createGain();
    voicedGain.gain.value = 1 - this.whisperRatio;
    sawOsc.connect(voicedGain);

    // ── Whisper gain ───────────────────────────────────────────────────────
    const whisperGain = ctx.createGain();
    whisperGain.gain.value = this.whisperRatio;
    noiseNode.connect(whisperGain);

    // ── Formant filters ────────────────────────────────────────────────────
    // F1
    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = f1;
    bp1.Q.value = 8;

    // F2
    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = f2;
    bp2.Q.value = 12;

    // Mix carriers → filters
    voicedGain.connect(bp1);
    whisperGain.connect(bp1);
    voicedGain.connect(bp2);
    whisperGain.connect(bp2);

    // ── Amplitude envelope ─────────────────────────────────────────────────
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, startTime);
    envGain.gain.linearRampToValueAtTime(amp, startTime + attackTime);
    envGain.gain.setValueAtTime(amp, endTime - releaseTime);
    envGain.gain.linearRampToValueAtTime(0, endTime);

    bp1.connect(envGain);
    bp2.connect(envGain);
    envGain.connect(destination);

    sawOsc.start(startTime);
    sawOsc.stop(endTime);
  }

  /** Create a white noise source of given duration. */
  _createNoise(ctx, dur) {
    const sampleRate = ctx.sampleRate;
    const frameCount = Math.ceil(sampleRate * (dur + 0.1));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data   = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }

  /** Build a simple convolution reverb (synthetic impulse). */
  async _buildReverb(ctx) {
    const sampleRate = ctx.sampleRate;
    const length     = sampleRate * 2.4; // 2.4s tail
    const impulse    = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.2);
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    return convolver;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─── CLI / Node debug output ──────────────────────────────────────────────────
// When run directly with Node, print the phoneme schedule instead of playing.
const isMain =
  typeof process !== 'undefined' &&
  typeof require !== 'undefined' &&
  require.main === module;

if (isMain) {
  console.log('\n🎤  NEON://OVERRIDE — Vocal Hook: "Override — I\'m alive, I\'m alive, I\'m alive."\n');
  console.log('Phoneme schedule:');
  console.log('─'.repeat(60));
  let t = 0;
  for (const p of PHONEME_SCRIPT) {
    const bar = p.amp > 0
      ? '█'.repeat(Math.round(p.amp * 20))
      : '·'.repeat(4);
    console.log(
      `  t=${t.toFixed(3)}s  [${p.text.padEnd(6)}]  vowel=${p.vowel.padEnd(4)}  ` +
      `pitch=${String(p.pitch || 0).padStart(3)}Hz  dur=${p.dur.toFixed(3)}s  ${bar}`
    );
    t += p.dur;
  }
  console.log('─'.repeat(60));
  console.log(`  Total duration: ${t.toFixed(3)}s\n`);
  console.log('In browser: import { VocalHook } from "./vocal_hook.js" then new VocalHook().play();\n');
}
