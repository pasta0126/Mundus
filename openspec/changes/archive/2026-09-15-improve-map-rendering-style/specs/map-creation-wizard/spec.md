## MODIFIED Requirements

### Requirement: Canvas rendering of the generated map
The system SHALL render every cell of a generated map on an HTML canvas,
positioned according to the map's grid type (square or hex), colored by
the cell's biome, and visually shaded according to the cell's elevation.
Biome boundaries and coastlines SHALL appear visually smoothed rather
than following the raw cell grid's hard, stair-stepped edges. The biome
color palette SHALL use warm, parchment-map-like tones (e.g. muted blues,
greens, and tans) rather than saturated flat colors. Cells whose biome is
`Mountains` or `Forest` SHALL be overlaid with a simple icon (a peak mark
for `Mountains`, a small tree-cluster mark for `Forest`) distinguishing
them from a flat color fill alone.

#### Scenario: Every cell is rendered
- **WHEN** a map is generated
- **THEN** the canvas renders the full grid, with no cell of the returned
  grid omitted from the base terrain rendering

#### Scenario: Different biomes are visually distinguishable
- **WHEN** a rendered map contains cells of at least two different biomes
- **THEN** those cells are drawn in visually distinct colors

#### Scenario: Grid type determines cell layout
- **WHEN** the generated map's grid type is `Hex`
- **THEN** cells are laid out as a hexagonal tessellation with alternating
  row offset, rather than a plain square grid

#### Scenario: Coastlines are smoothed, not stair-stepped
- **WHEN** a rendered map has a boundary between `Ocean` and a non-`Ocean`
  biome
- **THEN** that boundary is rendered as a smoothed curve rather than a
  sequence of hard right-angle cell edges

#### Scenario: Mountains and Forest cells carry an icon
- **WHEN** a rendered map contains cells of biome `Mountains` or `Forest`
- **THEN** at least some of those cells display an icon distinguishing
  that biome, in addition to its base terrain color

## ADDED Requirements

### Requirement: Generate another map after viewing a result
After a map is rendered, the system SHALL offer a "generate another"
action that returns to the wizard's Seed step specifically (not the
Review step), with grid type, size preset, and shape archetype kept as
they were.

#### Scenario: Generate another returns to the Seed step
- **WHEN** a user, after viewing a generated map, chooses "generate
  another"
- **THEN** the wizard's Seed step is shown, and the grid type, size
  preset, and shape archetype selections used for that generation are
  still set
