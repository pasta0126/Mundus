## Purpose

Partitions the world into seed-deterministic regions and renders their
boundaries as dashed lines, so a map can carry a political or territorial
structure without needing named regions yet.

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

### Requirement: Boundaries render as dashed lines
A region boundary SHALL render as a dashed line (alternating drawn and gap
segments), visually distinct from rivers (solid) and trade routes (dotted).

#### Scenario: A region boundary is visually distinct from a river
- **WHEN** a region boundary and a river are both rendered in the same view
- **THEN** the boundary is drawn with a dashed stroke and the river with a
  solid stroke

### Requirement: Region borders render as a toggleable layer
Region borders SHALL be hidden entirely when the region-borders layer is
hidden (see `map-layers`).

#### Scenario: Hiding the layer removes all region boundaries
- **WHEN** a user hides the region-borders layer
- **THEN** no region boundary is rendered anywhere in the current view
