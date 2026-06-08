import { CONFIG } from './config.js';
import { aabb } from './collision.js';

// The endless terrain stream. Holds ground segments (solid floor spans, with
// gaps being the absence of a segment) and obstacles, all in virtual screen-x.
// Everything scrolls left each step; pieces are recycled via pools so a run of
// any length never grows the heap. The generator fills new ground at the right.
export class World {
  constructor(generator) {
    this.gen = generator;
    this.segments = [];
    this.obstacles = [];
    this.segPool = [];
    this.obsPool = [];
    this.frontier = 0;     // right edge of generated ground (virtual x)
    this.distance = 0;     // total px scrolled this run (drives score)
    this.lastStepDx = 0;   // last step's scroll delta (for render interpolation)
    this.reset();
  }

  reset() {
    while (this.segments.length) this.segPool.push(this.segments.pop());
    while (this.obstacles.length) this.obsPool.push(this.obstacles.pop());
    this.distance = 0;
    this.lastStepDx = 0;
    // Start with a long flat runway so the player begins on solid ground.
    const w = CONFIG.VIRTUAL_W + 400;
    this.addSegment(0, w);
    this.frontier = w;
    this.gen.reset();
  }

  addSegment(x, width) {
    const s = this.segPool.pop() || { x: 0, width: 0 };
    s.x = x; s.width = width;
    this.segments.push(s);
  }

  addObstacle(x, y, w, h, type) {
    const o = this.obsPool.pop() || { x: 0, y: 0, w: 0, h: 0, type: 0 };
    o.x = x; o.y = y; o.w = w; o.h = h; o.type = type;
    this.obstacles.push(o);
  }

  update(dt, speed) {
    const dx = speed * dt;
    this.lastStepDx = dx;
    this.distance += dx;

    for (let i = 0; i < this.segments.length; i++) this.segments[i].x -= dx;
    for (let i = 0; i < this.obstacles.length; i++) this.obstacles[i].x -= dx;
    this.frontier -= dx;

    // Recycle pieces that have scrolled off the left edge (ordered front-to-back).
    const m = CONFIG.GEN.RECYCLE_MARGIN;
    while (this.segments.length && this.segments[0].x + this.segments[0].width < -m) {
      this.segPool.push(this.segments.shift());
    }
    while (this.obstacles.length && this.obstacles[0].x + this.obstacles[0].w < -m) {
      this.obsPool.push(this.obstacles.shift());
    }

    // Keep ground generated ahead of the right edge.
    const limit = CONFIG.VIRTUAL_W + CONFIG.GEN.SPAWN_MARGIN;
    let guard = 0;
    while (this.frontier < limit && guard++ < 64) {
      const adv = this.gen.append(this, this.frontier, speed, this.distance);
      this.frontier += adv;
      if (adv <= 0) break;
    }
  }

  // Is there solid floor beneath this x (true unless x is over a gap)?
  hasGroundAt(x) {
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (x >= s.x && x <= s.x + s.width) return true;
    }
    return false;
  }

  collides(x, y, w, h) {
    for (let i = 0; i < this.obstacles.length; i++) {
      const o = this.obstacles[i];
      if (aabb(x, y, w, h, o.x, o.y, o.w, o.h)) return true;
    }
    return false;
  }
}
