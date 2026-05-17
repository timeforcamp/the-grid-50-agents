# NEON://OVERRIDE — Game Design Document
**Genre:** Cyberpunk Side-Scrolling Runner  
**Platform:** HTML5 Canvas (Desktop browser)  
**Setting:** Neo-Kowloon, 2087  
**Protagonist:** Vex-7, a synthetic courier running the city's black-data underground

---

## 1. Core Loop

> Run → Survive → Score → Die → Retry

1. The world auto-scrolls left at increasing speed.
2. Vex-7 is always moving. The player **jumps, slides, and hacks** to dodge threats.
3. Collecting **Data Shards** boosts score multiplier.
4. When HP hits 0 or Vex-7 is caught, the run ends — show score, best score, prompt retry.

**Session length target:** 1–5 minutes. Every run is faster than the last.

---

## 2. Controls

| Input | Action |
|-------|--------|
| `↑` / `W` / `SPACE` | Jump (double-jump available once per air time) |
| `↓` / `S` | Slide (crouch under obstacles, lasts 0.6s) |
| `H` | Hack — brief invincibility + destroys nearest ICE wall or stuns nearest drone (3s cooldown) |
| `→` / `D` | Boost sprint (hold for 1.5s speed burst, 5s cooldown) |
| `P` / `ESC` | Pause |

---

## 3. Enemy Types

### 3.1 Patrol Drone (★ Easy)
- Flies in sine-wave pattern at mid-height.
- **Avoidance:** Jump over or slide under depending on wave phase.
- **Hacked:** Explodes, grants +50 pts bonus.
- Speed scales with game difficulty.

### 3.2 ICE Wall (★★ Medium)
- Static or slow-moving vertical barrier. Two variants:
  - **Low ICE** — jump over it.
  - **High ICE** — slide through a gap at the bottom.
  - **Full ICE** — must `H`-hack to destroy; indestructible otherwise.
- Color-coded: blue = low, red = high, white = full.

### 3.3 CorpSec Unit (★★★ Hard)
- Armored human-form enforcer. Runs at ~90% of Vex-7 speed.
- Can't be jumped — must slide past their taser swipe or hack to stun.
- After 5s stun window, despawns. If Vex-7 slows/stops: tackle = instant death.
- Appears only after distance ≥ 800m.

---

## 4. Scoring

| Event | Points |
|-------|--------|
| Distance traveled | +1 pt per 10px |
| Data Shard collected | +100 pts |
| Shard streak × multiplier | ×1 → ×2 → ×4 → ×8 (resets on hit) |
| Drone hacked | +50 bonus |
| ICE Wall hacked | +30 bonus |
| CorpSec evaded | +200 bonus |

**High score** is persisted in `localStorage`.

---

## 5. Difficulty Curve

| Phase | Distance | World Speed | Spawn Rate | Notes |
|-------|----------|-------------|------------|-------|
| Boot | 0–200m | 4 px/frame | Low | Tutorial prompts active |
| Street | 200–600m | 5 px/frame | Medium | Drones + Low/High ICE |
| Neon District | 600–1200m | 6 px/frame | Medium-High | Full ICE walls introduced |
| CorpZone | 1200–2000m | 7 px/frame | High | CorpSec units begin spawning |
| Deep Grid | 2000m+ | 8–12 px/frame (ramps) | Very High | All enemy types; Shard density increases |

Speed increments every 200m by +0.3 px/frame (capped at 12).

---

## 6. Three-Screen Tutorial Flow

### Screen 1 — JACK IN
- Vex-7 stands still; world scroll paused.
- Prompt: **"[SPACE] to jump — clear the first drone"**
- A lone Patrol Drone flies toward player. Must jump to proceed.
- On success: flash `JUMP ACQUIRED` in neon green.

### Screen 2 — STAY LOW
- World resumes slow scroll (speed 2).
- A Low ICE wall approaches.
- Prompt: **"[S] to slide — duck the ICE"**
- On success: flash `SLIDE ACQUIRED`.

### Screen 3 — JACK THE SYSTEM
- Full ICE Wall appears; slide gap deliberately absent.
- Prompt: **"[H] to hack — break the wall"**
- On success: flash `HACK ACQUIRED` → brief neon burst animation.
- Tutorial ends; world speed jumps to Phase 1 normal (4 px/frame).

Tutorial is skippable on second+ run via `ENTER` at title screen.

---

## 7. Progression & Meta

- **No lives** — one run, then retry.  
- **Best Distance** and **Best Score** shown on death screen.  
- Possible stretch: unlockable color palettes for Vex-7 at score milestones (scope TBD).

---

## 8. Aesthetic Notes

- **Palette:** Neon cyan `#00FFFF`, magenta `#FF00FF`, orange `#FF6600` on near-black `#0A0A0F`.
- **Font:** Monospace / terminal style.
- **Scanline overlay** (CSS or canvas) for CRT feel.
- Background parallax: 3 layers — distant city silhouette, mid neon signs, near scaffolding.
