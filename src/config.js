// Single source of truth for every tunable. Logic modules read from CONFIG so
// balancing never requires touching game code.

const PALETTE = { black: '#000000', white: '#ffffff' };

export const CONFIG = {
  // ── Virtual coordinate space (fixed 16:9). All gameplay is authored in these
  //    units; the renderer scales-to-fit the real viewport and letterboxes. This
  //    keeps the visible track identical on every device (fairness). ──
  VIRTUAL_W: 800,
  VIRTUAL_H: 450,

  // ── Loop ──
  PHYSICS_HZ: 120,          // fixed physics step rate
  MAX_FRAME_MS: 250,        // clamp huge dt (e.g. backgrounded tab)

  // ── Flags ──
  DEBUG: true,              // draw FPS + debug HUD
  INVERT: false,            // swap black/white
  ALLOW_DOUBLE_JUMP: true,  // single tap = jump, second tap mid-air = double jump
  SEED: null,               // null = random; set for reproducible runs

  // ── Player physics ──
  GRAVITY: 2200,            // px/s^2
  JUMP_VELOCITY: -780,      // px/s (upward impulse)
  FASTFALL_MULT: 2.6,       // gravity ×multiplier while Down is held in the air
  COYOTE_TIME: 0.08,        // s, grace to jump just after leaving an edge
  JUMP_BUFFER: 0.08,        // s, grace to register a jump just before landing
  VARIABLE_JUMP: true,      // tap = short hop, hold = full jump (jump-cut on release)
  JUMP_CUT_MULT: 0.4,       // upward velocity retained when the jump is released early

  PLAYER: {
    X: 150,                 // fixed horizontal position (virtual px)
    W: 26,
    H: 50,                  // standing height
    DUCK_H: 28,             // ducked height (must clear under OVERHEAD.GAP)
    HITBOX_INSET: 5,        // forgiving: collision box smaller than drawing
    RUN_CADENCE: 0.02,      // running-gait phase speed per px/s of scroll
  },

  // Overhead obstacle (hangs from the ceiling; must be ducked under, can't be jumped).
  OVERHEAD: {
    GAP: 34,                // px of clearance under the bar (ducked height must be < this)
    W_MIN: 44, W_MAX: 90,
    MIN_DIFF: 0.45,         // difficulty gate before overheads appear
  },

  // ── World / difficulty (uncapped, linear) ──
  GROUND_HEIGHT: 70,        // px from bottom of virtual field to ground line
  SCROLL_SPEED_START: 360,  // px/s
  SCROLL_ACCEL: 16,         // px/s added per second survived (no cap) — fast ramp

  // ── Procedural generation tuning + chunk-type weights ──
  GEN: {
    WARMUP_DIST: 800,       // px of guaranteed flat at the start of a run
    SPAWN_MARGIN: 200,      // keep ground generated this far past the right edge
    RECYCLE_MARGIN: 80,     // recycle pieces this far past the left edge
    // Reaction window (s of flat run around hazards, ×speed): eases from MAX at
    // difficulty 0 to MIN at difficulty 1, so high speed genuinely tightens timing.
    RUN_TIME_MAX: 0.5,
    RUN_TIME_MIN: 0.38,
    MIN_RUN: 120,           // floor for the above (px)
    GAP_SAFETY: 0.6,        // fraction of airborne horizontal travel a gap may use
    OBS_SAFETY: 0.6,        // fraction of jump apex an obstacle may reach
    FLAT_MIN: 150, FLAT_MAX: 320,
    OBS_W_MIN: 18, OBS_W_MAX: 40,
    OBS_H_MIN: 28,
    GAP_MIN: 60,
    DIFF_RANGE: 480,        // speed delta over which difficulty climbs 0->1 (~30s)
    COMBO_MIN_DIFF: 0.4,    // gap+obstacle combos only appear past this difficulty
  },

  // ── Leaderboard (Apps Script web app — see docs/04-leaderboard.md) ──
  LEADERBOARD: {
    URL: 'https://script.google.com/macros/s/AKfycbyNbyZX1y1JziQrekKaqdUtQr60mdJ1vtfGSBUyO1L6NLcvwaujHByBbdadZ56X-S38/exec',
    TOP_N: 25,
    REFRESH_DELAY_MS: 1500, // give the sheet a moment to commit the new row before re-reading
    NAME_MAX_LEN: 16,
  },
};

// Derived ground line (top of the ground) in virtual units.
CONFIG.GROUND_Y = CONFIG.VIRTUAL_H - CONFIG.GROUND_HEIGHT;

// Resolved palette (respects INVERT). Letterbox bars frame the play field.
CONFIG.COLORS = CONFIG.INVERT
  ? { bg: PALETTE.black, fg: PALETTE.white, letterbox: PALETTE.white }
  : { bg: PALETTE.white, fg: PALETTE.black, letterbox: PALETTE.black };
