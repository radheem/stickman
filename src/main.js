import { Game } from './game.js';
import { startLoop } from './loop.js';
import { loadName, saveName } from './score.js';

// Game state constants (mirror game.js: READY=0, PLAYING=1, OVER=2, PAUSED=3).
const PLAYING = 1;
const OVER = 2;
const PAUSED = 3;

const canvas = document.getElementById('game');
const game = new Game(canvas);

// ── DOM controls ────────────────────────────────────────────────────────────
const overlay = document.getElementById('startOverlay');
const nameInput = document.getElementById('nameInput');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const downBtn = document.getElementById('downBtn');
const menu = document.getElementById('menu');
const resumeBtn = document.getElementById('resumeBtn');
const restartBtn = document.getElementById('restartBtn');
const homeBtn = document.getElementById('homeBtn');

const show = (el, visible) => el.classList.toggle('hidden', !visible);

// Toggle controls to match the current game state.
function syncControls(state) {
  show(pauseBtn, state === PLAYING);
  show(downBtn, state === PLAYING);
  const menuOpen = state === PAUSED || state === OVER;
  show(menu, menuOpen);
  show(resumeBtn, state === PAUSED);
  show(restartBtn, state === OVER);
  show(homeBtn, menuOpen);
}

function showStartOverlay() {
  nameInput.value = loadName();
  overlay.style.display = 'flex';
  nameInput.focus();
  if (nameInput.select) nameInput.select();
}

game.onState = syncControls;
game.onHome = showStartOverlay;
syncControls(game.state); // initial sync (overlay is up on top)

// ── Name entry ──────────────────────────────────────────────────────────────
nameInput.value = loadName();

function begin() {
  const name = (nameInput.value || '').trim().slice(0, 16) || 'PLAYER';
  saveName(name);
  game.start(name);
  overlay.style.display = 'none';
  nameInput.blur();
}

playBtn.addEventListener('click', begin);
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    begin();
  }
});

// ── Control buttons ─────────────────────────────────────────────────────────
pauseBtn.addEventListener('click', () => game.pause());
resumeBtn.addEventListener('click', () => game.resume());
restartBtn.addEventListener('click', () => game.restart());
homeBtn.addEventListener('click', () => game.goHome());

// Down (duck on ground / fast-fall in air): hold the button (touch/mouse).
const setDown = (active) => game.setDown(active);
downBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); setDown(true); });
downBtn.addEventListener('pointerup', (e) => { e.preventDefault(); setDown(false); });
downBtn.addEventListener('pointercancel', () => setDown(false));
downBtn.addEventListener('pointerleave', () => setDown(false));

// ── Mobile robustness ───────────────────────────────────────────────────────
// Auto-pause when the tab is backgrounded (app switch, lock screen) so the run
// isn't lost while away. pause() is a no-op unless actively playing.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});

// Suppress long-press context menu and pinch-zoom gestures over the play area.
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('gesturestart', (e) => e.preventDefault());

// ── Loop ──────────────────────────────────────────────────────────────────--
startLoop(
  (dt) => game.update(dt),
  (alpha) => game.render(alpha),
);

nameInput.focus();
