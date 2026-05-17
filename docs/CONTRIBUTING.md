# Contributing to NEON://OVERRIDE

Welcome to the underground. NEON://OVERRIDE is open-source (MIT code, CC-BY 4.0 art/music). If you want to add levels, sprites, music tracks, or fix bugs — this guide tells you exactly how.

> **Stack:** Vanilla JavaScript, HTML5 Canvas, Web Audio API. No build step. No framework. No bundler. Open `index.html` in a browser and you're running the game.

---

## Before You Start

1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Open `index.html` in Chrome 90+ or Firefox 90+.
4. Make changes. Reload the browser. Iterate.
5. Open a pull request against `main`.

That's it. There is no `npm install`. There is no compile step.

---

## Repository Map

```
/
├── index.html          ← Game entry point; loads all scripts
├── game/
│   ├── constants.js    ← Every tunable number in one place
│   ├── main.js         ← Game loop + state machine
│   ├── player.js       ← Vex-7: input, physics, animation
│   ├── enemies.js      ← Drone, ICEWall, CorpSec classes
│   ├── level.js        ← Procedural chunk + wave generator  ← START HERE for levels
│   ├── hack.js         ← ICE breach minigame overlay
│   ├── world.js        ← Parallax background, floor
│   ├── ui.js           ← HUD, score, death screen, tutorial
│   ├── audio.js        ← Web Audio API synth + SFX
│   └── fx.js           ← Particles, neon glow, screen flash
├── art/                ← PNG sprites (optional — game runs without them)
├── music/              ← Audio tracks (optional)
├── lore/               ← World bible, character files
└── docs/               ← Design documents (you are here)
```

---

## How to Add a Level / Wave Pattern

Levels in NEON://OVERRIDE are **procedural chunks**, not hand-authored maps. You control them by editing `game/level.js`.

### Understanding the structure

The level system has three layers:

1. **Tiers** — named difficulty phases (`BOOT_SEQUENCE`, `FIREWALL_BREACH`, `DEEP_GRID`).
2. **Wave patterns** — per-tier arrays that declare which lanes are active in a given chunk.
3. **Obstacle catalogue** — the set of things that can spawn.

### Add a new obstacle type

Open `game/level.js` and add an entry to the `OBSTACLES` object:

```js
const OBSTACLES = {
  // existing entries...
  SPIKE_TRAP: {
    type:     'spike_trap',
    w:        50,
    h:        20,
    points:   0,
    passable: false,
    lanes:    [2],          // only spawns in the bottom lane
  },
};
```

Then add `'SPIKE_TRAP'` to the `allowedObstacles` array of any tier where it should appear:

```js
{
  label:   'DEEP_GRID',
  // ...
  allowedObstacles: ['DRONE', 'ICE_WALL', 'GAP', 'LOW_PIPE', 'SPIKE_TRAP'],
```

The renderer in `enemies.js` will look for a sprite at `/art/spike_trap.png`. If the file is absent, it falls back to a coloured rectangle with a neon glow. No other code changes are required.

### Add a new difficulty tier

Insert a new object into the `TIERS` array in `level.js`. Tiers are evaluated from lowest `minDist` to highest, so order matters:

```js
{
  label:        'NEURAL_STORM',    // shown in HUD
  minDist:      2000,
  maxDist:      4000,
  speed:        780,               // px/s — faster than DEEP_GRID baseline
  density:      0.75,              // fraction of slots that get an obstacle
  pickupRate:   0.15,              // fraction of slots that get a pickup
  allowedObstacles: ['DRONE', 'ICE_WALL', 'SPIKE_TRAP'],
  waves: [
    [1, 0, 1],
    [1, 1, 0],
    [0, 1, 1],
  ],
},
```

**Wave pattern format:** each entry is an array of `LANE_COUNT` (3) integers. `1` = obstacle active in this lane, `0` = clear. The generator uses these as weighted hints, not hard mandates — the density scalar can suppress individual lanes.

### Add a new pickup type

Add an entry to the `PICKUP` object in `level.js`:

```js
const PICKUP = {
  // existing entries...
  NEURAL_KEY: {
    type:   'neural_key',
    w:      36,
    h:      36,
    points: 1000,
    color:  '#ff6600',       // fallback render color if no sprite
  },
};
```

Then adjust the probability distribution in `spawnPickups()`:

```js
const roll = Math.random();
if (roll < 0.60)       template = PICKUP.DATA_SHARD;
else if (roll < 0.85)  template = PICKUP.CREDITS;
else if (roll < 0.98)  template = PICKUP.EXPLOIT;
else                   template = PICKUP.NEURAL_KEY;  // 2% drop rate
```

---

## How to Add Sprites

All sprites are optional. The game runs without them using coloured-rectangle fallbacks.

### Naming and location

| Entity | Expected file |
|---|---|
| Player (Vex-7) | `/art/vex7.png` |
| Patrol Drone | `/art/drone.png` |
| ICE Wall | `/art/ice_wall.png` |
| CorpSec Unit | `/art/corpsec.png` |
| Data Shard | `/art/shard.png` |
| Credits pickup | `/art/credits.png` |
| Exploit pickup | `/art/exploit.png` |
| Background layer 1 (far) | `/art/bg_city.png` |
| Background layer 2 (mid) | `/art/bg_neon.png` |
| Background layer 3 (near) | `/art/bg_scaffold.png` |

For any new obstacle or pickup you add, the expected path is `/art/<type>.png` where `<type>` matches the `type` field in the catalogue.

### Sprite requirements

| Property | Requirement |
|---|---|
| Format | PNG with transparency (RGBA) |
| Player size | 48 × 72 px |
| Enemy size | Match the `w` × `h` values in `OBSTACLES` |
| Background layers | 1600 × 400 px (2× canvas width, for seamless loop) |
| Color palette | Neon cyan `#00FFFF`, magenta `#FF00FF`, orange `#FF6600` on near-black `#0A0A0F` |

### Spritesheet animation

If you want to animate the player or enemies, the engine expects a horizontal spritesheet:

- All frames the same width (48px for Vex-7)
- Left to right: idle frame(s), then run cycle, then jump, then slide, then hack
- Declare frame counts in `game/constants.js` under `SPRITE_FRAMES`

---

## How to Add Music Tracks

### Web Audio (no file required)

`game/audio.js` exports `sfx.play(name)` and `music.start()` / `music.stop()`. For synthesis-only tracks, add new functions to `audio.js` using the Web Audio API:

```js
// audio.js
function playChaseTrack(ctx) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  // ... build your patch ...
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  return osc; // caller stops it
}

export const music = {
  start: () => { /* swap in your track */ },
  stop:  () => { /* stop oscillators */ },
};
```

### Audio file tracks (`.ogg` / `.mp3`)

1. Place your file in `/music/`. Preferred format: `.ogg` (broad browser support) with an `.mp3` fallback.
2. Name it descriptively: `main_theme.ogg`, `chase.ogg`, `boss_sting.ogg`.
3. In `audio.js`, load it with the standard `AudioContext` + `fetch` + `decodeAudioData` pattern:

```js
async function loadTrack(ctx, path) {
  const res  = await fetch(path);
  const buf  = await res.arrayBuffer();
  return ctx.decodeAudioData(buf);
}
```

4. Swap the buffer into the `music.start()` function in place of the synthesized track.

### SFX additions

Add new sound effects to the `sfx` map in `audio.js`:

```js
const SFX = {
  // existing...
  slide: (ctx) => { /* short noise burst */ },
  boost: (ctx) => { /* brief FM sweep up */ },
};
```

Call `sfx.play('boost')` from the relevant entity class.

---

## How to Add a New Enemy Class

1. Add the obstacle definition to `OBSTACLES` in `level.js` (see above).
2. Create a class in `game/enemies.js` that extends `Entity`:

```js
class SpikeTrap extends Entity {
  constructor(x, y) {
    super(x, y, 50, 20, '#ff3300');
    this.glowColor = '#ff6600';
    this.type = 'spike_trap';
  }

  update(dt, worldSpeed) {
    this.x -= worldSpeed * dt;    // scroll left with the world
  }

  draw(ctx) {
    const sprite = sprites['spike_trap'];
    if (sprite) {
      ctx.drawImage(sprite, this.x, this.y, this.w, this.h);
    } else {
      super.draw(ctx);             // fallback rect
    }
  }

  onCollide(player) {
    player.takeDamage(1);
  }
}
```

3. Register it in the chunk spawner in `game/main.js` so that `obstacle.type === 'spike_trap'` creates a `SpikeTrap` instance.

---

## Code Style

- **Vanilla JS only.** No TypeScript, no JSX, no frameworks.
- **IIFE or ES module** — prefer the IIFE pattern (`(function(global){...})(window)`) for files that must load before `main.js`. Use `export`/`import` for files in the module graph.
- **All magic numbers** live in `game/constants.js`. Do not hardcode values in entity classes.
- **Comment the why, not the what.** A line of code that reads `this.x -= worldSpeed * dt` does not need a comment. A line that sets `hitboxScale = 0.8` should explain: `// intentionally forgiving hitbox for game feel`.
- **No dependencies.** If you find yourself reaching for lodash, roll the three-line version.

---

## Pull Request Checklist

Before opening a PR:

- [ ] Game opens in Chrome/Firefox without console errors
- [ ] New obstacle or pickup appears in-game at the correct distance tier
- [ ] Sprite fallback (no `/art/` file) still renders and collides correctly
- [ ] Audio change does not break the silence/mute flow (never auto-plays before user gesture)
- [ ] `constants.js` updated if you introduced new tunable values
- [ ] Commit message describes *what changed and why*, not just *what*

---

## Design Principles

NEON://OVERRIDE is a game about *flow* and *legibility*. Every design decision should ask: does this make the player feel fast, clever, and in control — right up until the moment they die?

- Obstacles must be avoidable on first sight. If a player dies to something they couldn't read, that is a design bug.
- New mechanics must have a visual or audio tell. The ICE wall's blue glow means "hackable." Break that contract and you break player trust.
- Difficulty should come from speed and density, not from hidden state. No invisible timers. No RNG that cannot be outplayed.

---

## Getting Help

- Open a [GitHub Discussion](https://github.com/timeforcamp/the-grid-50-agents/discussions) for questions.
- Open an [Issue](https://github.com/timeforcamp/the-grid-50-agents/issues) for bugs with a reproduction case.
- Read [`docs/GDD.md`](GDD.md) for the canonical game design spec.
- Read [`docs/TECH_SPEC.md`](TECH_SPEC.md) for engine architecture details.

---

*NEON://OVERRIDE — built in the Grid by 50 agents who believe in shipping.*
