## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Biome set and ordered terrain bands
The system SHALL assign each cell's biome from a fixed, documented,
ordered sequence of biome bands - `Ocean`, `Beach`, `Grassland`,
`Forest`, `Tundra`, `Snow` - by sampling a single continuous
seed-derived terrain value at that cell's coordinates and mapping it
through fixed, documented thresholds in that order, so which biomes can
border which is determined by band adjacency in this sequence rather
than assigned independently per cell.

#### Scenario: Every cell has a value in the documented biome set
- **WHEN** any cell is generated
- **THEN** its biome is one of `Ocean`, `Beach`, `Grassland`, `Forest`,
  `Tundra`, `Snow`

#### Scenario: Band thresholds are fixed and documented
- **WHEN** the same seed and coordinate are sampled
- **THEN** the biome returned matches applying the documented threshold
  table to that coordinate's terrain value, reproducibly

### Requirement: Neighboring cells trend toward the same or adjacent biome band
Neighboring cells' underlying terrain values SHALL vary smoothly rather
than being assigned independently at random, so that neighboring cells
tend to share a biome band or sit in adjacent bands, forming coherent
regions (e.g. a body of `Ocean` bordered by a ring of `Beach`) rather
than cell-to-cell noise.

#### Scenario: Neighboring cells have closer terrain values than random cells
- **WHEN** comparing, across a generated window, the average absolute
  terrain-value difference between each cell and its immediate neighbors
  against the average absolute terrain-value difference between each
  cell and a uniformly random other cell in that window
- **THEN** the neighbor average is smaller

## REMOVED Requirements

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
