/**
 * NEON://OVERRIDE — Boot Sequence / Game Loader
 * Fake-terminal boot animation. Plays 3-5s before main menu.
 * Skippable on any keypress or click/tap.
 *
 * Usage:
 *   BootSequence.start(onComplete)
 *
 * Coordinates with game state machine: sets window.gameState = 'boot'
 * on init, then calls onComplete() when done so main.js can enter 'title'.
 */

(function (global) {
  'use strict';

  /* ─── Boot Lines ──────────────────────────────────────────────────────── */
  const BOOT_LINES = [
    { text: 'NEON://OVERRIDE  v2.0.77-nightly',       delay: 0,    color: '#00ffe7', fast: false },
    { text: 'Copyright (c) 2077 GLITCH CORP. All rights corrupted.', delay: 180, color: '#666', fast: false },
    { text: '',                                         delay: 280,  color: '#00ffe7', fast: true  },
    { text: 'BIOS v4.2.0 ........... OK',              delay: 350,  color: '#39ff14', fast: true  },
    { text: 'NEURAL BRIDGE ......... DETECTING',        delay: 480,  color: '#ffe600', fast: true  },
    { text: 'NEURAL BRIDGE ......... LOCKED',           delay: 700,  color: '#39ff14', fast: true  },
    { text: 'MOUNTING /dev/grid .... OK',               delay: 850,  color: '#39ff14', fast: true  },
    { text: 'LOADING CYBERSPACE MAP  [##########] 100%',delay: 1000, color: '#00ffe7', fast: true  },
    { text: '',                                         delay: 1150, color: '#00ffe7', fast: true  },
    { text: 'INITIALIZING NEURAL LINK...',              delay: 1200, color: '#00ffe7', fast: false },
    { text: '',                                         delay: 1700, color: '#00ffe7', fast: true  },
    { text: '  > SCANNING FOR ICE COUNTERMEASURES',    delay: 1750, color: '#ff00cc', fast: false },
    { text: '  > ICE COUNTERMEASURES: STANDBY',        delay: 2150, color: '#ff3355', fast: false },
    { text: '  > CORP-SEC PATROL: ACTIVE  [WARNING]',  delay: 2500, color: '#ff3355', fast: false },
    { text: '',                                         delay: 2900, color: '#00ffe7', fast: true  },
    { text: 'NEURAL SYNC .......... 100%',              delay: 2950, color: '#39ff14', fast: true  },
    { text: '',                                         delay: 3200, color: '#00ffe7', fast: true  },
    { text: '>>> PRESS ANY KEY TO JACK IN <<<',         delay: 3300, color: '#ffe600', fast: false },
  ];

  /* ─── DOM / state ─────────────────────────────────────────────────────── */
  let overlay   = null;
  let terminal  = null;
  let cursor    = null;
  let timers    = [];
  let done      = false;
  let onDoneCb  = null;
  let blinkInterval = null;
  let promptVisible = false;

  /* ─── helpers ─────────────────────────────────────────────────────────── */
  function scheduleTimer(fn, ms) {
    const id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function clearAllTimers() {
    timers.forEach(clearTimeout);
    timers = [];
    if (blinkInterval) { clearInterval(blinkInterval); blinkInterval = null; }
  }

  function finish() {
    if (done) return;
    done = true;
    clearAllTimers();
    document.removeEventListener('keydown', onSkip);
    document.removeEventListener('click',   onSkip);
    document.removeEventListener('touchstart', onSkip);

    // Fade out overlay
    overlay.style.transition = 'opacity 0.5s ease';
    overlay.style.opacity = '0';
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      if (typeof onDoneCb === 'function') onDoneCb();
    }, 520);
  }

  function onSkip() {
    if (!promptVisible && !done) {
      // Only allow skip once the prompt has shown
      return;
    }
    finish();
  }

  /* ─── typewriter for a single line ───────────────────────────────────── */
  function typewriterLine(el, text, color, fast, cb) {
    el.style.color = color || '#00ffe7';
    if (fast || text === '') {
      el.textContent = text;
      if (cb) cb();
      return;
    }
    let i = 0;
    const speed = 28; // ms per char
    function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        scheduleTimer(tick, speed);
      } else {
        if (cb) cb();
      }
    }
    tick();
  }

  /* ─── render each line in sequence ───────────────────────────────────── */
  function renderLines() {
    let lastDelay = 0;
    BOOT_LINES.forEach(function (line, idx) {
      scheduleTimer(function () {
        if (done) return;

        const row = document.createElement('div');
        row.className = 'boot-line';

        terminal.insertBefore(row, cursor);

        const isLast = idx === BOOT_LINES.length - 1;
        typewriterLine(row, line.text, line.color, line.fast, isLast ? function () {
          promptVisible = true;
          // blink the prompt row
          blinkInterval = setInterval(function () {
            row.style.visibility = row.style.visibility === 'hidden' ? 'visible' : 'hidden';
          }, 500);
        } : null);

        // Auto-scroll terminal to bottom
        terminal.scrollTop = terminal.scrollHeight;

      }, line.delay);

      lastDelay = Math.max(lastDelay, line.delay);
    });

    // Hard auto-finish at 5s (regardless of skip)
    scheduleTimer(finish, 5000);
  }

  /* ─── glitch effect ──────────────────────────────────────────────────── */
  function startGlitch() {
    const GLITCH_CHARS = '!@#$%^&*<>?/|\\01';
    setInterval(function () {
      if (done) return;
      if (Math.random() > 0.08) return; // sparse

      const lines = terminal.querySelectorAll('.boot-line');
      if (!lines.length) return;
      const target = lines[Math.floor(Math.random() * lines.length)];
      const orig = target.textContent;
      if (!orig.trim()) return;

      const glitched = orig.split('').map(function (ch) {
        return Math.random() < 0.15 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : ch;
      }).join('');

      target.textContent = glitched;
      setTimeout(function () { if (!done) target.textContent = orig; }, 80);
    }, 120);
  }

  /* ─── build DOM ───────────────────────────────────────────────────────── */
  function buildDOM() {
    // Styles — injected once
    if (!document.getElementById('boot-styles')) {
      const style = document.createElement('style');
      style.id = 'boot-styles';
      style.textContent = [
        '#boot-overlay {',
        '  position: fixed; inset: 0; z-index: 9999;',
        '  background: #000;',
        '  display: flex; flex-direction: column;',
        '  justify-content: center; align-items: center;',
        '  font-family: "Courier New", Courier, monospace;',
        '  overflow: hidden;',
        '}',
        '#boot-overlay::before {',
        '  content: ""; position: absolute; inset: 0;',
        '  background: repeating-linear-gradient(',
        '    0deg, transparent, transparent 2px,',
        '    rgba(0,255,231,0.03) 2px, rgba(0,255,231,0.03) 4px);',
        '  pointer-events: none; z-index: 1;',
        '}',
        '#boot-terminal {',
        '  position: relative; z-index: 2;',
        '  width: min(720px, 92vw);',
        '  max-height: 80vh; overflow: hidden;',
        '  padding: 2rem;',
        '  border: 1px solid rgba(0,255,231,0.25);',
        '  box-shadow: 0 0 40px rgba(0,255,231,0.15), inset 0 0 60px rgba(0,0,0,0.5);',
        '  background: rgba(0,0,10,0.92);',
        '}',
        '#boot-logo {',
        '  font-size: clamp(1rem, 3vw, 1.5rem);',
        '  color: #00ffe7;',
        '  text-shadow: 0 0 12px #00ffe7, 0 0 24px #00ffe7;',
        '  letter-spacing: 0.15em;',
        '  text-align: center;',
        '  margin-bottom: 1.5rem;',
        '  user-select: none;',
        '}',
        '.boot-line {',
        '  font-size: clamp(0.65rem, 1.8vw, 0.85rem);',
        '  line-height: 1.7;',
        '  white-space: pre;',
        '  min-height: 1.4em;',
        '  color: #00ffe7;',
        '}',
        '#boot-cursor {',
        '  display: inline-block;',
        '  width: 0.55em; height: 1.1em;',
        '  background: #00ffe7;',
        '  vertical-align: text-bottom;',
        '  animation: blink 0.9s step-start infinite;',
        '}',
        '@keyframes blink {',
        '  50% { opacity: 0; }',
        '}',
        '#boot-skip {',
        '  position: absolute; bottom: 1.2rem; right: 1.5rem; z-index: 3;',
        '  color: rgba(0,255,231,0.35);',
        '  font-family: "Courier New", monospace;',
        '  font-size: 0.65rem;',
        '  letter-spacing: 0.1em;',
        '  pointer-events: none;',
        '}',
      ].join('\n');
      document.head.appendChild(style);
    }

    // Overlay
    overlay = document.createElement('div');
    overlay.id = 'boot-overlay';

    // Logo banner
    const logo = document.createElement('div');
    logo.id = 'boot-logo';
    logo.textContent = 'N E O N : // O V E R R I D E';
    overlay.appendChild(logo);

    // Terminal box
    terminal = document.createElement('div');
    terminal.id = 'boot-terminal';
    overlay.appendChild(terminal);

    // Blinking cursor element (sits at bottom of terminal content)
    cursor = document.createElement('span');
    cursor.id = 'boot-cursor';
    terminal.appendChild(cursor);

    // Skip hint
    const skip = document.createElement('div');
    skip.id = 'boot-skip';
    skip.textContent = '[ESC or CLICK to skip]';
    overlay.appendChild(skip);

    document.body.appendChild(overlay);
  }

  /* ─── public API ──────────────────────────────────────────────────────── */
  const BootSequence = {
    /**
     * @param {Function} onComplete — called when boot finishes (or is skipped)
     */
    start: function (onComplete) {
      // Signal game state machine
      global.gameState = 'boot';

      onDoneCb = onComplete || null;
      done = false;
      promptVisible = false;

      buildDOM();
      renderLines();
      startGlitch();

      // Skip listeners — keydown always works, click only after prompt shows
      document.addEventListener('keydown',    onSkip, { once: false });
      document.addEventListener('click',      onSkip, { once: false });
      document.addEventListener('touchstart', onSkip, { once: false, passive: true });
    },
  };

  /* ─── expose ─────────────────────────────────────────────────────────── */
  global.BootSequence = BootSequence;

}(typeof window !== 'undefined' ? window : this));
