# dungeon-viewer Specification

## Purpose
Shows a generated dungeon as a readable 2D map reached from the map itself,
with the way back to exactly where the person came from.

## Requirements

### Requirement: Dungeon page and URL
The system SHALL serve a dungeon page at `/dungeons`, taking the map's seed, the
point's `x` and `y` and its type from the URL (`/dungeons?map=&x=&y=&type=`), so
that reloading or sharing the URL reproduces the same dungeon. An invalid seed,
missing parameter or unsupported type SHALL show a clear error rather than a
blank page.

#### Scenario: A URL reproduces the dungeon
- **WHEN** a person opens a dungeon URL
- **THEN** the same dungeon is shown as for anyone else opening that URL

#### Scenario: A bad URL shows an error
- **WHEN** a person opens `/dungeons` with a missing or invalid parameter
- **THEN** an error message is shown

### Requirement: Two-dimensional drawing
The page SHALL draw the dungeon as a 2D map on a canvas - walls, floors, the
entrance, every treasure and every boss - scaled to fit the view, with the final
boss visibly distinguished from lesser bosses. Hovering a treasure, a boss or
the entrance SHALL show a tooltip with its name and description. The page SHALL
show a legend of the marks and a sheet with the dungeon's name (its type and
place), style, and how many treasures and bosses it holds.

#### Scenario: Everything generated is drawn
- **WHEN** a dungeon is shown
- **THEN** its entrance, every treasure and every boss are drawn on the map

#### Scenario: Hovering names a mark
- **WHEN** the pointer rests on a treasure, boss or the entrance
- **THEN** a tooltip shows its name and description

#### Scenario: The final boss stands out
- **WHEN** a dungeon has lesser bosses
- **THEN** the final boss is drawn distinctly from them

### Requirement: Returning to the map
The page SHALL offer a control that returns to the map at `/maps`, with the same
seed and centred on the dungeon's point, at the zoom the person came from when
the URL carries it. The page SHALL NOT offer buttons to the other generator
pages; its "Mundus" title leads to the home page.

#### Scenario: Back to the same map
- **WHEN** a person uses the map control on a dungeon page
- **THEN** the map opens with the dungeon's map seed, centred on the dungeon's point

### Requirement: Loading and error feedback
The page SHALL show progress while a dungeon is being fetched and a clear message
if fetching fails.

#### Scenario: Progress and failure are visible
- **WHEN** a dungeon is being fetched, or the fetch fails
- **THEN** a progress indicator or an error message is shown

### Requirement: Copy seed and specs
The dungeon page SHALL let the person copy the dungeon's source (its map seed,
coordinate and type) and its full contents as JSON, each with its own control
and visible confirmation, and a clear message if the browser refuses.

#### Scenario: A dungeon's specs can be copied
- **WHEN** the person uses the copy controls
- **THEN** its source or full JSON is on the clipboard and a confirmation is shown

### Requirement: English text and touch notice
Every piece of user-facing text on the dungeon page SHALL be in English.

#### Scenario: All text is English
- **WHEN** the dungeon page is shown
- **THEN** all its labels, buttons and messages are in English

### Requirement: Caves are drawn as caves
A dungeon in the cave style SHALL be drawn with smooth, organic contours where
floor meets wall - not as squares of the grid - with a shaded rim on the rock and
a textured floor, so it reads as a cave at any window size. A dungeon in the
halls style SHALL be drawn on the square grid with a carved-stone finish: floor
tiles with visible joint lines, and walls with an inner shadow and a lit rim at
the floor boundary. A dungeon in the maze style SHALL be drawn on the square
grid with its walls (the hedge) given a leafy shrub texture instead of a flat
fill, and its floor kept as a plain, readable fill so the one true path stays
easy to trace. Marks (entrance, treasures, bosses), tooltips and their
positions SHALL be unaffected by any of these finishes.

#### Scenario: The outline of a cave is smooth
- **WHEN** a cave dungeon is shown
- **THEN** its walls are drawn as continuous curves with no visible square steps

#### Scenario: Halls read as carved stone
- **WHEN** a halls-style dungeon is shown
- **THEN** its floor shows joint lines between tiles and its walls show an inner shadow and a lit rim at the floor boundary, all on the square grid

#### Scenario: A maze reads as hedges
- **WHEN** a maze-style dungeon is shown
- **THEN** its walls show a leafy shrub texture and its floor is a plain, readable fill, on the square grid

#### Scenario: Marks stay where they were
- **WHEN** any dungeon is shown
- **THEN** every mark stands on the same cell as before and its tooltip still works
