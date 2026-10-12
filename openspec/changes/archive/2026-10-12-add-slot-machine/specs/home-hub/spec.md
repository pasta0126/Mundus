## ADDED Requirements

### Requirement: Three vertical cards above two horizontal cards
The system SHALL serve a home page at `/`. It SHALL present exactly five cards. The first row SHALL hold three large vertical cards - taller than they are wide - a map, a planet and a planetary system, side by side in three columns. A second row SHALL hold two horizontal cards - wider than they are tall - a dice tray and a slot machine, side by side, together filling the full width of the three cards above, each taking half of it. Every card SHALL have an icon, a name and a one-line description, its own pastel background colour, and SHALL lead to that thing's own page. On a window too narrow for three columns the cards MAY stack in one. It SHALL NOT present a card for dungeons.

#### Scenario: The root shows three cards above two
- **WHEN** a person opens `/` on a wide window
- **THEN** the home page shows the map, planet and system cards side by side, each taller than it is wide, and below them the dice and slot machine cards side by side, each wider than it is tall

#### Scenario: The second row spans the width of the first
- **WHEN** the home page is shown on a wide window
- **THEN** the dice and slot machine cards together span the same width as the three cards above

#### Scenario: Each of the five cards has its own pastel colour
- **WHEN** the home page is shown
- **THEN** the five cards have five different pastel background colours

#### Scenario: A card leads to its page
- **WHEN** the person chooses the map, planet, system, dice or slot machine card
- **THEN** the map, planet, system, dice or slot machine page opens

#### Scenario: There is still no dungeons card
- **WHEN** the home page is shown
- **THEN** no card mentions dungeons

## REMOVED Requirements

### Requirement: One large card per generator, including the dice tray
**Reason**: The hub gains a slot machine card and changes from four vertical cards in one row to three vertical cards above two horizontal cards.
**Migration**: Replaced by "Three vertical cards above two horizontal cards", which keeps the per-card icon, name, description, pastel colour and destination, and still presents no dungeons card.
