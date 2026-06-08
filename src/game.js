import { CONFIG } from './config.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { makeRng } from './rng.js';
import { Generator } from './generator.js';
import { World } from './world.js';
import { Player } from './player.js';
import { loadBest, saveBest } from './score.js';
import { fetchTop, submitScore } from './leaderboard.js';
import * as UI from './ui.js';

const READY = 0;
const PLAYING = 1;
const OVER = 2;
const PAUSED = 3;

// Orchestrates the whole game: owns the state machine, advances physics/world,
// detects death, and renders the scene + HUD.
export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    const seed = CONFIG.SEED != null ? CONFIG.SEED : ((Date.now() >>> 0) ^ 0x9e37);
    this.rng = makeRng(seed);
    this.gen = new Generator(this.rng);
    this.world = new World(this.gen);
    this.player = new Player();
    this.best = loadBest();

    this.state = READY;
    this.namePrompt = true;          // wait for name entry before accepting input
    this.playerName = 'PLAYER';
    this.elapsed = 0;
    this.speed = CONFIG.SCROLL_SPEED_START;
    this.score = 0;
    this.isNewBest = false;

    // Leaderboard state (populated on Game Over).
    this.board = [];
    this.boardStatus = 'idle'; // idle | submitting | loading | ok | error | disabled
    this.myScore = 0;
    this.myName = '';
    this._runId = 0;           // invalidates stale async refreshes on restart

    // FPS sampling.
    this.fps = 0;
    this._frames = 0;
    this._accMs = 0;
    this._lastTs = performance.now();

    // UI hooks set by the bootstrap (DOM lives outside the game).
    this.onState = null; // (state) => void — toggle DOM controls per state
    this.onHome = null;  // () => void — show the name-entry overlay

    this.input = new Input(canvas, {
      onJumpPress: () => this.onTap(),
      onJumpRelease: () => this.onJumpRelease(),
      onPause: () => this.togglePause(),
      onHome: () => this.goHome(),
      onDown: (active) => this.setDown(active),
    });
  }

  onJumpRelease() {
    if (this.state === PLAYING) this.player.releaseJump();
  }

  setDown(active) {
    this.player.downHeld = !!active && this.state === PLAYING;
  }

  _setState(s) {
    this.state = s;
    if (this.onState) this.onState(s);
  }

  // Called by the bootstrap once the player has entered a name.
  start(name) {
    this.playerName = name;
    this.namePrompt = false;
    this._setState(READY);
  }

  onTap() {
    if (this.namePrompt || this.state === PAUSED) return; // gated
    if (this.state === READY) {
      this._setState(PLAYING);
      this.player.requestJump();
    } else if (this.state === PLAYING) {
      this.player.requestJump();
    } else if (this.state === OVER) {
      this.restart();
    }
  }

  restart() {
    this._runId += 1; // cancel any pending leaderboard refresh
    this.world.reset();
    this.player.reset();
    this.elapsed = 0;
    this.speed = CONFIG.SCROLL_SPEED_START;
    this.score = 0;
    this.isNewBest = false;
    this.boardStatus = 'idle';
    this.board = [];
    this._setState(PLAYING);
  }

  // Stop the run and show the leaderboard (no score submitted — run isn't over).
  pause() {
    if (this.state !== PLAYING) return;
    this.player.downHeld = false; // don't keep ducking/falling after resume
    this._setState(PAUSED);
    this._refreshLeaderboard(false);
  }

  resume() {
    if (this.state !== PAUSED) return;
    this._setState(PLAYING);
  }

  togglePause() {
    if (this.namePrompt) return;
    if (this.state === PLAYING) this.pause();
    else if (this.state === PAUSED) this.resume();
  }

  // Abandon the run and return to the name-entry screen.
  goHome() {
    if (this.namePrompt) return;
    this._runId += 1; // cancel any pending leaderboard refresh
    this.world.reset();
    this.player.reset();
    this.elapsed = 0;
    this.speed = CONFIG.SCROLL_SPEED_START;
    this.score = 0;
    this.isNewBest = false;
    this.boardStatus = 'idle';
    this.board = [];
    this.namePrompt = true;
    this._setState(READY);
    if (this.onHome) this.onHome();
  }

  die() {
    this._setState(OVER);
    if (this.score > this.best) {
      this.best = this.score;
      this.isNewBest = true;
      saveBest(this.best);
    }
    this._refreshLeaderboard(true);
  }

  // Read the board (and, when `submit` is true, post this run's score first).
  // Guarded by a run id so a restart/home/resume mid-request discards the result.
  async _refreshLeaderboard(submit) {
    if (!CONFIG.LEADERBOARD.URL) { this.boardStatus = 'disabled'; return; }
    const rid = (this._runId += 1);
    const myName = this.playerName;
    const myScore = this.score;
    this.myName = myName;
    this.myScore = myScore;
    this.board = [];

    try {
      if (submit && myScore > 0) {
        this.boardStatus = 'submitting';
        await submitScore(myName, myScore);
        if (rid !== this._runId) return;
        await new Promise((r) => setTimeout(r, CONFIG.LEADERBOARD.REFRESH_DELAY_MS));
        if (rid !== this._runId) return;
      }
      this.boardStatus = 'loading';
      const top = await fetchTop();
      if (rid !== this._runId) return;
      this.board = top;
      this.boardStatus = 'ok';
    } catch (e) {
      if (rid !== this._runId) return;
      this.boardStatus = 'error';
    }
  }

  update(dt) {
    if (this.state === READY) {
      this.player.update(dt, true, CONFIG.SCROLL_SPEED_START); // idle jog in place
      return;
    }
    if (this.state === OVER || this.state === PAUSED) return; // frozen

    // PLAYING
    this.elapsed += dt;
    this.speed = CONFIG.SCROLL_SPEED_START + CONFIG.SCROLL_ACCEL * this.elapsed; // uncapped
    this.world.update(dt, this.speed);

    const hasGround = this.world.hasGroundAt(this.player.centerX);
    this.player.update(dt, hasGround, this.speed);
    this.score = Math.floor(this.world.distance / 10);

    const hb = this.player.hitbox();
    if (this.player.feetY > CONFIG.VIRTUAL_H + 40 || this.world.collides(hb.x, hb.y, hb.w, hb.h)) {
      this.die();
    }
  }

  render(alpha) {
    const r = this.renderer;
    const ctx = r.ctx;
    this._sampleFps();
    r.begin();

    // Smooth scroll: extrapolate the world by the sub-step fraction.
    const off = this.state === PLAYING ? alpha * this.world.lastStepDx : 0;
    ctx.save();
    ctx.translate(-off, 0);
    this._drawScene(ctx);
    ctx.restore();

    this.player.draw(ctx, this.state === PLAYING ? alpha : 1);

    if (this.state === PLAYING || this.state === READY) UI.drawScore(ctx, r.vw, this.score, this.best);
    if (this.state === READY) UI.drawReady(ctx, r.vw, r.vh);
    if (this.state === PAUSED) {
      UI.drawPaused(ctx, r.vw, r.vh, {
        score: this.score,
        board: this.board,
        boardStatus: this.boardStatus,
        myName: this.myName,
        myScore: this.myScore,
      });
    }
    if (this.state === OVER) {
      UI.drawGameOver(ctx, r.vw, r.vh, {
        name: this.playerName,
        score: this.score,
        best: this.best,
        isNewBest: this.isNewBest,
        board: this.board,
        boardStatus: this.boardStatus,
        myName: this.myName,
        myScore: this.myScore,
      });
    }

    if (CONFIG.DEBUG) this._drawDebug(ctx);
    if (r.isPortrait) UI.drawRotateHint(ctx, r.vw, r.vh);
  }

  _drawScene(ctx) {
    const fg = CONFIG.COLORS.fg;
    const bg = CONFIG.COLORS.bg;
    const groundY = CONFIG.GROUND_Y;
    const segs = this.world.segments;
    const obs = this.world.obstacles;

    ctx.strokeStyle = fg;
    ctx.fillStyle = fg;
    ctx.lineCap = 'butt';

    // Ground top line (gaps appear as breaks).
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      ctx.moveTo(s.x, groundY);
      ctx.lineTo(s.x + s.width, groundY);
    }
    ctx.stroke();

    // Ledge ticks at each segment edge (implies a pit edge).
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      ctx.moveTo(s.x, groundY); ctx.lineTo(s.x, groundY + 16);
      ctx.moveTo(s.x + s.width, groundY); ctx.lineTo(s.x + s.width, groundY + 16);
    }
    ctx.stroke();

    // Moving dashed texture below the line (sells the scrolling).
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 16]);
    ctx.lineDashOffset = -(this.world.distance % 28);
    ctx.beginPath();
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      ctx.moveTo(s.x, groundY + 24);
      ctx.lineTo(s.x + s.width, groundY + 24);
    }
    ctx.stroke();
    ctx.restore();

    // Obstacles.
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (o.type === 'tri') {
        ctx.beginPath();
        ctx.moveTo(o.x, groundY);
        ctx.lineTo(o.x + o.w, groundY);
        ctx.lineTo(o.x + o.w / 2, o.y);
        ctx.closePath();
        ctx.fill();
      } else if (o.type === 'over') {
        // Slab hanging from the ceiling; duck under the slot beneath it.
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillRect(o.x - 4, o.y + o.h - 8, o.w + 8, 8); // bottom lip
      } else {
        ctx.fillRect(o.x, o.y, o.w, o.h);
        // Hint at stacked squares with bg-colored dividers.
        const blocks = Math.max(1, Math.round(o.h / o.w));
        if (blocks > 1) {
          ctx.strokeStyle = bg;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let b = 1; b < blocks; b++) {
            const yy = o.y + (o.h / blocks) * b;
            ctx.moveTo(o.x, yy);
            ctx.lineTo(o.x + o.w, yy);
          }
          ctx.stroke();
          ctx.strokeStyle = fg;
        }
      }
    }
  }

  _drawDebug(ctx) {
    ctx.fillStyle = CONFIG.COLORS.fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.font = '13px monospace';
    const d = this.gen.difficulty(this.speed).toFixed(2);
    ctx.fillText(
      `FPS ${this.fps}  spd ${Math.round(this.speed)}  diff ${d}  segs ${this.world.segments.length}`,
      10, CONFIG.VIRTUAL_H - 8,
    );
  }

  _sampleFps() {
    const now = performance.now();
    this._frames += 1;
    this._accMs += now - this._lastTs;
    this._lastTs = now;
    if (this._accMs >= 500) {
      this.fps = Math.round((this._frames * 1000) / this._accMs);
      this._frames = 0;
      this._accMs = 0;
    }
  }
}
