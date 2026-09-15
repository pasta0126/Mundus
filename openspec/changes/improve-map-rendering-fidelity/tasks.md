## 1. Contour extraction (Square grid)

- [x] 1.1 Add a `contour.ts` helper implementing marching squares (16-case) over a corner scalar field derived from the land/ocean cell grid, chaining segments into closed polylines
- [x] 1.2 Add Chaikin corner-cutting smoothing (3-4 iterations) for a polyline
- [x] 1.3 Wire both into `MapCanvas`'s Square-grid path: build `Path2D` from all smoothed polylines, fill (`nonzero`) with the land base color, stroke with a darker coastline color, verify manually against Continent, Island, Archipelago (multiple filled contours), and InlandSea (a correctly-unfilled hole)

## 2. Crisp hex coastlines

- [x] 2.1 Replace the Hex-grid blur path with direct crisp hex-polygon fills (no offscreen blur canvas)
- [x] 2.2 Add a stroke pass along every hex edge shared between a land cell and an ocean neighbor, verify manually that the hex coastline reads as crisp hex steps

## 3. Terrain shading and icons

- [x] 3.1 Add hillshading (neighbor-gradient-based directional light) blended with the existing elevation-lightness factor, verify manually that terrain reads as shaded relief rather than flat color
- [x] 3.2 Replace the Mountains icon with a 2-3-triangle "range" glyph, increase icon subsample density, verify manually
- [x] 3.3 Replace the Forest icon with a denser two-tone tree-cluster glyph, verify manually

## 4. Ocean texture and border

- [x] 4.1 Add a wave-line texture pass over Ocean cells, verify manually
- [x] 4.2 Add a decorative double-rule border frame around the rendered map, verify manually

## 5. Close out

- [x] 5.1 Run `npm run build` in `frontend/` and verify it compiles
- [x] 5.2 Manually generate and screenshot at least one map per shape archetype (both grid types for at least Continent and Archipelago) and compare against the reference images' overall look
- [x] 5.3 Run `openspec validate improve-map-rendering-fidelity --strict` and verify it passes
- [x] 5.4 Deploy to void-server and verify against `https://mundus.northernarchive.com`
- [x] 5.5 Archive the change with `openspec archive improve-map-rendering-fidelity`
