# Infinite Stickman

An endlessly scrolling, monochrome 2D arcade runner. Vanilla JS + HTML5 Canvas,
zero dependencies, no build step. See [`docs/`](docs/) for the full plan.

## Run it

ES modules require HTTP (not `file://`). From this directory:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Landscape is the intended orientation.

## Status

**Playable prototype — M0 through M4 complete.** Full loop: title → run → die →
score → restart.

- **M0 — shell ✅** Canvas + DPR, fixed 16:9 virtual resolution scaled-to-fit +
  letterbox, fixed-timestep loop (120Hz) with render interpolation.
- **M1 — player ✅** Stick figure with arcade gravity; single tap = jump,
  second tap mid-air = double jump; coyote time + jump buffering; run/jump poses.
- **M2 — world ✅** Endless scrolling terrain with object-pooled, recycled chunks
  (verified bounded memory over long runs); seedable PRNG.
- **M3 — hazards ✅** Procedural gaps + obstacles (triangles / stacked squares),
  difficulty-gated; every hazard physics-checked for solvability; AABB collision +
  fall-into-gap death.
- **M4 — loop ✅** Uncapped linear speed ramp; live distance-based score + best
  (localStorage); READY / PLAYING / GAME_OVER states; HUD + Game Over overlay.
- **M5.5 — leaderboard ✅** Name entry on start (saved to localStorage); on Game
  Over the score is submitted to the Apps Script web app and the top scores are
  fetched and shown with the player's row highlighted. `text/plain` POST avoids
  CORS preflight; a run-id guard cancels stale fetches on restart. Verified
  end-to-end against the live endpoint.
- **Pause + Home ✅** Pause (button or `P`) stops the run and shows the live
  leaderboard with Resume; Home (button or `Esc`) abandons the run and returns to
  the name screen to enter a new name.
- **M5 — mobile polish ✅** Notch-safe controls; auto-pause on tab background;
  suppressed pinch-zoom / long-press menu; resize on address-bar show/hide.
  Difficulty tuned: full difficulty by ~30s (was ~100s), and the reaction window
  tightens as speed climbs.

## Controls

| Action | Input |
| --- | --- |
| Jump | tap / click · `Space` · `↑` |
| Double jump | second tap/press while airborne |
| Pause / view leaderboard | **PAUSE** button · `P` |
| Resume | **RESUME** button · `P` |
| Restart (after game over) | **RESTART** button · tap anywhere · `Space` |
| Home (change name) | **HOME** button · `Esc` |

Engine logic is covered by a headless simulation test (physics, generation
solvability, pooling). No browser was available in the build environment, so it
has **not yet been eyeballed visually** — that's the next thing to confirm.

Next: **M5 — mobile polish + feel**, then **M5.5 — leaderboard**. See
[`docs/03-implementation-roadmap.md`](docs/03-implementation-roadmap.md).

> Note: score is **distance-based** (resolves the open question in the roadmap) —
> it ticks proportionally to distance survived.

## Layout

```
index.html        canvas + module entry
styles.css        full-viewport, no-scroll shell
src/
  config.js       all tunables (one source of truth)
  loop.js         fixed-timestep loop + interpolation
  renderer.js     canvas, DPR, virtual->screen scaling, letterbox
  main.js         bootstrap (currently the M0 placeholder)
scripts/          leaderboard backend test scripts (Apps Script web app)
docs/             design + architecture + roadmap + leaderboard
```
