## ADDED Requirements

### Requirement: Deterministic per-cell terrain
Given the same seed, the biome of the cell at any coordinate `(x, y)`
(both arbitrary integers, positive, negative, or zero) SHALL be
byte-identical on every invocation, on any machine, indefinitely.
Changing the seed MAY change the resulting terrain.

#### Scenario: Same seed and coordinate always produce the same biome
- **WHEN** the cell at a given `(x, y)` is requested twice for the same
  seed, whether in the same window request or in two different window
  requests
- **THEN** the returned biome is identical both times

#### Scenario: Different seeds produce different terrain
- **WHEN** the same window is requested for two different seeds
- **THEN** the resulting cells SHALL NOT be identical

### Requirement: Location-independent generation
A cell's biome SHALL depend only on the seed and that cell's own
coordinates - never on which other cells have been requested before it,
what window shape contains it, or its position within that window - so
that exploring a world by requesting successive windows never causes
previously-seen terrain to change, and a window far from the origin is
generated exactly as if it had been the first (or only) request made.

#### Scenario: An unexplored distant window matches an equivalent combined window
- **WHEN** a window far from `(0, 0)` is requested for a seed, having
  made no prior request for that seed
- **AND** a second, larger window that fully contains the first is
  requested for the same seed
- **THEN** every cell's biome in the overlap is identical between the
  two responses

#### Scenario: Overlapping windows agree
- **WHEN** two windows that partially overlap are requested for the same
  seed, in either order
- **THEN** every cell in the overlapping region has the same biome in
  both responses

### Requirement: Windowed terrain query over HTTP
The system SHALL expose terrain generation over HTTP, accepting a seed
and a requested rectangular window (an origin `x` and `y`, each any
integer, plus a width and height in cells) as request parameters, and
returning exactly that window's cells as JSON: each cell's absolute `x`
and `y` coordinates and its biome (a string). Width and height SHALL
each be constrained to a documented maximum per request, to bound
response size; a request exceeding that maximum SHALL be rejected
without generating any terrain.

#### Scenario: A window returns exactly its requested cells
- **WHEN** a window is requested with origin `(ox, oy)`, width `w`, and
  height `h`
- **THEN** the response contains exactly `w * h` cells, one for every
  `(x, y)` with `ox <= x < ox + w` and `oy <= y < oy + h`, each carrying
  its absolute coordinates and biome

#### Scenario: Negative coordinates are valid
- **WHEN** a window is requested with a negative `x` or `y` origin
- **THEN** the request succeeds and returns cells at those negative
  coordinates

#### Scenario: An oversized window is rejected
- **WHEN** a window is requested whose width or height exceeds the
  documented per-request maximum
- **THEN** the request is rejected and no terrain is generated

### Requirement: Biome set from elevation and moisture
The system SHALL assign each cell's biome from a fixed, documented set
of ten biomes - `Ocean`, `Beach`, `Desert`, `Grassland`, `Swamp`,
`Tundra`, `Forest`, `Rainforest`, `Mountains`, `Snow` - by sampling two
independent, continuous, seed-derived values at that cell's coordinates
(an elevation value and a moisture value) and combining them through a
fixed, documented table. Elevation alone determines the lowest band
(`Ocean`), the next (`Beach`), and the highest band (split into
`Mountains` or `Snow` by moisture); for the two middle elevation bands,
moisture additionally determines which of three biomes applies for that
band.

#### Scenario: Every cell has a value in the documented biome set
- **WHEN** any cell is generated
- **THEN** its biome is one of `Ocean`, `Beach`, `Desert`, `Grassland`,
  `Swamp`, `Tundra`, `Forest`, `Rainforest`, `Mountains`, `Snow`

#### Scenario: Low and mid-low elevation determine water and coast regardless of moisture
- **WHEN** a cell's elevation value falls in the lowest or second-lowest
  documented elevation band
- **THEN** its biome is `Ocean` or `Beach` respectively, regardless of
  its moisture value

#### Scenario: Moisture determines the biome within a middle elevation band
- **WHEN** a cell's elevation value falls in one of the two middle
  documented elevation bands
- **THEN** its biome additionally depends on its moisture value: dry,
  medium, and wet moisture map to three different biomes for that
  elevation band, per the documented table

#### Scenario: The highest elevation band splits into Mountains or Snow by moisture
- **WHEN** a cell's elevation value falls in the highest documented
  elevation band
- **THEN** its biome is `Mountains` for drier moisture values and `Snow`
  for the wettest, per the documented table

#### Scenario: Band and table values are fixed and documented
- **WHEN** the same seed and coordinate are sampled
- **THEN** the biome returned matches applying the documented elevation
  thresholds, moisture thresholds, and elevation-by-moisture table to
  that coordinate's two values, reproducibly

### Requirement: Neighboring cells trend toward the same or adjacent biome
Neighboring cells' underlying elevation and moisture values SHALL each
vary smoothly rather than being assigned independently at random, so
that neighboring cells tend to share a biome or a closely related one,
forming coherent regions (e.g. a body of `Ocean` bordered by a ring of
`Beach`, a `Desert` fading into `Grassland` rather than jumping straight
to `Swamp`) rather than cell-to-cell noise. Water bodies SHALL be able
to span an area large enough to read as an ocean separating continents
or islands, not just a pond - i.e. the underlying elevation field's
regions of coherent value SHALL be large relative to a single request
window at the default zoom level, not confined to a small fraction of
it.

#### Scenario: Neighboring cells have closer elevation and moisture values than random cells
- **WHEN** comparing, across a generated window, the average absolute
  difference between each cell and its immediate neighbors against the
  average absolute difference between each cell and a uniformly random
  other cell in that window - computed separately for elevation and for
  moisture
- **THEN** the neighbor average is smaller than the random-pair average,
  for both elevation and moisture

#### Scenario: Water bodies can span a large area
- **WHEN** a sufficiently large window is sampled for a seed that
  produces a large `Ocean` region
- **THEN** that `Ocean` region's extent is not bounded by a small fixed
  size - it can span an area comparable to the window itself, large
  enough to plausibly separate two landmasses

## REMOVED Requirements

### Requirement: Deterministic map generation
**Reason**: Request parameters changed from `(grid type, size preset)`
to `(origin x/y, width, height)` over an unbounded coordinate space, and
determinism is now scoped per-cell rather than per-whole-map - see
"Deterministic per-cell terrain" and "Location-independent generation".
**Migration**: None - determinism still holds, just re-specified for the
new per-cell, windowed model.

### Requirement: Caller-chosen grid type
**Reason**: Terrain is now addressed by an unbounded integer coordinate
space rather than a single fixed-size grid, and the actual renderer has
only ever drawn a square grid regardless of this setting (`Hex`-specific
rendering was removed from the app in a prior change). Only a square
grid is supported going forward.
**Migration**: Callers SHALL omit any grid type parameter; there is
none.

### Requirement: Fixed size presets
**Reason**: Replaced by an arbitrary caller-chosen window (origin,
width, height) over an unbounded coordinate space - see "Windowed
terrain query over HTTP".
**Migration**: Callers choosing a preset like `Large` (128x128) SHALL
instead request a window with that width and height at the desired
origin (commonly `(0, 0)`).

### Requirement: Per-cell elevation
**Reason**: The new biome-band model determines a cell's biome directly
from its sampled terrain value; that value is not itself a product
concern exposed to callers, and nothing in the new model needs a
separate elevation field alongside biome.
**Migration**: Callers relying on elevation for rendering (e.g.
hillshading) SHALL render by biome alone; there is no replacement field.

### Requirement: Map generation over HTTP
**Reason**: Request/response shape changed from `(grid type, size
preset)` to a `(origin x/y, width, height)` window, and the response no
longer carries elevation or a grid type - see "Windowed terrain query
over HTTP".
**Migration**: Callers SHALL switch to the windowed query parameters and
drop any reliance on the removed `gridType`/`elevation` response fields.

### Requirement: Grain-scattered land/ocean silhouette
**Reason**: Replaced by the two-axis elevation/moisture biome model -
see "Biome set from elevation and moisture". A single scattered-circle
land silhouette with one fixed land biome no longer matches the ten-biome
model.
**Migration**: None - callers only ever consumed the resulting biome per
cell, which the new model still provides (with more possible values).
