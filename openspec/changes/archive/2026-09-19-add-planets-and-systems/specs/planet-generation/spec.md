## Purpose
Generate a reproducible description of a single planet from a text seed - its
type, look, atmosphere, rings, asteroid field, moons, and spin - so the same
seed always yields the same planet, whether viewed alone or inside a system.

## ADDED Requirements

### Requirement: Seed normalization
A planet seed SHALL be a non-empty text. Before use, the system SHALL
normalize it by trimming leading and trailing whitespace, collapsing runs of
inner whitespace to a single space, converting to lower case with the
invariant culture, and applying Unicode normalization form C. Two seeds that
differ only in those respects SHALL yield the same planet. A seed that is
empty after normalization, or longer than a documented maximum length, SHALL
be rejected.

#### Scenario: Case and spacing do not change the planet
- **WHEN** the seeds `Kepler 4`, `  kepler   4 ` and `KEPLER 4` are each requested
- **THEN** the three responses describe the same planet

#### Scenario: An empty seed is rejected
- **WHEN** a seed that is empty or only whitespace is requested
- **THEN** the request is rejected and no planet is generated

#### Scenario: An oversized seed is rejected
- **WHEN** a seed longer than the documented maximum is requested
- **THEN** the request is rejected and no planet is generated

### Requirement: Deterministic planet description
Given the same normalized seed, the planet description SHALL be identical on
every invocation, on any machine, indefinitely. The description SHALL depend
only on the seed - never on a system, an orbit, or any earlier request - so a
planet requested alone is identical to the same seed appearing in a system.
Different seeds MAY yield different planets.

#### Scenario: Same seed always produces the same planet
- **WHEN** the same seed is requested twice, in separate requests
- **THEN** both descriptions are identical

#### Scenario: A planet is the same alone and inside a system
- **WHEN** a planet seed is requested on its own and also as a slot of a system
- **THEN** the planet description is identical in both

### Requirement: One planet, one type
Every planet SHALL have exactly one type from a fixed, documented set:
rocky, desert, oceanic, ice, lava, toxic, and gas giant. The type SHALL fix
the planet's overall look: a palette of surface colors and a single
dominant surface character (one biome - never a mix of climates). The
description SHALL also carry a radius, a display name (the seed as the person
entered it), and a short descriptive text derived from the type and features.

#### Scenario: Every planet has a documented type
- **WHEN** any planet is generated
- **THEN** its type is one of rocky, desert, oceanic, ice, lava, toxic, gas giant

#### Scenario: A planet has a single palette
- **WHEN** any planet is generated
- **THEN** its description carries one palette consistent with its type

### Requirement: Surface features
A planet's description SHALL carry enough deterministic parameters for the
surface texture to be drawn without any further randomness: a texture seed
and a small, bounded set of geographic singularities (for example polar caps,
ridges, craters, storm bands, or seas, as suited to the type). The surface
SHALL stay low in detail - a soft, readable texture rather than fine terrain.

#### Scenario: Surface parameters are fully determined by the seed
- **WHEN** the same seed is generated twice
- **THEN** the texture seed and the set of singularities are identical both times

### Requirement: Atmosphere and clouds
A planet MAY have an atmosphere. A planet with an atmosphere MAY have a cloud
layer; a planet without an atmosphere SHALL NOT have clouds. Gas giants SHALL
always have an atmosphere.

#### Scenario: No atmosphere means no clouds
- **WHEN** a planet has no atmosphere
- **THEN** its description has no cloud layer

#### Scenario: Gas giants have an atmosphere
- **WHEN** a planet of type gas giant is generated
- **THEN** its description has an atmosphere

### Requirement: Rings and asteroid field
A planet MAY have a ring system and MAY have its own asteroid field, each
independently. When present, each SHALL carry its own deterministic
parameters (inner and outer extent relative to the planet's radius, and a
color).

#### Scenario: Rings and asteroid field are optional
- **WHEN** many seeds are generated
- **THEN** some planets have rings, some have an asteroid field, and some have neither

### Requirement: Moons
A planet SHALL have between zero and three moons. Each moon SHALL carry a
size smaller than its planet, a palette, and a deterministic orbit around the
planet (distance, period, initial phase, and inclination).

#### Scenario: Moon count is bounded
- **WHEN** any planet is generated
- **THEN** it has zero, one, two, or three moons

#### Scenario: Moons are smaller than their planet
- **WHEN** a planet has moons
- **THEN** every moon's size is smaller than the planet's radius

### Requirement: Spin
Every planet SHALL carry a deterministic rotation period and a deterministic
axial tilt, so a viewer can spin it identically for everyone.

#### Scenario: Spin parameters are deterministic
- **WHEN** the same seed is generated twice
- **THEN** its rotation period and axial tilt are identical both times

### Requirement: Planet query over HTTP
The system SHALL expose planet generation over HTTP, accepting a seed and
returning the planet's description as JSON, including the generation's
`SpecVersion`.

#### Scenario: A seed returns its planet
- **WHEN** a valid seed is requested
- **THEN** the response contains that planet's full description and the spec version

### Requirement: Versioned generation contract
Planet generation SHALL carry its own `SpecVersion`. Any change that alters
what a given seed produces SHALL be a breaking change and SHALL bump that
version.

#### Scenario: The version is reported with every planet
- **WHEN** any planet is generated
- **THEN** the response reports the planet generation's current spec version
