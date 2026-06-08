import { CONFIG } from './config.js';

// The stick figure. Physics are anchored at the FEET (ground-contact point), which
// is height-independent — so ducking can change the body height without disturbing
// landing. The top of the bbox is derived as `feetY - height`.
//
// Vertical control:
//   - Single tap = jump; a second tap while airborne = double jump.
//   - Releasing the jump input early trims the rise (variable jump height).
//   - Down held: ducks on the ground, fast-falls in the air.
// Plus coyote time (jump shortly after leaving an edge) and jump buffering (a jump
// pressed just before landing fires on landing).
export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.feetY = CONFIG.GROUND_Y;
    this.prevFeetY = this.feetY;
    this.vy = 0;
    this.grounded = true;
    this.jumpsUsed = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.cuttable = false;   // current jump can still be trimmed on release
    this.runCycle = 0;       // continuous running-gait phase (radians)
    this.downHeld = false;   // Down input held
    this.ducking = false;    // derived: downHeld && grounded
  }

  get centerX() { return CONFIG.PLAYER.X + CONFIG.PLAYER.W / 2; }
  get height() { return this.ducking ? CONFIG.PLAYER.DUCK_H : CONFIG.PLAYER.H; }

  hitbox() {
    const i = CONFIG.PLAYER.HITBOX_INSET;
    const h = this.height;
    return {
      x: CONFIG.PLAYER.X + i,
      y: (this.feetY - h) + i,
      w: CONFIG.PLAYER.W - 2 * i,
      h: h - 2 * i,
    };
  }

  requestJump() {
    const canFirst = this.grounded || (this.jumpsUsed === 0 && this.coyote <= CONFIG.COYOTE_TIME);
    if (canFirst) {
      this._jump();
    } else if (CONFIG.ALLOW_DOUBLE_JUMP && this.jumpsUsed >= 1 && this.jumpsUsed < 2) {
      this._jump(); // double jump
    } else if (!this.grounded) {
      this.jumpBuffer = CONFIG.JUMP_BUFFER;
    }
  }

  _jump() {
    this.vy = CONFIG.JUMP_VELOCITY;
    this.grounded = false;
    this.jumpsUsed += 1;
    this.jumpBuffer = 0;
    this.coyote = CONFIG.COYOTE_TIME + 1;
    this.cuttable = CONFIG.VARIABLE_JUMP; // this jump responds to hold length
  }

  // Jump-input release: trim the rise for a shorter hop (variable jump height).
  releaseJump() {
    if (this.cuttable && !this.grounded && this.vy < 0) {
      const cut = CONFIG.JUMP_VELOCITY * CONFIG.JUMP_CUT_MULT; // less-negative ceiling
      if (this.vy < cut) this.vy = cut;
    }
    this.cuttable = false;
  }

  update(dt, hasGround, speed) {
    this.prevFeetY = this.feetY;

    // Fast-fall (Down held, airborne) multiplies gravity for a quicker descent.
    const fast = this.downHeld && !this.grounded;
    const g = CONFIG.GRAVITY * (fast ? CONFIG.FASTFALL_MULT : 1);
    this.vy += g * dt;
    this.feetY += this.vy * dt;

    let landed = false;
    if (hasGround && this.feetY >= CONFIG.GROUND_Y) {
      this.feetY = CONFIG.GROUND_Y;
      this.vy = 0;
      landed = true;
    }

    if (landed) {
      if (!this.grounded) {
        this.grounded = true;
        this.jumpsUsed = 0;
        this.coyote = 0;
        this.cuttable = false;
        if (this.jumpBuffer > 0) this._jump(); // buffered jump fires on landing
      }
    } else {
      this.grounded = false;
    }

    if (this.grounded) this.coyote = 0; else this.coyote += dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;

    // Duck only while grounded; in the air Down is fast-fall instead.
    this.ducking = this.downHeld && this.grounded;

    if (this.grounded && !this.ducking) {
      const cadence = Math.max(CONFIG.SCROLL_SPEED_START, speed || 0) * CONFIG.PLAYER.RUN_CADENCE;
      this.runCycle = (this.runCycle + dt * cadence) % (Math.PI * 2);
    }
  }

  draw(ctx, alpha) {
    const x = CONFIG.PLAYER.X;
    const w = CONFIG.PLAYER.W;
    const h = this.height;
    const feet = this.prevFeetY + (this.feetY - this.prevFeetY) * alpha;
    const top = feet - h;
    const fg = CONFIG.COLORS.fg;

    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = x + w / 2;

    if (this.ducking) {
      // Crouched: low forward-leaning head, near-horizontal back, folded legs.
      const headR = Math.max(4, w * 0.3);
      const headCx = cx + w * 0.22;
      const headCy = top + headR;
      const backY = top + h * 0.5;
      ctx.beginPath();
      ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.45, backY);
      ctx.lineTo(headCx - headR * 0.4, headCy + headR * 0.3);
      ctx.moveTo(cx - w * 0.45, backY); ctx.lineTo(cx - w * 0.15, feet);
      ctx.moveTo(cx, backY + (feet - backY) * 0.35); ctx.lineTo(cx + w * 0.4, feet);
      ctx.stroke();
      return;
    }

    const headR = Math.max(5, w * 0.34);
    const headCy = top + headR;
    const neckY = headCy + headR;
    const hipY = top + h * 0.6;
    const shoulderY = neckY + (hipY - neckY) * 0.18;
    const armLen = w * 0.7;
    const legLen = feet - hipY;

    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, neckY);
    ctx.lineTo(cx, hipY);
    ctx.stroke();

    if (!this.grounded) {
      // Airborne: arms up, legs tucked.
      ctx.beginPath();
      ctx.moveTo(cx, shoulderY); ctx.lineTo(cx - armLen * 0.7, shoulderY - armLen * 0.5);
      ctx.moveTo(cx, shoulderY); ctx.lineTo(cx + armLen * 0.7, shoulderY - armLen * 0.5);
      ctx.moveTo(cx, hipY); ctx.lineTo(cx - legLen * 0.5, hipY + legLen * 0.8);
      ctx.moveTo(cx, hipY); ctx.lineTo(cx + legLen * 0.6, hipY + legLen * 0.7);
      ctx.stroke();
    } else {
      // Running: legs swing through an arc (feet lift forward); arms pump opposite.
      const stride = legLen * 0.6;
      const lift = legLen * 0.3;
      ctx.beginPath();
      for (const phase of [0, Math.PI]) {
        const a = this.runCycle + phase;
        const fx = cx + Math.sin(a) * stride;
        const fy = feet - Math.max(0, Math.cos(a)) * lift;
        ctx.moveTo(cx, hipY);
        ctx.lineTo(fx, fy);
      }
      for (const phase of [Math.PI, 0]) {
        const a = this.runCycle + phase;
        const hx = cx + Math.sin(a) * armLen * 0.7;
        ctx.moveTo(cx, shoulderY);
        ctx.lineTo(hx, shoulderY + armLen * 0.45);
      }
      ctx.stroke();
    }
  }
}
