## Purpose

Generates seed-deterministic rivers that originate at high-elevation
sources, wind downhill toward large water bodies, and can merge into a
shared downstream river as tributaries, so maps read as having real
watersheds rather than isolated terrain.

## ADDED Requirements

### Requirement: Deterministic river sources and paths
Given a seed, the set of river sources and each river's full path SHALL be
byte-identical on every invocation, on any machine, indefinitely. Changing
the seed MAY change the sources and paths. A river's path SHALL NOT depend
on which window it is later requested or rendered through.

#### Scenario: Same seed always yields the same rivers
- **WHEN** rivers are computed twice for the same seed over the same world
  region
- **THEN** every river's source, path, and confluences are identical both
  times

#### Scenario: A river segment renders identically regardless of window
- **WHEN** the same stretch of a river falls within two different requested
  windows for the same seed (e.g. one wide view and one narrow view, or two
  overlapping views)
- **THEN** that stretch's rendered path is identical in both

### Requirement: Rivers originate at high elevation
Every river SHALL originate at a cell whose elevation places it in the
existing highest documented elevation band (see `map-generation`'s `Peak`
band), so rivers read as descending from mountains rather than appearing on
flat or low ground.

#### Scenario: A river's source is a Peak-band cell
- **WHEN** a generated river's source cell is inspected
- **THEN** its elevation falls within the `Peak` elevation band

### Requirement: Rivers flow downhill to a terminal water body
From its source, a river SHALL follow a path of decreasing or equal
elevation until it reaches a cell belonging to a large water body (an
`Ocean` cell, or a lake as defined by this change's terrain additions), at
which point the river ends. A river that cannot reach a water body within a
documented maximum path length SHALL be discarded rather than left dangling
on land.

#### Scenario: A river terminates at water
- **WHEN** a generated river's path is inspected end to end
- **THEN** every step's elevation is less than or equal to the previous
  step's, and the final cell is part of a large water body

#### Scenario: A river that cannot reach water is not generated
- **WHEN** a candidate source's downhill path fails to reach a large water
  body within the documented maximum path length
- **THEN** no river is produced for that source

### Requirement: River paths are sinuous, not straight
A river's path SHALL wind (meander) rather than tracing the single
steepest-descent direction at every step, so it reads as an organic river
rather than a straight or jagged line following only the elevation
gradient.

#### Scenario: A sufficiently long river is not a straight line
- **WHEN** a generated river spans a large elevation drop (source to
  terminus)
- **THEN** its path is not a single straight segment - it changes direction
  more than once while still trending downhill overall

### Requirement: Rivers can converge as tributaries
Two or more river paths SHALL be able to merge into one shared downstream
path before reaching their terminal water body, at which point they
continue as a single river to their shared terminus.

#### Scenario: Two rivers merge before reaching water
- **WHEN** two rivers' paths are generated close enough to intersect before
  either reaches a water body
- **THEN** downstream of that intersection, both are represented as one
  merged river path to a single terminus

### Requirement: Rivers render as a toggleable layer
Rivers SHALL render as connected line strokes over the biome grid, and
SHALL be hidden entirely when the rivers layer is hidden (see
`map-layers`).

#### Scenario: Hiding the rivers layer removes all river strokes
- **WHEN** a user hides the rivers layer
- **THEN** no river is rendered anywhere in the current view
