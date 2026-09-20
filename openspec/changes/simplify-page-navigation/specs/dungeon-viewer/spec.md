## MODIFIED Requirements

### Requirement: Returning to the map
The page SHALL offer a control that returns to the map at `/maps`, with the same
seed and centred on the dungeon's point, at the zoom the person came from when
the URL carries it. The page SHALL NOT offer buttons to the other generator
pages; its "Mundus" title leads to the home page.

#### Scenario: Back to the same map
- **WHEN** a person uses the map control on a dungeon page
- **THEN** the map opens with the dungeon's map seed, centred on the dungeon's point
