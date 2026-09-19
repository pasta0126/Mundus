## Purpose

Places seed-deterministic points of interest - terrain features, monuments,
legends and whole settlements - from a single documented catalog, each
rendered as an icon with a legend and shown or hidden per category, so a map
can carry rich, exploreable content before any place ever gets a name.

## ADDED Requirements

### Requirement: One documented icon catalog
The system SHALL define every points-of-interest icon in a single catalog:
its id (also its artwork file name), a user-facing label and description,
its category, its class, its rarity, the biomes it may sit on and any
terrain-geometry rule. Categories are: relief & geology, nature & wildlife,
sea & islands, settlements, monuments & ruins, legends & mysteries. Classes
are: terrain (scattered, tied to biome), anchor (heads a settlement of a
given size), service (only ever a satellite of a settlement) and singular
(isolated and scarce). Every generated point of interest SHALL be an entry
of this catalog, in its own category, and every catalog entry SHALL have
artwork in every supported style.

#### Scenario: Every generated point is a catalog entry
- **WHEN** any point of interest is generated
- **THEN** its type is a catalog entry and its category is that entry's

#### Scenario: The catalog and the artwork agree
- **WHEN** the catalog is compared with the artwork of every style
- **THEN** each entry has an image in each style and no image lacks an entry

### Requirement: Rarity as a numeric weight
Each icon SHALL carry a rarity - common (100), uncommon (35), rare (10) or
exceptional (2) - used as the weight with which it is drawn among the icons
valid at the same spot. Common icons SHALL appear far more often than
exceptional ones.

#### Scenario: Common outnumbers exceptional
- **WHEN** many seeds are generated
- **THEN** common non-settlement icons outnumber exceptional ones by a wide margin

### Requirement: Deterministic point-of-interest placement
Given a seed, the set of points of interest (their category, icon type, role
and coordinate) SHALL be byte-identical on every invocation, on any machine,
indefinitely. Changing the seed MAY change the placements. A point's
existence and position SHALL NOT depend on which window it is later
requested through - a settlement's satellites included.

#### Scenario: Same seed always yields the same points of interest
- **WHEN** points of interest are computed twice for the same seed over the
  same world region
- **THEN** every point is identical both times

#### Scenario: Overlapping windows agree on shared points of interest
- **WHEN** two windows that partially overlap are requested for the same seed
- **THEN** every point of interest in the overlapping region is identical in both responses

### Requirement: Placement respects biome and terrain geometry
An icon SHALL only be placed on a biome its catalog entry allows, and
satisfy its geometry rule where it has one: coast (land beside open sea),
cape (land with sea on at least three sides), islet (land surrounded by
sea), lake (water enclosed by land, broad enough to be a lake and not a
bay), near-coast and open-sea (water close to, or far from, land) and
waterside (land beside water). Services SHALL never be placed in the sea.

#### Scenario: A lighthouse stands on a cape and an island lighthouse on an islet
- **WHEN** a lighthouse or island-lighthouse is generated
- **THEN** it is on land, with sea on at least three sides, or on every side, respectively

#### Scenario: A lake icon is only placed on enclosed water
- **WHEN** a lake icon is generated
- **THEN** its cell is water with land on every side within a bounded distance

#### Scenario: A sea icon is only placed on water
- **WHEN** an icon of the sea category is generated
- **THEN** its cell's biome is `Ocean`

### Requirement: Settlements form clusters of a stated size
A settlement SHALL be an anchor icon of one of five sizes - point, small,
medium, large, huge - plus, for every size above point, the service icons
the catalog lists for it, placed around the anchor within that size's
radius. Larger sizes SHALL be rarer, spread wider and never require fewer of
a service than the next smaller size does. A point-size settlement is a lone
icon. Every point SHALL carry its role (single, anchor or satellite) and,
for anchors and satellites, the size of its settlement.

#### Scenario: Satellites stay near their anchor
- **WHEN** a settlement's satellite is generated
- **THEN** an anchor of the same size lies within that size's radius

#### Scenario: Larger settlements are rarer
- **WHEN** many seeds are generated
- **THEN** small settlements outnumber medium ones, and medium outnumber huge ones

### Requirement: Icons only, no text labels
A rendered point of interest SHALL show only its icon; the system SHALL NOT
render a name or any other text label alongside it.

#### Scenario: No label appears next to an icon
- **WHEN** any point of interest is rendered
- **THEN** no text is drawn at or near its icon

### Requirement: Per-category visibility
Each points-of-interest category SHALL be independently shown or hidden via
the layer system (see `map-layers`), independent of every other category and
of every other overlay layer.

#### Scenario: Hiding one category leaves the others visible
- **WHEN** a user hides the "legends & mysteries" category
- **THEN** icons from every other category continue to render unchanged

### Requirement: Selectable icon style
The system SHALL offer the same icons in three styles - color (default),
fantasy and line - and let the user switch between them; switching changes
only how icons look, never which ones appear or where.

#### Scenario: Changing style keeps the same points
- **WHEN** the user switches the icon style
- **THEN** the same points are drawn in the same places with the new artwork

### Requirement: Icon legend
The system SHALL show a legend mapping each visible category's icon types
present in the view to a short description of what that icon represents.

#### Scenario: The legend describes every visible icon type
- **WHEN** a category is visible
- **THEN** the legend lists each of that category's icon types present in
  the current view, each with a short description
