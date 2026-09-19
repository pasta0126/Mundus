## Purpose

Gives every generated map a fixed, seed-derived north bearing - so a map
does not always orient with world "up" as north - and displays it as a
compass-rose icon, stable across regenerating the same seed.

## ADDED Requirements

### Requirement: Deterministic north bearing per seed
Given a seed, the system SHALL derive a single north bearing (an angle in
degrees, `0` inclusive to `360` exclusive, measured clockwise from screen
"up") that is byte-identical on every invocation, on any machine,
indefinitely. Changing the seed MAY change the bearing. The bearing SHALL
NOT depend on which window, zoom step, or coordinate is currently being
viewed.

#### Scenario: Same seed always yields the same bearing
- **WHEN** the north bearing is computed twice for the same seed
- **THEN** the returned angle is identical both times

#### Scenario: Different seeds can yield different bearings
- **WHEN** the north bearing is computed for two different seeds
- **THEN** the resulting angles are not guaranteed to match, and in the
  general case differ

#### Scenario: Bearing is independent of the current view
- **WHEN** a user pans, zooms, or jumps to a different coordinate within
  the same seed
- **THEN** the north bearing shown SHALL NOT change

### Requirement: Compass-rose icon rendering
The system SHALL render a compass-rose icon at a fixed position on the
viewport (overlaying the canvas, consistent with every other UI overlay),
rotated so that its north marker points toward the map's north bearing
relative to screen "up".

#### Scenario: The icon rotates to match the bearing
- **WHEN** a map's north bearing is 90 degrees
- **THEN** the compass rose's north marker points toward the right edge of
  the screen rather than the top

#### Scenario: The icon is hidden when its layer is hidden
- **WHEN** a user hides the compass-rose layer (see `map-layers`)
- **THEN** the compass-rose icon is no longer rendered
