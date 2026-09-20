# points-of-interest Specification

## Purpose
Places seed-deterministic points of interest - terrain features, monuments,
legends and whole settlements - from a single documented catalog, each
rendered as an icon that names itself on hover and shown or hidden per category, so a map
can carry rich, exploreable content before any place ever gets a name.

## Requirements

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

### Requirement: Icons can be retired without being deleted
A catalog entry MAY be retired: it stays in the catalog with its placement
rules and artwork, but SHALL NOT be generated, so it never appears on the
map, in a settlement's services, or among the icon types the generator can
place. Bringing an icon back is a catalog change only.

#### Scenario: A retired icon never appears
- **WHEN** many seeds are generated
- **THEN** no point has a retired icon's type, while the icon's catalog
  entry and artwork are still present

### Requirement: Rarity as a numeric weight
Each icon SHALL carry a rarity - common (100), uncommon (35), rare (10) or
exceptional (2) - used as the weight with which it is drawn among the icons
valid at the same spot. Common icons SHALL appear far more often than
exceptional ones.

#### Scenario: Common outnumbers exceptional
- **WHEN** many seeds are generated
- **THEN** common non-settlement icons outnumber exceptional ones by a wide margin

### Requirement: Balanced frequencies
A place whose biome offers only rare icons SHALL stay sparse rather than
filling with the one rare icon it has: a candidate spot is kept in
proportion to the total rarity weight of the icons valid there (up to a
per-category reference weight), so no single icon dominates its category.
Icons that depend on rare geometry - lighthouses on capes, beacons on
islets, piers on shores - SHALL still appear, found by a dedicated
shoreline search rather than left to chance.

#### Scenario: No icon dominates its category
- **WHEN** many seeds are generated
- **THEN** no single icon accounts for more than 45% of the relief, nature, sea or monuments icons

#### Scenario: Shore icons appear
- **WHEN** many seeds are generated
- **THEN** lighthouses and piers are among the points found

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
draw a name or any other text label alongside it on the map (its name is
available on hover - see "Icons name themselves on hover").

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

### Requirement: An icon stands on its point
A point of interest's icon SHALL be drawn standing on its coordinate: the
middle of the icon's base sits on the point, not the middle of the picture,
so a tall tower's foot is where the terrain checks were made. Hovering
follows the same drawn area.

#### Scenario: The base of the icon is at the point
- **WHEN** an icon is drawn for a point
- **THEN** its bottom edge is at the point's vertical position and it is centered on the point horizontally

### Requirement: Icons name themselves on hover
Hovering a point of interest SHALL show a tooltip with the icon's name and a
short description, taken from the catalog, and, for a point that holds a
dungeon, a line saying that a dungeon is here and that clicking enters it. The
tooltip SHALL appear only over the bare map - never over a panel or control -
and SHALL follow the pointer without covering the icon.

#### Scenario: Hovering an icon shows what it is
- **WHEN** the pointer rests over a drawn icon
- **THEN** a tooltip shows that icon's name and description

#### Scenario: A dungeon says so
- **WHEN** the pointer rests over an icon that holds a dungeon
- **THEN** the tooltip also says a dungeon is here and can be entered by clicking

#### Scenario: Moving off the icon hides the tooltip
- **WHEN** the pointer leaves the icon, or moves over a panel
- **THEN** no tooltip is shown

### Requirement: Some icons can hold a dungeon
The catalog SHALL mark which entries can hold a dungeon and, for each, its
dungeon style and the probability that a given point of that type does: caves
(`cave`, `skull-cave`, `crystal-cave`, `ice-cavern`), `mine`, `ruins`,
`hidden-temple`, `wizard-tower`, `dragon`, `dark-castle` and `hedge-maze`.
Settlement services never hold dungeons. Marking an entry SHALL NOT change its
id, its artwork, its placement rules or its rarity.

#### Scenario: Only marked entries hold dungeons
- **WHEN** many seeds are generated
- **THEN** every point that holds a dungeon is of a type the catalog marks as able to

#### Scenario: Marking changes no placement
- **WHEN** the same seed and window are generated before and after dungeons exist
- **THEN** every point's type, role and coordinate is identical

### Requirement: A deterministic roll decides which points hold a dungeon
Whether a point that can hold a dungeon does hold one SHALL be decided by a roll
that is a pure function of the seed, the point's coordinate and its type, with
the probability given by the catalog (certain for `dragon`, `skull-cave` and
`dark-castle`, otherwise about one in two), independent of the roll and stream
that place points. The result SHALL be part of every returned point and SHALL be
identical for the same point in any window.

#### Scenario: The same point always agrees
- **WHEN** two overlapping windows include the same point
- **THEN** it holds a dungeon in both or in neither

#### Scenario: Not every cave is a dungeon
- **WHEN** many seeds are generated
- **THEN** some caves hold a dungeon and some do not, while every dragon does

### Requirement: A dungeon is marked and can be entered
A point that holds a dungeon SHALL be drawn with a small "!" badge on its icon
and SHALL show as a dungeon in its tooltip. Clicking the icon or its badge SHALL
open that dungeon at `/dungeons` (see `dungeon-viewer`), carrying the map's seed,
the point's coordinate and type, and the current zoom. The badge SHALL be shown
and hidden with the icon's own category, and the pointer SHALL show that the
icon is clickable only over a dungeon. Clicking any other icon or the bare map
SHALL do nothing new.

#### Scenario: A dungeon point shows a badge
- **WHEN** a point that holds a dungeon is drawn
- **THEN** a "!" badge is drawn on its icon

#### Scenario: The badge follows the category
- **WHEN** a user hides that icon's category
- **THEN** neither the icon nor its badge is drawn

#### Scenario: Clicking enters the dungeon
- **WHEN** the person clicks a dungeon's icon
- **THEN** the dungeon page opens for that point

#### Scenario: Other icons are not clickable
- **WHEN** the person clicks an icon that holds no dungeon
- **THEN** nothing happens
