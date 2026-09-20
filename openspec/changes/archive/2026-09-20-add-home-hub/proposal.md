## Why

The map page is the site's front door: opening the root URL immediately fetches
and renders a random world, and nothing in the URL says which world it is, so a
map cannot be shared or returned to. The planet and system pages already take
their seed from the URL and sit beside the map as equals. The site now needs a
neutral landing page, a hub from which a person chooses what to generate, and
the map needs the same reproducible URL its siblings have. Both are also
prerequisites for dungeons (`add-dungeons`), which must be able to send a person
back to the exact map they came from.

## What Changes

- Add a home page at `/`: a lightweight hub with a large card for each thing the
  site generates (map, planet, system) and a card explaining that dungeons are
  found on the map. It makes no API request and loads no 3D code.
- Move the map to `/maps`. It takes its seed, centre and zoom from the URL
  (`/maps?seed=&x=&y=&zoom=`), so reloading or sharing the URL reproduces the
  same view, exactly as the planet and system pages do. With no seed it picks a
  random one and writes it into the URL.
- Keep the map's URL current as the person pans, zooms, jumps or regenerates,
  without adding a history entry for every step.
- **BREAKING**: the automatic map generation on page load now happens at
  `/maps`, not at `/`. Opening `/` no longer generates anything. Existing links
  to `/` reach the hub; they never carried a seed, so no reproducible link is lost.
- Every page's navigation row gains a way back to the home page.

## Capabilities

### New Capabilities
- `home-hub`: the landing page at `/`, its cards and its lightness.

### Modified Capabilities
- `map-creation-wizard`: the map lives at `/maps`, takes seed, centre and zoom
  from the URL and keeps them there; the automatic load applies to that route;
  Regenerate, jump and pan/zoom update the URL.
- `planet-system-viewer`: the navigation row shared by every page includes the
  home page, and the map's button leads to `/maps`.

## Impact

- Frontend: `main.tsx` routing (add `/` hub and `/maps`), `App.tsx` (read and
  write URL state; becomes the `/maps` page), a new home page component, the
  navigation buttons on the map, planet and system pages.
- Backend: none. Nginx already serves the single-page app for any path
  (`frontend/nginx.conf` should be checked for `/maps` fall-through).
- No change to map generation, its `SpecVersion` or any API.
