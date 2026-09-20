## Purpose

Builds a single-floor dungeon - its layout, entrance, treasures and bosses - as
a pure function of a map seed and the point of interest that holds it, so a
dungeon is the same on every machine forever and needs no storage.

## ADDED Requirements

### Requirement: Deterministic dungeons
Given a map seed, a point's `x` and `y` and its type, the dungeon SHALL be
byte-identical on every invocation, on any machine, indefinitely. Changing
any of the three MAY change the dungeon. A dungeon SHALL NOT depend on the
window through which its point was found, nor on any other point. The result
SHALL carry a dungeon spec version, incremented whenever any generation rule
changes.

#### Scenario: Same inputs, same dungeon
- **WHEN** a dungeon is generated twice for the same seed, coordinate and type
- **THEN** both results are identical

#### Scenario: A different coordinate gives a different dungeon
- **WHEN** dungeons are generated for two different coordinates of the same seed and type
- **THEN** they differ

### Requirement: A single floor on a grid
A dungeon SHALL be one floor on a rectangular grid whose every cell is a wall
or a floor, sized within documented bounds (width and height each between 32
and 96 cells) and varying with its style. It SHALL have exactly one entrance,
placed on a floor cell at the edge of the floor area, and every floor cell
SHALL be reachable from the entrance.

#### Scenario: Everything is reachable
- **WHEN** any dungeon is generated
- **THEN** every floor cell, treasure and boss can be reached from the entrance by walking over floor cells

#### Scenario: One entrance
- **WHEN** any dungeon is generated
- **THEN** it has exactly one entrance and it is on a floor cell

### Requirement: Layout style follows the place
The layout SHALL come from one of three styles chosen by the point's type: cave
(organic, winding passages) for caves, caverns and mines; halls (rooms joined by
corridors) for ruins, temples, castles, towers and lairs; and maze (a perfect
maze with one path between any two cells) for hedge mazes. The type-to-style
mapping SHALL be part of the dungeon catalog.

#### Scenario: A hedge maze is a maze
- **WHEN** a dungeon for a hedge maze is generated
- **THEN** there is exactly one path between any two floor cells of its maze

#### Scenario: A ruin is rooms and corridors
- **WHEN** a dungeon for a ruin is generated
- **THEN** its floor consists of separate rooms joined by corridors

### Requirement: Bosses
A dungeon SHALL hold one final boss, standing on the floor cell farthest by
walking distance from the entrance, and MAY hold up to two lesser bosses on
other floor cells at least as far from the entrance as the middle of the
route to the final boss. Bosses SHALL be drawn from a documented catalog in
which each entry has an id, a label, a description, a rarity and the styles
it may guard; ids are frozen and only ever appended. A dragon's dungeon SHALL
always have a dragon as its final boss.

#### Scenario: The final boss is at the far end
- **WHEN** any dungeon is generated
- **THEN** its final boss is on the floor cell whose walking distance from the entrance is greatest

#### Scenario: A dragon's lair is guarded by a dragon
- **WHEN** the dungeon of a dragon point is generated
- **THEN** its final boss is a dragon

#### Scenario: Bosses come from the catalog
- **WHEN** any dungeon is generated
- **THEN** every boss's kind is a catalog entry allowed in that dungeon's style

### Requirement: Treasures
A dungeon SHALL hold between three and eight treasures on distinct floor cells,
away from the entrance, weighted toward dead ends and side rooms, plus a hoard
beside the final boss. Treasures SHALL be drawn from a documented catalog with
common, uncommon, rare and exceptional entries weighted like points-of-interest
rarities, so common treasures greatly outnumber exceptional ones.

#### Scenario: Treasure count is bounded
- **WHEN** any dungeon is generated
- **THEN** it has between three and eight treasures on distinct floor cells, not on the entrance or a boss

#### Scenario: Common outnumbers exceptional
- **WHEN** many dungeons are generated
- **THEN** common treasures outnumber exceptional ones by a wide margin

### Requirement: Dungeon API
The system SHALL expose dungeon generation over HTTP, accepting the map seed,
the point's `x` and `y` and its type, and returning the dungeon as JSON: its
spec version, style, size, the grid, the entrance, and every treasure and boss
with its cell and catalog id. A missing seed or coordinate, an invalid seed, or
a type that is not one able to hold a dungeon SHALL be rejected with a clear
message. The API SHALL NOT require that the point actually holds a dungeon on
its map.

#### Scenario: A valid request returns a dungeon
- **WHEN** a request gives a valid seed, coordinates and dungeon-capable type
- **THEN** the dungeon is returned as JSON

#### Scenario: A type that cannot hold a dungeon is rejected
- **WHEN** a request names a type that is not dungeon-capable
- **THEN** it is rejected with a message and no dungeon is generated
