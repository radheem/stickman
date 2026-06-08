import { CONFIG } from './config.js';

// Procedural terrain generator. Appends one "feature" (flat / obstacle / gap /
// combo) per call, advancing the world frontier. Every hazard is checked for
// solvability against the actual jump physics, and every hazard is wrapped in a
// safe flat run so the player can always land and set up the next jump.
export class Generator {
  constructor(rng) {
    this.rng = rng;
    // Jump metrics derived from physics (kept consistent with CONFIG).
    this.airtime = (2 * -CONFIG.JUMP_VELOCITY) / CONFIG.GRAVITY;
    this.apex = (CONFIG.JUMP_VELOCITY * CONFIG.JUMP_VELOCITY) / (2 * CONFIG.GRAVITY);
    this.featureCount = 0;
  }

  reset() { this.featureCount = 0; }

  difficulty(speed) {
    return Math.max(0, Math.min(1, (speed - CONFIG.SCROLL_SPEED_START) / CONFIG.GEN.DIFF_RANGE));
  }

  // Flat run guaranteed around hazards, in px. Scales with speed, but the time
  // window eases from RUN_TIME_MAX to RUN_TIME_MIN as difficulty rises, so the
  // game gets harder (tighter reactions) the faster it goes.
  safeRun(speed) {
    const d = this.difficulty(speed);
    const t = CONFIG.GEN.RUN_TIME_MAX + (CONFIG.GEN.RUN_TIME_MIN - CONFIG.GEN.RUN_TIME_MAX) * d;
    return Math.max(CONFIG.GEN.MIN_RUN, speed * t);
  }

  // Widest gap clearable at this speed: airborne horizontal travel × safety.
  maxGap(speed) { return speed * this.airtime * CONFIG.GEN.GAP_SAFETY; }

  // A random clearable obstacle height (capped below the jump apex).
  obsHeight(speed) {
    const maxH = this.apex * CONFIG.GEN.OBS_SAFETY;
    return this.rng.float(CONFIG.GEN.OBS_H_MIN, Math.max(CONFIG.GEN.OBS_H_MIN + 8, maxH));
  }

  // Append one feature starting at world-x `startX`. Returns horizontal advance.
  append(world, startX, speed, distance) {
    const G = CONFIG.GEN;
    const r = this.rng;
    const groundY = CONFIG.GROUND_Y;
    this.featureCount += 1;

    // Warm-up: flat only until the player is settled in.
    const type = distance < G.WARMUP_DIST ? 'flat' : this._choose(this.difficulty(speed));

    let cursor = startX;

    if (type === 'flat') {
      const w = r.float(G.FLAT_MIN, G.FLAT_MAX);
      world.addSegment(cursor, w);
      cursor += w;

    } else if (type === 'obstacle') {
      const lead = this.safeRun(speed);
      const trail = this.safeRun(speed);
      const ow = r.float(G.OBS_W_MIN, G.OBS_W_MAX);
      const oh = this.obsHeight(speed);
      const w = lead + ow + trail;
      world.addSegment(cursor, w);
      world.addObstacle(cursor + lead, groundY - oh, ow, oh, r.chance(0.5) ? 'tri' : 'stack');
      cursor += w;

    } else if (type === 'gap') {
      const maxG = this.maxGap(speed);
      const gw = r.float(Math.max(G.GAP_MIN, maxG * 0.4), maxG);
      cursor += gw; // empty space (a pit)
      const lw = this.safeRun(speed) + r.float(40, 120);
      world.addSegment(cursor, lw);
      cursor += lw;

    } else if (type === 'over') {
      // Overhead bar hanging from the ceiling: duck under it (can't be jumped over).
      const lead = this.safeRun(speed);
      const trail = this.safeRun(speed);
      const ow = r.float(CONFIG.OVERHEAD.W_MIN, CONFIG.OVERHEAD.W_MAX);
      const w = lead + ow + trail;
      world.addSegment(cursor, w);
      const barBottom = groundY - CONFIG.OVERHEAD.GAP; // height of the slab from y=0
      world.addObstacle(cursor + lead, 0, ow, barBottom, 'over');
      cursor += w;

    } else { // combo: gap, then an obstacle on the landing platform
      const gw = r.float(G.GAP_MIN, this.maxGap(speed) * 0.8);
      cursor += gw;
      const lead = this.safeRun(speed);
      const trail = this.safeRun(speed);
      const ow = r.float(G.OBS_W_MIN, (G.OBS_W_MIN + G.OBS_W_MAX) / 2);
      const oh = this.obsHeight(speed) * 0.8;
      const w = lead + ow + trail;
      world.addSegment(cursor, w);
      world.addObstacle(cursor + lead, groundY - oh, ow, oh, r.chance(0.5) ? 'tri' : 'stack');
      cursor += w;
    }

    return cursor - startX;
  }

  // Weighted pick gated by difficulty. Flat always retains weight (breathers).
  _choose(d) {
    const wFlat = 0.5 - 0.25 * d;
    const wObs = 0.25 + 0.08 * d;
    const wGap = 0.18 + 0.1 * d;
    const wCombo = d > CONFIG.GEN.COMBO_MIN_DIFF ? 0.08 + 0.18 * (d - CONFIG.GEN.COMBO_MIN_DIFF) : 0;
    const wOver = d > CONFIG.OVERHEAD.MIN_DIFF ? 0.07 + 0.16 * (d - CONFIG.OVERHEAD.MIN_DIFF) : 0;
    const total = wFlat + wObs + wGap + wCombo + wOver;
    let x = this.rng.next() * total;
    if ((x -= wFlat) < 0) return 'flat';
    if ((x -= wObs) < 0) return 'obstacle';
    if ((x -= wGap) < 0) return 'gap';
    if ((x -= wCombo) < 0) return 'combo';
    return 'over';
  }
}
