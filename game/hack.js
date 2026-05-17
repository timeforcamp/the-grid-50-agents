/**
 * NEON://OVERRIDE — ICE Breach Minigame
 * Triggered on ICE wall collision. Player must match a glyph key sequence
 * within 3 seconds or take damage.
 *
 * Usage:  window.Hack.start(callback)
 *   callback(true)  → breach succeeded, player phases through
 *   callback(false) → breach failed, player takes damage
 */

(function (global) {
  'use strict';

  const GLYPHS   = ['─','█','▓','░','╳','▒','▐','▌','╬','╪'];
  const KEYS     = ['w','a','s','d','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'];
  const LABELS   = { w:'W', a:'A', s:'S', d:'D',
                     ArrowUp:'↑', ArrowLeft:'←', ArrowDown:'↓', ArrowRight:'→' };
  const SEQ_LEN  = 5;
  const TIME_MS  = 3000;

  let overlay = null, timerBar = null, seqEl = null, inputEl = null;
  let sequence = [], pressed = [], deadline = 0, ticker = null, cb = null;

  /* ── helpers ─────────────────────────────────────────────── */

  function rndGlyph() { return GLYPHS[Math.random() * GLYPHS.length | 0]; }
  function rndKey()   { return KEYS[Math.random() * KEYS.length | 0]; }

  function glitchText(str) {
    return str.split('').map(c =>
      Math.random() < 0.08 ? rndGlyph() : c
    ).join('');
  }

  function buildSequence() {
    sequence = [];
    for (let i = 0; i < SEQ_LEN; i++) sequence.push(rndKey());
  }

  /* ── DOM ──────────────────────────────────────────────────── */

  function buildOverlay() {
    overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '9999',
      background: 'rgba(0,0,0,0.93)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Courier New", monospace',
      color: '#00ff41',
      userSelect: 'none',
    });

    overlay.innerHTML = `
      <div id="hk-noise" style="position:absolute;inset:0;pointer-events:none;opacity:0.04;"></div>
      <div style="font-size:11px;letter-spacing:4px;opacity:0.6;margin-bottom:12px;">
        █ ICE DETECTED — BREACH SEQUENCE INITIATED █
      </div>
      <div id="hk-banner" style="font-size:28px;letter-spacing:6px;margin-bottom:24px;
           text-shadow:0 0 12px #00ff41;animation:hkflicker 0.12s infinite alternate;">
        ${rndGlyph()}${rndGlyph()} CRACKING ICE ${rndGlyph()}${rndGlyph()}
      </div>
      <div id="hk-seq" style="font-size:36px;letter-spacing:14px;margin-bottom:20px;
           min-height:52px;text-shadow:0 0 8px #00ff41;"></div>
      <div id="hk-input" style="font-size:22px;letter-spacing:10px;min-height:36px;
           color:#00cc33;"></div>
      <div style="margin-top:24px;width:320px;height:6px;background:#003300;border:1px solid #00ff41;">
        <div id="hk-timer" style="height:100%;width:100%;background:#00ff41;
             transition:width 0.1s linear;box-shadow:0 0 6px #00ff41;"></div>
      </div>
      <div style="margin-top:14px;font-size:10px;opacity:0.5;letter-spacing:2px;">
        MATCH THE SEQUENCE — ${TIME_MS/1000}s TO BREACH
      </div>
    `;

    /* inject keyframe CSS once */
    if (!document.getElementById('hk-style')) {
      const s = document.createElement('style');
      s.id = 'hk-style';
      s.textContent = `
        @keyframes hkflicker {
          from { opacity:1; } to { opacity:0.7; }
        }
        @keyframes hkshake {
          0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)}
        }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(overlay);
    timerBar = document.getElementById('hk-timer');
    seqEl    = document.getElementById('hk-seq');
    inputEl  = document.getElementById('hk-input');

    /* CRT noise canvas */
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    document.getElementById('hk-noise').appendChild(noiseCanvas);
    animateNoise(noiseCanvas);
  }

  function animateNoise(canvas) {
    let running = true;
    function frame() {
      if (!document.body.contains(canvas)) return;
      canvas.width  = canvas.offsetWidth  || 400;
      canvas.height = canvas.offsetHeight || 300;
      const ctx = canvas.getContext('2d');
      const id  = ctx.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = Math.random() < 0.5 ? 255 : 0;
        id.data[i] = id.data[i+1] = id.data[i+2] = v;
        id.data[i+3] = Math.random() * 30;
      }
      ctx.putImageData(id, 0, 0);
      if (running) requestAnimationFrame(frame);
    }
    frame();
  }

  function renderSequence() {
    seqEl.textContent = sequence.map(k => LABELS[k]).join('  ');
  }

  function renderInput() {
    const done  = pressed.map(k => LABELS[k]).join('  ');
    const remaining = sequence.slice(pressed.length).map(k => '·').join('  ');
    inputEl.textContent = done + (done && remaining ? '  ' : '') + remaining;
  }

  function flash(color, msg) {
    overlay.style.borderTop = `3px solid ${color}`;
    if (seqEl) { seqEl.style.color = color; seqEl.textContent = msg; }
  }

  function teardown() {
    document.removeEventListener('keydown', onKey);
    clearInterval(ticker);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = timerBar = seqEl = inputEl = null;
    sequence = []; pressed = [];
  }

  /* ── logic ────────────────────────────────────────────────── */

  function onKey(e) {
    const k = e.key;
    if (!KEYS.includes(k)) return;
    e.preventDefault();

    const expected = sequence[pressed.length];
    if (k === expected) {
      pressed.push(k);
      renderInput();
      if (pressed.length === sequence.length) resolve(true);
    } else {
      flash('#ff003c', '╳ BREACH FAILED ╳');
      setTimeout(() => resolve(false), 400);
      document.removeEventListener('keydown', onKey);
    }
  }

  function resolve(success) {
    clearInterval(ticker);
    if (success) {
      flash('#00ffff', '█ ACCESS GRANTED █');
    } else {
      overlay.style.animation = 'hkshake 0.1s 3';
    }
    setTimeout(() => {
      teardown();
      if (cb) { const f = cb; cb = null; f(success); }
    }, success ? 500 : 600);
  }

  function startTimer() {
    deadline = Date.now() + TIME_MS;
    ticker = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      const pct = (remaining / TIME_MS) * 100;
      if (timerBar) timerBar.style.width = pct + '%';
      if (remaining <= 0) {
        clearInterval(ticker);
        flash('#ff003c', '╳ TIMEOUT ╳');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => {
          teardown();
          if (cb) { const f = cb; cb = null; f(false); }
        }, 600);
      }
    }, 100);
  }

  /* ── public API ───────────────────────────────────────────── */

  global.Hack = {
    start(callback) {
      if (overlay) return; // already running
      cb = callback;
      buildSequence();
      buildOverlay();
      renderSequence();
      renderInput();
      startTimer();
      document.addEventListener('keydown', onKey);
    }
  };

})(window);
