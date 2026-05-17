# NEON://OVERRIDE — Chase / Action Track

**File:** `music/chase.js`
**BPM:** 140
**Key:** A minor (Am) — fully compatible with main theme (Am / Dm cross-fades cleanly)
**Style:** Cyberpunk dark techno / industrial

---

## Track Brief

The Chase track fires when the player hits the **first powerup** or crosses **1,000 metres**. It is designed to signal a gear-shift in threat level — the world is now actively hostile. Everything gets heavier, faster, and meaner.

### Production Notes

| Layer | Technique | Character |
|---|---|---|
| **Kick drum** | Pitched sine (120→40 Hz) through waveshaper + click transient | Heavy, punchy, slightly distorted — industrial thump |
| **Snare** | Bandpass noise burst + triangle tone | Cracking, lo-fi, aggressive |
| **Hi-hats** | High-pass noise, closed + open offbeats | Relentless forward momentum |
| **Bass arp** | Sawtooth → lowpass (resonant) → compressor | 16th-note arpeggios cycling Am7 → Dm → Am → Em |
| **Lead** | Detuned square + sawtooth → heavy distortion → bandpass | Stabby, gritty melodic hits |
| **Sub pad** | Sine at root A (55 Hz) | Fills low end, tension underneath |

### Chord Progression (4-bar loop)

```
| Am7    | Dm     | Am     | Em     |
```

Matches the Am framework of the main theme so both tracks can be layered or cross-faded without harmonic clash.

### Emotional Arc

- **Bar 1–2:** Shock. Kick + arp hit immediately. Snare locks in.
- **Bar 3–4:** Lead enters — melodic but distorted, cyberpunk menace.
- **Loop:** Builds tension indefinitely; pace feels like running through a neon-lit corridor being chased by something very fast.

---

## Integration

```html
<script src="music/chase.js"></script>
```

```js
// Trigger on first powerup or 1000m milestone:
window.Chase.play();

// Stop (e.g., on player death or level end):
window.Chase.stop();
```

`Chase.isPlaying()` returns a boolean for state checks.

---

## Coordination

- **Key compatibility:** Am — works with main theme's Am/Dm centre.
- **Cross-fade:** Stop/start calls include 0.5s fade-in and 1.2s fade-out to allow smooth transitions.
- **No shared AudioContext assumptions** — Chase creates its own context on first `play()` call.
