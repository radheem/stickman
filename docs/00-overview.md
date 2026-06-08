# Infinite Stickman — Project Overview

## One-liner
An endlessly scrolling 2D arcade runner. A minimalist stick figure auto-runs
through procedurally generated terrain; the player only controls jumping. Survive
as long as possible while the world speeds up. Black-and-white vector aesthetic,
playable in any browser and on touch devices.

## Vision & feel
- **Aesthetic:** High-contrast monochrome (pure black on white). Clean vector
  lines, simple geometric shapes. Evokes the classic Chrome dino runner and early
  handheld LCD games.
- **Tone:** Instant-on, no menus to wade through, "one more run" arcade loop.
- **Pillars:**
  1. *Readable* — at a glance you always know where the hazards and gaps are.
  2. *Fair* — death is always the player's fault, never an impossible spawn.
  3. *Escalating* — difficulty rises smoothly and indefinitely via scroll speed.

## Scope (v1 / prototype)
**In:**
- Auto-scrolling ground that loops infinitely (procedural).
- Stick figure with gravity + jump (single jump; double-jump as a toggle).
- Two hazard families: **gaps** (leap over) and **obstacles** (dodge — triangles,
  stacked squares).
- Score = survival time, ticking up live, top-right.
- Game Over overlay with final score, best score, Restart, and global leaderboard
  (submit name + see top scores) backed by a Google Sheet.
- Mobile (touch) + desktop (spacebar / click) controls.
- Gradually increasing scroll speed.

**Out (v1 — candidate for later):**
- Multiple characters / skins.
- Coins / collectibles, power-ups.
- Sound (optional stretch; see roadmap).
- Online leaderboards / accounts.
- Parallax backgrounds beyond a simple ground line.

## Key decisions (defaults — see 02-technical-architecture.md)
| Decision | Choice | Why |
|---|---|---|
| Engine | Vanilla JS + HTML5 Canvas 2D | Zero deps, tiny payload, runs everywhere, full control over the simple visuals |
| Build tooling | None for prototype (plain ES modules) | Fastest path; add Vite later only if needed |
| Language | JavaScript (JSDoc types) | No build step; types via JSDoc for editor help |
| Rendering | Single `<canvas>`, immediate-mode draw each frame | Game is shape-simple; no DOM/WebGL overhead needed |
| Physics | Hand-rolled fixed-gravity arcade physics | Deterministic, trivial, no library |
| Persistence (personal best) | `localStorage` | No backend needed |
| Global leaderboard | Google Apps Script web app (JSON GET/POST) → Google Sheet | Serverless, no backend/API key; already built & tested in `scripts/`. See `04-leaderboard.md` |
| Orientation | Fixed 16:9 virtual resolution, scale-to-fit + letterbox | Identical fairness on every device; landscape preferred, portrait allowed with rotate hint |
| Jump | Single tap = jump; double-tap = double jump | Per decision |
| Speed | Uncapped linear escalation | Per decision |

## Success criteria for the prototype
- Holds a steady 60 FPS on a mid-range phone.
- Loads in under ~1s on a typical connection (single small bundle).
- Playable with one thumb (touch) or one key (spacebar).
- No impossible obstacle/gap spawns at any speed.
- Survives an arbitrarily long run without memory growth (object pooling /
  recycling of terrain pieces).

## Doc map
- `01-game-design.md` — mechanics, physics constants, difficulty curve, generation rules.
- `02-technical-architecture.md` — tech stack, module layout, game loop, rendering.
- `03-implementation-roadmap.md` — phased milestones and a checklist.
- `04-leaderboard.md` — Google Form + Sheet leaderboard (the radheem-ventures pattern).
