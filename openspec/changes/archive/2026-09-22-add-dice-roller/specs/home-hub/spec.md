## REMOVED Requirements

### Requirement: One large card per generator
**Reason**: Replaced by "One large card per generator, including the dice
tray", which keeps the same card layout and behavior but adds a fourth
card so the dice tray is reachable from the hub too.
**Migration**: No user-facing migration; the map, planet and system cards
keep their existing behavior under the requirement below.

## ADDED Requirements

### Requirement: One large card per generator, including the dice tray
The system SHALL serve a home page at `/`. It SHALL present exactly four
large vertical cards - taller than they are wide - a map, a planet, a
planetary system and a dice tray, side by side in four columns, each with an
icon, a name and a one-line description, each with its own pastel background
colour, and each leading to that thing's own page. On a window too narrow
for four columns the cards MAY stack in one. It SHALL NOT present a card for
dungeons.

#### Scenario: The root shows four cards in four columns
- **WHEN** a person opens `/` on a wide window
- **THEN** the home page shows a card for the map, one for planets, one for systems and one for the dice tray, side by side, each taller than it is wide

#### Scenario: Each card has its own pastel colour
- **WHEN** the home page is shown
- **THEN** the four cards have four different pastel background colours

#### Scenario: A card leads to its page
- **WHEN** the person chooses the map, planet, system or dice card
- **THEN** the map, planet, system or dice page opens

#### Scenario: There is no dungeons card
- **WHEN** the home page is shown
- **THEN** no card mentions dungeons
