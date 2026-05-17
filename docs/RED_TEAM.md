# RED_TEAM.md — NEON://OVERRIDE Adversarial Review

```
reviewer : red (qa-test-engineer)
build    : v0.1.0-alpha
date     : 2026-05-17
verdict  : DO NOT SHIP — critical blockers present
```

---

## EXECUTIVE SUMMARY

NEON://OVERRIDE has excellent aesthetic bones — the HUD is polished, the hack
minigame overlay is genuinely cool, and the level generator's architecture is
clean. But the game is **unplayable in its current state** due to three fatal
structural gaps. Below those blockers are a stack of logic bugs, UX landmines,
and a tutorial that describes the wrong game entirely. All findings are ranked
by severity with concrete fixes.

---

## SEVERITY LEVELS

| Level | Meaning |
|-------|---------|
| **BLOCKER** | Game cannot run / is immediately soft-locked |
| **HIGH** | Breaks core mechanic; player hits it every run |
| **MEDIUM** | Significant frustration or confusion |
| **LOW** | Polish / tuning / exploitability |

---

## BLOCKERS (SHIP-STOPPERS)

### B-01 — Game entry point is a 404

`index.html` does a meta-refresh + JS redirect to `./website/index.html`.
That file **does not exist** — only `.gitkeep` is in `/website/`. Every
single player gets a 404 before seeing a pixel of game.

**Fix:** Either put the game canvas in `index.html` directly, or add
`website/index.html` as the real entry point. Don't redirect to nothing.

---

### B-02 — Core game loop does not exist

TECH_SPEC declares `game/main.js`, `game/player.js`, `game/enemies.js`,
`game/world.js`. **None of these files exist.** The game has a beautiful HUD,
a working level generator, and a hack minigame — and no game loop to call any
of them. You cannot press play.

**Fix:** `main.js` is the critical path. Player physics + game state machine
first; everything else is decoration until the loop runs.

---

### B-03 — Hack overlay doesn't pause the game loop

`hack.js`'s `start(callback)` pops up a full-screen DOM overlay and waits for
keystrokes, but **nothing pauses `requestAnimationFrame`**. The world keeps
scrolling. The player will slam into CorpSec units while trying to type a
5-key sequence. Either the player dies mid-hack every time, or the hack system
is never called because the player has already hit the obstacle.

**Fix:** `Hack.start()` must call `game.pause()` (or set `gameState =
'HACKING'`) before showing the overlay, and `resume()` in the callback.
Alternatively, give Vex-7 brief invincibility frames (e.g. 2s) when the hack
overlay opens, matching the GDD's stated "brief invincibility" behavior.

---

## HIGH SEVERITY

### H-01 — Movement keys hijacked during hack minigame

`hack.js` `KEYS` array = `['w','a','s','d','ArrowUp','ArrowLeft','ArrowDown',
'ArrowRight']`. These are *exactly* the game's movement and boost keys. The
`e.preventDefault()` call blocks them. Even with B-03 fixed (game paused),
this is a 5-key sequence demanding W/A/S/D inputs from a sequence that could
include jump (W/↑) or slide (S/↓). The input model should be dedicated hack
keys — **not** the movement keyset.

**Fix:** Use number keys (1–5) or a distinct input set for the hack sequence
UI (e.g. `F1`–`F5` or mouse clicks). Alternatively, display the sequence as
colored glyph tiles the player matches by clicking, eliminating the keyboard
conflict entirely and feeling more "hacker" anyway.

---

### H-02 — Three ICE wall variants specified but only one exists

GDD specifies Low ICE (jump), High ICE (slide gap), and Full ICE (H-hack
only), color-coded blue/red/white respectively. `level.js` only has one
`ICE_WALL` obstacle with a single `glowColor: '#00aaff'`. There is no
`ICE_LOW`, `ICE_HIGH`, or `ICE_FULL` variant — no slide gap, no color
distinction. Every ICE wall looks identical and behaves identically. The core
puzzle mechanic ("read the color, pick the response") doesn't exist.

**Fix:** Add three obstacle subtypes to the catalog:
```js
ICE_LOW:  { type:'ice_low',  w:30, h:80,  glow:'#0088ff', avoidance:'jump'  },
ICE_HIGH: { type:'ice_high', w:30, h:160, glow:'#ff2200', gap:true          },
ICE_FULL: { type:'ice_full', w:30, h:160, glow:'#ffffff', hackRequired:true },
```
Only spawn `ICE_FULL` from `allowedObstacles` in DEEP_GRID; introduce
`ICE_LOW` and `ICE_HIGH` in FIREWALL_BREACH.

---

### H-03 — CorpSec never spawns (missing from level catalog)

GDD gives CorpSec detailed behavior: 90% Vex-7 speed, tazer swipe, stun,
+200 bonus on evade — spawns after 800m. `level.js` `OBSTACLES` object: no
`CORPSEC` entry. `DEEP_GRID.allowedObstacles` = `['DRONE','ICE_WALL','GAP',
'LOW_PIPE']`. CorpSec never enters the level generator. The game's hardest
enemy is absent.

**Fix:** Add `CORPSEC: { type:'corpsec', w:40, h:80, ... }` to the catalog
and include it in `DEEP_GRID.allowedObstacles`. Add a distance guard in
`generateChunk` that skips CorpSec spawns below 800m.

---

### H-04 — GAP obstacle has zero height — invisible to AABB

`OBSTACLES.GAP = { ..., h: 0, ... }`. The AABB collision function:
```js
a.y < b.y + b.h && a.y + a.h > b.y
```
With `b.h = 0`: `a.y < b.y && a.y + a.h > b.y` — only true if Vex-7's
bounding box straddles an infinitely thin line. In practice, **gap collision
never fires**. Players fall into visual holes in the floor with no death trigger.

**Fix:** Gaps need a collider below the visible floor. Two options:
1. Model the gap as a kill-zone trigger with `h` equal to fall-through depth
   (e.g. 60px — same as the floor margin).
2. Drop a `KILL_ZONE` entity at the gap with positive dimensions and
   `type:'void'` that triggers instant death on contact.

---

### H-05 — Canvas height vs. lane layout mismatch (lane 3 is off-screen)

TECH_SPEC: canvas = 800×400px. `level.js`: `LANE_HEIGHT = 160`,
`LANE_Y = [80, 240, 400]`. Three lanes at 160px each = 480px. **Lane 2
center is y=400, exactly at canvas bottom.** An obstacle at lane 2 renders
half off-screen. ICE_WALL (h=160) in lane 2: `y = 400 - 80 = 320`,
bottom edge at y=480 — **80px off canvas**. Slide gaps in lane 2 are below
the visible area.

**Fix:** Either change canvas to 480px (cleaner) or collapse to 2 lanes:
```js
LANE_COUNT = 2;
LANE_Y     = [120, 320]; // comfortably inside 800×400
```
Two lanes keeps the runner tight and readable. Three lanes in 400px is too
cramped anyway.

---

### H-06 — Hack timing creates a guaranteed-death window

GDD: H-key hack has 3s cooldown. `hack.js`: minigame lasts up to 3000ms.
If cooldown starts at minigame-open, it expires the instant the minigame
resolves. Net result: **hack cooldown = 0** when chained perfectly.
Skilled players will spam hack with zero downtime, breaking the intended
risk/reward around cooldown management.

**Fix:** Cooldown should start when the minigame *resolves* (success or
failure), not when it opens. On failure, consider a 6s cooldown penalty
— failing a hack should hurt.

---

## MEDIUM SEVERITY

### M-01 — Tutorial strings describe a different game

`strings.js` tutorial step 2: *"tap [space] or [btn_a] to deploy payload.
hit the red processes."* Step 3: *"double-tap a direction to phase-shift."*
The game is a **runner**. There are no payloads to deploy, no red processes
to kill, no double-tap phase-shift. The strings describe a twin-stick
shooter. New players who read the tutorial will be completely lost.

**Fix:** Rewrite strings.js tutorial to match GDD Section 6:
```js
{ step:1, head:"step_01 // movement", body:"you're always running. [↑/W/SPACE] jumps. [↓/S] slides. the grid doesn't stop." },
{ step:2, head:"step_02 // hack",     body:"[H] to jack into ICE walls. 3-second cooldown. don't waste it." },
{ step:3, head:"step_03 // shards",   body:"grab data shards for score multiplier. chain them. don't get hit." },
```

---

### M-02 — HUD draws twice (DOM overlay + canvas 2D)

`hud.js` `draw()` calls both `_drawCanvas()` and `_updateDOM()` every frame.
Players see canvas-painted HUD elements (including a non-clickable "RESTART"
rectangle drawn in pixels) AND the DOM overlay simultaneously. The canvas
fake-button looks real but does nothing on click. The DOM button works but
may be hidden by z-index issues.

**Fix:** Pick one rendering path. The DOM overlay is richer — keep it.
Wrap `_drawCanvas()` in a flag: `if (this._canvasFallback) _drawCanvas()`.
Set `_canvasFallback = false` after DOM overlay builds successfully.

---

### M-03 — Score color flicker is random, not event-driven

`_updateDOM`: `if (_tick % 60 < 3)` forces score text to magenta for 3
frames every 60. This fires regardless of game events. Players will see
score flash magenta mid-run with no trigger — looks like a bug.

**Fix:** Only flash on score increase. Pass a `scoreDelta` in state:
```js
if (state.scoreDelta > 0) { scoreEl.classList.add('score-bump'); }
```
Remove the class after one animation cycle.

---

### M-04 — `maxHealth` is ignored, health cells are always 3

`_buildOverlay` hardcodes `for (let i = 0; i < 3; i++)`. State passes
`maxHealth` but it's never used to create cells. If the game designer
later sets `maxHealth = 5`, HUD still shows 3 cells. Low integrity values
against 5-health enemies will look wrong.

**Fix:** Build health cells dynamically from `maxHealth`:
```js
for (let i = 0; i < maxHealth; i++) { /* create cell */ }
```
Initialize HUD with `HUD.init(canvas, { maxHealth: 3 })`.

---

### M-05 — Bloom effect is a GPU readback bomb

`fx.js` `bloom()` reads the canvas back to CPU via `ctx.drawImage(canvas,
0, 0)` on a secondary canvas context. Every call causes a GPU→CPU sync
stall. At 60fps on an 800×400 canvas this adds ~8–15ms per frame on mid-tier
hardware — alone enough to drop to 30fps. The chromatic aberration is worse:
O(width × height) per-pixel JS loop = 320,000 iterations/frame.

**Fix:** Replace canvas-readback bloom with CSS `filter: blur() brightness()`
on a duplicate canvas element positioned absolutely (no readback). Or use
`ctx.shadowBlur` on neon elements at draw time (already done in HUD — extend
the pattern). Remove `chromaticAberration()` or gate it behind a
settings toggle defaulted off.

---

### M-06 — Difficulty hard cliffs at tier boundaries

`getDifficulty()` applies smooth ramping within a tier, but tier transitions
are instant: speed jumps from 460px/s (end of FIREWALL_BREACH) to 640px/s
(start of DEEP_GRID) — a **39% speed increase** in a single frame at the
1500m boundary. GDD specifies +0.3px/frame per 200m — that's a gradual 7.5%
ramp. The tier system contradicts the ramp spec.

**Fix:** Blend speed across the tier boundary using a 100m crossfade window:
```js
const blend = Math.min(1, (distance - tier.minDist) / 100);
const speed = lerp(prevTierSpeed, tier.speed, blend) + scalar * 80;
```

---

### M-07 — DEEP_GRID `[1,1,1]` gauntlet wave is inescapable

Wave `[1, 1, 1]` marks all three lanes active. Combined with density 0.65+
and the lane layout bug (H-05), a gauntlet at max density can spawn obstacles
in all lanes simultaneously with no safe path. The comment says "use
sparingly" but there's no spawn frequency limiter preventing consecutive
gauntlets. At DEEP_GRID a player could see two in a row.

**Fix:** Add a minimum gap enforcer:
```js
if (lastWasGauntlet && pattern.every(p => p === 1)) {
  pattern = pick(tier.waves.filter(w => !w.every(p => p === 1)));
}
```

---

### M-08 — Restart button re-binds `onclick` every frame

`_elements.restart.onclick = onRestart || null` executes every single frame
in `_updateDOM`. If `onRestart` is not passed in state (undefined), the button
is silently unbound. Players click "RESTART" and nothing happens. No error,
no feedback.

**Fix:** Bind `onclick` once in `_buildOverlay`, and have `onRestart` call
through a stable ref:
```js
_elements.restart.addEventListener('click', () => {
  if (_onRestartFn) _onRestartFn();
});
// Elsewhere: HUD.setRestartHandler(fn)
```

---

## LOW SEVERITY / POLISH

### L-01 — Score exploit via multiplier + EXPLOIT pickup

EXPLOIT pickups (500pts) at 8× multiplier = 4000pts per pickup. DEEP_GRID
still has 20% pickup rate. A skilled player staying alive and maintaining
8× will generate astronomical scores quickly, compressing the high-score
table. localStorage persistence means this is trivially exploitable (edit
localStorage directly).

**Suggestion:** Cap multiplier contribution to shards only (EXPLOIT gives
flat bonus, bypasses multiplier). Add a checksum to localStorage score to
detect tampering.

---

### L-02 — H key for hack is undiscoverable

`H` is not a standard game key. After the tutorial there's no HUD hint for
hack cooldown state or a reminder that H exists. When players first encounter
a Full ICE wall they'll try jumping, try sliding, die, and not know why.

**Suggestion:** Add a small `[H]` key indicator in the HUD with a cooldown
arc that dims when unavailable. Flash it when a Full ICE wall is on screen
within 200px.

---

### L-03 — `loading_long` string has a typo / inadvertent grammar

`strings.js`: `"patience is a exploit."` — should be `"patience is an
exploit."` This reads as a grammar error rather than intentional hacker voice.
(Hacker voice would be something like `"patience.exe"` or `"patience: buffer
filling."`)

---

### L-04 — Neon trail pool grows unbounded under sustained fire

`fx.js` `drawNeonTrail()` pushes to `this.neonTrails` every call with no pool
cap. TECH_SPEC mandates max 80 simultaneous particles. Under heavy particle
generation (player taking damage + hack burst + rain) the array could exceed
this. `splice()` in the update loop is O(n) and makes GC pressure worse.

**Fix:** Use a ring buffer of fixed size 80:
```js
if (this.neonTrails.length >= 80) this.neonTrails.shift();
```
Or implement the object pool described in TECH_SPEC Section 10.

---

### L-05 — Pickup spawns can overlap obstacles

`spawnPickups()` places pickups independently of obstacle placement. A shard
can spawn at `slotX + slotWidth * 0.5` inside an ICE wall occupying the same
`slotX`. Players see a shard they can never collect (it's inside a wall),
which is both frustrating and reads as a bug.

**Fix:** Pass the current slot's obstacle list to `spawnPickups()` and skip
spawn if x/y overlaps any obstacle AABB.

---

### L-06 — `sector_loading` string uses placeholder `{n}` literally

`strings.js`: `"patching into sector {n}..."`. No templating engine is wired
up. If this string is displayed as-is, players see the literal text `{n}`.

**Fix:** Replace with a `getSectorString(n)` function:
```js
getSectorString: (n) => `patching into sector ${String(n).padStart(2,'0')}...`
```

---

### L-07 — Rain is cosmetic but adds real frame cost

`fx.js` `spawnRain()` runs a `splice()` loop on every raindrop every frame.
With density 0.2 spawning 1 drop per ~5 frames and drops living ~50–100
frames, the array sustains ~10–20 entries. Splice is not terrible at this
size. But combined with bloom, this adds up in the 6ms frame budget.

**Suggestion:** Pre-allocate a rain pool of 30 drops; recycle by resetting
`y = -10, x = random`. Avoids GC churn.

---

## IS THE CYBERPUNK VIBE EARNED OR PASTED ON?

**Earned:**
- HUD vocabulary is genuinely good: `DIST`, `SYS`, `DATA_HARVESTED`, corner
  accents, glitch animation, CRT scanline overlay. This feels like a terminal.
- `hack.js` glyph sequences (`─`,`█`,`▓`,`░`,`╳`) are great atmosphere. The
  breach sequence timer with green glow is the single coolest piece of UX in
  the project.
- Game-over taunts in `strings.js` are sharp. "Garbage collected." is perfect.
- Color palette (cyan/magenta on near-black) is disciplined and consistent.
- `strings.js` NPC voice (Static) has a distinct personality.

**Pasted On:**
- The tutorial describes a shooter, not a cyberpunk runner. Immersion breaks
  immediately on the first screen a player reads.
- "Neo-Kowloon 2087" and "Vex-7" are in the GDD but nowhere in-game (strings,
  boot screen, death screen). The world has a name but the game doesn't say it.
- Boost sprint (`→/D`) has no thematic name. GDD just calls it "boost sprint."
  A game where you hack ICE should call it something like `OVERCLOCK` or
  `JACK-SPRINT`. Small thing, big vibes.
- Background parallax (city silhouette, neon signs, scaffolding) is in the
  GDD but `world.js` doesn't exist. Without it the game feels like a grey void
  with colored rectangles. The cyberpunk is entirely in the HUD layer;
  the game world has no setting.

---

## PRIORITIZED FIX LIST

```
SHIP-BLOCKER (fix before any playtesting):
  B-02  Create main.js with game loop + player.js with physics
  B-01  Create website/index.html (or move game into index.html)
  B-03  Pause game loop during hack minigame
  H-01  Fix hack key sequence to not use movement keys

CRITICAL (fix before any public demo):
  H-02  Implement 3 ICE wall variants with color coding
  H-03  Add CorpSec to level catalog
  H-04  Fix GAP obstacle height to positive value
  H-05  Fix canvas height vs lane layout (use 2 lanes)
  M-01  Rewrite tutorial strings to match actual game controls

IMPORTANT (fix before jam showcase):
  M-02  Single HUD rendering path (DOM only)
  M-05  Replace canvas-readback bloom with CSS filter
  M-06  Smooth tier speed transitions
  M-07  Add gauntlet consecutive spawn limiter
  H-06  Fix hack cooldown start time

POLISH (if time allows):
  L-02  Add H-key hint in HUD near ICE walls
  L-01  Clamp EXPLOIT pickup score bypass
  L-05  Prevent pickup/obstacle overlap
  L-04  Cap neon trail pool at 80
  L-03  Fix "a exploit" typo
  L-06  Fix {n} template literal in sector string
```

---

## CLOSING TAKE

The project has real style. The hack minigame, the HUD, and the level
generator are solid foundations. But three files that contain the *actual game*
don't exist yet — no game loop, no player, no world. Everything else is a
beautiful UI shell around a missing engine. That's the only thing that matters
right now.

Fix B-01 through B-03 and H-01 and you have something playable. Fix everything
in the CRITICAL tier and you have something good. The cyberpunk vibe is
genuinely there in the code that exists — don't let tutorial copy and a missing
`main.js` bury it.

Ship the game first. Polish the corpse later.

```
// red out
```
