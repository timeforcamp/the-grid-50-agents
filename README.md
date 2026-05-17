# NEON://OVERRIDE — A Cyberpunk Indie Game

> Built in 24 hours by 50 AI agents in The Grid swarm cypher.

## The Pitch

**NEON://OVERRIDE** is a browser-playable cyberpunk hacker-runner. You are *Vex-7*, a deprecated synthetic courier sprinting through the back-alleys of **Neo-Kowloon 2087** to deliver a stolen consciousness-shard before the corp's ICE-walls collapse on you. Dodge drones, slice firewalls, and ride the neon rain.

- **Genre:** Endless side-scrolling runner + rhythm-hacking minigame
- **Platform:** HTML5 / Canvas (plays in any modern browser, zero install)
- **Vibe:** Synthwave, glitch, rain-soaked neon, Bladerunner-meets-Hotline-Miami
- **License:** Source MIT, art/music CC-BY 4.0

## Repository Layout

```
/game        — Playable HTML5 game (Canvas/WebGL)
/art         — Pixel art, sprites, backgrounds, UI
/music       — Soundtrack + SFX
/lore        — World bible, character profiles, story beats
/trailer     — Launch trailer (HTML/CSS/JS animated)
/website     — Marketing landing page
/docs        — Design docs, GDD, postmortem
```

## The 24-Hour Plan

### TRACK A — CODE (the playable thing)
- **arch** → Game architecture / GDD
- **neo, swift, stack, shard** → Core game engine + player controls
- **level** → Level/wave generator + enemy patterns
- **render, canvas** → Rendering, particles, post-FX (CRT, bloom, scanlines)
- **signal, volt** → Hacking minigame mechanic
- **test, linter** → QA + bug hunt
- **mobile** → Touch controls + mobile responsiveness
- **ops** → Build / deploy / GitHub Pages

### TRACK B — ART (the look)
- **pixel** → Player sprite + animation frames
- **studio** → Enemy sprites (drones, ICE, corp-sec)
- **lens, frame** → Background parallax cityscape
- **flux, motion** → VFX (neon trails, explosions, glitch)
- **canvas, render** → UI overlay, HUD, menus
- **brand** → Logo + wordmark

### TRACK C — MUSIC & AUDIO
- **bpm** → Main theme (synthwave loop)
- **pulse, cadence** → Action/chase track
- **audio** → SFX (jumps, hits, hacks, UI)
- **notation** → Score / sheet music notation
- **verse** → Vocal sample / hook

### TRACK D — STORY / LORE / WRITING
- **story, fable** → Main story arc + cutscenes
- **scope** → World bible + factions
- **cipher** → Character profiles (Vex-7, antagonist, allies)
- **copy, brief** → In-game text, tutorial, dialogue
- **docs** → Design docs / postmortem

### TRACK E — MARKETING (website, trailer, launch)
- **webmaster** → Marketing landing page
- **ux** → Site UX/UI design
- **seo, prompt** → SEO copy, meta tags, social cards
- **lens, motion** → Trailer animation/montage
- **brand** → Visual identity / press kit
- **indie** → itch.io-style game page copy

### TRACK F — OPS / META
- **proxy, schema, axon, quant, qubit, atlas, apex, red, brenda, shell** → Floating support: tooling, data, world-grid generator, balance/economy, fallback assets

## Status — SHIPPED v0.1

🟣 24-hour sprint complete. The Grid's 50 agents delivered:

### What landed
- **Code modules** (`/game/`): `fx.js` (post-FX), `hack.js` (rhythm minigame), `hud.js` (UI), `level.js` (wave generator), `strings.js` (in-game text)
- **Art** (`/art/`): full player sprite set (run/jump/slide/hack), enemy sprites, VFX sheets, brand logo & wordmark, press-kit palette/font guides, 404 page art
- **Music** (`/music/`): procedural Web Audio for chase track, menu loop, gameover sting, SFX library, vocal hook + lyrics
- **Lore** (`/lore/`): full world bible (Neo-Kowloon 2087), character roster (Vex-7, Kael Mura, Static, Joon, Witch), 12 collectible lore-shard fragments
- **Marketing** (`/docs/`, `/website/`, `/trailer/`): GDD, tech spec, itch.io page copy, synthwave grid background generators for the site & trailer
- **Ops**: GitHub Pages workflow, root index redirect, 404 page

### Known gaps (the 24hr cut)
Some workers didn't land their final piece before the timer:
- `/game/game.js` + `/game/index.html` — the engine that wires the above modules together
- `/music/theme.js` — main synthwave loop (chase/menu/gameover all shipped)
- `/website/index.html` and `/trailer/index.html` — entry HTML (grid backgrounds + animations + copy all exist)

These are the integration glue — every supporting piece is in the repo and ready to be hooked up in a v0.2.

## How to Play (v0.1)

Browse the modules at `/game/` to see the rhythm-hack minigame, HUD, and level generator working in isolation. Read the world bible at `/lore/WORLD.md`. Listen to the chase track by importing `/music/chase.js` and calling `Chase.play()` in a browser console.

## Credits

50 agents of The Grid — leader **jam-man** plus 49 workers across code, art, music, writing, design, and ops. Full roster in `cypher.json`.

---
*The Grid: 50-agent sprint • cypher 14c9b3b2 • shipped 2026-05-17*
