# M7 — Vertical Control: Variable Jump Height + Ducking

Two features that deepen moment-to-moment control and make the game feel more
like the Chrome dino runner:

- **M7a — Variable jump height:** a quick tap = short hop; holding = full jump.
- **M7b — Ducking + overhead obstacles:** Down ducks on the ground (and still
  fast-falls in the air); a new hazard hangs from the ceiling and must be ducked
  under (can't be jumped over).

Both build on the existing physics; the headless sim harness will verify
solvability before hand-off.

## M7a — Variable jump height

**Behaviour:** the longer the jump input is held (up to the existing apex), the
higher the jump. Releasing early cuts the rise short → a low hop.

**Mechanic (standard platformer "jump cut"):**
- On jump, record that this jump is *cuttable*.
- On jump-input *release*, if still ascending (`vy < 0`) and cuttable, clamp the
  upward velocity: `vy = max(vy, JUMP_VELOCITY * JUMP_CUT_MULT)` and mark this jump
  no longer cuttable.
- Each new jump (including the double jump) resets cuttable, so both jumps respond
  to hold length independently.

**Input:** jump becomes press + release.
- Pointer: `pointerdown` = press (start/jump/restart), `pointerup`/`pointercancel`
  = release.
- Keyboard: `keydown` of Space/↑/W/Enter = press, `keyup` = release.
- Release only matters during PLAYING (it just trims velocity); presses keep their
  existing state-machine meaning.

**Config:** `JUMP_CUT_MULT` (e.g. `0.4`) and a `VARIABLE_JUMP` flag.

**Solvability:** unchanged — full hold still produces the same apex the generator
already assumes, so every existing hazard stays clearable. Short hops are an
*option*, never required.

## M7b — Ducking + overhead obstacles

### Player height model (refactor to feet-anchored physics)
Today physics tracks the bbox *top* with a fixed height. To support a changing
height cleanly, switch to tracking the **feet** (ground-contact point), which is
height-independent:
- `feetY` integrates gravity; ground contact is `feetY >= GROUND_Y`.
- Drawing/hitbox derive the top as `feetY - height`.
- `height = ducking ? DUCK_H : PLAYER.H`.

This avoids the circular "height depends on grounded depends on landing-y" problem
and keeps the feet planted when ducking toggles.

### Down does double duty (like the dino game)
The single "Down held" input drives both:
- **Grounded + Down** → **duck** (height → `DUCK_H`, crouched pose, shorter hitbox).
- **Airborne + Down** → **fast-fall** (existing — gravity ×`FASTFALL_MULT`).

So `player.downHeld` (set by input) replaces the current `fastFall` flag, and the
two behaviours are derived from it each frame.

### Overhead obstacle
A block hanging from the ceiling with a duck-height slot beneath it. Geometry
(virtual units, `GROUND_Y = 380`):
- Standing player top ≈ `GROUND_Y - PLAYER.H` = 330; ducked top ≈ `GROUND_Y - DUCK_H`.
- Bar **bottom** = `GROUND_Y - OVERHEAD_GAP`. With `DUCK_H = 28` and
  `OVERHEAD_GAP = 32`: bottom = 348. Ducked top (352) is *below* 348 → passes;
  standing top (330) is *above* 348 → collides. The bar extends up to the ceiling
  (`y = 0`) so it **cannot be jumped over** — only ducked under.
- Stored like other obstacles: `{ x, y: 0, w, h: GROUND_Y - OVERHEAD_GAP, type: 'over' }`.
- Collision reuses the existing AABB vs the (ducked-aware) player hitbox.

Ground obstacles (jump-over) are floor-mounted, so ducking never helps with them —
each hazard type has exactly one correct response: **gap → jump, block → jump,
overhead → duck.**

### Generation
- New feature type `over`, gated behind `OVER_MIN_DIFF` (like combos), wrapped in
  `safeRun` lead/trail on flat ground (never over a gap).
- Width `OVER_W_MIN..OVER_W_MAX` (a wide beam).
- **Solvability:** ducking is instant on press, so an overhead is always clearable
  given the standard reaction window already guaranteed by `safeRun`. The sim test
  will assert overheads only appear on flat ground with adequate lead.

### Drawing
- **Ducked pose:** lower, compressed stick figure (short torso, bent legs, head
  near the slot height).
- **Overhead:** filled black slab from the ceiling down to its bottom edge, with a
  visible bottom lip so the duck slot reads clearly.

### Config additions
```
PLAYER.DUCK_H            // ducked height (e.g. 28)
OVERHEAD: {
  GAP: 32,               // clearance under the bar (ducked height must be < this)
  W_MIN: 44, W_MAX: 90,
  MIN_DIFF: 0.45,        // difficulty gate
}
```

## Build order & checklist

**M7a — Variable jump**
- [ ] `config.js`: `JUMP_CUT_MULT`, `VARIABLE_JUMP`.
- [ ] `input.js`: split jump into press/release (pointer + keyboard).
- [ ] `player.js`: `releaseJump()` with jump-cut; reset cuttable on each `_jump`.
- [ ] `game.js`: wire `onJumpPress`/`onJumpRelease`.
- [ ] Verify (headless): held jump reaches full apex; tap reaches a lower hop;
      double-jump independently cuttable.

**M7b — Ducking + overhead**
- [ ] Refactor `player.js` to feet-anchored physics; `downHeld` → duck/fast-fall.
- [ ] Ducked hitbox + crouched draw pose.
- [ ] `config.js`: `PLAYER.DUCK_H`, `OVERHEAD` block.
- [ ] `generator.js`: `over` feature type + difficulty gate + solvability.
- [ ] `game.js`/scene: draw overhead obstacles.
- [ ] Verify (headless): existing hazards still clearable; overheads only on flat
      ground with lead; ducked player passes under, standing player collides.

**Done when:** tap vs hold gives distinct jump heights, and overhead obstacles can
be ducked under but not jumped over — all hazards remain fair.
