## Why

The current `map-generation` capability (seven shape archetypes, elevation
noise, Voronoi biome regions, mountain/forest thresholds) is more
machinery than the project needs right now, and the project owner wants
to restart map shape generation from a much simpler, classic worldbuilding
technique instead: scattering "grains" (like rice, lentils, and
chickpeas of different sizes on a blank sheet of paper) and tracing
around them - each grain's neighborhood, and the union of overlapping
grains, becomes an organic landmass silhouette. Start with just that
silhouette (land vs. ocean, nothing else), and add richness back
incrementally in later changes.

This also tightens the frontend: drop the Shape step from the wizard (no
archetype to choose against a silhouette-only generator), replace the
single "Generate another" action with three explicit actions after
viewing a map (Regenerate, Restart wizard, Download), and add real
progress/status feedback so the user is never left guessing what's
happening.

## What Changes

- **REMOVED**: shape archetypes (`Continent`/`Island`/`Archipelago`/
  `Peninsula`/`IsthmusLandBridge`/`InlandSea`/`Unconstrained`), the
  elevation-noise + mask engine, Voronoi biome regions, and the
  Mountains/Forest biome distinction - `map-generation` no longer accepts
  a shape parameter or produces per-region biome variety.
- **ADDED**: a grain-scatter silhouette generator - deterministically
  scatters a seed-dependent number of circular "grains" of varying size
  (small/medium/large, evoking rice/lentils/chickpeas) across the grid;
  a cell is land if it falls within any grain's radius (grains may
  overlap, merging into one landmass), otherwise ocean. Every land cell
  gets one fixed biome value; elevation is still a continuous per-cell
  field (now derived from grain proximity) so existing
  hillshading/contour-smoothing rendering keeps working unchanged.
- **MODIFIED** (`map-creation-wizard`): remove the Shape Archetype step
  (wizard is now Seed -> Grid Type -> Size Preset -> Review); after
  viewing a generated map, offer three explicit actions - Regenerate (new
  random seed, same grid/size, generates immediately without leaving the
  result view), Restart wizard (clear every selection, back to Seed
  step), and Download (save the rendered map as a PNG); add visible
  progress/status feedback for every asynchronous step (generating,
  rendering, downloading) instead of a single static "Generating…" line.
- **ADDED**: an explicit requirement that all user-facing text is in
  English (already true today; making it a tracked requirement so future
  changes don't regress it).

## Non-Goals

- Re-adding biome variety, elevation-driven terrain features, or
  mountain/forest icons - explicitly deferred to a future change once the
  silhouette technique itself is validated. (The rendering *code* for
  those - hillshading, icon glyphs - is kept where cheap to keep, but not
  exercised by this generator; see design.md.)
- Grain shape beyond circles (true rice/lentil elongated ellipses) -
  future refinement once the basic circle-union silhouette is validated.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `map-generation`: shape archetypes and biome regions removed; grain-
  scatter silhouette generation added.
- `map-creation-wizard`: Shape step removed; three post-generation
  actions (Regenerate/Restart/Download) and progress/status feedback
  added; all-English UI text tracked as a requirement.

## Impact

- Backend: `backend/src/Mundus.Core/ShapeArchetype.cs` and `ShapeMask.cs`
  deleted; `Map.cs` rewritten; `MapsController` drops the
  `shapeArchetype` parameter; `MapGeneratorTests.cs` rewritten.
- Frontend: `wizard/steps/ShapeArchetypeStep.tsx` deleted; wizard
  types/steps updated; `App.tsx` rewritten for the three post-generation
  actions and progress feedback; frontend API client regenerated.
