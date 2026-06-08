import { CONFIG } from './config.js';

// The stick figure. Fixed horizontal position; the player only controls vertical
// movement. Single tap = jump; a second tap while airborne = double jump.
// Includes coyote time (jump shortly after leaving an edge) and jump buffering
// (a jump pressed just before landing fires on landing).
export class Player {
  constructor() {
    this.groundTop = CONFIG.GROUND_Y - CONFIG.PLAYER.H; // y when standing
    this.reset();
  }

  reset() {
    this.y = this.groundTop;
    this.prevY = this.y;
    this.vy = 0;
    this.grounded = true;
    this.jumpsUsed = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.runCycle = 0; // continuous running-gait phase (radians)
  }

  get centerX() { return CONFIG.PLAYER.X + CONFIG.PLAYER.W / 2; }

  hitbox() {
    const i = CONFIG.PLAYER.HITBOX_INSET;
    return {
      x: CONFIG.PLAYER.X + i,
      y: this.y + i,
      w: CONFIG.PLAYER.W - 2 * i,
      h: CONFIG.PLAYER.H - 2 * i,
    };
  }

  // Called on every jump intent (tap / space / click).
  requestJump() {
    const canFirst = this.grounded || (this.jumpsUsed === 0 && this.coyote <= CONFIG.COYOTE_TIME);
    if (canFirst) {
      this._jump();
    } else if (CONFIG.ALLOW_DOUBLE_JUMP && this.jumpsUsed >= 1 && this.jumpsUsed < 2) {
      this._jump(); // double jump
    } else if (!this.grounded) {
      this.jumpBuffer = CONFIG.JUMP_BUFFER; // remember it for landing
    }
  }

  _jump() {
    this.vy = CONFIG.JUMP_VELOCITY;
    this.grounded = false;
    this.jumpsUsed += 1;
    this.jumpBuffer = 0;
    this.coyote = CONFIG.COYOTE_TIME + 1; // consume coyote window
  }

  // dt: fixed step (s). hasGround: solid floor beneath the player? speed: current
  // scroll speed, used to pace the running animation (faster scroll = faster legs).
  update(dt, hasGround, speed) {
    this.prevY = this.y;

    this.vy += CONFIG.GRAVITY * dt;
    this.y += this.vy * dt;

    let landed = false;
    if (hasGround && this.y >= this.groundTop) {
      this.y = this.groundTop;
      this.vy = 0;
      landed = true;
    }

    if (landed) {
      if (!this.grounded) {
        this.grounded = true;
        this.jumpsUsed = 0;
        this.coyote = 0;
        if (this.jumpBuffer > 0) this._jump(); // buffered jump fires on landing
      }
    } else {
      this.grounded = false;
    }

    if (this.grounded) this.coyote = 0; else this.coyote += dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;

    if (this.grounded) {
      // Cadence scales with scroll speed so the legs visibly keep pace.
      const cadence = Math.max(CONFIG.SCROLL_SPEED_START, speed || 0) * CONFIG.PLAYER.RUN_CADENCE;
      this.runCycle = (this.runCycle + dt * cadence) % (Math.PI * 2);
    }
  }

  draw(ctx, alpha) {
    const x = CONFIG.PLAYER.X;
    const w = CONFIG.PLAYER.W;
    const h = CONFIG.PLAYER.H;
    const y = this.prevY + (this.y - this.prevY) * alpha; // interpolated
    const fg = CONFIG.COLORS.fg;

    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const cx = x + w / 2;
    const headR = Math.max(5, w * 0.34);
    const headCy = y + headR;
    const neckY = headCy + headR;
    const hipY = y + h * 0.6;
    const feetY = y + h;
    const shoulderY = neckY + (hipY - neckY) * 0.18;
    const armLen = w * 0.7;
    const legLen = feetY - hipY;

    // Head.
    ctx.beginPath();
    ctx.arc(cx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();

    // Torso.
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
      // Running: legs swing through an arc (feet lift when forward), arms pump
      // opposite the legs (offset by PI). Continuous so the motion reads clearly.
      const stride = legLen * 0.6;
      const lift = legLen * 0.3;
      ctx.beginPath();
      for (const phase of [0, Math.PI]) {
        const a = this.runCycle + phase;
        const fx = cx + Math.sin(a) * stride;
        const fy = feetY - Math.max(0, Math.cos(a)) * lift;
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
