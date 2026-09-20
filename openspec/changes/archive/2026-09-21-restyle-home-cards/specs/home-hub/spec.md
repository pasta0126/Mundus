## REMOVED Requirements

### Requirement: Home page at the root
**Reason**: It required a dungeons card. Dungeons are reached only through the map, so the hub offers just the three things that can be generated; the new "One large card per generator" requirement keeps the rest of its behavior.
**Migration**: Open a dungeon from its point on the map.

## ADDED Requirements

### Requirement: One large card per generator
The system SHALL serve a home page at `/`. It SHALL present exactly three large
vertical cards - taller than they are wide - a map, a planet and a planetary
system, side by side in three columns, each with an icon, a name and a one-line
description, each with its own pastel background colour, and each leading to
that thing's own page. On a window too narrow for three columns the cards MAY
stack in one. It SHALL NOT present a card for dungeons.

#### Scenario: The root shows three cards in three columns
- **WHEN** a person opens `/` on a wide window
- **THEN** the home page shows a card for the map, one for planets and one for systems, side by side, each taller than it is wide

#### Scenario: Each card has its own pastel colour
- **WHEN** the home page is shown
- **THEN** the three cards have three different pastel background colours

#### Scenario: A card leads to its page
- **WHEN** the person chooses the map, planet or system card
- **THEN** the map, planet or system page opens

#### Scenario: There is no dungeons card
- **WHEN** the home page is shown
- **THEN** no card mentions dungeons
