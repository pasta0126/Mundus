## ADDED Requirements

### Requirement: The map is served at its own route
The system SHALL serve the map page at `/maps`. The root `/` SHALL NOT show
the map (see `home-hub`).

#### Scenario: The map opens at /maps
- **WHEN** a person opens `/maps`
- **THEN** the map page is shown

### Requirement: The map view is kept in the URL
The map page SHALL take its view from the URL - `/maps?seed=&x=&y=&zoom=`,
where `seed` is the map's seed, `x` and `y` are the world coordinate at the
centre of the view and `zoom` is the number of one of the
documented zoom steps, as shown on the zoom indicator - so that reloading or sharing the URL reproduces the
same view, as the planet and system pages do. Whenever the seed, centre or
zoom changes (Regenerate, going to a coordinate, panning, zooming), the URL
SHALL be updated to match without adding a history entry for each change. A
missing or malformed `x`, `y` or `zoom` SHALL fall back to `(0, 0)` and the
default zoom respectively. A seed the map generation rejects as invalid SHALL
show a clear error rather than a blank page.

#### Scenario: A URL reproduces the view
- **WHEN** a person opens `/maps` with a seed, a centre and a zoom
- **THEN** the same view is shown as for anyone else opening that URL

#### Scenario: Moving updates the URL
- **WHEN** a person pans, zooms, jumps to a coordinate or regenerates
- **THEN** the URL shows the new seed, centre and zoom, and the browser's back button does not step through each change

#### Scenario: Malformed view parameters fall back to defaults
- **WHEN** the URL has a seed but a non-numeric `x` or a `zoom` that is not one of the documented steps
- **THEN** the view is centred on `(0, 0)` or at the default zoom for the missing values, and the seed is honored

## MODIFIED Requirements

### Requirement: Automatic generation on load
On load of the map page (`/maps`), the system SHALL immediately request the
window for the view named by the URL from the `map-generation` API, without
requiring any user input. When the URL carries no seed, it SHALL use a
randomly generated seed, centre the view on `(0, 0)` at the default zoom, and
write that seed into the URL. No seed, position, or other parameter is
collected from the user beforehand. Opening any other page, including the
home page, SHALL NOT generate a map.

#### Scenario: Loading the page generates a map without user input
- **WHEN** the map page (`/maps`) loads with no seed in the URL
- **THEN** exactly one window request is made for a window centered on
  `(0, 0)` using a freshly generated random seed, that seed appears in the
  URL, and the rendered result reflects the response once it arrives

#### Scenario: Loading the map page with a seed reproduces that view
- **WHEN** `/maps` loads with a seed in the URL
- **THEN** the window requested is the one for that seed, centre and zoom, not a random one

#### Scenario: A failed initial generation is shown, not silently dropped
- **WHEN** the automatic initial map-generation request fails
- **THEN** the user is shown that generation failed, with a way to
  retry

### Requirement: Jumping to a specific coordinate
After a window is rendered, the system SHALL let the user enter a
specific `x`/`y` world coordinate and jump directly there: the current
zoom step's full viewport-covering window SHALL be recalculated,
centered on the entered coordinate, using the same seed. This is
independent of panning (which shifts by a fixed step) and of the
default starting position (which SHALL remain `(0, 0)` on Regenerate, and on
initial load when the URL names no centre).

#### Scenario: Going to a coordinate recenters the view there
- **WHEN** a user, after viewing a generated window, enters an `x` and a
  `y` value and confirms
- **THEN** a new window request is made for the same seed and the
  current zoom step's cell size, centered on the entered coordinate,
  and the canvas updates to show the response

#### Scenario: Going to a coordinate preserves the seed and zoom step
- **WHEN** a user jumps to a coordinate
- **THEN** the seed and the on-screen cell size used for the new window
  request are unchanged from the current view

#### Scenario: Initial load and Regenerate still default to the origin
- **WHEN** the map page loads with no centre in its URL, or a user chooses "Regenerate"
- **THEN** the resulting window is centered on `(0, 0)`, regardless of
  any coordinate previously jumped to
