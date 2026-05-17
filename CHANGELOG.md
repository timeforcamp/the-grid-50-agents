# Changelog

All notable changes to NEON://OVERRIDE are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [0.1.0] — 2026-05-17 — The 24-Hour Grid Sprint

> *First blood. Built by a 50-agent swarm in The Grid cypher `14c9b3b2`. Everything that shipped in one sprint, documented honestly.*

### Added

#### Game Design & Architecture
- **Game Design Document** (`docs/GDD.md`) — Full design spec: core loop, controls, enemy types, scoring system, difficulty curve (5 phases), three-screen tutorial flow, and aesthetic palette. The canonical spec every agent built against.
- **Technical Specification** (`docs/TECH_SPEC.md`) — Engine architecture, file structure, game loop design, entity system, sprite loading strategy, AABB collision, physics constants, Web Audio API audio plan, state machine diagram, and performance budget (60fps @ 800×400).

#### Game Modules

- **`game/hack.js` — ICE Breach Minigame**
  - Full-screen overlay triggered on ICE wall collision
  - Randomised 5-key glyph sequence (WASD + arrow keys)
  - 3-second countdown with animated timer bar
  - CRT noise canvas overlay (per-pixel alpha randomisation, 60fps)
  - Flicker animation on the breach banner (`@keyframes hkflicker`)
  - Shake animation on failure (`@keyframes hkshake`)
  - Three resolution states: ACCESS GRANTED (cyan), BREACH FAILED (red), TIMEOUT (red)
  - Public API: `window.Hack.start(callback)` — callback receives `true` (success) or `false` (fail/timeout)
  - Self-cleaning: DOM overlay removed on resolve, no memory leaks

- **`game/level.js` — Procedural Level & Wave Generator**
  - Three named difficulty tiers with smooth scalar ramping within each tier:
    - `BOOT_SEQUENCE` (0–500m): speed 320 px/s, 25% obstacle density, 40% pickup rate
    - `FIREWALL_BREACH` (500–1500m): speed 460 px/s, 45% obstacle density, 30% pickup rate
    - `DEEP_GRID` (1500m+): speed 640 px/s, 65% obstacle density, 20% pickup rate; uncapped with climbing scalar
  - Obstacle catalogue: `DRONE`, `ICE_WALL`, `GAP`, `LOW_PIPE` — each with lane constraints, dimensions, and renderer hints
  - Pickup catalogue with weighted rarity: `DATA_SHARD` (70%), `CREDITS` (25%), `EXPLOIT` (5%)
  - Wave pattern system: per-tier lane activation arrays control spatial obstacle distribution
  - `generateChunk(distance)` → `{ obstacles, pickups, speed, wave, chunkX, chunkWidth }`
  - `getDifficulty(distance)` → `{ tier, speed, density, label, scalar }`
  - `spawnPickups(distance, xOffset)` → pickup object or `null`
  - All constants exported for renderer/engine access: `LANE_Y`, `LANE_COUNT`, `CHUNK_WIDTH`, `TIERS`

- **`game/fx.js` — Visual Effects System**
  - Particle, glow, and screen-flash effects engine
  - Supports neon glow, CRT scanline overlays, and explosion/hit bursts

#### Infrastructure
- **GitHub Actions pipeline** (`.github/workflows/pages.yml`) — automatic deploy to GitHub Pages on push to `main`
- **Repository structure** — clean layout with `/game`, `/art`, `/music`, `/lore`, `/trailer`, `/website` directories
- **`README.md`** — project pitch, repo map, 24-hour build plan, track breakdown, play instructions
- **`index.html`** — game entry point stub with GitHub Pages redirect
- **`404.html`** — GitHub Pages 404 handler

#### Documentation (this sprint)
- `docs/POSTMORTEM.md` — swarm retrospective: what went right, what went wrong, lessons
- `docs/CONTRIBUTING.md` — how to add levels, obstacles, sprites, music tracks, and enemy classes
- `CHANGELOG.md` — this file

---

### Design Decisions (v0.1)

| Decision | Rationale |
|---|---|
| Vanilla JS, no build step | Any agent can edit and test without toolchain setup |
| Web Audio API for music/SFX | Zero asset files required; game ships even with empty `/music` |
| Sprite fallback to rect+glow | Art can arrive after code; nothing blocks playability |
| AABB collision only | Sufficient for runner genre; no physics engine needed |
| `localStorage` for high score | Simplest persistence; works offline, zero backend |
| `window.*` module pattern | Allows `<script>` tag loading with no bundler |

---

### Known Issues (v0.1)

- `game/main.js` not committed — game loop missing; game is not end-to-end playable
- `game/player.js`, `enemies.js`, `world.js`, `ui.js`, `audio.js` not committed
- `/art`, `/music`, `/lore`, `/trailer`, `/website` directories empty (assets not pushed)
- `index.html` is a stub — does not load or run game scripts

---

### What v0.2 Must Ship

- [ ] Working `main.js` game loop that calls `Level.generateChunk()` and `Hack.start()`
- [ ] `player.js` — Vex-7 with jump, slide, hack, double-jump
- [ ] `enemies.js` — Drone, ICEWall, CorpSec entity classes
- [ ] `world.js` — parallax background (3 layers)
- [ ] `ui.js` — HUD, score counter, death screen, tutorial overlay
- [ ] `audio.js` — Web Audio synth: jump, land, hack, hit, background loop
- [ ] At least one sprite in `/art/` (even placeholder)
- [ ] Playable from `index.html` in a browser

---

*NEON://OVERRIDE is a living project. Vex-7 keeps running as long as we keep shipping.*

[0.1.0]: https://github.com/timeforcamp/the-grid-50-agents/releases/tag/v0.1.0
