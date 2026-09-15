# world-generation Specification

## Purpose
Generate reproducible world content - starting with a minimal `World`
record - from a seed, so the same seed always yields byte-identical output
across machines and over time, and independent generation steps don't
interfere with one another.

## Requirements

### Requirement: Deterministic seeded generation
Given the same seed, the system SHALL produce byte-identical output on
every invocation, on any machine, indefinitely. A seed MAY be a string or
a 32-bit unsigned integer.

#### Scenario: Same seed produces identical output
- **WHEN** a `World` is generated twice from the same seed value
- **THEN** the two resulting `World` records are identical in every field

#### Scenario: Different seeds produce different output
- **WHEN** two `World` records are generated from two different seed values
- **THEN** the resulting records SHALL NOT be identical in every field

### Requirement: Seeded random primitives
The system SHALL expose a seeded random source with the following
operations, each of which is itself deterministic given the seed and the
sequence of prior calls: a uniform float in `[0, 1)`, a uniform integer
within an inclusive `[min, max]` range, a boolean draw with a given
probability, a uniform pick from a non-empty list, a weighted pick from a
list of (value, weight) pairs, and a shuffle that returns a new,
independently-ordered list without mutating its input.

#### Scenario: Integer draw respects inclusive bounds
- **WHEN** an integer is drawn with `min = 5` and `max = 8`
- **THEN** every drawn value is one of `5, 6, 7, 8`

#### Scenario: Shuffle does not mutate its input
- **WHEN** a list is shuffled
- **THEN** the original list SHALL be unchanged
- **AND** the shuffled result SHALL contain exactly the same elements

#### Scenario: Weighted pick only returns listed values
- **WHEN** a value is drawn from a weighted list of candidates
- **THEN** the drawn value SHALL be one of the candidates in that list

### Requirement: Independent named sub-streams
The system SHALL allow deriving independent, named child random streams
from a parent seed. A child stream identified by a given name SHALL be
deterministic given the parent seed, that name, and the sequence of prior
child derivations from that same parent; draws from one named child
stream SHALL NOT change the sequence produced by a differently-named
child stream derived at the same point in that sequence.

#### Scenario: Same parent seed and derivation order reproduce the same stream
- **WHEN** two random sources are created from the same parent seed
- **AND** a child stream is derived from each, using the same name, as the
  first child derived from that parent
- **THEN** the two child streams produce identical sequences

#### Scenario: Different child names diverge
- **WHEN** two child streams are derived from the same parent seed, at the
  same point in its derivation order, using different names
- **THEN** the two child streams SHALL NOT produce identical sequences

### Requirement: World generation
The system SHALL generate a `World` record from a seed. A `World` SHALL
include: a spec version identifying the shape of the record, the seed it
was generated from, a size classification, and a biome classification.
Size SHALL be one of a fixed, closed set of values. Biome SHALL be one of
a fixed, closed set of values. Adding a new value to either set SHALL NOT
change what an existing seed generates; reordering or removing a value
SHALL be treated as a breaking change to the spec version.

#### Scenario: Generated World is well-formed
- **WHEN** a `World` is generated from a seed
- **THEN** the result includes a spec version, the original seed, a size
  from the fixed set of allowed sizes, and a biome from the fixed set of
  allowed biomes

#### Scenario: World generation is deterministic
- **WHEN** a `World` is generated twice from the same seed
- **THEN** the size and biome are identical between the two results

### Requirement: World generation over HTTP
The system SHALL expose world generation at `GET /api/Worlds/{seed}`,
returning the generated `World` as JSON with its size and biome
serialized as their string names, not numeric values.

#### Scenario: Requesting a world by seed
- **WHEN** a client sends `GET /api/Worlds/{seed}` for a given seed
- **THEN** the response is `200 OK` with a JSON body matching the `World`
  shape, `size` and `biome` rendered as strings (e.g. `"Large"`,
  `"Forest"`)

#### Scenario: Same seed requested twice returns the same World
- **WHEN** `GET /api/Worlds/{seed}` is requested twice with the same seed
- **THEN** both responses contain the same `size` and `biome`
