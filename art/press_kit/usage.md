# NEON://OVERRIDE — Brand Usage Guidelines

## Assets

| File                  | Description                                         | Use When                                         |
|-----------------------|-----------------------------------------------------|--------------------------------------------------|
| `art/logo.svg`        | Full-color neon logo (cyan + magenta on dark bg)    | Website header, splash screen, press releases    |
| `art/logo_mono.svg`   | Single-color off-white logo on dark bg              | Small placements, B&W print, favicon fallback    |
| `art/favicon.svg`     | 32×32 "N://" icon mark                              | Browser tab, app icon, small social avatars      |

---

## Do's

✅ Use the logo on `#0d0d1a` (Deep Navy) or `#1a0033` (Deep Purple) backgrounds.  
✅ Maintain the **NEON://** (cyan) and **OVERRIDE** (magenta) color split in the wordmark.  
✅ Add scanline overlays (CSS `repeating-linear-gradient`) for authentic CRT feel.  
✅ Apply neon glow via CSS `text-shadow` or SVG `feGaussianBlur` to logo text.  
✅ Use the favicon mark standalone when the wordmark is too wide (mobile nav, app icons).  
✅ Keep minimum clear space of **1× the cap-height** around the logo on all sides.  
✅ Scale the logo proportionally — minimum readable width is **200px** for full wordmark.  

---

## Don'ts

❌ Do NOT place the logo on white or light backgrounds.  
❌ Do NOT recolor the logo (e.g., all-cyan or all-magenta) — use `logo_mono.svg` for single-color needs.  
❌ Do NOT stretch, skew, or rotate the logo.  
❌ Do NOT add drop shadows — the glow effect IS the shadow. Competing shadows break the neon illusion.  
❌ Do NOT use rasterized (PNG/JPG) versions at sizes below 200px — use SVG.  
❌ Do NOT place busy imagery directly behind the logo. Use a dark overlay at minimum 80% opacity.  

---

## Website Implementation

```css
/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=VT323&family=JetBrains+Mono:wght@400;700&display=swap');

/* Neon text utility */
.neon-cyan {
  color: #00ffff;
  text-shadow: 0 0 7px #00ffff, 0 0 18px #00ffff, 0 0 40px #00ffff;
}
.neon-magenta {
  color: #ff00ff;
  text-shadow: 0 0 7px #ff00ff, 0 0 18px #ff00ff, 0 0 40px #ff00ff;
}

/* Scanline overlay */
.scanlines {
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.15),
    rgba(0,0,0,0.15) 1px,
    transparent 1px,
    transparent 4px
  );
}
```

---

## Social Media Asset Sizes

| Platform       | Size       | Asset to use                              |
|----------------|------------|-------------------------------------------|
| Twitter/X header | 1500×500 | Full-color logo centered on `#0d0d1a`    |
| Twitter/X avatar | 400×400  | Favicon mark scaled to 280px, centered    |
| YouTube thumbnail| 1280×720 | Full-color logo + game screenshot behind |
| itch.io cover  | 630×500    | Full-color logo + tagline, dark bg        |
| Discord banner | 960×540    | Full-color logo, scanline overlay         |

---

## Tone & Voice

**NEON://OVERRIDE** is a **cyberpunk indie game** — the brand voice is:

- **Terse. Technical. Glitched.** Short sentences. Fragmentary syntax.
- First-person hacker perspective: "You are the override."
- Use ALL-CAPS for system commands, labels, and headings.
- Use lowercase + monospace for terminal output, flavor text.
- Avoid corporate/polished language. This is underground.

**Example taglines:**
- `> SYSTEM COMPROMISED. OVERRIDE INITIATED.`
- `THEY BUILT THE GRID. YOU WILL BREAK IT.`
- `jack in. take control. burn it down.`
