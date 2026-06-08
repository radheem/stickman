import { CONFIG } from './config.js';

// Fixed-timestep loop with render interpolation. Physics advances in fixed steps
// (CONFIG.PHYSICS_HZ) so behaviour is identical on 60/90/120/144Hz displays; the
// renderer interpolates between the last two physics states using `alpha` (0..1)
// for smooth visuals regardless of frame rate.
//
//   update(dt)   dt is a fixed step in SECONDS
//   render(alpha) alpha is the fractional progress toward the next step
//
// Returns a handle with stop().
export function startLoop(update, render) {
  const STEP_MS = 1000 / CONFIG.PHYSICS_HZ;
  const STEP_S = STEP_MS / 1000;
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let running = true;

  function frame(now) {
    if (!running) return;
    let dt = now - last;
    last = now;
    if (dt > CONFIG.MAX_FRAME_MS) dt = CONFIG.MAX_FRAME_MS;
    acc += dt;
    while (acc >= STEP_MS) {
      update(STEP_S);
      acc -= STEP_MS;
    }
    render(acc / STEP_MS);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  return {
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
  };
}
