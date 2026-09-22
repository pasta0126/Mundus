## ADDED Requirements

### Requirement: Caves are drawn as caves
A dungeon in the cave style SHALL be drawn with smooth, organic contours where
floor meets wall - not as squares of the grid - with a shaded rim on the rock and
a textured floor, so it reads as a cave at any window size. Halls and mazes MAY
remain drawn on the square grid. Marks (entrance, treasures, bosses), tooltips and
their positions SHALL be unaffected.

#### Scenario: The outline of a cave is smooth
- **WHEN** a cave dungeon is shown
- **THEN** its walls are drawn as continuous curves with no visible square steps

#### Scenario: Marks stay where they were
- **WHEN** a cave dungeon is shown
- **THEN** every mark stands on the same cell as before and its tooltip still works
