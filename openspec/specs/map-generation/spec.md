# map-generation Specification

## Purpose
Generate a reproducible, spatial grid of cells - each with an elevation
and a land/ocean silhouette formed by scattering circular "grains" across
the grid - from a seed and a small set of caller-chosen parameters, so
the same inputs always yield the same map and it resembles an organic
landmass rather than per-cell visual noise.

## Requirements

### Requirement: Deterministic map generation
Given the same seed and the same request parameters (grid type, size
preset), the system SHALL produce a byte-identical map on every
invocation, on any machine, indefinitely. Changing any request parameter
MAY change the resulting map.

#### Scenario: Same seed and parameters produce identical maps
- **WHEN** a map is generated twice with the same seed, grid type, and
  size preset
- **THEN** every cell's biome and elevation are identical between the two
  results

#### Scenario: Different seeds produce different maps
- **WHEN** two maps are generated with the same grid type and size
  preset but different seeds
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

### Requirement: Per-cell elevation
Every cell SHALL have an elevation value, normalized to a fixed range
(`0.0` low to `1.0` high inclusive), derived from proximity to the
nearest grain, and SHALL vary smoothly across neighboring cells rather
than being assigned independently at random per cell: a cell's elevation
SHALL be closer, on average, to its immediate neighbors' elevations than
to the elevation of a cell chosen uniformly at random from the same map.

#### Scenario: Every cell has a valid elevation
- **WHEN** a map is generated
- **THEN** every cell has an elevation between 0.0 and 1.0 inclusive

#### Scenario: Neighboring cells have closer elevations than random cells
- **WHEN** comparing, across a generated map, the average absolute
  elevation difference between each cell and its immediate neighbors
  against the average absolute elevation difference between each cell and
  a uniformly random other cell
- **THEN** the neighbor average is smaller

### Requirement: Map generation over HTTP
The system SHALL expose map generation over HTTP, accepting seed, grid
type, and size preset as request parameters, and returning the generated
map as JSON with grid type, size preset, dimensions, and the full cell
grid (each cell's coordinates, biome as a string, and elevation).

#### Scenario: Requesting a map
- **WHEN** a client requests a map with a valid seed, grid type, and size
  preset
- **THEN** the response is `200 OK` with a JSON body containing the grid
  type, size preset, width, height, and every cell's coordinates, biome
  (as a string), and elevation

#### Scenario: Requesting a map with an invalid parameter
- **WHEN** a client requests a map with a grid type or size preset value
  outside the documented sets
- **THEN** the response is a `4xx` client error and no map is generated

### Requirement: Grain-scattered land/ocean silhouette
The system SHALL generate a map's land/ocean silhouette by scattering a
seed-dependent number of circular "grains" of varying size across the
grid; a cell SHALL be land if it falls within any grain's radius
(overlapping grains merge into one landmass), and `Ocean` otherwise.
Every land cell SHALL have the same single fixed biome value.

#### Scenario: A generated map has both land and ocean
- **WHEN** a map is generated
- **THEN** the result contains at least one `Ocean` cell and, for all but
  pathologically small grain counts, typically at least one non-`Ocean`
  cell

#### Scenario: Every land cell shares the same biome
- **WHEN** inspecting any two non-`Ocean` cells in a generated map
- **THEN** their biome values are identical
