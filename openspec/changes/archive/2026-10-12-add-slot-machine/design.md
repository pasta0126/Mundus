## Context

The frontend is a Vite/React app whose pages (`map`, `planets`, `dice`, `dungeons`, `about`) each live in their own folder under `frontend/src/` and are reached from a hub at `/`. The dice tray already establishes the patterns this change reuses: a browser-only history kept in `localStorage` (last 100 entries, JSON export, delete all), shake-to-act on devices with motion sensors, and no backend involvement. See proposal.md for motivation and the `slot-machine` spec for behaviour.

## Goals / Non-Goals

**Goals:**
- Make themes pure data, so a theme can be added or tuned without touching spin, session or reading logic.
- Keep the session reading logic independent of the number of reels and of the number of spins.
- Keep the page frontend-only, with no new dependency and no external assets.

**Non-Goals:**
- User-defined themes or symbols, multiple rows, paylines, or sizes other than 3 and 5 reels.
- Any effect of a result on the map, planet or system pages.
- Real money, accounts or any server-side state.

## Decisions

**Themes are data, reading modes are code.** A theme is a plain object: id, name, accent colour, reading mode, six symbols (id, name, icon, weight, and per-mode data such as blend phrases or a payout value) and, for the casino, its payout table. The three reading modes (blend, loot, payout) are the only logic that varies between themes. *Alternative:* one component per theme. Rejected because it duplicates spin and session handling and makes a fifth theme expensive.

**Everything is a session.** A free session and a bounded one share one shape (`maxSpins` is `null` when free), and a spin is only ever appended to an open session. The only difference is who closes it. *Alternative:* record free spins individually and bounded ones as sessions. Rejected because it needs two history shapes and two export formats, and loses the aggregation the person asked for in free play.

**Readings are computed from shares, not counts.** Blend mode works on each symbol's share of all symbols shown, with fixed thresholds (secondary above 25%, trace above 10%). Shares make the reading identical for 3 or 5 reels and for any number of spins. *Alternative:* absolute thresholds. Rejected because they would need retuning per reel count and session length.

**The session result is derived, not stored incrementally.** The result is a pure function of the session's theme and its spins, recomputed after every spin and frozen into the entry at close. This keeps the live result and the recorded one from drifting and makes the readings easy to test in isolation.

**Randomness is the browser's secure RNG with weighted choice.** Each reel picks a symbol by weight using `crypto.getRandomValues`, falling back to `Math.random` only if unavailable. There is no seed, matching the dice tray's "not reproducible" rule. *Alternative:* a seeded RNG for shareable spins. Rejected as unrequested.

**Casino payouts are a table keyed by symbol and match count, tuned by computation.** Because positions do not matter, the chance of each match count is computed exactly from the symbol weights, and the multipliers are chosen so the expected return lands between 90% and 95%. A test computes the expected return for 3 and 5 reels so a weight change cannot silently break it.

**Reels are 3D drums, with no physics.** Each reel is a six-sided prism with one face per symbol, built with three.js like the dice and planet pages (flat shading, orbit controls limited to a small range). The outcome is already decided by the engine, so a drum only turns at a fixed speed, brakes with ease-out at its scheduled time and lands on the face index of its symbol - no Rapier/WASM. The scene is a plain module (`machineScene.ts`) driven imperatively by the page, which keeps owning the session and commit logic; the scene reports when all drums settled. A lever is the second way to spin. *Alternatives:* a 12-face drum (rounder but each symbol twice and less like a die) and a CSS 3D transform (no real lighting or orbit). A flat 2D row stays as the fallback when WebGL is unavailable.

**Icons are inline SVG drawn in code.** A consistent flat style with one accent colour per theme, no external assets and crisp at any size. *Alternatives:* emoji (inconsistent across platforms) and pixel art (more work, can be swapped in later since icons sit behind one mapping from symbol id to icon).

**History and balance reuse the dice storage approach.** Two keys, one for the history and one for the casino balance, each wrapped so unavailable storage degrades to in-memory behaviour for the page's lifetime.

**Home layout is a two-row grid.** Three columns in the first row and a two-column row below, so the two horizontal cards each take half of the width the three vertical cards occupy. On narrow windows the grid collapses to one column.

## Risks / Trade-offs

- [Fixed 25% and 10% thresholds may read oddly for very short sessions, e.g. one 3-reel spin where every symbol is exactly 33%] → Ties for the dominant symbol are broken at random and the other symbols still pass the secondary threshold; the wording handles "several equal" gracefully. Thresholds live in one place so they are easy to tune.
- [The casino's expected return depends on weights and could drift if weights are edited] → The test that computes it for both reel counts fails when it leaves the 90-95% band.
- [Storage may be unavailable (private browsing) so history and balance reset on reload] → Same graceful degradation as the dice tray; the page keeps working.
- [WebGL may be missing or lost] → The flat reel row remains as a fallback with identical behaviour, and the DOM readout never depends on the canvas.
- [Five cards and a new layout on the hub affect the first page every visitor sees] → The layout change is isolated to the hub and covered by its own scenarios; the hub still loads no page code up front.
- [The casino theme could be mistaken for real gambling] → The page states that the credits are toys, and no real-money or purchase path exists anywhere in it.
