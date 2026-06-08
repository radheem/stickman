// Unifies keyboard, mouse, and touch into game intents. The game decides what
// each intent means based on its current state.
//
//   onJump  — tap / click / Space / ArrowUp / W / Enter
//   onPause — P (toggle pause/resume)
//   onHome  — Escape (back to name entry)
//
// Pointer events bind to the canvas (which fills the screen) rather than window,
// so taps on HTML controls (name field, buttons) aren't hijacked as jumps. Keys
// bind to window but are ignored while the user is typing in a form field.
export class Input {
  constructor(canvas, handlers) {
    const { onJump, onPause, onHome } = handlers;

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      onJump();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
        e.preventDefault();
        onJump();
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        if (onPause) onPause();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (onHome) onHome();
      }
    }, { passive: false });
  }
}
