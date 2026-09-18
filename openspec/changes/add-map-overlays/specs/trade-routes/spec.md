## Purpose

Generates seed-deterministic routes connecting settlements and rendered as
dotted lines, so a map can suggest trade and travel between places without
needing named routes yet.

## ADDED Requirements

### Requirement: Deterministic route generation
Given a seed, the set of routes (each route's endpoints and path) SHALL be
byte-identical on every invocation, on any machine, indefinitely. Changing
the seed MAY change the routes. A route's path SHALL NOT depend on which
window it is later requested through.

#### Scenario: Same seed always yields the same routes
- **WHEN** routes are computed twice for the same seed over the same world
  region
- **THEN** every route's endpoints and path are identical both times

#### Scenario: A route segment renders identically regardless of window
- **WHEN** the same stretch of a route falls within two different requested
  windows for the same seed
- **THEN** that stretch's rendered path is identical in both

### Requirement: Routes connect settlement or seaport points of interest
Every route's two endpoints SHALL each be a settlement-category point of
interest (village, city, or seaport - see `points-of-interest`), so routes
read as travel/trade links between places rather than arbitrary lines.

#### Scenario: A route's endpoints are settlements
- **WHEN** a generated route is inspected
- **THEN** both of its endpoints coincide with a village, city, or seaport
  point of interest

### Requirement: Routes render as dotted lines
A route SHALL render as a dotted line (evenly spaced dots along its path),
visually distinct from rivers (solid) and region borders (thin solid, in
a different color) by dot pattern alone.

#### Scenario: A route is visually distinct from a region border
- **WHEN** a route and a region border are both rendered in the same view
- **THEN** the route is drawn with a dotted stroke and the border with a
  solid stroke

### Requirement: Trade routes render as a toggleable layer
Routes SHALL be hidden entirely when the trade-routes layer is hidden (see
`map-layers`).

#### Scenario: Hiding the layer removes all routes
- **WHEN** a user hides the trade-routes layer
- **THEN** no route is rendered anywhere in the current view
