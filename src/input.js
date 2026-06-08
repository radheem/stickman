// Unifies keyboard, mouse, and touch into game intents. The game decides what
// each intent means based on its current state.
//
//   onJumpPress   — tap / click / Space / ArrowUp / W / Enter (down)
//   onJumpRelease — release of the above (trims jump height — variable jump)
//   onPause       — P (toggle pause/resume)
//   onHome        — Escape (back to name entry)
//   onDown        — Down / S held: true on press, false on release (duck / fast-fall)
//
// Pointer events bind to the canvas (which fills the screen) rather than window,
// so taps on HTML controls (name field, buttons) aren't hijacked as jumps. Keys
// bind to window but are ignored while the user is typing in a form field.
const JUMP_CODES = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter']);
const DOWN_CODES = new Set(['ArrowDown', 'KeyS']);

export class Input {
  constructor(canvas, handlers) {
    const { onJumpPress, onJumpRelease, onPause, onHome, onDown } = handlers;
    const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onJumpPress();
    }, { passive: false });
    const release = (e) => { e.preventDefault(); if (onJumpRelease) onJumpRelease(); };
    canvas.addEventListener('pointerup', release, { passive: false });
    canvas.addEventListener('pointercancel', release, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (typing(e.target)) return;
      if (DOWN_CODES.has(e.code)) {
        e.preventDefault();
        if (onDown) onDown(true); // idempotent on key-repeat
        return;
      }
      if (e.repeat) return;
      if (JUMP_CODES.has(e.code)) {
        e.preventDefault();
        onJumpPress();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        if (onPause) onPause();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (onHome) onHome();
      }
    }, { passive: false });

    window.addEventListener('keyup', (e) => {
      if (DOWN_CODES.has(e.code)) {
        if (onDown) onDown(false);
      } else if (JUMP_CODES.has(e.code)) {
        if (onJumpRelease) onJumpRelease();
      }
    });

    // Safety: keys can get "stuck" if focus is lost mid-press.
    window.addEventListener('blur', () => {
      if (onDown) onDown(false);
      if (onJumpRelease) onJumpRelease();
    });
  }
}
