# about-page Specification

## Purpose
Gives Mundus a page that explains what it is and offers, and gives the site
shareable metadata so a link to it previews meaningfully elsewhere.

## Requirements

### Requirement: About route
The system SHALL serve an About page at `/about` describing what Mundus is
and listing what it offers (map, planets, systems, dice, slots), in English.

#### Scenario: Opening the About page shows a description
- **WHEN** a person opens `/about`
- **THEN** a page is shown describing Mundus and its map, planet, system, dice and slot machine features, in English

### Requirement: Shareable site metadata
The site SHALL declare a meta description and Open Graph/Twitter Card tags
(title, description, image) in its HTML head, so a shared link to the site
shows a meaningful preview (title, description and image) in chat apps,
social media and search results.

#### Scenario: A shared link shows a preview
- **WHEN** a link to the site is shared on a platform that reads Open Graph or Twitter Card tags
- **THEN** the preview shows a title, a description and an image for Mundus

### Requirement: Project introduction and author
The About page SHALL open with a short explanation of what Mundus is and
SHALL state who made it and where they are based.

#### Scenario: A visitor learns what Mundus is and who made it
- **WHEN** a person opens `/about`
- **THEN** the page explains what Mundus is, names its author and says where the author is based

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

### Requirement: Touch support is mentioned
The About page SHALL state that every page works on phones and tablets.

#### Scenario: Mobile support is stated
- **WHEN** a person reads the About page
- **THEN** it says Mundus works on touch devices
