/**
 * GRID.JS — Cyberpunk Synthwave World-Grid Generator
 * Self-contained Canvas renderer. No dependencies.
 * Usage: window.Grid.attach(canvasElement)
 * Exports: window.Grid = { attach, detach }
 */
(function (global) {
  'use strict';

  // ─── Palette ───────────────────────────────────────────────────────────────
  const C = {
    sky_top:    '#000010',
    sky_mid:    '#0d0030',
    sky_hor:    '#1a0040',
    sun_outer:  '#ff2070',
    sun_inner:  '#ffb347',
    sun_lines:  '#0d0030',
    mtn_fill:   '#0a001a',
    mtn_edge:   '#ff2070',
    grid_h:     '#ff2070',
    grid_v:     '#bf00ff',
    grid_glow:  'rgba(255,32,112,0.18)',
    stars:      '#ffffff',
    scan_line:  'rgba(0,0,0,0.08)',
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  function createState(canvas) {
    return {
      canvas,
      ctx: canvas.getContext('2d'),
      raf: null,
      t: 0,
      speed: 0.6,          // grid scroll speed (px/frame at 60fps)
      stars: buildStars(220),
    };
  }

  function buildStars(n) {
    const s = [];
    for (let i = 0; i < n; i++) {
      s.push({
        x: Math.random(),
        y: Math.random() * 0.55,  // upper half only
        r: Math.random() * 1.4 + 0.3,
        blink: Math.random() * Math.PI * 2,
      });
    }
    return s;
  }

  // ─── Draw helpers ──────────────────────────────────────────────────────────
  function drawSky(ctx, W, H, horizon) {
    const grad = ctx.createLinearGradient(0, 0, 0, horizon);
    grad.addColorStop(0,    C.sky_top);
    grad.addColorStop(0.55, C.sky_mid);
    grad.addColorStop(1,    C.sky_hor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, horizon);
  }

  function drawStars(ctx, W, H, horizon, stars, t) {
    stars.forEach(s => {
      const alpha = 0.5 + 0.5 * Math.sin(t * 0.02 + s.blink);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * horizon, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
      ctx.fill();
    });
  }

  function drawSun(ctx, W, horizon) {
    const cx = W / 2;
    const cy = horizon;
    const R  = Math.min(W, horizon) * 0.22;

    // outer glow
    const glow = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.6);
    glow.addColorStop(0,   'rgba(255,32,112,0.45)');
    glow.addColorStop(1,   'rgba(255,32,112,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - R * 1.6, cy - R * 1.6, R * 3.2, R * 3.2);

    // sun body gradient
    const sunGrad = ctx.createLinearGradient(cx, cy - R, cx, cy);
    sunGrad.addColorStop(0,   C.sun_inner);
    sunGrad.addColorStop(0.5, C.sun_outer);
    sunGrad.addColorStop(1,   C.sun_outer);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI, 0);  // upper semicircle
    ctx.closePath();
    ctx.fillStyle = sunGrad;
    ctx.fill();

    // horizontal scan lines across the sun
    const lineCount = 10;
    const spacing = R / lineCount;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = C.sun_lines;
    for (let i = 1; i < lineCount; i++) {
      const ly = cy - i * spacing;
      const halfW = Math.sqrt(Math.max(0, R * R - (cy - ly) * (cy - ly)));
      ctx.fillRect(cx - halfW, ly - 1, halfW * 2, spacing * 0.45);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function buildMountainPath(W, horizon, seed) {
    // deterministic peaks from seed
    const peaks = [];
    const count = 9;
    for (let i = 0; i <= count; i++) {
      const px = (i / count) * W;
      // pseudo-random using seed
      const h = 0.05 + 0.18 * Math.abs(Math.sin(seed + i * 1.7 + i * i * 0.13));
      peaks.push({ x: px, y: horizon - h * horizon * 0.6 });
    }
    // smooth via catmull-rom style
    return peaks;
  }

  function drawMountains(ctx, W, horizon) {
    // back range (darker, lower)
    drawMountainRange(ctx, W, horizon, 42.0, 0.55, C.mtn_fill, 'rgba(255,32,112,0.25)', 1);
    // front range
    drawMountainRange(ctx, W, horizon, 13.0, 0.75, C.mtn_fill, C.mtn_edge, 1.5);
  }

  function drawMountainRange(ctx, W, horizon, seed, scale, fill, edgeColor, edgeWidth) {
    const peaks = buildMountainPath(W, horizon * scale, seed);

    ctx.beginPath();
    ctx.moveTo(0, horizon);
    peaks.forEach((p, i) => {
      if (i === 0) {
        ctx.lineTo(p.x, p.y);
      } else {
        const prev = peaks[i - 1];
        const mx = (prev.x + p.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, (prev.y + p.y) / 2);
      }
    });
    ctx.lineTo(W, horizon);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();

    // glowing edge
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = edgeWidth;
    ctx.shadowColor = edgeColor;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawGrid(ctx, W, H, horizon, t, speed) {
    const VP = { x: W / 2, y: horizon };   // vanishing point

    // floor area
    const floorH = H - horizon;
    if (floorH <= 0) return;

    // floor background
    const floorGrad = ctx.createLinearGradient(0, horizon, 0, H);
    floorGrad.addColorStop(0, '#0d001a');
    floorGrad.addColorStop(1, '#000008');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizon, W, floorH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizon, W, floorH);
    ctx.clip();

    // ── Horizontal lines (receding) ──────────────────────────────────────
    // Map lines onto a perspective grid:
    //   z=0 at horizon, z=1 at bottom.
    //   Screen y = horizon + floorH * (z / (z + k))  → approximate perspective
    // We use a scrolling offset so lines move toward viewer.
    const H_LINES = 18;
    const scrollZ = (t * speed * 0.003) % 1;  // 0..1 cycle

    for (let i = 0; i <= H_LINES; i++) {
      // z in [0,1], offset by scroll
      let z = (i / H_LINES + scrollZ) % 1;
      // perspective: lines bunch near horizon
      const screenY = horizon + floorH * (1 - Math.pow(1 - z, 2.2));

      const alpha = z * 0.9 + 0.05;
      ctx.strokeStyle = `rgba(255,32,112,${alpha.toFixed(2)})`;
      ctx.lineWidth = z * 2 + 0.5;
      ctx.shadowColor = C.grid_h;
      ctx.shadowBlur = z * 8;

      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(W, screenY);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // ── Vertical lines (converging to VP) ────────────────────────────────
    const V_LINES = 24;
    const halfSpread = W * 0.9;

    for (let i = 0; i <= V_LINES; i++) {
      const frac = i / V_LINES - 0.5;  // -0.5..0.5
      const bottomX = W / 2 + frac * halfSpread * 2;
      const distFromCenter = Math.abs(frac) * 2;  // 0..1
      const alpha = 0.15 + (1 - distFromCenter) * 0.6;

      ctx.strokeStyle = `rgba(191,0,255,${alpha.toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.shadowColor = C.grid_v;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.moveTo(VP.x, VP.y);
      ctx.lineTo(bottomX, H);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // ── Grid glow overlay ─────────────────────────────────────────────────
    const glowGrad = ctx.createLinearGradient(0, horizon, 0, H);
    glowGrad.addColorStop(0, 'rgba(255,32,112,0.12)');
    glowGrad.addColorStop(0.3, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, horizon, W, floorH);

    ctx.restore();
  }

  function drawScanLines(ctx, W, H) {
    // subtle CRT scan-line overlay
    ctx.fillStyle = C.scan_line;
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 2);
    }
  }

  function drawVignette(ctx, W, H) {
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.85);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,10,0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ─── Main render loop ──────────────────────────────────────────────────────
  function render(state) {
    const { canvas, ctx } = state;
    const W = canvas.width;
    const H = canvas.height;
    const horizon = H * 0.48;

    ctx.clearRect(0, 0, W, H);

    drawSky(ctx, W, H, horizon);
    drawStars(ctx, W, H, horizon, state.stars, state.t);
    drawSun(ctx, W, horizon);
    drawMountains(ctx, W, horizon);
    drawGrid(ctx, W, H, horizon, state.t, state.speed);
    drawScanLines(ctx, W, H);
    drawVignette(ctx, W, H);

    state.t++;
    state.raf = requestAnimationFrame(() => render(state));
  }

  // ─── Resize helper ─────────────────────────────────────────────────────────
  function resize(state) {
    const canvas = state.canvas;
    canvas.width  = canvas.offsetWidth  || canvas.clientWidth  || 800;
    canvas.height = canvas.offsetHeight || canvas.clientHeight || 450;
  }

  // ─── Public API ────────────────────────────────────────────────────────────
  const instances = new WeakMap();

  function attach(canvas) {
    if (instances.has(canvas)) return instances.get(canvas);
    const state = createState(canvas);
    resize(state);

    const ro = new ResizeObserver(() => resize(state));
    ro.observe(canvas);

    render(state);
    instances.set(canvas, { state, ro });
    return { state, ro };
  }

  function detach(canvas) {
    if (!instances.has(canvas)) return;
    const { state, ro } = instances.get(canvas);
    cancelAnimationFrame(state.raf);
    ro.disconnect();
    instances.delete(canvas);
  }

  global.Grid = { attach, detach };

}(typeof window !== 'undefined' ? window : globalThis));
