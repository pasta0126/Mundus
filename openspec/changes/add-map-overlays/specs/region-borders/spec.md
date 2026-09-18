## Purpose

Partitions the world into seed-deterministic regions and renders their
boundaries as thin solid lines, so a map can carry a political or
territorial structure without needing named regions yet.

## ADDED Requirements

### Requirement: Deterministic region partition
Given a seed, the partition of the world into regions (each region's extent
and boundary) SHALL be byte-identical on every invocation, on any machine,
indefinitely. Changing the seed MAY change the partition. A region
boundary's shape SHALL NOT depend on which window it is later requested
through.

#### Scenario: Same seed always yields the same region boundaries
- **WHEN** region boundaries are computed twice for the same seed over the
  same world region
- **THEN** the boundaries are identical both times

#### Scenario: A boundary segment renders identically regardless of window
- **WHEN** the same stretch of a region boundary falls within two different
  requested windows for the same seed
- **THEN** that stretch's rendered path is identical in both

### Requirement: Boundaries render as thin solid lines
A region boundary SHALL render as a thin solid line.

#### Scenario: A boundary renders as a continuous line
- **WHEN** a region boundary is rendered
- **THEN** it appears as an unbroken, thin stroke rather than a series of
  dashes or dots

### Requirement: Boundaries never render over open water
A region boundary point SHALL be omitted from rendering wherever it falls
on open water (the `Ocean` biome, excluding isolated single-cell noise
artifacts already suppressed by the map-generation layer's own pond
suppression - see `map-generation`) - this only changes what gets drawn,
not the underlying region partition or boundary calculation itself. Very
small, artifact-scale water dips MAY still have a boundary drawn across
them; only a real, regionally-inland water body suppresses the line.
Irregular boundary shapes, isolated point-like fragments, and stretches
that happen to be straight are all acceptable outcomes of this omission.

#### Scenario: A boundary does not cross the ocean
- **WHEN** a region seam passes through an area of `Ocean`
- **THEN** no boundary point is rendered on top of that ocean area

#### Scenario: A tiny suppressed pond does not fragment the line
- **WHEN** a region seam passes over an isolated single-cell elevation dip
  that map-generation's own pond suppression already treats as land
- **THEN** the boundary still renders across that point

### Requirement: Region borders render as a toggleable layer, off by default
Region borders SHALL be hidden entirely when the region-borders layer is
hidden (see `map-layers`). Pending further tuning, this layer's
documented default visibility is hidden, and it is labeled "Experimental"
in the layers panel.

#### Scenario: Hiding the layer removes all region boundaries
- **WHEN** a user hides the region-borders layer
- **THEN** no region boundary is rendered anywhere in the current view

#### Scenario: The layer starts hidden on first load
- **WHEN** the page loads and a map is generated for the first time in a
  session
- **THEN** the region-borders layer's visibility matches its documented
  default of hidden
