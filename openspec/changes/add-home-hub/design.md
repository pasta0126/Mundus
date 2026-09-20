## Context

The frontend is a single-page app with no router library: `main.tsx` picks a
page from `window.location.pathname` (`/planets`, `/systems`, otherwise the
map, which is `App.tsx`). The planet and system pages already read their seed
from `URLSearchParams` and write it back with `pushState`/`replaceState`.
`App.tsx` keeps seed, centre and zoom only in React state and generates a random
world on mount. nginx already falls back to `index.html` for any path, so new
routes need no server change. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- A `/` page that costs almost nothing to load.
- A map view that is a pure function of its URL, in the same style as the planet and system pages.
- Keep the map's bundle and behavior otherwise unchanged.

**Non-Goals:**
- Adopting a routing library.
- Server-side routing, redirects or a changed API.
- Saving or listing previously visited worlds on the hub.

## Decisions

**Keep the hand-rolled path switch, add exact matching for `/`.** The existing
`startsWith` checks stay; `/maps` renders the map and `/` renders the hub. Any
unknown path renders the hub rather than the map, so a stale bookmark never
triggers a heavy load. *Alternative:* react-router - rejected: one more
dependency for five routes that the site already handles in ten lines.

**Load the map lazily, like the 3D pages.** The map (`App.tsx`) becomes a lazy
import so the hub bundle contains only the hub. This is what makes "nothing is
generated or loaded on the home page" true and is a small change since the
planet pages already do it. *Alternative:* keep the map eager - rejected, it
would ship the canvas and POI artwork loaders to everyone who lands on `/`.

**URL state via `replaceState` for continuous changes.** Pan, zoom and jump
change the URL often; using `pushState` would make Back step through each
nudge. The map writes with `replaceState` and only the initial no-seed load
and Regenerate are also `replaceState` (Regenerate is a new random world, not
a place worth going back to). Planets use `pushState` for a chosen seed because
that is a deliberate navigation; the map has no such moment.

**URL is the source of truth on load, React state afterwards.** On mount the
map parses `seed`, `x`, `y`, `zoom` once, falls back per value and starts the
usual tiled load. Subsequent changes flow state to URL only. The map does not
listen to `popstate`, since it never pushes. *Alternative:* two-way binding -
rejected as needless for a page that never adds history entries.

**`zoom` is the step number shown on the zoom indicator (1-based).** Every step
draws one pixel per cell (only the sampling stride differs), so the cell size
cannot identify a step; the indicator's number is what a person sees and is
stable as long as steps are only appended. A number outside the list falls back
to the default.

**Hub cards are static.** They are plain links (no fetch, no thumbnails). The
dungeons card links to `/maps` since dungeons are reached through map points
(see `add-dungeons`).

**Navigation row.** The shared navigation buttons become one component used by
the map, planet and system pages and listing every page except the current one,
so adding a page later is a one-line change.

## Risks / Trade-offs

- [Existing bookmarks to `/` now show the hub, not a map] → Accepted: the old
  map was random and carried no seed, so nothing reproducible is lost.
- [URL churn could hit browser rate limits on `replaceState`] → The URL is
  written once per loaded view (when its first data arrives), not per event, so
  writes are as rare as fetches.
- [The map API accepts any non-blank seed, so a seed in the URL cannot be
  "invalid"] → A blank seed counts as none; a failed request shows the existing
  error with Retry.

## Migration Plan

Frontend-only change. Deploy the frontend image; no backend, database or API
change and no cache invalidation beyond the new bundle hash. Rollback is
redeploying the previous frontend image. Bump the minor version (behavior of
`/` changes) and tag the commit per the project's versioning workflow.
