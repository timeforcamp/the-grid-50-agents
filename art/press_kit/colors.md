# NEON://OVERRIDE — Color Palette

## Primary Palette

| Name          | Hex       | RGB              | Usage                                      |
|---------------|-----------|------------------|--------------------------------------------|
| Neon Cyan     | `#00ffff` | `0, 255, 255`    | Primary accent; logo first half, UI highlights, headers |
| Neon Magenta  | `#ff00ff` | `255, 0, 255`    | Secondary accent; logo second half, CTA buttons, alerts |
| Neon Yellow   | `#ffff00` | `255, 255, 0`    | Warning states, score readouts, tertiary accent |
| Deep Navy     | `#0d0d1a` | `13, 13, 26`     | Primary background; canvas for all neon elements |
| Deep Purple   | `#1a0033` | `26, 0, 51`      | Secondary background, card surfaces, overlays |
| Off-White     | `#f8f8ff` | `248, 248, 255`  | Body text, UI labels, mono logo variant |

## Extended / Tint Palette

| Name              | Hex       | Notes                                      |
|-------------------|-----------|--------------------------------------------|
| Cyan Glow         | `#c8ffff` | Inner highlight on neon tube letterforms   |
| Magenta Glow      | `#ffc8ff` | Inner highlight on neon tube letterforms   |
| Cyan Dim          | `#007070` | Inactive/disabled state, subtle borders    |
| Magenta Dim       | `#700070` | Inactive/disabled state                    |
| Surface Overlay   | `#ffffff0d` | 5% white overlay for card depth           |

## Usage Rules

- **Never** place Neon Cyan on white or light backgrounds — glow effect is lost.
- **Always** use Deep Navy (`#0d0d1a`) or Deep Purple (`#1a0033`) as the canvas.
- Neon Yellow is a **tertiary** accent only — never use it for large text blocks.
- Off-White is the **only** permitted text color on dark backgrounds (no pure white `#ffffff`).
- Glow effects (feGaussianBlur or CSS `text-shadow`/`box-shadow`) are encouraged; blur radius 4–20px depending on element size.
