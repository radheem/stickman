# Implementation Roadmap

Milestones are ordered so there's something runnable as early as possible, then
each step layers on fun and fairness. Each milestone has a clear "done when".

## M0 — Skeleton (runnable shell)
- [ ] `index.html`, `styles.css` (full-viewport, no-scroll), `src/main.js`.
- [ ] Canvas with DPR scaling; clears to background each frame.
- [ ] Fixed-timestep loop (`loop.js`) drawing a placeholder shape.
- [ ] `config.js` with initial constants/flags.
- **Done when:** a shape renders and the loop runs at 60 FPS in the browser.

## M1 — Player + physics
- [ ] `player.js`: stick figure drawn from primitives; gravity + ground collision.
- [ ] `input.js`: Space / click / tap → `JUMP`; single jump with coyote time +
      jump buffer.
- [ ] Figure jumps and lands cleanly on a flat ground line.
- **Done when:** you can jump a stick figure on the spot, frame-rate independent.

## M2 — Scrolling world + terrain stream
- [ ] `chunk.js`, `world.js`: flat ground scrolling right→left at `SCROLL_SPEED`.
- [ ] Object pooling: spawn chunks at right edge, recycle off left edge.
- [ ] `rng.js` (mulberry32), seedable.
- **Done when:** ground scrolls endlessly with zero heap growth over a long run.

## M3 — Hazards + generation + collision
- [ ] `generator.js`: weighted chunk types (flat / obstacle / gap / combo) gated by
      a difficulty scalar.
- [ ] Solvability constraints (max clearable gap/height from physics; min safe
      spacing; warm-up ramp; periodic breather chunks).
- [ ] `collision.js`: AABB hit on obstacles; fall-into-gap death (forgiving hitbox).
- **Done when:** a real run is playable and you can die — and every death feels fair.

## M4 — Difficulty ramp + scoring + game states
- [ ] Linear scroll-speed ramp over time (optional soft cap).
- [ ] `score.js`: live survival score, top-right HUD, localStorage best.
- [ ] `game.js` state machine: READY → PLAYING → GAME_OVER.
- [ ] `ui.js`: start hint, live score, Game Over overlay (final + best + Restart).
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

## M5.5 — Global leaderboard (Apps Script web app)
Backend is **already built & tested** (`scripts/getTest.sh`, `postTest.sh`, `.env`).
See `04-leaderboard.md` for the full integration.
- [ ] Commit the Apps Script source into `scripts/Code.gs` (currently only in the
      Apps Script editor); confirm `doGet` enforces TOP_N and `doPost` validates.
- [ ] `leaderboard.js`: `fetchTop()` (GET → JSON) and `submitScore()` (POST with
      `Content-Type: text/plain` to avoid CORS preflight; fire-and-forget).
- [ ] On Game Over: prompt for a name (cached in localStorage), submit, wait briefly,
      re-GET, then show the top-N board with the player's rank highlighted.
- [ ] Optional JSON snapshot fallback if the live fetch fails.
- **Done when:** a score submitted on one device appears on the board on another.

## M6 — Hardening & stretch (optional)
- [ ] `DEBUG` overlay: FPS, speed, difficulty, hitboxes.
- [ ] Light unit tests for generator/collision/rng with a fixed seed.
- [ ] PWA: manifest + service worker for offline play.
- [ ] Optional: sound, double-jump, variable jump height (already flagged in config).
- [ ] Optional: Vite build for minified production bundle.

## Suggested order of attack
M0 → M1 → M2 → M3 → M4 give a complete, fun prototype. M5 makes it ship-quality on
mobile. M6 is polish and platform reach. Don't start M3 generation tuning before
M1 physics feel right — the generator's solvability math depends on the jump arc.

## Resolved decisions
- **Orientation:** fixed 16:9 virtual resolution scaled-to-fit + letterbox;
  landscape preferred, portrait allowed with a non-blocking rotate hint.
- **Jump:** single tap = jump, double-tap = double jump.
- **Scroll speed:** uncapped linear escalation.
- **Leaderboard:** Google Form + Sheet (radheem-ventures pattern) — see `04-leaderboard.md`.

## Open questions still to resolve during build
- Score unit: pure time, or distance-based (they're proportional but feel different)?
- Leaderboard name entry: free text, or 3-initials arcade style?
