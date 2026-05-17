# NEON://OVERRIDE — Typography System

All fonts are **free via Google Fonts**. Import URL:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## Font Roles

### Display / Logo — Orbitron
- **Google Fonts**: https://fonts.google.com/specimen/Orbitron
- **Weights used**: 900 (logo), 700 (headers), 400 (sub-headers)
- **Usage**: Game logo wordmark, screen titles, chapter headings, UI panel headers
- **Character**: Geometric, hard-edged, futuristic. Evokes industrial tech and retrofuturism.
- **CSS**: `font-family: 'Orbitron', sans-serif;`

### Terminal / Retro — VT323
- **Google Fonts**: https://fonts.google.com/specimen/VT323
- **Weights used**: 400 (monospace display)
- **Usage**: Terminal readouts, lore logs, hacker-text flavor copy, loading screens, flavor UI elements
- **Character**: Authentic pixel/CRT terminal font. Evokes 80s computer screens.
- **CSS**: `font-family: 'VT323', monospace;`
- **Note**: Render at 16px minimum; best at multiples of 8px (16, 24, 32, 48, 64px)

### Code / Body — JetBrains Mono
- **Google Fonts**: https://fonts.google.com/specimen/JetBrains+Mono
- **Weights used**: 400 (body), 700 (emphasis, labels)
- **Usage**: Body text, game dialogues, tooltips, README, website copy, HUD numeric readouts
- **Character**: Clean, legible, technical. Designed for code but reads beautifully as body text in a tech context.
- **CSS**: `font-family: 'JetBrains Mono', monospace;`

---

## Type Scale

| Role             | Font          | Size    | Weight | Color        | Letter-spacing |
|------------------|---------------|---------|--------|--------------|----------------|
| Game Logo        | Orbitron      | 68px    | 900    | Cyan/Magenta | 2px            |
| Section Title    | Orbitron      | 36px    | 700    | Cyan `#0ff`  | 1px            |
| Sub-heading      | Orbitron      | 20px    | 400    | Off-white    | 1px            |
| Terminal Display | VT323         | 24px    | 400    | Cyan `#0ff`  | 3px            |
| Body Copy        | JetBrains Mono| 14px    | 400    | Off-white    | 0              |
| UI Label / HUD   | JetBrains Mono| 11px    | 700    | Off-white    | 4px uppercase  |
| Tagline          | JetBrains Mono| 10px    | 400    | 50% white    | 4px uppercase  |

---

## Anti-patterns

- **Do not** use serif fonts anywhere in the UI.
- **Do not** use Orbitron at weights below 400 — glyphs lose their structural integrity at thin weights.
- **Do not** mix more than 2 fonts in a single layout context.
- VT323 should feel **intentional** (terminal context), not as a substitute for Orbitron.
