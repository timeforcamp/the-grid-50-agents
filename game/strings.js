// NEON://OVERRIDE — in-game string table
// voice: Static. terse. terminal. cyberpunk. all lowercase.
// usage: window.Strings.menu.title / window.Strings.gameover.taunts[n]

window.Strings = {

  // ── MENU ──────────────────────────────────────────────────────────────
  menu: {
    title:        "neon://override",
    tagline:      "the grid never sleeps. neither should you.",
    start:        "> jack in",
    continue:     "> resume session",
    options:      "> configure",
    quit:         "> disconnect",
    credits:      "> who built this cage",
    volume:       "signal strength",
    fullscreen:   "expand the void",
    back:         "< abort",
    confirm:      "execute? [y/n]",
    press_any:    "press any key to bleed in",
  },

  // ── HUD ───────────────────────────────────────────────────────────────
  hud: {
    score:        "data_harvested",
    lives:        "instances",
    level:        "sector",
    time:         "uptime",
    health:       "integrity",
    ammo:         "payload",
    combo:        "cascade",
    multiplier:   "amp",
    boss_incoming:"//WARNING: apex process detected",
    low_health:   "integrity critical — patch or die",
    no_ammo:      "payload depleted",
    checkpoint:   "node locked",
    level_clear:  "sector scrubbed",
  },

  // ── TUTORIAL — 5 steps ────────────────────────────────────────────────
  tutorial: [
    {
      step:  1,
      head:  "step_01 // movement",
      body:  "you are a signal. signals move. use [wasd] or d-pad. the grid does not wait for the confused.",
    },
    {
      step:  2,
      head:  "step_02 // attack",
      body:  "tap [space] or [btn_a] to deploy payload. hit the red processes. don't hit the white ones. learn the difference fast.",
    },
    {
      step:  3,
      head:  "step_03 // dodge",
      body:  "everything here wants to overwrite you. double-tap a direction to phase-shift. latency kills.",
    },
    {
      step:  4,
      head:  "step_04 // data nodes",
      body:  "glowing nodes hold harvested data. grab them. data is the only currency that matters in the grid.",
    },
    {
      step:  5,
      head:  "step_05 // cascade",
      body:  "chain kills to build cascade multiplier. let it drop and you're leaving credits on the table. don't leave credits on the table.",
    },
  ],

  // ── GAME OVER — 10 taunts (Static's voice) ────────────────────────────
  gameover: {
    header: "//process_terminated",
    subhead: "signal lost",
    retry:  "> try again (you won't win)",
    menu:   "> back to the void",
    taunts: [
      "another body for the grid.",
      "you ran out of next.",
      "the grid chewed you up. the grid is still hungry.",
      "static remembers every corpse. yours is unremarkable.",
      "error 404: survival instinct not found.",
      "process killed. no core dump. you weren't worth the memory.",
      "the system didn't even notice you. that's the saddest part.",
      "you had one job: don't flatline. you had one job.",
      "garbage collected.",
      "signal degraded to noise. which is all you ever were.",
    ],
  },

  // ── ACHIEVEMENTS — 10 titles ───────────────────────────────────────────
  achievements: [
    { id: "first_blood",    title: "first packet",       desc: "destroy your first process."                        },
    { id: "no_damage",      title: "ghost protocol",     desc: "clear a sector without taking damage."              },
    { id: "cascade_10",     title: "cascade overflow",   desc: "reach a x10 cascade multiplier."                   },
    { id: "speed_run",      title: "low latency",        desc: "complete sector 01 under 60 seconds."               },
    { id: "all_nodes",      title: "data hoarder",       desc: "collect every node in a single sector."            },
    { id: "boss_kill",      title: "apex terminated",    desc: "defeat your first apex process."                    },
    { id: "death_10",       title: "repeat offender",    desc: "die 10 times. static is not impressed. keep going." },
    { id: "full_clear",     title: "sector scrubbed",    desc: "eliminate every process in a sector."               },
    { id: "no_shoot",       title: "pacifist signal",    desc: "reach sector 03 without firing a single payload."   },
    { id: "true_end",       title: "you rewrote the grid", desc: "finish the game. static didn't see that coming."  },
  ],

  // ── SYSTEM MESSAGES ────────────────────────────────────────────────────
  system_msgs: {
    loading:          "compiling sector data...",
    loading_long:     "still loading. the grid is vast. patience is a exploit.",
    error_generic:    "//err: something broke. probably not your fault. probably.",
    error_save:       "//err: save state corrupted. the grid takes everything.",
    error_connection: "//err: uplink severed. check your rig.",
    paused:           "// paused — the grid continues without you",
    resume:           "> resume",
    saving:           "writing to persistent memory...",
    saved:            "progress locked.",
    new_game_warn:    "overwrite current session? data is not recoverable.",
    sector_loading:   "patching into sector {n}...",
    boss_loading:     "//WARNING: apex process initializing — brace your signal",
    credits_roll:     "neon://override was built in 24 hours by signals who refused to flatline.",
    version:          "build v0.1.0-alpha // the grid is in beta, always",
  },

};
