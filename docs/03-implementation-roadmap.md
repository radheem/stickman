# Implementation Roadmap

Milestones are ordered so there's something runnable as early as possible, then
each step layers on fun and fairness. Each milestone has a clear "done when".

## M0 — Skeleton (runnable shell) ✅
- [x] `index.html`, `styles.css` (full-viewport, no-scroll), `src/main.js`.
- [x] Canvas with DPR scaling; clears to background each frame.
- [x] Fixed-timestep loop (`loop.js`) drawing a placeholder shape.
- [x] `config.js` with initial constants/flags.
- **Done when:** a shape renders and the loop runs at 60 FPS in the browser.

## M1 — Player + physics ✅
- [x] `player.js`: stick figure drawn from primitives; gravity + ground collision.
- [x] `input.js`: Space / click / tap → `JUMP`; single jump with coyote time +
      jump buffer.
- [x] Figure jumps and lands cleanly on a flat ground line.
- **Done when:** you can jump a stick figure on the spot, frame-rate independent.

## M2 — Scrolling world + terrain stream ✅
- [x] `world.js`: flat ground scrolling right→left at `SCROLL_SPEED`.
      (Chunks modelled inline as ground segments + obstacles; no separate `chunk.js`.)
- [x] Object pooling: spawn at right edge, recycle off left edge.
- [x] `rng.js` (mulberry32), seedable.
- **Done when:** ground scrolls endlessly with zero heap growth over a long run.

## M3 — Hazards + generation + collision ✅
- [x] `generator.js`: weighted feature types (flat / obstacle / gap / combo) gated by
      a difficulty scalar.
- [x] Solvability constraints (max clearable gap/height from physics; safe spacing;
      warm-up ramp; flat breathers).
- [x] `collision.js`: AABB hit on obstacles; fall-into-gap death (forgiving hitbox).
- **Done when:** a real run is playable and you can die — and every death feels fair.

## M4 — Difficulty ramp + scoring + game states ✅
- [x] Linear, uncapped scroll-speed ramp over time.
- [x] `score.js`: live distance-based score, top-right HUD, localStorage best.
- [x] `game.js` state machine: READY → PLAYING → GAME_OVER (→ PAUSED).
- [x] `ui.js`: start hint, live score, Game Over overlay (final + best + Restart).
- **Done when:** full loop works: start → play → die → see score → restart.

## M5 — Mobile polish + feel ✅
- [x] Touch controls solid; `touch-action: none`; no scroll/zoom/pull-to-refresh.
- [x] Double-tap = double jump (suppress native double-tap zoom / pinch / callout).
- [x] Fixed 16:9 virtual resolution scaled to fit + letterbox; subtle rotate hint
      in portrait (non-blocking); resizes on visualViewport (address-bar) changes.
- [x] Big tap targets; crisp lines at all DPRs; controls respect notch safe-area.
- [x] Auto-pause when the tab is backgrounded (app switch / lock).
- [x] Tuning pass: faster speed ramp (full difficulty ~30s, was ~100s); reaction
      window tightens with difficulty so high speed is genuinely harder.
- [x] Continuous run animation + jump pose; moving ground texture.
- **Done when:** it feels good one-thumbed on a real phone and on desktop.

## M5.5 — Global leaderboard (Apps Script web app) ✅
See `04-leaderboard.md` for the full integration.
- [ ] Commit the Apps Script source into `scripts/Code.gs` (still only in the Apps
      Script editor) — outstanding.
- [x] `leaderboard.js`: `fetchTop()` (GET → JSON) and `submitScore()` (POST with
      `Content-Type: text/plain` to avoid CORS preflight; fire-and-forget).
- [x] Name entry on start (cached in localStorage); on Game Over submit, wait briefly,
      re-GET, then show the top-N board with the player's row highlighted.
- [x] Pause shows the live board; run-id guard cancels stale fetches.
- [ ] Optional JSON snapshot fallback if the live fetch fails — not added.
- **Done when:** a score submitted on one device appears on the board on another. ✅

## Deploy ✅
- [x] GitHub Actions workflow deploys to GitHub Pages on push to `main`
      (`.github/workflows/deploy.yml`, `.nojekyll`).
- [ ] One-time: set repo Settings → Pages → Source = "GitHub Actions" (manual).

## M6 — Hardening & stretch (optional)
- [~] `DEBUG` overlay: FPS, speed, difficulty done; hitboxes not yet.
- [ ] Light unit tests for generator/collision/rng with a fixed seed (a headless
      sim harness exists ad-hoc; not committed).
- [ ] PWA: manifest + service worker for offline play.
- [ ] Optional: sound.
- [ ] Optional: Vite build for minified production bundle.

## M7 — Vertical control: variable jump + ducking
See `05-vertical-control-plan.md`. Adds tap-vs-hold jump height and a duck-under
overhead-obstacle mechanic (the other half of the dino game).

## Suggested order of attack
M0 → M1 → M2 → M3 → M4 give a complete, fun prototype. M5 makes it ship-quality on
mobile. M5.5 adds the leaderboard. M7 deepens the moment-to-moment control. M6 is
polish and platform reach.

## Resolved decisions
- **Orientation:** fixed 16:9 virtual resolution scaled-to-fit + letterbox;
  landscape preferred, portrait allowed with a non-blocking rotate hint.
- **Jump:** single tap = jump, double-tap = double jump; **fast-fall** on Down.
- **Scroll speed:** uncapped linear escalation.
- **Leaderboard:** Google Apps Script web app (not Forms) — see `04-leaderboard.md`.
- **Score unit:** distance-based.
