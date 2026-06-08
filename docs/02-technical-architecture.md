# Technical Architecture

## Stack
- **HTML5 Canvas 2D** for all rendering.
- **Vanilla JavaScript**, ES modules (`<script type="module">`). No framework.
- **No build step** for the prototype — open `index.html` and it runs. (Add Vite
  later only if we want bundling/minification for production.)
- **JSDoc** comments for editor type-checking without TypeScript compilation.
- **localStorage** for the high score.
- **No runtime dependencies.**

Rationale: the game is geometrically simple and performance-sensitive on mobile. A
single canvas with hand-written immediate-mode drawing is the smallest, fastest,
most portable option and keeps the whole thing in one tiny payload.

## File / module layout
```
stickman/
├─ docs/                     # this planning set
├─ index.html               # canvas + minimal chrome, loads main.js as a module
├─ styles.css               # full-viewport canvas, no-scroll, monochrome page
└─ src/
   ├─ main.js               # bootstrap: create Game, attach input, start loop
   ├─ config.js             # ALL tunable constants (physics, speeds, weights, flags)
   ├─ game.js               # Game state machine (READY/PLAYING/GAME_OVER), orchestration
   ├─ loop.js               # fixed-timestep loop w/ render interpolation
   ├─ input.js              # keyboard + touch + click → unified "jump"/"restart" intents
   ├─ player.js             # stick figure: physics, jump, state, draw
   ├─ world.js              # terrain stream: chunk spawning, recycling, scroll
   ├─ generator.js          # procedural chunk generation + solvability constraints
   ├─ chunk.js              # chunk data model (ground segments, gaps, obstacles)
   ├─ collision.js          # AABB tests, gap/fall detection
   ├─ rng.js                # seedable PRNG (mulberry32)
   ├─ score.js              # score accrual + localStorage best
   ├─ leaderboard.js        # GET top scores + POST score to the Apps Script web app (JSON)
   ├─ renderer.js           # canvas setup, DPR scaling, virtual→screen scaling, clear
   └─ ui.js                 # score HUD, start hint, Game Over overlay + leaderboard UI
```
Modules are small and single-purpose; `game.js` wires them together. Keeping
`config.js` as the one source of tunables means balancing never touches logic.

## Game states
A simple state machine in `game.js`:
- `READY` — title/idle; first input → `PLAYING`.
- `PLAYING` — physics + generation + scoring run.
- `GAME_OVER` — frozen field + overlay; restart input → reset → `PLAYING`.

State transitions are explicit; update/draw branch on current state.

## The game loop (fixed timestep + interpolation)
```
let acc = 0, last = performance.now();
const STEP = 1000 / 120;            // physics at 120 Hz, in ms

function frame(now) {
  let dt = now - last; last = now;
  dt = Math.min(dt, 250);           // clamp huge gaps (tab was backgrounded)
  acc += dt;
  while (acc >= STEP) {
    update(STEP / 1000);            // fixed physics step, in seconds
    acc -= STEP;
  }
  const alpha = acc / STEP;         // 0..1 interpolation factor
  render(alpha);                    // interpolate visual positions
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```
- **Why:** identical physics on 60 Hz, 90 Hz, 120 Hz, and 144 Hz displays; no
  tunneling through obstacles at high speed; smooth visuals via interpolation.
- `update(dt)`: advance scroll, player physics, generate/recycle terrain, collide,
  accrue score.
- `render(alpha)`: clear, draw world, draw player (interpolated), draw HUD/overlay.

## Rendering details
- One `<canvas>` filling the viewport.
- **DPR scaling:** set `canvas.width/height = cssSize * devicePixelRatio`, scale the
  2D context by DPR, draw in CSS pixels → crisp lines on retina/mobile.
- Clear and redraw every frame (immediate mode). Field is simple enough that full
  redraw at 60 FPS is cheap.
- Draw order: background/ground → obstacles → player → HUD → overlay.
- Keep all colors behind a tiny palette object so `INVERT` flips the whole game.

## Performance & memory
- **Object pooling** for chunks/obstacles — recycle off-screen pieces, never grow
  the heap during a run (critical for "infinite").
- No per-frame allocations in the hot path (reuse vectors/AABBs; avoid array
  literals and closures inside `update`/`render`).
- Cull anything off-screen from drawing.
- Target: stable 60 FPS on a mid-range phone; verify with a frame-time readout
  behind a `DEBUG` flag.

## Input handling
- Unify `keydown` (Space/ArrowUp), `mousedown`, and `touchstart` into intents:
  `JUMP` and `RESTART`.
- `preventDefault` on touch to stop scroll/zoom; `touch-action: none` in CSS.
- Debounce so one tap = one jump; respect the jump buffer (see game design).

## Persistence
- `score.js` reads/writes `localStorage["stickman.best"]`. Guard with try/catch
  (private mode / disabled storage) and fall back to in-memory.

## Configurability (flags in `config.js`)
- `ALLOW_DOUBLE_JUMP`, `VARIABLE_JUMP_HEIGHT`, `INVERT`, `DEBUG`,
  `SEED` (null = random), plus every physics/speed/generation constant and the
  chunk-type weight table.

## Testing approach (lightweight)
- Pure logic (`generator.js`, `collision.js`, `rng.js`, `score.js`) is dependency-
  free and unit-testable with a seeded PRNG — deterministic.
- A `DEBUG` overlay can draw hitboxes, current speed, difficulty, and FPS.
- Manual playtest matrix: desktop Chrome/Firefox/Safari, iOS Safari, Android Chrome.

## Production hardening (post-prototype, optional)
- Add Vite for bundling/minification and a hashed build.
- Inline/preload assets; single-file build possible (everything is text + canvas).
- Add a service worker for offline play (it's a perfect PWA candidate).
