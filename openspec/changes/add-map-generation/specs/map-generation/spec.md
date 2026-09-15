## Purpose

Generate a reproducible, spatial grid of cells - each with an elevation,
grouped into a small number of contiguous biome regions, optionally
shaped into a recognizable landmass archetype - from a seed and a small
set of caller-chosen parameters, so the same inputs always yield the same
map and it resembles a real place (an island, a continent) rather than
per-cell visual noise.

## ADDED Requirements

### Requirement: Deterministic map generation
Given the same seed and the same request parameters (grid type, size
preset, shape archetype), the system SHALL produce a byte-identical map
on every invocation, on any machine, indefinitely. Changing any request
parameter MAY change the resulting map.

#### Scenario: Same seed and parameters produce identical maps
- **WHEN** a map is generated twice with the same seed, grid type, size
  preset, and shape archetype
- **THEN** every cell's biome and elevation are identical between the two
  results

#### Scenario: Different seeds produce different maps
- **WHEN** two maps are generated with the same grid type, size preset,
  and shape archetype but different seeds
- **THEN** the resulting cell grids SHALL NOT be identical

### Requirement: Caller-chosen grid type
The system SHALL support generating a map on a `Square` grid or on a
`Hex` grid (rectangular offset layout), selected explicitly by the
caller per request.

#### Scenario: Requesting a square grid
- **WHEN** a map is requested with grid type `Square`
- **THEN** the resulting map's cells are addressed by `(x, y)` coordinates
  forming a rectangular grid, and each interior cell has exactly 4
  orthogonal neighbors

#### Scenario: Requesting a hex grid
- **WHEN** a map is requested with grid type `Hex`
- **THEN** the resulting map's cells are addressed by offset coordinates
  forming a rectangular layout, and each interior cell has exactly 6
  neighbors

### Requirement: Fixed size presets
The system SHALL support exactly four size presets, each with a fixed,
documented width and height in cells: `Small` (32x32), `Medium` (64x64),
`Large` (128x128), `Huge` (256x256). The system SHALL NOT accept an
arbitrary caller-chosen width or height.

#### Scenario: Requested preset determines dimensions
- **WHEN** a map is requested with a given size preset
- **THEN** the resulting map's width and height match that preset's fixed,
  documented dimensions exactly

### Requirement: Biome regions, not per-cell biome
The system SHALL partition each map into a small number of contiguous
biome regions, where every cell in a region has the same biome, and the
region count SHALL fall within a range determined by the size preset:
`Small` 1-3 regions, `Medium` 3-6 regions, `Large` 6-12 regions, `Huge`
10-20 regions. Every cell SHALL belong to exactly one region and have
exactly one biome (from the same fixed, closed set of biomes as the
`world-generation` capability).

#### Scenario: Region count matches the size preset's range
- **WHEN** a map is generated with a given size preset
- **THEN** the number of distinct contiguous biome regions in the result
  falls within that preset's documented range

#### Scenario: Every cell in a region shares its biome
- **WHEN** inspecting any two cells that belong to the same biome region
- **THEN** their biome values are identical

#### Scenario: Regions are contiguous
- **WHEN** inspecting any single biome region
- **THEN** every cell in that region can be reached from any other cell
  in the same region by moving only through cells of that same region

### Requirement: Per-cell elevation
Every cell SHALL have an elevation value, normalized to a fixed range
(`0.0` low to `1.0` high inclusive), and elevation SHALL vary smoothly
across neighboring cells rather than being assigned independently at
random per cell: a cell's elevation SHALL be closer, on average, to its
immediate neighbors' elevations than to the elevation of a cell chosen
uniformly at random from the same map.

#### Scenario: Every cell has a valid elevation
- **WHEN** a map is generated
- **THEN** every cell has an elevation between 0.0 and 1.0 inclusive

#### Scenario: Neighboring cells have closer elevations than random cells
- **WHEN** comparing, across a generated map, the average absolute
  elevation difference between each cell and its immediate neighbors
  against the average absolute elevation difference between each cell and
  a uniformly random other cell
- **THEN** the neighbor average is smaller

### Requirement: Shape archetype
The system SHALL support four shape archetypes selected explicitly by the
caller, each guaranteeing an observable property of the resulting map's
land/ocean layout (land = any non-`Ocean` biome cell):

- `Continent`: land cells SHALL form exactly one contiguous connected
  region (ocean may or may not touch the map edges).
- `Island`: land cells SHALL form exactly one contiguous connected
  region, AND every cell on the map's outer edge SHALL be `Ocean`.
- `Archipelago`: land cells SHALL form two or more disjoint contiguous
  connected regions, each separated from the others by `Ocean` cells.
- `Unconstrained`: no guarantee on land/ocean layout beyond the other
  requirements in this spec (region count, contiguity of biome regions,
  elevation coherence).

#### Scenario: Continent archetype produces one landmass
- **WHEN** a map is generated with shape archetype `Continent`
- **THEN** the set of non-`Ocean` cells forms exactly one contiguous
  connected region

#### Scenario: Island archetype produces one landmass with ocean edges
- **WHEN** a map is generated with shape archetype `Island`
- **THEN** the set of non-`Ocean` cells forms exactly one contiguous
  connected region, and every cell on the outer edge of the map is
  `Ocean`

#### Scenario: Archipelago archetype produces multiple landmasses
- **WHEN** a map is generated with shape archetype `Archipelago`
- **THEN** the set of non-`Ocean` cells forms two or more contiguous
  connected regions, with no two of them adjacent to each other

### Requirement: Map generation over HTTP
The system SHALL expose map generation over HTTP, accepting seed, grid
type, size preset, and shape archetype as request parameters, and
returning the generated map as JSON with grid type, size preset,
dimensions, and the full cell grid (each cell's coordinates, biome as a
string, and elevation).

#### Scenario: Requesting a map
- **WHEN** a client requests a map with a valid seed, grid type, size
  preset, and shape archetype
- **THEN** the response is `200 OK` with a JSON body containing the grid
  type, size preset, width, height, and every cell's coordinates, biome
  (as a string), and elevation

#### Scenario: Requesting a map with an invalid parameter
- **WHEN** a client requests a map with a grid type, size preset, or
  shape archetype value outside the documented sets
- **THEN** the response is a `4xx` client error and no map is generated
