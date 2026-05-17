# NEON://OVERRIDE — VFX Assets

All VFX sprites live in `/art/vfx/`. They are authored as SVG so they can be rasterized at any resolution. Below are the frame specs engine devs need to slice and render them.

---

## vfx_explosion.svg
**Type:** Animated sprite sheet (6 frames)  
**Sheet dimensions:** 768 × 128 px  
**Frame dimensions:** 128 × 128 px  
**Frame count:** 6  

| Frame | X offset | Description |
|-------|----------|-------------|
| 0 | 0   | Ignition — tiny white core, 3 short rays |
| 1 | 128 | Expanding burst — 28px radius, 6 rays |
| 2 | 256 | Full bloom — 56px radius, 8 rays, debris shards |
| 3 | 384 | Dissipating ring — outer ring + 8 debris shards |
| 4 | 512 | Afterglow fade — diffuse glow, distant sparks |
| 5 | 640 | Wisp — near-transparent ghost ring |

**Colors:** Neon pink `#FF2AFF`, white hot core `#FFFFFF`, deep magenta `#CC00FF`  
**Recommended playback:** 12–16 fps, play once (no loop)  
**Blend mode:** `additive` (screen) over scene  

---

## vfx_glitch.svg
**Type:** Overlay tile (single frame, tileable)  
**Dimensions:** 256 × 256 px  

**Usage:**
- Render as a full-screen or object-space overlay
- Recommended blend mode: `screen` or `overlay` at 30–60% opacity
- For chromatic aberration: sample the R channel shifted +4px X and B channel shifted −4px X
- Tile or stretch to fill the render target
- Trigger on hit/damage events; flash for 1–3 frames then fade out

**Contents:** Horizontal glitch tear lines, red/blue CA ghost offsets, scanline overlay, noise speckle, vertical tear artifacts  
**Colors:** Glitch red `#FF0044`, cyan `#00FFFF`, magenta `#FF00FF`  

---

## vfx_spark.svg
**Type:** Animated sprite sheet (4 frames)  
**Sheet dimensions:** 256 × 64 px  
**Frame dimensions:** 64 × 64 px  
**Frame count:** 4  

| Frame | X offset | Description |
|-------|----------|-------------|
| 0 | 0   | Birth — small dot, 3 short tendrils |
| 1 | 64  | Full discharge — 5 branching lightning arcs + micro sparks |
| 2 | 128 | Fading discharge — thinner arcs, floating sparks |
| 3 | 192 | Embers — dissipated, only floating particle dots |

**Colors:** Electric yellow `#FFE600`, white hot `#FFFFFF`, amber `#FFAA00`  
**Recommended playback:** 20–24 fps, play once  
**Blend mode:** `additive` (screen)  
**Anchor point:** Center of frame (32, 32)  

---

## vfx_trail.svg
**Type:** Motion trail strip (single frame)  
**Dimensions:** 256 × 32 px  

**Usage:**
- Attach behind a moving entity; `x=0` (left edge) is the **head** (bright tip), right edge is the transparent tail
- Orient horizontally; rotate/transform to match entity's velocity vector
- Scale X to match desired trail length; scale Y for entity width
- Recommended blend mode: `additive` (screen) or `lighten`
- Update position every frame to follow the entity; fade out `opacity` when entity stops

**Contents:** Outer glow, main trail body, hot-core center line, head turbo hotspot, scatter particles, edge speed lines  
**Colors:** Cyan `#00FFFF`, white tip `#FFFFFF`, deep teal `#004455`  

---

## General Integration Notes

1. **Blend mode:** All VFX are designed for **additive / screen** blend over dark cyberpunk backgrounds. They will look washed out on white backgrounds.
2. **Rasterization:** SVGs can be rasterized at 1×, 2×, or 4× for HiDPI. Use `width`/`height` attributes to control output resolution.
3. **Sprite slicing:** For sprite sheets, slice at exact pixel X offsets listed above. All sheets use left-to-right frame ordering.
4. **Alpha:** All assets rely on SVG `stop-opacity` / `opacity` for transparency — ensure your renderer supports RGBA output when rasterizing.
5. **Performance:** The glitch tile is meant for short bursts (≤6 frames). The trail should be redrawn/repositioned every frame rather than cached.
