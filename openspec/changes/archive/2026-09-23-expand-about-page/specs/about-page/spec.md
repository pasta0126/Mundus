## ADDED Requirements

### Requirement: Project introduction and author
The About page SHALL open with a short explanation of what Mundus is and
SHALL state who made it and where they are based.

#### Scenario: A visitor learns what Mundus is and who made it
- **WHEN** a person opens `/about`
- **THEN** the page explains what Mundus is, names its author and says where the author is based

### Requirement: A feature guide per page
The About page SHALL present one section for each of the map, dungeons,
planet, system and dice pages, each briefly listing the features and
functions available on that page and linking to it.

#### Scenario: Every page has its own section
- **WHEN** a person reads the About page
- **THEN** there is a section for the map, dungeons, planets, systems and dice, each listing what a person can do there

#### Scenario: A section leads to its page
- **WHEN** a person uses a section's link
- **THEN** that page opens (dungeons, which are entered from the map, link to the map)

### Requirement: Touch support is mentioned
The About page SHALL state that every page works on phones and tablets.

#### Scenario: Mobile support is stated
- **WHEN** a person reads the About page
- **THEN** it says Mundus works on touch devices
