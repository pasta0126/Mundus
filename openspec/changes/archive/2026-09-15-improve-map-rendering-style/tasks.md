## 1. Smoothed rendering

- [x] 1.1 Refactor `MapCanvas` to draw the cell grid onto a small offscreen canvas (`PRE_SCALE` px/cell) and upscale it onto the visible canvas with `imageSmoothingEnabled`/`imageSmoothingQuality`, verify manually that coastlines look smoothed rather than stair-stepped, for both grid types
- [x] 1.2 Replace `BIOME_COLORS` with the warm, parchment-style palette from design.md, verify manually that all seven biomes remain visually distinguishable

## 2. Iconography

- [x] 2.1 Add a deterministic subsample + triangle "peak" icon pass for `Mountains` cells, drawn at full-viewport coordinates over the smoothed base, verify manually against a map containing Mountains
- [x] 2.2 Add a deterministic subsample + tree-cluster icon pass for `Forest` cells, verify manually against a map containing Forest

## 3. Generate another

- [x] 3.1 Add a "Generate another" action to the result view in `App.tsx` that sets `stepIndex` to the Seed step and returns to the wizard view, keeping grid type/size preset/shape archetype, verify manually that those three stay set and the Seed step is shown

## 4. Close out

- [x] 4.1 Run `npm run build` in `frontend/` and verify it compiles
- [x] 4.2 Manually generate at least one map per shape archetype and both grid types, eyeball the rendering against the reduced-scope goal (smoothed coastlines, parchment palette, mountain/forest icons)
- [x] 4.3 Run `openspec validate improve-map-rendering-style --strict` and verify it passes
- [x] 4.4 Deploy to void-server and verify against `https://mundus.northernarchive.com`
- [x] 4.5 Archive the change with `openspec archive improve-map-rendering-style`
