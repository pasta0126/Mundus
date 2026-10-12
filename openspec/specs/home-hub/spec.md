# home-hub Specification

## Purpose
Gives the site a neutral landing page from which a person chooses what to
generate, without generating or loading anything until they choose.

## Requirements

### Requirement: Nothing is generated on the home page
The home page SHALL NOT request any map, planet, system or point-of-interest
data and SHALL NOT load the code of the map canvas or of the 3D pages, so it
appears at once and generating anything is always a deliberate choice.

#### Scenario: Opening the hub makes no generation request
- **WHEN** the home page is opened
- **THEN** no request is made to any generation API

### Requirement: English text on the home page
Every piece of user-facing text on the home page SHALL be in English.

#### Scenario: All text is English
- **WHEN** the home page is shown
- **THEN** all its labels, descriptions and buttons are in English

### Requirement: The home page is the way between pages
Every page other than the home page SHALL show the "Mundus" title as a link to
the home page, and SHALL NOT offer buttons that lead directly to the other
generator pages (map, planet, system). Choosing what to generate is done on the
home page. A page MAY offer a control that returns to the exact place it was
opened from (a dungeon returns to its map view).

#### Scenario: The title leads home
- **WHEN** a person uses the "Mundus" title on the map, planet, system or dungeon page
- **THEN** the home page opens

#### Scenario: No shortcuts between generator pages
- **WHEN** the map, planet or system page is shown
- **THEN** it offers no buttons to the other generator pages below or beside its panel

### Requirement: A footer link to the About page
The home page SHALL show a small footer with a link to `/about`.

#### Scenario: The footer links to About
- **WHEN** the home page is shown
- **THEN** a footer link to `/about` is visible

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
