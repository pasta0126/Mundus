## MODIFIED Requirements

### Requirement: Canvas rendering of the generated map
The system SHALL render every cell of a generated map on an HTML canvas,
positioned according to the map's grid type (square or hex). For a
`Square` grid, the boundary between `Ocean` and non-`Ocean` biome SHALL
be rendered as a smoothed vector contour (not a blurred raster and not a
stair-stepped raw cell edge). For a `Hex` grid, that boundary SHALL be
rendered as a crisp (non-blurred) line following the actual hex-edge
steps between land and ocean cells. Terrain SHALL be shaded using each
cell's local elevation gradient (a directional-light hillshade effect),
not a flat per-cell lightness multiplier alone. Cells whose biome is
`Mountains` or `Forest` SHALL be overlaid with an icon distinguishing
that biome, denser and more detailed than a single simple mark per
sampled cell. `Ocean` cells SHALL carry a wave-line texture rather than a
flat or blurred fill. The rendered map SHALL be framed by a decorative
border.

#### Scenario: Every cell is rendered
- **WHEN** a map is generated
- **THEN** the canvas renders the full grid, with no cell of the
  returned grid omitted from the base terrain rendering

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
- **THEN**, for a `Square` grid, that boundary is rendered as a
  continuous smoothed vector curve (not a blurred gradient and not a
  sequence of hard right-angle cell edges); for a `Hex` grid, that
  boundary is rendered as a crisp (non-blurred) line following hex cell
  edges

#### Scenario: Mountains and Forest cells carry an icon
- **WHEN** a rendered map contains cells of biome `Mountains` or `Forest`
- **THEN** a majority of those cells display a multi-part icon (not a
  single dot or triangle) distinguishing that biome, in addition to its
  base terrain color

#### Scenario: Ocean has a wave texture
- **WHEN** a rendered map contains `Ocean` cells
- **THEN** those cells show a wave-line pattern rather than a flat or
  blurred fill

#### Scenario: The map is framed
- **WHEN** a map is rendered
- **THEN** a decorative border frame is visible around the rendered grid
