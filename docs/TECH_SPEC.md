# NEON://OVERRIDE — Technical Specification

---

## 1. Stack & Constraints

| Property | Value |
|----------|-------|
| Language | Vanilla JavaScript (ES2020, no build step) |
| Entry point | `index.html` — single file bootstraps everything |
| Renderer | HTML5 Canvas 2D API |
| Target FPS | 60 (via `requestAnimationFrame`) |
| External deps | **None** for MVP |
| Asset loading | Optional PNG sprites from `/art/` if present |
| Persistence | `localStorage` for high score |
| Browser support | Chrome 90+, Firefox 90+, Edge 90+ |

---

## 2. File Structure

```
/
├── index.html          ← game entry, inline <style>, loads game.js
├── game/
│   ├── main.js         ← game loop, state machine
│   ├── player.js       ← Vex-7 entity, input, physics
│   ├── enemies.js      ← Drone, ICEWall, CorpSec classes
│   ├── world.js        ← scrolling background, parallax layers
│   ├── ui.js           ← HUD, score, tutorial prompts, death screen
│   ├── audio.js        ← Web Audio API synth (no files needed)
│   └── constants.js    ← all magic numbers in one place
├── art/                ← optional PNG sprites (auto-detected at load)
│   ├── vex7.png
│   ├── drone.png
│   └── ...
├── docs/
│   ├── GDD.md
│   └── TECH_SPEC.md
└── README.md
```

---

## 3. Game Loop

```js
// main.js
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap dt at 50ms
  lastTime = timestamp;

  update(dt);   // physics, collision, difficulty ramp
  render();     // clear → world → entities → UI

  requestAnimationFrame(gameLoop);
}
```

- `update()` is deterministic given `dt` — no absolute-time drift.
- All velocities expressed in **pixels-per-second** internally; `dt` normalises them.
- Canvas resolution: **800 × 400** logical pixels; CSS scales to fill viewport preserving aspect ratio.

---

## 4. Entity System (Lightweight OOP)

```js
class Entity {
  constructor(x, y, w, h, color) { ... }
  update(dt) {}
  draw(ctx) {
    // MVP: filled rect + glow
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.w, this.h);
    // If sprite loaded: ctx.drawImage(this.sprite, ...)
  }
  getBounds() { return { x, y, w, h }; }
}
```

Subclasses: `Player`, `Drone`, `ICEWall`, `CorpSec`, `DataShard`, `ParticleEffect`.

---

## 5. Sprite Loading Strategy

```js
// constants.js
const SPRITE_PATHS = {
  player: '/art/vex7.png',
  drone:  '/art/drone.png',
  ice:    '/art/ice_wall.png',
  corpsec:'/art/corpsec.png',
  shard:  '/art/shard.png',
};

// main.js — at init
async function loadSprites() {
  for (const [key, path] of Object.entries(SPRITE_PATHS)) {
    try {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;  // rej = silent fallback
        img.src = path;
      });
      sprites[key] = img;
    } catch { /* no sprite = use rect fallback */ }
  }
}
```

Entities check `sprites[key]` before drawing. Absence = colored rect + glow. **No sprites required for game to run.**

---

## 6. Collision Detection

- AABB (axis-aligned bounding box) only — sufficient for runner genre.
- Player hitbox is **intentionally slightly smaller** than visual (80% width, 90% height) for "feel".
- Collision check runs once per frame after update sweep.

```js
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}
```

---

## 7. Physics

- **Gravity:** 1400 px/s²  
- **Jump impulse:** −520 px/s  
- **Double-jump impulse:** −420 px/s (once per airtime)  
- **Slide:** sets player height to 50% for 0.6s, then restores  
- **Ground Y:** canvas height − 60px (floor)  
- No friction model needed — horizontal movement is world-scroll only.

---

## 8. Audio (Web Audio API — no files)

- Synthesized sounds only for MVP:
  - Jump: short sine blip up
  - Land: low thud (noise burst)
  - Hack: FM sweep
  - Hit: distorted buzz
  - Background music: looping procedural beat via `OscillatorNode` + `GainNode`
- `audio.js` exports `sfx.play('jump')` interface — easy to swap for loaded audio later.

---

## 9. State Machine

```
TITLE → TUTORIAL (skippable) → PLAYING → PAUSED → DEAD → TITLE
```

State stored in `gameState` string. Each state has `enter()`, `update()`, `render()` handlers.

---

## 10. Performance Budget (60fps @ 800×400)

| Task | Budget |
|------|--------|
| World / parallax draw | ~2ms |
| Entity updates + draw | ~3ms |
| Collision detection | <0.5ms |
| UI overlay | ~0.5ms |
| **Total target** | **< 6ms / frame** |

- Particle pool: max 80 simultaneous particles, reused via object pool.
- Enemy pool: max 10 simultaneous enemies on screen.
- No GC pressure from `new` in hot loop — use pool pattern.

---

## 11. Difficulty Constants (tweak in `constants.js`)

```js
export const DIFFICULTY = {
  BASE_SPEED: 4,          // px/frame
  SPEED_CAP: 12,
  SPEED_INCREMENT: 0.3,   // per 200m
  SPAWN_INTERVAL_BASE: 90,// frames
  SPAWN_INTERVAL_MIN: 30,
  CORPSEC_DISTANCE: 8000, // px (~800m)
  HACK_COOLDOWN: 3000,    // ms
  BOOST_DURATION: 1500,
  BOOST_COOLDOWN: 5000,
};
```
