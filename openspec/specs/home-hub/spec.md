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
