## REMOVED Requirements

### Requirement: Routes and entry link
**Reason**: Its navigation row, one button for every other page, is dropped: pages are reached through the home page (see `home-hub`). Its route and seed behavior continue in "Planet and system routes".
**Migration**: Use the "Mundus" title, which links to the home page, and choose from there.

## ADDED Requirements

### Requirement: Planet and system routes
The system SHALL serve a planet page at `/planets` and a system page at
`/systems`, each taking its seed from the URL so that reloading or sharing the
URL reproduces the same view. An invalid seed in the URL SHALL show a clear
error rather than a blank page.

#### Scenario: A URL reproduces the view
- **WHEN** a person opens a planet or system URL that includes a seed
- **THEN** the same planet or system is shown as for anyone else opening that URL

#### Scenario: An invalid seed shows an error
- **WHEN** a person opens a URL whose seed is rejected as invalid
- **THEN** an error message is shown
