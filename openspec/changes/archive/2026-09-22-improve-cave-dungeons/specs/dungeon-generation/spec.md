## ADDED Requirements

### Requirement: Caves are tunnels and chambers
A dungeon in the cave style SHALL read as a system of winding tunnels joining
chambers, not as one open cavern. Its floor SHALL cover between 25% and 45% of
the grid; no fully open square of floor larger than 9 by 9 cells SHALL exist;
passages between chambers SHALL be between 2 and 5 cells wide for most of their
length; and the walls SHALL have no isolated speck (a wall group of fewer than 4
cells surrounded by floor) and the floor no single-cell pocket. The cave SHALL
remain one connected region, so every rule of the other requirements (one
entrance, everything reachable, the final boss farthest) still holds. Halls and
mazes are unchanged.

#### Scenario: A cave is not an open field
- **WHEN** many cave dungeons are generated
- **THEN** each has between 25% and 45% of its grid as floor and no 10 by 10 block of floor

#### Scenario: No specks or pockets
- **WHEN** any cave dungeon is generated
- **THEN** it has no enclosed wall group under 4 cells and no floor pocket of one cell

#### Scenario: Caves stay connected
- **WHEN** any cave dungeon is generated
- **THEN** every floor cell is reachable from the entrance

#### Scenario: The dungeon version records the change
- **WHEN** a cave dungeon is generated after this change
- **THEN** its spec version is higher than that of the caves generated before it
