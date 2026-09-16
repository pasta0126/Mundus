## Purpose

Places seed-deterministic points of interest across a fixed set of icon
categories - geology, settlements, nature, history, sea legends, and
mythological beings - each rendered as an icon with a legend, and shown or
hidden per category, so a map can carry rich, exploreable content before any
place ever gets a name.

## ADDED Requirements

### Requirement: Fixed, documented icon category and type set
The system SHALL support a fixed, documented set of points-of-interest
categories, each with a fixed, documented set of icon types within it:

- **Geology & relief**: mountain peak, mountain range, volcano, cave
- **Settlements**: village, city, seaport, castle, landmark building, ruins
- **Nature**: forest
- **History & scenic**: historic site, scenic site
- **Sacred & mystical**: place of worship, portal
- **Sea legends**: sea monster, treasure, shipwreck, singular event
- **Mythological beings**: mythological creature

Every generated point of interest SHALL have an icon type from this set;
this set is the complete inventory the system's icon artwork MUST cover.

#### Scenario: Every generated point of interest has a documented icon type
- **WHEN** any point of interest is generated
- **THEN** its icon type is one of the types listed in the documented set

### Requirement: Deterministic point-of-interest placement
Given a seed, the set of points of interest (their category, icon type, and
coordinate) SHALL be byte-identical on every invocation, on any machine,
indefinitely. Changing the seed MAY change the placements. A point's
existence and position SHALL NOT depend on which window it is later
requested through.

#### Scenario: Same seed always yields the same points of interest
- **WHEN** points of interest are computed twice for the same seed over the
  same world region
- **THEN** every point's category, icon type, and coordinate are identical
  both times

#### Scenario: Overlapping windows agree on shared points of interest
- **WHEN** two windows that partially overlap are requested for the same
  seed
- **THEN** every point of interest in the overlapping region is identical
  in both responses

### Requirement: Placement respects biome suitability
A point of interest's icon type SHALL only be placed on a cell whose biome
is consistent with that icon type (for example: mountain peak, mountain
range, volcano, and cave icons only on `Mountains`/`Snow` cells; seaport
only on land cells adjacent to `Ocean`; sea monster, treasure, and shipwreck
only on `Ocean` cells; forest only on `Forest`/`Rainforest` cells).

#### Scenario: A seaport is only placed next to water
- **WHEN** a seaport point of interest is generated
- **THEN** its cell is land and at least one neighboring cell is `Ocean`

#### Scenario: A sea monster is only placed on water
- **WHEN** a sea-monster point of interest is generated
- **THEN** its cell's biome is `Ocean`

### Requirement: Icons only, no text labels
A rendered point of interest SHALL show only its icon; the system SHALL NOT
render a name or any other text label alongside it.

#### Scenario: No label appears next to an icon
- **WHEN** any point of interest is rendered
- **THEN** no text is drawn at or near its icon

### Requirement: Per-category visibility
Each points-of-interest category (see the documented set above) SHALL be
independently shown or hidden via the layer system (see `map-layers`),
independent of every other category and of every other overlay layer.

#### Scenario: Hiding one category leaves the others visible
- **WHEN** a user hides the "mythological beings" category
- **THEN** icons from every other category continue to render unchanged

### Requirement: Icon legend
The system SHALL show a legend mapping each visible category's icon types
to a short description of what that icon represents.

#### Scenario: The legend describes every visible icon type
- **WHEN** a category is visible
- **THEN** the legend lists each of that category's icon types present in
  the current view, each with a short description
