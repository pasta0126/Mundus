# about-page Specification

## Purpose
Gives Mundus a page that explains what it is and offers, and gives the site
shareable metadata so a link to it previews meaningfully elsewhere.

## Requirements

### Requirement: About route
The system SHALL serve an About page at `/about` describing what Mundus is
and listing what it offers (map, planets, systems, dice), in English.

#### Scenario: Opening the About page shows a description
- **WHEN** a person opens `/about`
- **THEN** a page is shown describing Mundus and its map, planet, system and dice features, in English

### Requirement: Shareable site metadata
The site SHALL declare a meta description and Open Graph/Twitter Card tags
(title, description, image) in its HTML head, so a shared link to the site
shows a meaningful preview (title, description and image) in chat apps,
social media and search results.

#### Scenario: A shared link shows a preview
- **WHEN** a link to the site is shared on a platform that reads Open Graph or Twitter Card tags
- **THEN** the preview shows a title, a description and an image for Mundus
