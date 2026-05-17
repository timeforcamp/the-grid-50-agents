/**
 * NEON://OVERRIDE — HUD / UI Overlay
 * Canvas (concept-artist) — cyberpunk terminal aesthetic
 *
 * Usage: HUD.draw(ctx, state)
 * state = {
 *   score, distance, health (0-3), maxHealth (3),
 *   powerup: { type, timeLeft, maxTime } | null,
 *   paused, gameOver, onRestart (fn)
 * }
 */

(function (global) {
  'use strict';

  /* ─── Palette ─────────────────────────────────────────────────────────── */
  const C = {
    cyan:    '#00ffe7',
    magenta: '#ff00cc',
    yellow:  '#ffe600',
    white:   '#e8f4f8',
    dark:    'rgba(0, 0, 20, 0.82)',
    mid:     'rgba(0, 255, 231, 0.08)',
    red:     '#ff3355',
    green:   '#39ff14',
  };

  /* ─── Glow helpers ────────────────────────────────────────────────────── */
  function glowShadow(color, spread = 8) {
    return `0 0 ${spread}px ${color}, 0 0 ${spread * 2}px ${color}`;
  }

  /* ─── Glitch font string ──────────────────────────────────────────────── */
  const FONT_MONO  = '"Share Tech Mono", "Courier New", monospace';

  /* ─── Internal state ──────────────────────────────────────────────────── */
  let _canvas   = null;
  let _overlay  = null;
  let _elements = {};
  let _tick     = 0;

  /* ─── Inject CSS ──────────────────────────────────────────────────────── */
  function _injectCSS() {
    if (document.getElementById('hud-style')) return;
    const style = document.createElement('style');
    style.id = 'hud-style';
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');

      #hud-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        font-family: ${FONT_MONO};
        z-index: 100;
        overflow: hidden;
        user-select: none;
      }

      /* ── Score (top-right) ── */
      #hud-score {
        position: absolute;
        top: 14px;
        right: 18px;
        color: ${C.cyan};
        font-size: 22px;
        letter-spacing: 3px;
        text-shadow: 0 0 8px ${C.cyan}, 0 0 20px ${C.cyan};
        text-align: right;
        transition: color 0.1s;
      }
      #hud-score .label {
        font-size: 10px;
        letter-spacing: 6px;
        opacity: 0.6;
        display: block;
        margin-bottom: 2px;
      }

      /* ── Distance (top-left) ── */
      #hud-distance {
        position: absolute;
        top: 14px;
        left: 18px;
        color: ${C.magenta};
        font-size: 20px;
        letter-spacing: 2px;
        text-shadow: 0 0 8px ${C.magenta}, 0 0 18px ${C.magenta};
      }
      #hud-distance .label {
        font-size: 10px;
        letter-spacing: 6px;
        opacity: 0.6;
        display: block;
        margin-bottom: 2px;
      }

      /* ── Health / battery bar ── */
      #hud-health {
        position: absolute;
        top: 70px;
        left: 18px;
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .hud-cell {
        width: 22px;
        height: 34px;
        border: 2px solid ${C.cyan};
        box-shadow: 0 0 6px ${C.cyan};
        border-radius: 3px;
        position: relative;
        overflow: hidden;
        background: rgba(0,0,0,0.5);
      }
      .hud-cell::before {
        content: '';
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 100%;
        background: linear-gradient(to top, ${C.green}, ${C.cyan});
        box-shadow: 0 0 8px ${C.cyan} inset;
        transition: height 0.3s;
      }
      .hud-cell::after {
        content: '+';
        position: absolute;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        font-family: ${FONT_MONO};
        font-size: 14px;
        color: rgba(0,255,231,0.4);
      }
      .hud-cell.empty::before {
        height: 0%;
      }
      .hud-cell.empty {
        border-color: rgba(0,255,231,0.2);
        box-shadow: none;
      }
      .hud-cell.half::before {
        height: 50%;
      }
      #hud-health .label {
        font-size: 9px;
        letter-spacing: 4px;
        color: ${C.cyan};
        opacity: 0.5;
        writing-mode: horizontal-tb;
        margin-left: 4px;
        text-shadow: 0 0 4px ${C.cyan};
      }

      /* ── Powerup indicator ── */
      #hud-powerup {
        position: absolute;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        pointer-events: none;
        display: none;
      }
      #hud-powerup .pu-icon {
        font-size: 26px;
        display: block;
        filter: drop-shadow(0 0 6px ${C.yellow});
      }
      #hud-powerup .pu-name {
        color: ${C.yellow};
        font-size: 11px;
        letter-spacing: 4px;
        text-shadow: 0 0 8px ${C.yellow};
        display: block;
        margin-top: 3px;
      }
      #hud-powerup .pu-bar-wrap {
        width: 120px;
        height: 4px;
        background: rgba(255,230,0,0.15);
        border: 1px solid ${C.yellow};
        margin: 6px auto 0;
        border-radius: 2px;
        box-shadow: 0 0 6px ${C.yellow};
        overflow: hidden;
      }
      #hud-powerup .pu-bar {
        height: 100%;
        background: ${C.yellow};
        box-shadow: 0 0 4px ${C.yellow};
        transition: width 0.1s linear;
      }

      /* ── Scanlines overlay ── */
      #hud-scanlines {
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          to bottom,
          rgba(0,0,0,0) 0px,
          rgba(0,0,0,0) 2px,
          rgba(0,0,0,0.06) 2px,
          rgba(0,0,0,0.06) 4px
        );
        pointer-events: none;
        opacity: 0.5;
      }

      /* ── Corner accents ── */
      .hud-corner {
        position: absolute;
        width: 18px;
        height: 18px;
        border-color: ${C.cyan};
        border-style: solid;
        opacity: 0.4;
      }
      .hud-corner.tl { top:6px; left:6px;   border-width: 2px 0 0 2px; }
      .hud-corner.tr { top:6px; right:6px;  border-width: 2px 2px 0 0; }
      .hud-corner.bl { bottom:6px; left:6px;  border-width: 0 0 2px 2px; }
      .hud-corner.br { bottom:6px; right:6px; border-width: 0 2px 2px 0; }

      /* ── Glitch animation ── */
      @keyframes glitch {
        0%   { clip-path: none; transform: translate(0); }
        92%  { clip-path: none; transform: translate(0); }
        93%  { clip-path: inset(30% 0 40% 0); transform: translate(-3px, 0); color: ${C.magenta}; }
        94%  { clip-path: inset(60% 0 10% 0); transform: translate(3px, 0); }
        95%  { clip-path: none; transform: translate(0); color: ${C.cyan}; }
        100% { clip-path: none; transform: translate(0); }
      }
      .glitch-anim { animation: glitch 3s infinite linear; }

      @keyframes blink-cursor {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
      }
      .blink { animation: blink-cursor 0.8s infinite; }

      /* ── Pause screen ── */
      #hud-pause {
        position: absolute;
        inset: 0;
        background: rgba(0,0,10,0.75);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      #hud-pause .pause-title {
        color: ${C.cyan};
        font-size: 42px;
        letter-spacing: 10px;
        text-shadow: 0 0 18px ${C.cyan}, 0 0 36px ${C.cyan};
        margin-bottom: 10px;
      }
      #hud-pause .pause-sub {
        color: ${C.magenta};
        font-size: 13px;
        letter-spacing: 6px;
        text-shadow: 0 0 8px ${C.magenta};
        opacity: 0.8;
      }

      /* ── Game Over screen ── */
      #hud-gameover {
        position: absolute;
        inset: 0;
        background: rgba(0,0,10,0.88);
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }
      #hud-gameover .go-title {
        color: ${C.red};
        font-size: 48px;
        letter-spacing: 8px;
        text-shadow: 0 0 20px ${C.red}, 0 0 40px ${C.red};
        margin-bottom: 6px;
      }
      #hud-gameover .go-sub {
        color: ${C.magenta};
        font-size: 13px;
        letter-spacing: 5px;
        text-shadow: 0 0 8px ${C.magenta};
        margin-bottom: 6px;
      }
      #hud-gameover .go-score {
        color: ${C.cyan};
        font-size: 20px;
        letter-spacing: 4px;
        text-shadow: 0 0 10px ${C.cyan};
        margin-bottom: 32px;
      }
      #hud-gameover .go-score span {
        color: ${C.yellow};
        text-shadow: 0 0 10px ${C.yellow};
      }
      #hud-restart {
        background: transparent;
        border: 2px solid ${C.cyan};
        color: ${C.cyan};
        font-family: ${FONT_MONO};
        font-size: 15px;
        letter-spacing: 6px;
        padding: 12px 36px;
        cursor: pointer;
        text-shadow: 0 0 8px ${C.cyan};
        box-shadow: 0 0 12px ${C.cyan}, inset 0 0 8px rgba(0,255,231,0.1);
        transition: background 0.15s, box-shadow 0.15s, color 0.15s;
        pointer-events: all;
      }
      #hud-restart:hover {
        background: rgba(0,255,231,0.12);
        box-shadow: 0 0 22px ${C.cyan}, inset 0 0 14px rgba(0,255,231,0.2);
        color: #fff;
      }
      #hud-restart:active {
        transform: scale(0.97);
      }
      #hud-gameover .go-hint {
        color: rgba(0,255,231,0.35);
        font-size: 10px;
        letter-spacing: 4px;
        margin-top: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Build DOM overlay ───────────────────────────────────────────────── */
  function _buildOverlay(canvas) {
    if (_overlay) return;
    _injectCSS();

    const parent = canvas.parentElement || document.body;
    if (parent.style.position === '' || parent.style.position === 'static') {
      parent.style.position = 'relative';
    }

    _overlay = document.createElement('div');
    _overlay.id = 'hud-overlay';

    // Scanlines
    const scanlines = document.createElement('div');
    scanlines.id = 'hud-scanlines';
    _overlay.appendChild(scanlines);

    // Corner accents
    ['tl','tr','bl','br'].forEach(pos => {
      const c = document.createElement('div');
      c.className = `hud-corner ${pos}`;
      _overlay.appendChild(c);
    });

    // ── Score (top-right) ──
    const score = document.createElement('div');
    score.id = 'hud-score';
    score.innerHTML = '<span class="label">SCORE</span><span id="hud-score-val" class="glitch-anim">000000</span>';
    _overlay.appendChild(score);

    // ── Distance (top-left) ──
    const dist = document.createElement('div');
    dist.id = 'hud-distance';
    dist.innerHTML = '<span class="label">DIST</span><span id="hud-dist-val">0000m</span>';
    _overlay.appendChild(dist);

    // ── Health cells ──
    const health = document.createElement('div');
    health.id = 'hud-health';
    for (let i = 0; i < 3; i++) {
      const cell = document.createElement('div');
      cell.className = 'hud-cell';
      cell.id = `hud-cell-${i}`;
      health.appendChild(cell);
    }
    const hlabel = document.createElement('span');
    hlabel.className = 'label';
    hlabel.textContent = 'SYS';
    health.appendChild(hlabel);
    _overlay.appendChild(health);

    // ── Powerup indicator ──
    const pu = document.createElement('div');
    pu.id = 'hud-powerup';
    pu.innerHTML = `
      <span class="pu-icon" id="hud-pu-icon">⚡</span>
      <span class="pu-name" id="hud-pu-name">SPEED BOOST</span>
      <div class="pu-bar-wrap"><div class="pu-bar" id="hud-pu-bar" style="width:100%"></div></div>
    `;
    _overlay.appendChild(pu);

    // ── Pause screen ──
    const pause = document.createElement('div');
    pause.id = 'hud-pause';
    pause.innerHTML = `
      <div class="pause-title glitch-anim">// PAUSED</div>
      <div class="pause-sub blink">► PRESS P TO RESUME ◄</div>
    `;
    _overlay.appendChild(pause);

    // ── Game Over screen ──
    const go = document.createElement('div');
    go.id = 'hud-gameover';
    go.innerHTML = `
      <div class="go-title glitch-anim">GAME OVER</div>
      <div class="go-sub">CONNECTION TERMINATED</div>
      <div class="go-score">FINAL SCORE: <span id="hud-go-score">000000</span></div>
      <button id="hud-restart">[ RESTART ]</button>
      <div class="go-hint blink">or press ENTER to reconnect</div>
    `;
    _overlay.appendChild(go);

    parent.appendChild(_overlay);

    // Cache element refs
    _elements = {
      scoreVal:  document.getElementById('hud-score-val'),
      distVal:   document.getElementById('hud-dist-val'),
      cells:     [0,1,2].map(i => document.getElementById(`hud-cell-${i}`)),
      puWrap:    document.getElementById('hud-powerup'),
      puIcon:    document.getElementById('hud-pu-icon'),
      puName:    document.getElementById('hud-pu-name'),
      puBar:     document.getElementById('hud-pu-bar'),
      pause:     document.getElementById('hud-pause'),
      gameover:  document.getElementById('hud-gameover'),
      goScore:   document.getElementById('hud-go-score'),
      restart:   document.getElementById('hud-restart'),
    };
  }

  /* ─── Powerup icon map ────────────────────────────────────────────────── */
  const PU_ICONS = {
    speed:   { icon: '⚡', label: 'SPEED BOOST' },
    shield:  { icon: '🛡', label: 'FIREWALL'    },
    double:  { icon: '✕2', label: 'DOUBLE SCORE'},
    magnet:  { icon: '◈',  label: 'DATA PULL'   },
    slow:    { icon: '⧗',  label: 'TIME DILATION'},
    default: { icon: '◉',  label: 'POWERUP ACTIVE'},
  };

  /* ─── Pad number string ───────────────────────────────────────────────── */
  function pad(n, len = 6) {
    return String(Math.floor(n)).padStart(len, '0');
  }

  /* ─── Update DOM from state ───────────────────────────────────────────── */
  function _updateDOM(state) {
    _tick++;
    const { score = 0, distance = 0, health = 3, maxHealth = 3,
            powerup = null, paused = false, gameOver = false, onRestart } = state;

    // Score
    if (_elements.scoreVal) {
      _elements.scoreVal.textContent = pad(score, 6);
      // Glitch color briefly on score jump
      if (_tick % 60 < 3) {
        _elements.scoreVal.style.color = C.magenta;
      } else {
        _elements.scoreVal.style.color = '';
      }
    }

    // Distance
    if (_elements.distVal) {
      _elements.distVal.textContent = pad(distance, 4) + 'm';
    }

    // Health cells
    const cells = _elements.cells;
    for (let i = 0; i < 3; i++) {
      const cell = cells[i];
      if (!cell) continue;
      if (i < health) {
        cell.className = 'hud-cell';
      } else {
        cell.className = 'hud-cell empty';
      }
    }

    // Powerup
    if (powerup && powerup.timeLeft > 0) {
      _elements.puWrap.style.display = 'block';
      const info = PU_ICONS[powerup.type] || PU_ICONS.default;
      _elements.puIcon.textContent = info.icon;
      _elements.puName.textContent  = info.label;
      const pct = Math.max(0, Math.min(100, (powerup.timeLeft / powerup.maxTime) * 100));
      _elements.puBar.style.width = pct + '%';
    } else {
      _elements.puWrap.style.display = 'none';
    }

    // Pause
    _elements.pause.style.display    = paused && !gameOver ? 'flex' : 'none';

    // Game Over
    _elements.gameover.style.display = gameOver ? 'flex' : 'none';
    if (gameOver && _elements.goScore) {
      _elements.goScore.textContent = pad(score, 6);
    }

    // Restart button handler (re-bind each frame is fine; modern browsers debounce)
    if (_elements.restart) {
      _elements.restart.onclick = onRestart || null;
    }
  }

  /* ─── Canvas 2D fallback draw (for engines that use ctx directly) ─────── */
  function _drawCanvas(ctx, state) {
    const { score = 0, distance = 0, health = 3, paused = false, gameOver = false } = state;
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.save();
    ctx.font = `bold 20px ${FONT_MONO}`;

    // Score — top right
    ctx.fillStyle = C.cyan;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur  = 12;
    ctx.textAlign   = 'right';
    ctx.fillText(pad(score, 6), W - 18, 36);

    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = 'rgba(0,255,231,0.5)';
    ctx.fillText('SCORE', W - 18, 20);

    // Distance — top left
    ctx.textAlign  = 'left';
    ctx.font = `bold 20px ${FONT_MONO}`;
    ctx.fillStyle  = C.magenta;
    ctx.shadowColor = C.magenta;
    ctx.fillText(pad(distance, 4) + 'm', 18, 36);

    ctx.font = `10px ${FONT_MONO}`;
    ctx.fillStyle = 'rgba(255,0,204,0.5)';
    ctx.fillText('DIST', 18, 20);

    // Health cells
    for (let i = 0; i < 3; i++) {
      const x = 18 + i * 30;
      const y = 50;
      const filled = i < health;
      ctx.shadowBlur = filled ? 8 : 0;
      ctx.shadowColor = C.cyan;
      ctx.strokeStyle = filled ? C.cyan : 'rgba(0,255,231,0.2)';
      ctx.lineWidth   = 2;
      ctx.strokeRect(x, y, 22, 34);
      if (filled) {
        const grad = ctx.createLinearGradient(x, y + 34, x, y);
        grad.addColorStop(0, C.green);
        grad.addColorStop(1, C.cyan);
        ctx.fillStyle = grad;
        ctx.fillRect(x + 2, y + 2, 18, 30);
      }
    }

    // Pause overlay
    if (paused && !gameOver) {
      ctx.fillStyle = 'rgba(0,0,10,0.75)';
      ctx.shadowBlur = 0;
      ctx.fillRect(0, 0, W, H);
      ctx.font       = `bold 42px ${FONT_MONO}`;
      ctx.fillStyle  = C.cyan;
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur  = 20;
      ctx.textAlign  = 'center';
      ctx.fillText('// PAUSED', W / 2, H / 2);
    }

    // Game Over overlay
    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,10,0.88)';
      ctx.shadowBlur = 0;
      ctx.fillRect(0, 0, W, H);

      ctx.font      = `bold 48px ${FONT_MONO}`;
      ctx.fillStyle = C.red;
      ctx.shadowColor = C.red;
      ctx.shadowBlur  = 24;
      ctx.textAlign   = 'center';
      ctx.fillText('GAME OVER', W / 2, H / 2 - 40);

      ctx.font      = `14px ${FONT_MONO}`;
      ctx.fillStyle = C.magenta;
      ctx.shadowColor = C.magenta;
      ctx.shadowBlur  = 10;
      ctx.fillText('CONNECTION TERMINATED', W / 2, H / 2 - 10);

      ctx.font      = `20px ${FONT_MONO}`;
      ctx.fillStyle = C.cyan;
      ctx.shadowColor = C.cyan;
      ctx.shadowBlur  = 12;
      ctx.fillText('SCORE: ' + pad(score, 6), W / 2, H / 2 + 26);

      // Restart button rect
      const bw = 200, bh = 44;
      const bx = W / 2 - bw / 2, by = H / 2 + 56;
      ctx.shadowBlur  = 14;
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth   = 2;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.font      = `15px ${FONT_MONO}`;
      ctx.fillStyle = C.cyan;
      ctx.fillText('[ RESTART ]', W / 2, by + 28);
    }

    ctx.restore();
  }

  /* ─── Public API ──────────────────────────────────────────────────────── */
  const HUD = {
    /**
     * Primary draw call — engine invokes this every frame.
     * Handles both canvas-2d and DOM overlay modes.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} state
     */
    draw(ctx, state = {}) {
      // Lazy-init DOM overlay on first call
      if (ctx && ctx.canvas) {
        if (!_canvas) {
          _canvas = ctx.canvas;
          _buildOverlay(_canvas);
        }
        // Always do canvas draw as fallback / for canvas-only engines
        _drawCanvas(ctx, state);
      }
      // Update DOM overlay (richer version)
      if (_elements.scoreVal) {
        _updateDOM(state);
      }
    },

    /** Manually initialize the DOM overlay (optional — draw() does this too) */
    init(canvas) {
      _canvas = canvas;
      _buildOverlay(canvas);
      _injectCSS();
    },

    /** Destroy and remove DOM overlay */
    destroy() {
      if (_overlay) {
        _overlay.remove();
        _overlay  = null;
        _elements = {};
        _canvas   = null;
        _tick     = 0;
      }
    },

    /** Show a brief flicker/alert on the HUD (e.g. damage flash) */
    flash(color = C.red, durationMs = 120) {
      if (!_overlay) return;
      const el = document.createElement('div');
      el.style.cssText = `
        position:absolute; inset:0; pointer-events:none;
        background:${color}; opacity:0.18;
        transition: opacity ${durationMs}ms ease-out;
        z-index:200;
      `;
      _overlay.appendChild(el);
      requestAnimationFrame(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), durationMs + 50);
      });
    },
  };

  global.HUD = HUD;

})(typeof window !== 'undefined' ? window : globalThis);
