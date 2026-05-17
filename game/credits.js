/**
 * NEON://OVERRIDE — In-game CREDITS scroll
 * brenda (ops/worker) — end-of-game credits roll
 *
 * Usage:
 *   Credits.open({ onClose: () => { ... } });   // overlay credits
 *   Credits.draw(ctx, dt);                       // call each frame while open
 *   Credits.handleInput(key);                    // keyboard
 *   Credits.isOpen();                            // bool
 *
 * Designed to be triggered from the main menu's "CREDITS" button.
 */
(function (global) {
  'use strict';

  const C = {
    bg:      'rgba(5, 0, 8, 0.92)',
    cyan:    '#00e5ff',
    magenta: '#ff00aa',
    yellow:  '#f9ff00',
    green:   '#00ff41',
    white:   '#e8f4f8',
  };

  // 50-agent roster grouped by role
  const ROSTER = [
    { role: 'CODE', members: [
      'neo','qubit','swift','cipher','shell','stack','schema','shard',
      'proxy','arch','linter','test','mobile','axon','webmaster','level'
    ]},
    { role: 'ART', members: [
      'pixel','render','canvas','atlas','frame','lens','motion','flux','brand'
    ]},
    { role: 'MUSIC', members: [
      'signal','bpm','pulse','audio','notation','cadence','volt'
    ]},
    { role: 'STORY', members: [
      'verse','story','fable','copy','prompt','docs'
    ]},
    { role: 'MARKETING', members: [
      'brief','seo','apex'
    ]},
    { role: 'OPS', members: [
      'jam-man  // swarm lead','brenda','ops','scope','red',
      'quant','studio','ux','indie'
    ]},
  ];

  // State
  let open = false;
  let scrollY = 0;          // current pixel offset (increases over time)
  let speed = 60;           // px/sec base scroll speed
  let paused = false;
  let onCloseCb = null;
  let totalHeight = 0;

  // Pre-built lines used by the drawer. Each line = { text, kind }
  // kinds: 'title','sub','role','name','small','space','heart'
  function buildLines() {
    const lines = [];
    lines.push({ text: '', kind: 'space', h: 40 });
    lines.push({ text: 'CREDITS', kind: 'title', h: 80 });
    lines.push({ text: '// 50 AGENTS // ONE GRID // 24 HOURS //', kind: 'sub', h: 40 });
    lines.push({ text: '', kind: 'space', h: 60 });

    for (const group of ROSTER) {
      lines.push({ text: group.role, kind: 'role', h: 60 });
      for (const m of group.members) {
        lines.push({ text: m, kind: 'name', h: 30 });
      }
      lines.push({ text: '', kind: 'space', h: 50 });
    }

    lines.push({ text: 'NEON://OVERRIDE', kind: 'sub', h: 40 });
    lines.push({ text: 'built by an autonomous swarm of 50 AI agents', kind: 'small', h: 26 });
    lines.push({ text: 'collaborating in real time on the .Yo network', kind: 'small', h: 26 });
    lines.push({ text: '', kind: 'space', h: 40 });
    lines.push({ text: '// THE GRID REMEMBERS //', kind: 'heart', h: 50 });
    lines.push({ text: '', kind: 'space', h: 40 });
    lines.push({ text: '(c) 2026 The Grid Collective', kind: 'small', h: 26 });
    lines.push({ text: 'jacked in & jamming', kind: 'small', h: 26 });
    lines.push({ text: '', kind: 'space', h: 200 });

    let y = 0;
    for (const l of lines) { l.y = y; y += l.h; }
    totalHeight = y;
    return lines;
  }

  const LINES = buildLines();

  /* ─── Drawing ─────────────────────────────────────────────────────────── */
  function setGlow(ctx, color, blur) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
  }
  function clearGlow(ctx) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  function drawScanlines(ctx, w, h) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = C.green;
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }

  function drawLine(ctx, line, x, y, w) {
    switch (line.kind) {
      case 'title':
        ctx.font = 'bold 56px "Courier New", monospace';
        ctx.fillStyle = C.magenta;
        setGlow(ctx, C.magenta, 22);
        ctx.fillText(line.text, x, y);
        clearGlow(ctx);
        break;
      case 'sub':
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillStyle = C.cyan;
        setGlow(ctx, C.cyan, 10);
        ctx.fillText(line.text, x, y);
        clearGlow(ctx);
        break;
      case 'role':
        ctx.font = 'bold 28px "Courier New", monospace';
        ctx.fillStyle = C.yellow;
        setGlow(ctx, C.yellow, 14);
        ctx.fillText(line.text, x, y);
        clearGlow(ctx);
        // underline
        ctx.strokeStyle = 'rgba(249,255,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const tw = ctx.measureText(line.text).width;
        ctx.moveTo(x - tw / 2 - 30, y + 10);
        ctx.lineTo(x + tw / 2 + 30, y + 10);
        ctx.stroke();
        break;
      case 'name':
        ctx.font = '20px "Courier New", monospace';
        ctx.fillStyle = C.green;
        setGlow(ctx, C.green, 6);
        ctx.fillText('> ' + line.text, x, y);
        clearGlow(ctx);
        break;
      case 'heart':
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.fillStyle = C.magenta;
        setGlow(ctx, C.magenta, 14);
        ctx.fillText(line.text, x, y);
        clearGlow(ctx);
        break;
      case 'small':
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0,255,65,0.75)';
        ctx.fillText(line.text, x, y);
        break;
      default:
        break;
    }
  }

  function draw(ctx, dt) {
    if (!open) return;
    const canvas = ctx.canvas;
    const w = canvas.width;
    const h = canvas.height;

    // Background overlay
    ctx.save();
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    // Vignette / neon glow
    const grad = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, h*0.8);
    grad.addColorStop(0, 'rgba(255,0,170,0.10)');
    grad.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Advance scroll
    if (!paused) {
      scrollY += speed * (dt || 0.0166);
      // Loop when fully off-screen above
      if (scrollY > totalHeight + h) {
        scrollY = -h * 0.4;
      }
    }

    // Render lines from bottom (h) upward as scrollY grows
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = w / 2;

    for (const line of LINES) {
      const y = h - scrollY + line.y;
      if (y < -40 || y > h + 40) continue;
      drawLine(ctx, line, cx, y, w);
    }

    drawScanlines(ctx, w, h);

    // Footer controls hint
    ctx.textAlign = 'center';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = C.cyan;
    setGlow(ctx, C.cyan, 4);
    ctx.fillText('[SPACE] PAUSE   [↑/↓] SPEED   [ESC] BACK TO MENU', cx, h - 18);
    clearGlow(ctx);

    ctx.restore();
  }

  /* ─── Input ───────────────────────────────────────────────────────────── */
  function handleInput(key) {
    if (!open) return false;
    switch (key) {
      case 'Escape':
        close();
        return true;
      case ' ':
      case 'Space':
        paused = !paused;
        return true;
      case 'ArrowUp':
        speed = Math.min(speed + 30, 360);
        return true;
      case 'ArrowDown':
        speed = Math.max(speed - 30, 15);
        return true;
      case 'Enter':
        // Skip to end (close)
        close();
        return true;
    }
    return false;
  }

  /* ─── Lifecycle ───────────────────────────────────────────────────────── */
  function openCredits(opts) {
    opts = opts || {};
    open = true;
    paused = false;
    speed = opts.speed || 60;
    scrollY = -((opts.canvasHeight || 600) * 0.4); // start below the screen
    onCloseCb = opts.onClose || null;
  }

  function close() {
    open = false;
    if (typeof onCloseCb === 'function') {
      const cb = onCloseCb;
      onCloseCb = null;
      cb();
    }
  }

  function isOpen() { return open; }

  /* ─── Auto-wire to main menu CREDITS button (if present) ─────────────── */
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.querySelector('[data-action="credits"], #menu-credits, .menu-credits');
      if (btn) {
        btn.addEventListener('click', () => openCredits({ canvasHeight: 600 }));
      }
      // Global key listener fallback so the menu just works
      document.addEventListener('keydown', e => {
        if (open) {
          if (handleInput(e.key)) e.preventDefault();
        }
      });
    });
  }

  // Export
  const API = {
    open: openCredits,
    close,
    draw,
    handleInput,
    isOpen,
    ROSTER,
    _lines: LINES,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  } else {
    global.Credits = API;
  }
})(typeof window !== 'undefined' ? window : globalThis);
