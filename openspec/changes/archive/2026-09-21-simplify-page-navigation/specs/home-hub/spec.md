## ADDED Requirements

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
