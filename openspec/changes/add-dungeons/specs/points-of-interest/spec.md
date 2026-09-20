## ADDED Requirements

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

## MODIFIED Requirements

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
