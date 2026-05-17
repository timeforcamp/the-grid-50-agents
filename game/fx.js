/**
 * NEON://OVERRIDE - Post-FX Rendering Layer
 * Lightweight effects for 60fps cyberpunk runner
 */

class PostFX {
  constructor() {
    this.shakeX = 0;
    this.shakeY = 0;
    this.shakeDecay = 0.85;
    this.rainDrops = [];
    this.bloomCanvas = null;
    this.bloomCtx = null;
    this.neonTrails = [];

    // Initialize bloom buffer
    this.initBloomBuffer();
  }

  initBloomBuffer() {
    if (typeof document !== 'undefined') {
      this.bloomCanvas = document.createElement('canvas');
      this.bloomCtx = this.bloomCanvas.getContext('2d');
    }
  }

  /**
   * CRT Scanline Overlay
   * Creates retro CRT monitor effect with horizontal scanlines
   */
  drawScanlines(ctx, intensity = 0.15) {
    const canvas = ctx.canvas;
    const lineHeight = 2;

    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = intensity;

    // Draw horizontal scanlines
    ctx.fillStyle = '#000000';
    for (let y = 0; y < canvas.height; y += lineHeight * 2) {
      ctx.fillRect(0, y, canvas.width, lineHeight);
    }

    // Add subtle vertical RGB offset for authentic CRT feel
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(1, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0000ff';
    ctx.fillRect(-1, 0, canvas.width, canvas.height);

    ctx.restore();
  }

  /**
   * Chromatic Aberration Glitch Effect
   * Splits RGB channels for digital corruption aesthetic
   */
  chromaticAberration(ctx, intensity = 2) {
    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const newData = new Uint8ClampedArray(data.length);

    // Copy original data
    newData.set(data);

    // Offset red and blue channels
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;

        // Red channel shift right
        const redX = Math.min(x + intensity, canvas.width - 1);
        const redIdx = (y * canvas.width + redX) * 4;
        if (redIdx < data.length) {
          newData[idx] = data[redIdx];
        }

        // Blue channel shift left
        const blueX = Math.max(x - intensity, 0);
        const blueIdx = (y * canvas.width + blueX) * 4;
        if (blueIdx < data.length) {
          newData[idx + 2] = data[blueIdx + 2];
        }
      }
    }

    ctx.putImageData(new ImageData(newData, canvas.width, canvas.height), 0, 0);
  }

  /**
   * Bloom Effect
   * Additive glow for neon elements
   */
  bloom(ctx, radius = 8, intensity = 0.3) {
    const canvas = ctx.canvas;

    // Ensure bloom buffer matches canvas size
    if (!this.bloomCanvas ||
        this.bloomCanvas.width !== canvas.width ||
        this.bloomCanvas.height !== canvas.height) {
      if (this.bloomCanvas) {
        this.bloomCanvas.width = canvas.width;
        this.bloomCanvas.height = canvas.height;
      }
    }

    if (!this.bloomCtx) return;

    // Copy current frame to bloom buffer
    this.bloomCtx.clearRect(0, 0, canvas.width, canvas.height);
    this.bloomCtx.drawImage(canvas, 0, 0);

    // Apply blur to bloom buffer
    this.bloomCtx.filter = `blur(${radius}px)`;
    this.bloomCtx.globalCompositeOperation = 'screen';
    this.bloomCtx.globalAlpha = intensity;
    this.bloomCtx.drawImage(this.bloomCanvas, 0, 0);

    // Draw bloom back to main canvas
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = intensity;
    ctx.drawImage(this.bloomCanvas, 0, 0);
    ctx.restore();

    // Reset bloom context
    this.bloomCtx.filter = 'none';
    this.bloomCtx.globalCompositeOperation = 'source-over';
    this.bloomCtx.globalAlpha = 1;
  }

  /**
   * Screen Shake Effect
   * Triggers camera shake for impact feedback
   */
  shake(magnitude) {
    this.shakeX += (Math.random() - 0.5) * magnitude;
    this.shakeY += (Math.random() - 0.5) * magnitude;
  }

  /**
   * Apply Screen Shake
   * Call before drawing game content
   */
  applyShake(ctx) {
    if (Math.abs(this.shakeX) > 0.1 || Math.abs(this.shakeY) > 0.1) {
      ctx.save();
      ctx.translate(this.shakeX, this.shakeY);

      // Decay shake
      this.shakeX *= this.shakeDecay;
      this.shakeY *= this.shakeDecay;

      return true; // Indicates shake was applied, need to restore
    }
    return false;
  }

  /**
   * Neon Trail Effect
   * Draws glowing trails behind moving objects
   */
  drawNeonTrail(ctx, x, y, color = '#00ffff', length = 10) {
    this.neonTrails.push({
      x: x,
      y: y,
      color: color,
      life: length,
      maxLife: length
    });

    // Draw and update trails
    ctx.save();
    for (let i = this.neonTrails.length - 1; i >= 0; i--) {
      const trail = this.neonTrails[i];
      const alpha = trail.life / trail.maxLife;

      ctx.globalAlpha = alpha * 0.6;
      ctx.fillStyle = trail.color;
      ctx.shadowColor = trail.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(trail.x - 1, trail.y - 1, 2, 2);

      trail.life--;
      if (trail.life <= 0) {
        this.neonTrails.splice(i, 1);
      }
    }
    ctx.restore();
  }

  /**
   * Rain Particle System
   * Atmospheric cyberpunk rain effect
   */
  spawnRain(ctx, density = 0.3) {
    const canvas = ctx.canvas;

    // Spawn new raindrops
    if (Math.random() < density) {
      this.rainDrops.push({
        x: Math.random() * canvas.width,
        y: -10,
        speed: 3 + Math.random() * 4,
        length: 8 + Math.random() * 12,
        opacity: 0.3 + Math.random() * 0.4
      });
    }

    // Draw and update raindrops
    ctx.save();
    ctx.lineCap = 'round';

    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const drop = this.rainDrops[i];

      // Draw raindrop
      ctx.globalAlpha = drop.opacity;
      ctx.strokeStyle = '#4dd0e1';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#4dd0e1';
      ctx.shadowBlur = 2;

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 2, drop.y - drop.length);
      ctx.stroke();

      // Update position
      drop.y += drop.speed;
      drop.x -= 0.5; // Slight diagonal movement

      // Remove if off-screen
      if (drop.y > canvas.height + 20) {
        this.rainDrops.splice(i, 1);
      }
    }
    ctx.restore();
  }

  /**
   * Glitch Scanner Lines
   * Horizontal data corruption effect
   */
  glitchScanlines(ctx, intensity = 0.1) {
    if (Math.random() < intensity) {
      const canvas = ctx.canvas;
      const y = Math.random() * canvas.height;
      const height = 1 + Math.random() * 4;

      ctx.save();
      ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)}, 255, 255, 0.3)`;
      ctx.fillRect(0, y, canvas.width, height);

      // Data shift effect
      const shift = (Math.random() - 0.5) * 20;
      const imageData = ctx.getImageData(0, y, canvas.width, height);
      ctx.putImageData(imageData, shift, y);

      ctx.restore();
    }
  }

  /**
   * Master render call
   * Apply multiple effects in sequence
   */
  render(ctx, effects = {}) {
    const {
      scanlines = true,
      rain = true,
      glitch = false,
      bloom = true,
      chromatic = false
    } = effects;

    // Apply screen shake first (affects all subsequent drawing)
    const needsRestore = this.applyShake(ctx);

    // Post-processing effects
    if (scanlines) this.drawScanlines(ctx, 0.12);
    if (rain) this.spawnRain(ctx, 0.2);
    if (glitch) this.glitchScanlines(ctx, 0.02);
    if (chromatic) this.chromaticAberration(ctx, 1);
    if (bloom) this.bloom(ctx, 6, 0.25);

    // Restore shake translation
    if (needsRestore) {
      ctx.restore();
    }
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.FX = new PostFX();
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = PostFX;
}