/**
 * NEON://OVERRIDE — Level & Wave Generator
 * level.js
 *
 * Exports: window.Level
 *   generateChunk(distance)  → { obstacles, pickups, speed, wave }
 *   spawnPickups(distance, x) → pickup object or null
 *   getDifficulty(distance)   → { tier, speed, density, label }
 */

(function (global) {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────

  const CHUNK_WIDTH   = 800;   // px width of one generated chunk
  const LANE_COUNT    = 3;     // top / mid / bottom lanes
  const LANE_HEIGHT   = 160;   // px per lane (total canvas height = 480)
  const LANE_Y        = [80, 240, 400]; // centre-y of each lane

  // Obstacle catalogue
  const OBSTACLES = {
    DRONE:    { type: 'drone',    w: 60,  h: 40,  points: 0,   passable: false, lanes: [0,1,2] },
    ICE_WALL: { type: 'ice_wall', w: 30,  h: 160, points: 0,   passable: false, lanes: [0,1,2] },
    GAP:      { type: 'gap',      w: 120, h: 0,   points: 0,   passable: false, lanes: [1,2]   }, // floor gap
    LOW_PIPE: { type: 'low_pipe', w: 40,  h: 100, points: 0,   passable: false, lanes: [1,2]   },
  };

  const PICKUP = {
    DATA_SHARD: { type: 'data_shard', w: 24, h: 24, points: 100, color: '#00ffcc' },
    CREDITS:    { type: 'credits',    w: 28, h: 28, points: 250, color: '#ff00ff' },
    EXPLOIT:    { type: 'exploit',    w: 32, h: 32, points: 500, color: '#ffff00' }, // rare power-up
  };

  // ─── Wave / Difficulty Tiers ───────────────────────────────────────────────

  const TIERS = [
    {
      label:   'BOOT_SEQUENCE',
      minDist: 0,
      maxDist: 500,
      speed:   320,        // px/s
      density: 0.25,       // obstacle chance per slot
      pickupRate: 0.40,
      allowedObstacles: ['DRONE', 'GAP'],
      waves: [
        [0, 1, 0],         // wave patterns — lane indices for obstacles
        [1, 0, 0],
        [0, 0, 1],
      ],
    },
    {
      label:   'FIREWALL_BREACH',
      minDist: 500,
      maxDist: 1500,
      speed:   460,
      density: 0.45,
      pickupRate: 0.30,
      allowedObstacles: ['DRONE', 'ICE_WALL', 'GAP', 'LOW_PIPE'],
      waves: [
        [1, 0, 1],
        [0, 1, 0],
        [1, 1, 0],
        [0, 0, 1],
        [1, 0, 0],
      ],
    },
    {
      label:   'DEEP_GRID',
      minDist: 1500,
      maxDist: Infinity,
      speed:   640,
      density: 0.65,
      pickupRate: 0.20,
      allowedObstacles: ['DRONE', 'ICE_WALL', 'GAP', 'LOW_PIPE'],
      waves: [
        [1, 1, 0],
        [0, 1, 1],
        [1, 0, 1],
        [1, 1, 1],  // gauntlet — all lanes blocked (rare, use sparingly)
        [0, 1, 0],
      ],
    },
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
  }

  function getTier(distance) {
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (distance >= TIERS[i].minDist) return TIERS[i];
    }
    return TIERS[0];
  }

  // Difficulty scalar (0→1) within the current tier for smooth ramping
  function difficultyScalar(distance) {
    const tier = getTier(distance);
    if (!isFinite(tier.maxDist)) {
      // Hard tier: keeps climbing, capped at 1
      const over = distance - tier.minDist;
      return Math.min(1.0, over / 2000);
    }
    const span = tier.maxDist - tier.minDist;
    return Math.min(1.0, (distance - tier.minDist) / span);
  }

  // ─── Core API ─────────────────────────────────────────────────────────────

  /**
   * getDifficulty(distance)
   * Returns metadata about the current difficulty state.
   */
  function getDifficulty(distance) {
    const tier   = getTier(distance);
    const scalar = difficultyScalar(distance);
    const speed  = tier.speed + scalar * 80; // ramp speed within tier
    return {
      tier:    tier.label,
      speed:   Math.round(speed),
      density: Math.min(0.90, tier.density + scalar * 0.20),
      label:   tier.label,
      scalar,
    };
  }

  /**
   * spawnPickups(distance, xOffset)
   * Returns a pickup object or null (probabilistic).
   * xOffset is the absolute x position within the chunk.
   */
  function spawnPickups(distance, xOffset) {
    const { pickupRate } = getTier(distance);
    if (Math.random() > pickupRate) return null;

    const lane = randInt(0, LANE_COUNT - 1);
    const y    = LANE_Y[lane] - 12;

    // Weighted rarity: 70% shard, 25% credits, 5% exploit
    const roll = Math.random();
    let template;
    if (roll < 0.70)       template = PICKUP.DATA_SHARD;
    else if (roll < 0.95)  template = PICKUP.CREDITS;
    else                   template = PICKUP.EXPLOIT;

    return {
      ...template,
      x: xOffset,
      y,
      lane,
      id: `pickup_${distance}_${xOffset}`,
    };
  }

  /**
   * generateChunk(distance)
   * The main function called by game.js every time a new chunk is needed.
   *
   * Returns:
   * {
   *   obstacles : Array<ObstacleObj>
   *   pickups   : Array<PickupObj>
   *   speed     : number   (px/s)
   *   wave      : string   (tier label)
   *   chunkX    : number   (absolute world-x of chunk start = distance * CHUNK_WIDTH)
   * }
   */
  function generateChunk(distance) {
    const tier    = getTier(distance);
    const diff    = getDifficulty(distance);
    const chunkX  = distance * CHUNK_WIDTH;

    const obstacles = [];
    const pickups   = [];

    // Choose a wave pattern from the tier
    const pattern = pick(tier.waves);

    // Slot spacing — more obstacles as density climbs
    const slotCount = Math.round(4 + diff.scalar * 4);   // 4–8 slots per chunk
    const slotWidth = CHUNK_WIDTH / slotCount;

    for (let s = 0; s < slotCount; s++) {
      const slotX = chunkX + s * slotWidth + slotWidth * 0.3;

      // Should this slot have an obstacle?
      const hasObstacle = Math.random() < diff.density;

      if (hasObstacle) {
        // Pick lane from wave pattern (lane=1 means place obstacle)
        const activeLanes = pattern
          .map((active, laneIdx) => active ? laneIdx : null)
          .filter(l => l !== null);

        // Don't always block ALL active lanes — ease off at low scalar
        const lanesThisSlot = activeLanes.filter(() => Math.random() < (0.5 + diff.scalar * 0.5));

        for (const lane of lanesThisSlot) {
          const obKey  = pick(tier.allowedObstacles);
          const obTpl  = OBSTACLES[obKey];

          // Validate lane compatibility
          if (!obTpl.lanes.includes(lane)) continue;

          obstacles.push({
            ...obTpl,
            x:    slotX,
            y:    LANE_Y[lane] - obTpl.h / 2,
            lane,
            id:   `obs_${distance}_${s}_${lane}`,
            // Visual hints for renderer
            glowColor: obKey === 'ICE_WALL' ? '#00aaff' : '#ff2200',
          });
        }
      }

      // Pickup in this slot?
      const pickup = spawnPickups(distance, slotX + slotWidth * 0.5);
      if (pickup) pickups.push(pickup);
    }

    return {
      obstacles,
      pickups,
      speed:  diff.speed,
      wave:   tier.label,
      chunkX,
      chunkWidth: CHUNK_WIDTH,
    };
  }

  // ─── Export ───────────────────────────────────────────────────────────────

  global.Level = {
    generateChunk,
    spawnPickups,
    getDifficulty,

    // Constants useful to the renderer / engine
    LANE_Y,
    LANE_COUNT,
    LANE_HEIGHT,
    CHUNK_WIDTH,
    OBSTACLES,
    PICKUP,
    TIERS,
  };

})(typeof window !== 'undefined' ? window : globalThis);
