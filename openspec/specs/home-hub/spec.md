# home-hub Specification

## Purpose
Gives the site a neutral landing page from which a person chooses what to
generate, without generating or loading anything until they choose.

## Requirements

### Requirement: Home page at the root
The system SHALL serve a home page at `/`. It SHALL present, as large,
prominent cards, each thing the site generates: a map, a planet and a
planetary system, each with an icon, a name and a one-line description, and
each leading to that thing's own page. It SHALL also present a card for
dungeons that says they are found on the map and leads to the map.

#### Scenario: The root shows the hub
- **WHEN** a person opens `/`
- **THEN** the home page is shown with a card for the map, one for planets, one for systems and one for dungeons

#### Scenario: A card leads to its page
- **WHEN** the person chooses the map, planet or system card
- **THEN** the map, planet or system page opens

#### Scenario: The dungeons card points to the map
- **WHEN** the person chooses the dungeons card
- **THEN** the map page opens

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
