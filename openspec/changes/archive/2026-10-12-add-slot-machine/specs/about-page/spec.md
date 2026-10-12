## MODIFIED Requirements

### Requirement: About route
The system SHALL serve an About page at `/about` describing what Mundus is
and listing what it offers (map, planets, systems, dice, slots), in English.

#### Scenario: Opening the About page shows a description
- **WHEN** a person opens `/about`
- **THEN** a page is shown describing Mundus and its map, planet, system, dice and slot machine features, in English

### Requirement: A feature guide per page
The About page SHALL present one section for each of the map, dungeons,
planet, system, dice and slot machine pages, each briefly listing the
features and functions available on that page and linking to it.

#### Scenario: Every page has its own section
- **WHEN** a person reads the About page
- **THEN** there is a section for the map, dungeons, planets, systems, dice and slots, each listing what a person can do there

#### Scenario: A section leads to its page
- **WHEN** a person uses a section's link
- **THEN** that page opens (dungeons, which are entered from the map, link to the map)
