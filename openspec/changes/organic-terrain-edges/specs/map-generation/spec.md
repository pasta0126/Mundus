## ADDED Requirements

### Requirement: Organic, non-smooth boundary edges
Every threshold-crossing boundary between biomes derived from the elevation field (Ocean/Beach, Beach/Lowland, and every other elevation-band edge, including any water body distinct from Ocean) and every threshold-crossing boundary between biomes derived from the moisture field (e.g. Desert/Grassland, Grassland/Forest) SHALL carry organic, ragged detail along its length, comparable in character to the domain-warped mountain/plate-boundary seams, rather than reading as a long, smooth, low-curvature arc. This applies at the finest supported sampling stride (`step = 1`) and SHALL NOT rely on speckled per-cell noise to satisfy it - the "Neighboring cells trend toward the same or adjacent biome" requirement's coherence still applies away from a boundary.

#### Scenario: A coastline boundary is not well-approximated by a smooth curve
- **WHEN** sampling a window at `step = 1` for a seed known to produce a long Ocean/Beach or Beach/Lowland coastline stretch, and extracting the sequence of boundary-crossing points along that stretch
- **THEN** the boundary's deviation from a low-order smooth curve fit (e.g. a local moving-average or low-degree polynomial) exceeds a documented minimum threshold - i.e. the boundary is not indistinguishable from a smooth arc

#### Scenario: A moisture-band boundary is not well-approximated by a smooth curve
- **WHEN** sampling a window at `step = 1` for a seed known to produce a long moisture-band boundary within a single elevation band (e.g. a Forest edge within Lowland)
- **THEN** the boundary's deviation from a low-order smooth curve fit exceeds the same documented minimum threshold

#### Scenario: Region coherence is preserved alongside added raggedness
- **WHEN** comparing, across a generated window, the average absolute difference between each cell and its immediate neighbors against the average absolute difference between each cell and a uniformly random other cell in that window, for both elevation and moisture
- **THEN** the neighbor average remains smaller than the random-pair average, unchanged from the existing "Neighboring cells trend toward the same or adjacent biome" requirement

#### Scenario: Stray-pond suppression near the coast is preserved
- **WHEN** a cell's detailed elevation sample falls below the Ocean/Beach threshold but that cell's regional (base-octave-only) elevation is clearly inland
- **THEN** the cell is still not rendered as a stray pond - it resolves the same way this requirement's added raggedness does not reintroduce isolated fine-detail dips as false water bodies
