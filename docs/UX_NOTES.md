# NEON://OVERRIDE — UX/UI Wireframe & Interaction Notes
**Author:** UX (ux-designer jammer)  
**Date:** 2026-05-17  
**Status:** v1 — ready for Pixel (frontend) implementation  
**Accessibility Target:** WCAG 2.1 AA

---

## 0. Design Principles

1. **Signal over noise** — every pixel earns its place. No decorative clutter.
2. **Cyberpunk legibility** — neon on dark, not neon on neon.
3. **Speed is personality** — transitions feel instant but purposeful (≤ 200 ms).
4. **Zero dark patterns** — no fake urgency, no hidden costs, no manipulative defaults.
5. **Keyboard-first** — every interactive element reachable without a mouse.

---

## 1. Site Information Architecture

```
NEON://OVERRIDE (root /)
│
├── Hero / Landing          #hero
│   ├── Headline + tagline
│   ├── Primary CTA: [JACK IN — PLAY NOW]
│   └── Secondary CTA: [WATCH TRAILER]
│
├── About / Game Overview   #about
│   ├── 3-column feature strip (Run / Hack / Survive)
│   └── Screenshot / art carousel
│
├── How to Play             #how-to-play
│   ├── Controls table
│   └── Enemy type cards (Drone / ICE Wall / CorpSec)
│
├── Lore                    #lore
│   ├── World intro paragraph (Neo-Kowloon, 2087)
│   └── Faction/character blurbs
│
├── Leaderboard             #leaderboard
│   └── Top-10 scores (localStorage, no server needed MVP)
│
├── Soundtrack              #soundtrack
│   └── Track listing + embedded player
│
└── Footer
    ├── Built-in-24hrs badge
    ├── GitHub link
    └── Keyboard shortcut legend
```

### 1.1 Nav Bar (sticky, top)
- Logo left: `NEON://OVERRIDE` in monospace
- Links right: About · Play · Lore · Leaderboard · Soundtrack
- Mobile: hamburger collapses to full-screen overlay nav
- Active section highlighted via scroll-spy (IntersectionObserver)
- Skip-to-main link as first focusable element (visually hidden, visible on focus)

---

## 2. Hero CTA Priority

```
┌─────────────────────────────────────────────────────┐
│  [NAV]                               NEON://OVERRIDE │
├─────────────────────────────────────────────────────┤
│                                                     │
│   NEON://OVERRIDE                                   │
│   ─────────────────────                             │
│   RUN. HACK. SURVIVE.                               │
│   Neo-Kowloon, 2087. The Grid never sleeps.         │
│                                                     │
│   [ JACK IN — PLAY NOW ]   [ ▶ WATCH TRAILER ]     │
│    PRIMARY (filled neon)    SECONDARY (outline)     │
│                                                     │
│   ↓ scroll cue (animated chevron)                   │
└─────────────────────────────────────────────────────┘
```

**CTA Hierarchy Rules:**
- Primary: `background: #00ff41; color: #000; font-weight: 700` — maximum contrast (AAA)
- Secondary: `border: 2px solid #00b8ff; color: #00b8ff` — distinct hue, lower visual weight
- Minimum tap target: 44×44 px (WCAG 2.5.5)
- Both CTAs keyboard-focusable with `:focus-visible` ring (`outline: 3px solid #fff; outline-offset: 3px`)
- On focus, announce "Play NEON://OVERRIDE" (aria-label on primary button)

---

## 3. Scroll Behavior

### 3.1 Scroll Mechanics
- `scroll-behavior: smooth` on `<html>` **but** respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- Nav anchor links jump instantly when `prefers-reduced-motion: reduce` is active.

### 3.2 Scroll-Triggered Reveals
- Sections fade-up on enter (`opacity: 0 → 1`, `translateY: 20px → 0`, `duration: 300ms`)
- Triggered via IntersectionObserver threshold 0.15
- Under `prefers-reduced-motion`: elements are visible immediately (no animation class applied)

### 3.3 Parallax Hero Background
- Subtle grid/scanline parallax on hero background only
- Max parallax depth: 30px (subtle — not nauseating)
- **Disabled entirely** under `prefers-reduced-motion`

---

## 4. Accessibility

### 4.1 Color Contrast
| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|-----------|-------|------|
| Body text | `#e0e0e0` | `#0a0a0f` | 16.5:1 | AAA |
| Primary CTA text | `#000000` | `#00ff41` | 13.4:1 | AAA |
| Secondary CTA text | `#00b8ff` | `#0a0a0f` | 5.8:1 | AA |
| Accent / neon orange | `#ff6b35` | `#0a0a0f` | 4.7:1 | AA |
| Section headings | `#ffffff` | `#0a0a0f` | 21:1 | AAA |
| Dimmed metadata | `#888888` | `#0a0a0f` | 5.3:1 | AA |

### 4.2 Keyboard Navigation
- Tab order follows DOM order (no `tabindex > 0`)
- All interactive elements: button, a, input — native focusable
- Custom components (carousel, modal) implement ARIA roles + keyboard handlers:
  - Carousel: Left/Right arrows navigate; Home/End jump to first/last
  - Modal: Trap focus within; Escape closes; `aria-modal="true"`; return focus on close
- Skip link: `<a class="skip-link" href="#main-content">Skip to main content</a>`
- Nav hamburger: `aria-expanded`, `aria-controls` attributes toggled on open/close

### 4.3 Reduced Motion
- All CSS animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- JS animations check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- Scanline / glitch effects: static under reduced motion

### 4.4 Screen Reader Support
- `<main id="main-content">` landmark
- Section headings: semantic `<h1>` → `<h2>` → `<h3>` hierarchy (never skip levels)
- Images: meaningful `alt` text; decorative elements `alt=""` or `role="presentation"`
- Live region for score/leaderboard updates: `aria-live="polite"`
- Game canvas: `aria-label="NEON://OVERRIDE game canvas"` + instructions below canvas

### 4.5 Typography
- Base font size: 16px (never below — no `font-size < 1rem` in body copy)
- Line height: minimum 1.5 for body text
- Letter spacing on monospace headers: `0.05em` for legibility
- No text in images (all text is HTML/CSS)

---

## 5. Game Menu Flows

### 5.1 Complete Menu State Machine

```
                    ┌─────────────┐
                    │  MAIN MENU  │
                    └──────┬──────┘
                           │ [JACK IN / PLAY]
                    ┌──────▼──────┐
                    │  GAME BOOT  │ (brief 1.5s cinematic: "JACKING IN...")
                    └──────┬──────┘
                           │ auto-advance
                    ┌──────▼──────────────────────────────────┐
                    │              GAMEPLAY                   │
                    │  [P / ESC] ────────────────────────────►│──────┐
                    └──────┬──────────────────────────────────┘      │
                           │ HP = 0 / caught                  ┌──────▼──────┐
                    ┌──────▼──────┐                           │  PAUSE MENU │
                    │  GAME OVER  │                           └──────┬──────┘
                    └──────┬──────┘                                  │
                     ┌─────┴──────┐                    ┌────────────┼────────────┐
                     │            │                    │            │            │
              [RETRY]│     [MAIN] │             [RESUME]      [RESTART]    [QUIT TO MAIN]
                     │            │                    │            │            │
              ┌──────▼──┐  ┌─────▼──────┐     ┌──────▼──────┐    │            │
              │GAME BOOT│  │ MAIN MENU  │     │  GAMEPLAY   │    │            │
              └─────────┘  └────────────┘     └─────────────┘    │            │
                                                           ┌──────▼──┐  ┌─────▼──────┐
                                                           │GAME BOOT│  │ MAIN MENU  │
                                                           └─────────┘  └────────────┘
```

---

### 5.2 MAIN MENU Screen

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│         ██╗  ██╗███████╗ ██████╗ ███╗  ██╗          │
│         ██║  ██║██╔════╝██╔═══██╗████╗ ██║          │
│         ██║  ██║█████╗  ██║   ██║██╔██╗██║          │
│         ╚██╗██╔╝██╔══╝  ██║   ██║██║╚████║          │
│          ╚████╔╝███████╗╚██████╔╝██║ ╚███║          │
│           ╚═══╝ ╚══════╝ ╚═════╝ ╚═╝  ╚══╝          │
│                                                      │
│              NEON://OVERRIDE                         │
│           ─────────────────────                      │
│                                                      │
│              [ JACK IN ]           ← focus default   │
│              [ SETTINGS ]                            │
│              [ LEADERBOARD ]                         │
│              [ HOW TO PLAY ]                         │
│                                                      │
│         HIGH SCORE: 000000                           │
│                                                      │
│    [background: animated grid scroll, scanlines]     │
└──────────────────────────────────────────────────────┘
```

**Interaction notes:**
- Default focus: "JACK IN" button on load
- Arrow keys / Tab navigate menu items
- Enter / Space activate
- Menu items glow on focus/hover: `text-shadow: 0 0 10px currentColor`
- `aria-label="Main menu"` on nav element
- Background animation paused under `prefers-reduced-motion`

---

### 5.3 GAMEPLAY HUD

```
┌──────────────────────────────────────────────────────┐
│ SCORE: 002,450  ×4  │░░░░░░░░░░░░░░░░░░│ HP: ███░░ │
│ [HACK: READY]  BOOST: ▓▓▓░░                [P] PAUSE│
├──────────────────────────────────────────────────────┤
│                                                      │
│                  [GAME CANVAS]                       │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Score: top-left, monospace, `font-size: 1rem`
- Multiplier badge: inline after score `×N` — color shifts green→yellow→orange→red with level
- HP bar: top-right, segmented blocks (5 segments = 5 HP), red fill
- Hack cooldown: bottom-left, text "HACK: READY" / "HACK: 2s" — `aria-live="off"` (too noisy)
- Pause button: top-right corner, 44×44 min tap target

---

### 5.4 PAUSE MENU Screen

```
┌──────────────────────────────────────────────────────┐
│  [blurred/dimmed game state behind]                  │
│                                                      │
│  ┌───────────────────────────────┐                   │
│  │                               │                   │
│  │    // SYSTEM PAUSED //        │                   │
│  │    ───────────────────        │                   │
│  │    [ RESUME ]         ← focus │                   │
│  │    [ RESTART ]                │                   │
│  │    [ HOW TO PLAY ]            │                   │
│  │    [ QUIT TO MAIN ]           │                   │
│  │                               │                   │
│  └───────────────────────────────┘                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Interaction notes:**
- `role="dialog"` `aria-modal="true"` `aria-labelledby="pause-title"`
- Focus trapped inside modal; Escape = Resume
- Background game canvas rendered but frozen (requestAnimationFrame stopped)
- Backdrop: `rgba(0,0,0,0.75)` + `backdrop-filter: blur(4px)` (graceful degradation if unsupported)

---

### 5.5 GAME OVER Screen

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│         CONNECTION TERMINATED                        │
│         ─────────────────────                        │
│                                                      │
│         FINAL SCORE:   002,450                       │
│         HIGH SCORE:    008,120                       │
│         DISTANCE:      1,204 m                       │
│         SHARDS:        12                            │
│                                                      │
│         [ RETRY ]          ← default focus           │
│         [ MAIN MENU ]                                │
│                                                      │
│         [death animation: static/glitch flash]       │
└──────────────────────────────────────────────────────┘
```

**Interaction notes:**
- Death flash: 200ms white flash → glitch distortion → screen blacks → Game Over appears
- Under `prefers-reduced-motion`: skip flash, fade in score card directly (300ms)
- New high score: `aria-live="assertive"` announces "New high score!" once
- `role="dialog"` semantics same as pause menu

---

### 5.6 HOW TO PLAY Screen (in-game overlay)

```
┌──────────────────────────────────────────────────────┐
│  HOW TO PLAY                                         │
│  ────────────                                        │
│                                                      │
│  MOVE        ↑ W SPACE  — Jump (double-jump OK)     │
│              ↓ S        — Slide                      │
│              H          — Hack (3s cooldown)         │
│              → D        — Boost sprint               │
│              P / ESC    — Pause                      │
│                                                      │
│  ENEMIES     ● DRONE    — Jump or slide              │
│              ■ ICE WALL — Jump / Slide / Hack        │
│              ◆ CORPSEC  — Slide past or Hack         │
│                                                      │
│  SCORE       Data Shards ×multiplier                 │
│              Streak for 8× max!                      │
│                                                      │
│              [ GOT IT ]   ← closes overlay           │
└──────────────────────────────────────────────────────┘
```

---

## 6. Mobile Layout Breakpoints

### 6.1 320px (Small Mobile — iPhone SE / older Android)

- Single-column layout throughout
- Nav: hamburger only — no inline links
- Hero: stacked vertically; headline `font-size: clamp(1.6rem, 8vw, 2rem)`
- CTAs: full-width buttons, stacked vertically, 44px height min
- Game canvas: `width: 100%; height: auto` — scales to fit; touch controls shown below canvas
- HUD: score top-left, HP top-right; reduced font size `0.75rem`; HACK button becomes on-screen tap button
- Feature strip: 1 column, icons above text
- Tables (controls): scrollable horizontally with `overflow-x: auto`

```
┌────────────────┐
│ NEON://  [☰]  │
├────────────────┤
│                │
│ NEON://OVERRIDE│
│ RUN.HACK.SURV. │
│                │
│ [JACK IN NOW] │
│ [▶ TRAILER]   │
│                │
│ ↓              │
└────────────────┘
```

### 6.2 768px (Tablet / Large Mobile — iPad mini, Pixel)

- 2-column grid available for feature strip
- Hero: horizontal layout restored — text left, art/screenshot right
- CTAs: side-by-side (not full-width)
- Nav: links visible if space allows (768px is borderline — show links if viewport ≥ 768px)
- Game canvas: fixed 700×300 px centered, touch D-pad overlay optional
- Menu modals: max-width 480px centered
- Typography: `font-size` steps up from mobile but not to full desktop

```
┌──────────────────────────────┐
│ NEON://  About Play Lore [☰] │
├──────────────────────────────┤
│ NEON://  │ [game art /        │
│ OVERRIDE │  screenshot]       │
│          │                    │
│[JACK IN] [▶ TRAILER]         │
└──────────────────────────────┘
```

### 6.3 1280px (Desktop)

- Full layout: sticky nav with all links
- Hero: full-viewport-height section with parallax grid bg (if no reduced-motion)
- Game canvas: 1024×400 px max, centered
- Feature strip: 3-column
- Lore section: 2-column (text + character art)
- Menu modals: max-width 560px
- Leaderboard: table with hover row highlights

```
┌──────────────────────────────────────────────────────┐
│ NEON://OVERRIDE    About  Play  Lore  LB  Soundtrack │
├──────────────────────────────────────────────────────┤
│                                                      │
│  NEON://OVERRIDE             ┌────────────────────┐  │
│  ─────────────────           │   [game art /      │  │
│  RUN. HACK. SURVIVE.         │    screenshot]     │  │
│  Neo-Kowloon, 2087.          └────────────────────┘  │
│                                                      │
│  [JACK IN — PLAY NOW]  [▶ WATCH TRAILER]            │
└──────────────────────────────────────────────────────┘
```

### 6.4 Touch Controls (Mobile Game)

On-screen D-pad for mobile — shown below canvas when touch device detected:

```
┌─────────────────────────────────┐
│  [↑ JUMP]                       │
│  [↓ SLIDE]  [H HACK]  [→ BOOST]│
│                        [P PAUSE]│
└─────────────────────────────────┘
```

- Each button: minimum 56×56 px (generous touch target on small screens)
- Semi-transparent: `rgba(0,255,65,0.15)` background, `rgba(0,255,65,0.6)` border
- `touch-action: manipulation` to prevent 300ms delay
- `user-select: none` to prevent text selection on hold

---

## 7. Component Specs (for Pixel / frontend)

### 7.1 Button States
| State | Style |
|-------|-------|
| Default (primary) | `bg: #00ff41; color: #000; border: none` |
| Hover (primary) | `bg: #00cc33; box-shadow: 0 0 16px #00ff41` |
| Focus (any) | `outline: 3px solid #ffffff; outline-offset: 3px` |
| Active | `transform: scale(0.97)` |
| Disabled | `opacity: 0.4; cursor: not-allowed; pointer-events: none` |
| Default (secondary) | `bg: transparent; border: 2px solid #00b8ff; color: #00b8ff` |
| Hover (secondary) | `box-shadow: 0 0 16px #00b8ff` |

### 7.2 Typography Scale
| Token | Value | Use |
|-------|-------|-----|
| `--text-xs` | `0.75rem / 1.4` | HUD labels, metadata |
| `--text-sm` | `0.875rem / 1.5` | Secondary UI, captions |
| `--text-base` | `1rem / 1.6` | Body copy |
| `--text-lg` | `1.25rem / 1.5` | Lead paragraphs |
| `--text-xl` | `1.5rem / 1.3` | Section subheadings |
| `--text-2xl` | `2rem / 1.2` | Section headings |
| `--text-3xl` | `clamp(2rem,5vw,3rem) / 1.1` | Hero headline |
| `--text-display` | `clamp(3rem,8vw,5rem) / 1.0` | Logo / display type |

### 7.3 Spacing Rhythm
- Base unit: `8px`
- Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 / 128 px`
- Section vertical padding: `96px` desktop / `64px` tablet / `48px` mobile
- Component internal padding: `16px` / `24px`

### 7.4 Color Tokens
```css
:root {
  --color-bg:           #0a0a0f;
  --color-bg-surface:   #111118;
  --color-bg-elevated:  #1a1a24;
  --color-neon-green:   #00ff41;
  --color-neon-blue:    #00b8ff;
  --color-neon-orange:  #ff6b35;
  --color-neon-purple:  #b44fff;
  --color-text-primary: #e0e0e0;
  --color-text-muted:   #888888;
  --color-text-dim:     #555566;
  --color-border:       #222233;
  --color-focus-ring:   #ffffff;
}
```

### 7.5 Animation Tokens
```css
:root {
  --duration-fast:   100ms;
  --duration-base:   200ms;
  --duration-slow:   300ms;
  --ease-out:        cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in-out:     cubic-bezier(0.4, 0.0, 0.2, 1);
}
```

---

## 8. Interaction Checklist (for QA)

- [ ] Skip link appears on first Tab press and navigates to `#main-content`
- [ ] All nav links keyboard-navigable and visible on focus
- [ ] Primary CTA focus ring visible on dark background
- [ ] Game menus: Escape closes pause/modals
- [ ] Game canvas announces state changes to screen readers
- [ ] No animation plays when `prefers-reduced-motion: reduce` is active
- [ ] Touch targets ≥ 44×44 px on all interactive elements
- [ ] Color contrast passes AA for all text (AAA for body text)
- [ ] Mobile layout tested at 320px — no horizontal scroll
- [ ] High score announced via `aria-live` on game over
- [ ] Hamburger menu `aria-expanded` toggles correctly
- [ ] Focus trap works in pause modal and game-over modal
