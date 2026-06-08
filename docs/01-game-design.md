# Game Design

## The core loop
1. Run starts immediately (or on first tap) — figure auto-runs in place; the world
   scrolls right→left.
2. Player taps / presses space to jump over gaps and obstacles.
3. Scroll speed ramps up continuously.
4. A collision with an obstacle, or falling into a gap, ends the run.
5. Game Over overlay → Restart → back to step 1.

Score is purely endurance: it increases with survival time (and therefore distance).

## Controls
| Platform | Action | Input |
|---|---|---|
| Desktop | Jump | `Space`, `ArrowUp`, or mouse click on canvas |
| Mobile | Jump | Tap anywhere on the canvas |
| Any | Restart | Tap/click Restart button, or `Space` on Game Over |

- The player controls **vertical movement only**. Horizontal position is fixed
  (figure stays at a fixed x; the world moves).
- **Jump model (decided):** a single tap/press = one jump. A **double-tap /
  double-click** (a second input within ~250ms while airborne) triggers a
  **double jump** — a second upward impulse mid-air. Each airborne state allows at
  most one extra jump; after landing the counter resets.
  - Implementation note: track `jumpsUsed` (0 on ground). First input from ground →
    jump, `jumpsUsed=1`. A further input while airborne with `jumpsUsed < 2` →
    second jump, `jumpsUsed=2`. The "double-click" feel falls out naturally: two
    quick taps = jump then immediate double-jump.
- Input is **buffered** slightly: a jump pressed within ~80ms before landing still
  fires on landing (feels responsive, forgives early taps).
- Optional **variable jump height:** holding the key/touch a touch longer gives a
  marginally higher jump (cap it). Default off for v1 simplicity; flag it.

## Physics (arcade, fixed-step)
All values are tuned in a config object so they can be balanced without touching logic.

| Constant | Starting value (suggested) | Notes |
|---|---|---|
| `GRAVITY` | ~2200 px/s² | Pulls the figure down each frame |
| `JUMP_VELOCITY` | ~ -780 px/s | Initial upward velocity on jump |
| `GROUND_Y` | derived from canvas height | Baseline the figure stands on |
| `SCROLL_SPEED_START` | ~320 px/s | Initial world scroll speed |
| `SCROLL_SPEED_MAX` | **none (uncapped)** — decided | Speed escalates indefinitely; run ends when reactions can't keep up |
| `SCROLL_ACCEL` | ~6 px/s per second | Linear ramp; see difficulty curve |
| `COYOTE_TIME` | ~80 ms | Grace to jump just after leaving an edge |
| `JUMP_BUFFER` | ~80 ms | Grace to register a jump just before landing |

**Why fixed-step:** physics updates on a fixed timestep (e.g. 1/120s) decoupled
from render, so jump arcs and collisions are identical regardless of device frame
rate. Rendering interpolates between physics steps. (See 02 for the loop.)

These numbers are *starting points* — expect a tuning pass. The jump arc should
clear the widest gap and the tallest obstacle the generator can produce, with a
readable margin.

## Difficulty curve
- Scroll speed increases **linearly and without cap** with survival time:
  `speed = START + ACCEL * t`. No ceiling — the run ends when the player's reactions
  can no longer keep up. Linear feels relentless but fair; avoid exponential (spikes
  too fast).
- As speed rises, the generator is *allowed* to (but doesn't always) place tighter
  spacing and slightly larger hazards — gated by a `difficulty` scalar derived from
  speed, normalized 0→1.
- **Guarantee solvability:** the minimum spacing between hazards must always leave
  enough horizontal distance to land and re-jump given the current speed and jump
  arc. The generator computes this from physics, not from magic numbers.

## Procedural terrain generation
The world is a stream of **chunks** generated just off the right edge and recycled
once they scroll off the left edge (object pooling — no unbounded allocation).

### Chunk model
A chunk is a fixed-width segment (e.g. screen-width-ish or smaller tiles) carrying:
- ground segments (solid floor) and **gaps** (no floor — fall = death),
- zero or more **obstacles** sitting on the floor.

### Generation rules
- Maintain a "spawn cursor" at the right edge. When empty space appears, emit the
  next chunk.
- Choose chunk type by weighted random, gated by `difficulty`:
  - **flat** (always safe) — guaranteed breather chunks injected periodically so
    runs have rhythm.
  - **single obstacle** — one triangle or stacked-square block to jump.
  - **gap** — a hole sized so a jump at current speed clears it with margin.
  - **gap + obstacle** combos — only above a difficulty threshold.
- **Hard constraints (always enforced):**
  - First N seconds / first few chunks are easy (warm-up ramp).
  - At least `MIN_SAFE_GAP` of flat ground after every hazard, scaled by speed, so
    the player can always land and set up the next jump.
  - Gap width ≤ `maxClearableGapForSpeed(speed)`.
  - Obstacle height ≤ `maxClearableHeightForSpeed(speed)`.
  - No two hazards closer than the in-air horizontal travel distance.
- Use a **seedable PRNG** (e.g. mulberry32) so runs are reproducible for debugging
  and testing; seed from time for real play.

### Recycling
- Keep a pool of chunk objects. When a chunk's right edge passes the left of the
  screen, return it to the pool and reuse it for the next spawn. Positions are
  recomputed, not the objects reallocated — keeps GC quiet on long runs.

## Collision
- Figure is approximated by a simple AABB (axis-aligned bounding box), slightly
  *smaller* than the drawn figure (forgiving hitbox — feels fair).
- Obstacles are AABBs (or a triangle treated as its bounding box for v1).
- Each step: AABB-vs-AABB against nearby obstacles; if the figure's feet are over a
  gap and below ground level → fall death.
- Gaps: if x is within a gap span and figure y is at/under ground → start falling;
  once below screen → game over.

## Visual / UI design
- **Palette:** black `#000` foreground on white `#fff` (or invertible — keep a
  single `INVERT` flag).
- **Figure:** classic stick figure (circle head, line torso, 2 arms, 2 legs).
  Optional 2-frame running animation (leg swap) and a tucked pose mid-jump.
- **Ground:** a single baseline with a subtle texture (dashes/dots) so motion is
  visible. Gaps = breaks in the baseline.
- **Obstacles:** filled black triangles and stacked squares.
- **Score:** large monospace/7-seg-style digits, top-right, live ticking.
- **Best score:** smaller, near the live score or on Game Over.
- **Game Over overlay:** dim the field, show "GAME OVER", final score, best score,
  and a clear Restart button (big tap target for mobile).
- **Start state:** a faint "TAP / SPACE TO JUMP" hint until the first input.

## Mobile considerations & orientation (decided)
- **Fixed virtual resolution + scale-to-fit.** The game renders to a fixed internal
  16:9 landscape coordinate space (e.g. 800×450 virtual units) and is scaled
  uniformly to fit the viewport, letterboxed with black bars as needed. This keeps
  the amount of visible track *identical on every device* — so fairness and the
  difficulty curve don't change between a phone and a desktop. (Without this, a
  wider screen would show more track ahead = easier; the fixed space removes that.)
- **Orientation:** landscape is the intended orientation (a side-scroller needs
  horizontal reaction room). In portrait the game still runs (letterboxed smaller)
  but shows a subtle, non-blocking "↻ rotate for the best experience" hint. We do
  not hard-block portrait.
- Use device-pixel-ratio for crisp lines at any scale.
- Lock interaction to the canvas; prevent page scroll / pull-to-refresh / double-tap
  zoom on touch. **Caution:** native double-tap-to-zoom must be suppressed
  (`touch-action: none`) precisely because our double-tap = double-jump.
- Big Restart hit area sized in virtual units so it scales with the field.
