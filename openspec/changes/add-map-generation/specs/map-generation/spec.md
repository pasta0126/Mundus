## Purpose

Generate a reproducible, spatial grid of cells - each with a biome and an
elevation - from a seed and caller-chosen grid parameters, so the same
inputs always yield the same map and a renderer can draw it as an actual
2D top-down map instead of a single summary record.

## ADDED Requirements

### Requirement: Deterministic map generation
Given the same seed and the same request parameters (grid type, width,
height), the system SHALL produce a byte-identical map on every
invocation, on any machine, indefinitely. Changing any request parameter
(seed, grid type, width, or height) MAY change the resulting map.

#### Scenario: Same seed and parameters produce identical maps
- **WHEN** a map is generated twice with the same seed, grid type, width,
  and height
- **THEN** every cell's biome and elevation are identical between the two
  results

#### Scenario: Different seeds produce different maps
- **WHEN** two maps are generated with the same grid type, width, and
  height but different seeds
- **THEN** the resulting cell grids SHALL NOT be identical

### Requirement: Caller-chosen grid type
The system SHALL support generating a map on a `Square` grid or on a
`Hex` grid (rectangular offset layout), selected explicitly by the
caller per request. Grid type SHALL NOT be inferred from the seed or from
any `World` record.

#### Scenario: Requesting a square grid
- **WHEN** a map is requested with grid type `Square`
- **THEN** the resulting map's cells are addressed by `(x, y)` coordinates
  forming a rectangular grid

#### Scenario: Requesting a hex grid
- **WHEN** a map is requested with grid type `Hex`
- **THEN** the resulting map's cells are addressed by hex coordinates
  forming a rectangular offset layout, and each interior cell has exactly
  six neighbors

### Requirement: Caller-chosen dimensions
The system SHALL generate a map with the exact width and height (in
cells) requested by the caller, both of which MUST be positive integers.
The system SHALL reject a request with a non-positive width or height, or
with dimensions exceeding a documented maximum, without generating a
partial map.

#### Scenario: Requested dimensions are honored
- **WHEN** a map is requested with width `W` and height `H`
- **THEN** the resulting map contains exactly `W × H` cells laid out
  according to the requested grid type

#### Scenario: Non-positive dimensions are rejected
- **WHEN** a map is requested with a width or height that is zero or
  negative
- **THEN** the system SHALL reject the request and generate no map

#### Scenario: Excessive dimensions are rejected
- **WHEN** a map is requested with width or height beyond the documented
  maximum
- **THEN** the system SHALL reject the request and generate no map

### Requirement: Per-cell biome and elevation
Every cell in a generated map SHALL have exactly one biome (from the same
fixed, closed set of biomes as the `world-generation` capability) and one
elevation value, normalized to a fixed range (`0.0` low to `1.0` high
inclusive).

#### Scenario: Every cell is fully populated
- **WHEN** a map is generated
- **THEN** every cell in the grid has a biome from the fixed biome set and
  an elevation between 0.0 and 1.0 inclusive

### Requirement: Spatial coherence
Elevation and biome SHALL vary smoothly across neighboring cells rather
than being assigned independently at random per cell: a cell's elevation
SHALL be closer, on average, to its immediate neighbors' elevations than
to the elevation of a cell chosen uniformly at random from the same map.
The same coherence property SHALL hold for biome (a cell's biome is more
likely to match an immediate neighbor's biome than a randomly chosen
cell's).

#### Scenario: Neighboring cells have closer elevations than random cells
- **WHEN** comparing, across a generated map, the average absolute
  elevation difference between each cell and its immediate neighbors
  against the average absolute elevation difference between each cell and
  a uniformly random other cell
- **THEN** the neighbor average is smaller

### Requirement: Map generation over HTTP
The system SHALL expose map generation over HTTP, accepting seed, grid
type, width, and height as request parameters, and returning the
generated map as JSON with grid type, dimensions, and the full cell grid
(each cell's coordinates, biome as a string, and elevation).

#### Scenario: Requesting a map
- **WHEN** a client requests a map with a valid seed, grid type, width,
  and height
- **THEN** the response is `200 OK` with a JSON body containing the grid
  type, width, height, and every cell's coordinates, biome (as a string),
  and elevation

#### Scenario: Requesting a map with invalid dimensions
- **WHEN** a client requests a map with a non-positive or
  excessively large width or height
- **THEN** the response is a `4xx` client error and no map is generated
