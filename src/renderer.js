import { CONFIG } from './config.js';

// Owns the canvas and the virtual->screen mapping. Gameplay draws in virtual
// units (CONFIG.VIRTUAL_W x VIRTUAL_H); the renderer scales that uniformly to fit
// the viewport, centers it, paints letterbox bars around it, and accounts for
// device pixel ratio so lines stay crisp.
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.cssW = 0;
    this.cssH = 0;
    this.resize();
    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    // Mobile: fires when the browser chrome (address bar) shows/hides.
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  }

  get vw() { return CONFIG.VIRTUAL_W; }
  get vh() { return CONFIG.VIRTUAL_H; }
  get isPortrait() { return this.cssH > this.cssW; }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.dpr = dpr;
    this.cssW = cssW;
    this.cssH = cssH;

    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);

    // Uniform scale-to-fit; letterbox the remainder.
    this.scale = Math.min(cssW / this.vw, cssH / this.vh);
    this.offsetX = (cssW - this.vw * this.scale) / 2;
    this.offsetY = (cssH - this.vh * this.scale) / 2;
  }

  // Start a frame: paint the letterbox backdrop, set the virtual-space transform,
  // and fill the play field. After this, draw using virtual units.
  begin() {
    const { ctx, dpr } = this;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = CONFIG.COLORS.letterbox;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const s = dpr * this.scale;
    ctx.setTransform(s, 0, 0, s, dpr * this.offsetX, dpr * this.offsetY);

    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, this.vw, this.vh);
  }
}
