## Purpose
Generate a reproducible planetary system from a text seed - a central group of
one to three bodies, planet slots on orbits, and at most one asteroid belt -
and allow a custom system to be described entirely by a URL.

## ADDED Requirements

### Requirement: Deterministic system
Given the same normalized seed (normalized as in `planet-generation`), the
system description SHALL be identical on every invocation, on any machine,
indefinitely. It SHALL depend only on the seed. Different seeds MAY yield
different systems.

#### Scenario: Same seed always produces the same system
- **WHEN** the same system seed is requested twice
- **THEN** both descriptions are identical

### Requirement: Central group of one to three bodies
Every system SHALL have a central group of one, two, or three bodies, chosen
by the system's seed. Each body SHALL be one of a fixed, documented set of
kinds: stars of several types (for example red dwarf, yellow, orange, blue
giant, white dwarf) and compact objects (black hole, pulsar). Each body SHALL
carry a size, a color, and a deterministic orbit around the group's common
center; a group of one body sits at the center. Planets orbit the common
center of the group.

#### Scenario: The group has one to three bodies
- **WHEN** any system is generated
- **THEN** its central group has one, two, or three bodies, each of a documented kind

#### Scenario: A single body sits at the center
- **WHEN** a system's central group has one body
- **THEN** that body is at the common center

### Requirement: Planet slots
Every system SHALL have between one and eight planet slots. Each slot SHALL
carry a planet seed and a deterministic orbit. A slot's planet seed SHALL be
`<normalized system seed>/<n>` with `n` counting from 1, so requesting that
seed as a planet on its own yields the identical planet. A slot's orbit
SHALL depend only on the system seed and the slot's index, not on its planet
seed. Orbits SHALL be ordered outward by index and SHALL lie outside the
central group's extent.

#### Scenario: Slot seeds follow the documented pattern
- **WHEN** a system with a normalized seed `kepler` has three slots
- **THEN** their planet seeds are `kepler/1`, `kepler/2`, and `kepler/3`

#### Scenario: A slot's planet equals the standalone planet
- **WHEN** the planet seed of a slot is requested as a planet on its own
- **THEN** it is identical to the planet shown in that slot

#### Scenario: Orbits move outward
- **WHEN** a system has more than one slot
- **THEN** each slot's orbital radius is larger than the previous slot's

### Requirement: Mostly coplanar orbits
Every orbit SHALL carry a deterministic inclination. Most orbits SHALL lie in
the common reference plane or very near it; an occasional planet MAY orbit in
a clearly different plane.

#### Scenario: Most orbits share a plane
- **WHEN** many systems are generated
- **THEN** most planets have a small or zero inclination, and a minority have a clearly larger one

### Requirement: At most one asteroid belt
A system MAY have one asteroid belt and SHALL NOT have more than one. A belt
SHALL orbit the common center in the reference plane, at a radius between two
neighboring planet slots, and SHALL carry a width and a color.

#### Scenario: Never more than one belt
- **WHEN** many systems are generated
- **THEN** every system has zero or one belt

#### Scenario: A belt sits between two planet orbits
- **WHEN** a system has a belt
- **THEN** its radius lies between the orbits of two neighboring slots

### Requirement: Deterministic motion
For every orbiting body (central group bodies, planets, moons, belt), the
description SHALL carry the data - radius, period, initial phase, and
inclination - from which its position at any time `t` is a pure function.
At `t = 0` the positions SHALL be the deterministic initial positions, the
same for everyone.

#### Scenario: Initial positions are identical for everyone
- **WHEN** the same system is viewed by two people at `t = 0`
- **THEN** every body is at the same position for both

### Requirement: Custom system
A custom system SHALL be described by a central seed, an ordered list of one
to eight planet seeds, and optionally the index of the slot after which the
belt sits. It SHALL require no storage: the whole description SHALL be
recoverable from the request, and therefore from a URL. The central group and
the orbits SHALL be derived from the central seed exactly as for a generated
system with that seed, and each listed planet seed is used as given. A
custom system that lists the planet seeds of a generated system, with that
system's seed as its central seed, SHALL be identical to it.

#### Scenario: A custom system needs no storage
- **WHEN** a custom system is requested with a central seed and a list of planet seeds
- **THEN** the response fully describes the system with nothing stored on the server

#### Scenario: A custom system equal to a generated one
- **WHEN** a custom system is requested with system seed `kepler` as its central seed and the planet seeds `kepler/1` to `kepler/n` of the generated system
- **THEN** its description is identical to the generated system's, except for its belt if the belt is not requested

#### Scenario: Too many planets are rejected
- **WHEN** a custom system lists more than eight planet seeds
- **THEN** the request is rejected and no system is generated

### Requirement: System query over HTTP
The system SHALL expose system generation over HTTP, accepting a seed and,
optionally, an explicit list of planet seeds and a belt position (a custom
system), and returning the system's description as JSON, including its
generation `SpecVersion`.

#### Scenario: A seed returns its system
- **WHEN** a valid seed is requested
- **THEN** the response contains the central group, the slots, the optional belt, and the spec version

### Requirement: Versioned generation contract
System generation SHALL carry its own `SpecVersion`. Any change that alters
what a given seed produces SHALL be a breaking change and SHALL bump that
version.

#### Scenario: The version is reported with every system
- **WHEN** any system is generated
- **THEN** the response reports the system generation's current spec version
