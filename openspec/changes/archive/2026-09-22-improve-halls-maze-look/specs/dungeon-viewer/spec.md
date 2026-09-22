## MODIFIED Requirements

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
