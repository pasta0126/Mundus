## 1. Backend: grain-scatter generator

- [ ] 1.1 Delete `Mundus.Core/ShapeArchetype.cs` and `ShapeMask.cs`
- [ ] 1.2 Remove `RegionCountRange` from `SizePreset.cs` (no longer used)
- [ ] 1.3 Rewrite `Map.cs`: grain count/radius derivation from `SizePreset`, per-cell elevation as max-of-falloff over grains, land/ocean split at the existing `0.3` threshold, single land biome value; remove the Voronoi region/moisture/mountain-threshold code and the retry/verification loop
- [ ] 1.4 Update `MapsController` to drop the `shapeArchetype` parameter
- [ ] 1.5 Rewrite `MapGeneratorTests.cs`: keep/adapt determinism, dimensions, elevation-bounds, and neighbor-coherence tests; drop region-count/contiguity/archetype tests; add a test that a generated map contains both land and ocean cells for a reasonable grain count
- [ ] 1.6 Run `dotnet test` and verify all tests pass

## 2. Frontend: wizard changes

- [ ] 2.1 Delete `wizard/steps/ShapeArchetypeStep.tsx`; update `wizard/types.ts` (drop `shapeArchetype`, `WIZARD_STEPS` becomes 4 steps) and `MapCreationWizard.tsx` (remove the Shape Archetype case); update `ReviewStep.tsx`
- [ ] 2.2 Regenerate the frontend API client (`npm run generate:api-types`) against the updated OpenAPI document and verify it compiles

## 3. Frontend: post-generation actions

- [ ] 3.1 Add the shadcn `progress` component (`npx shadcn add progress`)
- [ ] 3.2 Rewrite `App.tsx`'s view-state handling: Regenerate (new random seed, same grid/size, generates in place), Restart wizard (reset all state, back to Seed step), Download (canvas `toBlob` PNG + `<a download>`), verify each manually
- [ ] 3.3 Add progress-indicator + status-message feedback for generating and rendering phases (including a brief "Rendering…" state before the synchronous canvas draw), and a descriptive failure message, verify manually

## 4. Frontend: rendering cleanup

- [ ] 4.1 Remove the Mountains/Forest icon-drawing code from `MapCanvas.tsx` (dead now that those biomes never occur), keep contour/hillshade/wave-texture/border code as-is
- [ ] 4.2 Run `npm run build` and verify it compiles

## 5. Close out

- [ ] 5.1 Manually walk through the full flow in a browser (wizard with 4 steps -> generate -> Regenerate -> Restart wizard -> Download) for both grid types and at least two size presets, screenshot the result
- [ ] 5.2 Run `openspec validate simplify-map-generation-to-silhouette --strict` and verify it passes
- [ ] 5.3 Deploy to void-server and verify against `https://mundus.northernarchive.com`
- [ ] 5.4 Archive the change with `openspec archive simplify-map-generation-to-silhouette`
