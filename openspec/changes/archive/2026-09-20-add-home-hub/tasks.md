## 1. Routing and lazy loading

- [x] 1.1 In `main.tsx`, render the hub at `/`, the map at `/maps`, keep `/planets` and `/systems`, and render the hub for any unknown path
- [x] 1.2 Load the map (`App.tsx`) with `lazy`/`Suspense`, so the hub bundle does not include it; confirm the hub makes no API request

## 2. Home hub

- [x] 2.1 Build the home page with large cards for map, planet, system and dungeons (icon, name, one-line English description), styled like the existing pages
- [x] 2.2 Make each card a link (dungeons card leads to `/maps` and says dungeons are found on the map)

## 3. Map view in the URL

- [x] 3.1 On mount, parse `seed`, `x`, `y`, `zoom` from the URL with per-value fallbacks (`(0, 0)`, default zoom, random seed written to the URL when absent)
- [x] 3.2 Write the current seed, centre and zoom (step number) to the URL with `replaceState` each time a loaded view swaps in (Regenerate, jump, pan, zoom)
- [x] 3.3 Treat a blank seed as none, keep the existing failure message with Retry, and centre Regenerate and seed entry on `(0, 0)` as specified
- [x] 3.4 Keep Download's filename and the on-load request count as specified (one window request per load)

## 4. Navigation

- [x] 4.1 Extract the shared navigation row into one component listing every page except the current one, including Home
- [x] 4.2 Use it on the map, planet and system pages; point the map button at `/maps`

## 5. Verify and release

- [x] 5.1 Manually check: `/` loads without network calls; `/maps` with and without a seed; reload and share reproduce the view; Back does not step through pans
- [x] 5.2 Run the frontend lint and build; update the README route list
- [x] 5.3 Bump the semver in `package.json` (minor) and tag the commit `vX.Y.Z`
