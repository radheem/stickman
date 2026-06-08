import { CONFIG } from './config.js';

const pad = (n) => String(n).padStart(5, '0');

// Live score + best, top-right.
export function drawScore(ctx, vw, score, best) {
  ctx.fillStyle = CONFIG.COLORS.fg;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(pad(score), vw - 16, 14);
  ctx.font = '14px monospace';
  ctx.fillText('BEST ' + pad(best), vw - 16, 52);
}

// Start screen hint.
export function drawReady(ctx, vw, vh) {
  ctx.fillStyle = CONFIG.COLORS.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px monospace';
  ctx.fillText('INFINITE STICKMAN', vw / 2, vh * 0.32);
  ctx.font = '18px monospace';
  ctx.fillText('TAP / SPACE TO JUMP', vw / 2, vh * 0.32 + 42);
  ctx.font = '13px monospace';
  ctx.fillText('double-tap to double-jump', vw / 2, vh * 0.32 + 68);
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) : s);

// Draws the leaderboard list (header + rows or status) starting at `top`,
// highlighting the player's row (or showing a "you" line if off-board).
function drawBoard(ctx, vw, top, info) {
  const { board, boardStatus, myName, myScore } = info;
  const fg = CONFIG.COLORS.fg;
  const bg = CONFIG.COLORS.bg;
  const W = 400, x0 = (vw - W) / 2, x1 = x0 + W;
  const rankX = x0 + 14, nameX = x0 + 56, scoreX = x1 - 14;
  const rowH = 20, maxRows = 9;

  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('— LEADERBOARD —', vw / 2, top);

  const listTop = top + 18;
  if (boardStatus === 'ok' && board && board.length) {
    let highlighted = false;
    const rows = board.slice(0, maxRows);
    ctx.font = '14px monospace';
    for (let i = 0; i < rows.length; i++) {
      const e = rows[i];
      const rowTop = listTop + i * rowH;
      const cy = rowTop + rowH / 2;
      const mine = !highlighted && e.name === myName && e.score === myScore;
      if (mine) {
        highlighted = true;
        ctx.fillStyle = fg;
        ctx.fillRect(x0, rowTop, W, rowH);
        ctx.fillStyle = bg;
      } else {
        ctx.fillStyle = fg;
      }
      ctx.textAlign = 'left';
      ctx.fillText(String(i + 1).padStart(2, ' '), rankX, cy);
      ctx.fillText(clip(e.name.toUpperCase(), 12), nameX, cy);
      ctx.textAlign = 'right';
      ctx.fillText(pad(e.score), scoreX, cy);
    }
    if (!highlighted && myScore > 0) {
      const cy = listTop + rows.length * rowH + rowH / 2 + 4;
      ctx.fillStyle = fg;
      ctx.textAlign = 'left';
      ctx.fillText(' ·', rankX, cy);
      ctx.fillText(clip((myName || '').toUpperCase(), 12), nameX, cy);
      ctx.textAlign = 'right';
      ctx.fillText(pad(myScore), scoreX, cy);
    }
  } else {
    const msg =
      boardStatus === 'submitting' ? 'submitting score…' :
      boardStatus === 'loading' ? 'loading leaderboard…' :
      boardStatus === 'disabled' ? 'leaderboard not configured' :
      boardStatus === 'error' ? 'leaderboard unavailable' :
      '…';
    ctx.fillStyle = fg;
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(msg, vw / 2, listTop + 30);
  }
}

// Game Over overlay: result line + leaderboard. Restart/Home are DOM buttons;
// a tap anywhere also restarts.
export function drawGameOver(ctx, vw, vh, info) {
  const { name, score, best, isNewBest } = info;
  ctx.fillStyle = CONFIG.INVERT ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.90)';
  ctx.fillRect(0, 0, vw, vh);

  const fg = CONFIG.COLORS.fg;
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('GAME OVER', vw / 2, 36);
  ctx.font = '16px monospace';
  ctx.fillText(
    (name ? name.toUpperCase() + '  ·  ' : '') + 'SCORE ' + pad(score) +
    '  ·  ' + (isNewBest ? '★ NEW BEST' : 'BEST ' + pad(best)),
    vw / 2, 66,
  );

  drawBoard(ctx, vw, 96, info);
}

// Pause overlay: paused label + current score + leaderboard. Resume/Home are
// DOM buttons.
export function drawPaused(ctx, vw, vh, info) {
  ctx.fillStyle = CONFIG.INVERT ? 'rgba(0,0,0,0.80)' : 'rgba(255,255,255,0.90)';
  ctx.fillRect(0, 0, vw, vh);

  const fg = CONFIG.COLORS.fg;
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('PAUSED', vw / 2, 36);
  ctx.font = '16px monospace';
  ctx.fillText('SCORE ' + pad(info.score), vw / 2, 66);

  drawBoard(ctx, vw, 96, info);
}

// Non-blocking rotate hint shown in portrait.
export function drawRotateHint(ctx, vw, vh) {
  ctx.fillStyle = CONFIG.COLORS.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font = '15px monospace';
  ctx.fillText('↻ rotate for the best experience', vw / 2, vh - 10);
}
