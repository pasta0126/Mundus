## MODIFIED Requirements

### Requirement: Routes and entry link
The system SHALL serve a planet page at `/planets` and a system page at
`/systems`, each taking its seed from the URL so that reloading or sharing
the URL reproduces the same view. The map page (`/maps`) and the home page
(`/`) are served alongside them. Every page SHALL offer the same style of
navigation: white buttons with an icon and a label, in a row below the
panel, one for each of the other pages (the home page, the map, the planet
page, the system page), so a person can move between all of them. An invalid
seed in the URL SHALL show a clear error rather than a blank page.

#### Scenario: A URL reproduces the view
- **WHEN** a person opens a planet or system URL that includes a seed
- **THEN** the same planet or system is shown as for anyone else opening that URL

#### Scenario: The map page links to the new pages
- **WHEN** the map page is shown
- **THEN** it offers buttons below its panel that open the home page, the planet page and the system page

#### Scenario: Every page links to the other two
- **WHEN** the planet page or the system page is shown
- **THEN** buttons below its panel, in the same style as the map page's, open the home page, the map (at `/maps`) and the other of the two pages

#### Scenario: An invalid seed shows an error
- **WHEN** a person opens a URL whose seed is rejected as invalid
- **THEN** an error message is shown
