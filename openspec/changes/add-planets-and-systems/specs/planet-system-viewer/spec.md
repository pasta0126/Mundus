## Purpose
Let a person look at generated planets and planetary systems as rotatable 3D
scenes, reached from their own routes, with every view reproducible from its
URL.

## ADDED Requirements

### Requirement: Routes and entry link
The system SHALL serve a planet page at `/planets` and a system page at
`/systems`, each taking its seed from the URL so that reloading or sharing
the URL reproduces the same view. The existing map page SHALL offer a link to
the new pages, presented in the same spirit as its phone notice. An invalid
seed in the URL SHALL show a clear error rather than a blank page.

#### Scenario: A URL reproduces the view
- **WHEN** a person opens a planet or system URL that includes a seed
- **THEN** the same planet or system is shown as for anyone else opening that URL

#### Scenario: The map page links to the new pages
- **WHEN** the map page is shown
- **THEN** it offers a link that opens the planet and system pages

#### Scenario: An invalid seed shows an error
- **WHEN** a person opens a URL whose seed is rejected as invalid
- **THEN** an error message is shown

### Requirement: Random name
Both pages SHALL offer a control that picks a new, random, pronounceable name
as the seed and shows the resulting planet or system. The name is the seed
and SHALL appear in the URL.

#### Scenario: Random picks a new pronounceable seed
- **WHEN** the random control is used
- **THEN** a new pronounceable name becomes the seed, appears in the URL, and its planet or system is shown

### Requirement: Planet view
The planet page SHALL show the planet as a 3D sphere covered by its surface
texture, drawn only from the planet's description. It SHALL show a cloud layer
if the planet has an atmosphere, its rings and asteroid field if any, and its
moons. The planet SHALL turn on its own axis at its deterministic rotation
period and axial tilt; its moons SHALL orbit slowly around it. The person
SHALL be able to rotate the view by dragging and zoom with the mouse wheel.
The planet SHALL NOT orbit any star in this view.

#### Scenario: A planet turns and its moons orbit
- **WHEN** a planet page is shown
- **THEN** the planet turns on its own axis and any moons orbit it

#### Scenario: The view can be rotated and zoomed
- **WHEN** the person drags on the view or uses the mouse wheel
- **THEN** the view rotates or zooms accordingly

#### Scenario: Clouds only with an atmosphere
- **WHEN** a planet has no atmosphere
- **THEN** no cloud layer is drawn

### Requirement: Planet sheet
Every planet view SHALL show a sheet with its name, type, descriptive text,
and its notable features (atmosphere, rings, asteroid field, moon count).

#### Scenario: The sheet describes the planet
- **WHEN** a planet is shown
- **THEN** its sheet lists its name, type, description, and features

### Requirement: System view
The system page SHALL show the system as a 3D scene: its central group
orbiting the common center, its planets on their orbits (including any
inclined ones), its belt if any, and each orbit drawn as a line. Bodies
SHALL start at their deterministic initial positions and then keep orbiting.
The person SHALL be able to rotate the view by dragging and zoom with the
mouse wheel.

#### Scenario: The system starts from deterministic positions and then moves
- **WHEN** a system page is shown
- **THEN** bodies begin at their deterministic initial positions and then orbit

#### Scenario: Inclined orbits are visible
- **WHEN** a system has a planet on an inclined orbit
- **THEN** that planet's orbit and motion are drawn in its own plane

### Requirement: Opening a planet from a system
Clicking a planet in the system view SHALL open that planet's sheet and 3D
model, and SHALL offer a way back to the system.

#### Scenario: Click opens the planet and back returns
- **WHEN** the person clicks a planet in the system view
- **THEN** that planet's sheet and 3D model are shown
- **AND** a control returns to the system view

### Requirement: Custom system input
The system page SHALL let a person build a custom system: enter a central
seed, add and remove planet seeds (up to eight), and optionally place a belt.
The result SHALL be reflected in the URL, so sharing the URL shares the
custom system, with nothing saved on a server.

#### Scenario: A custom system is shared by URL
- **WHEN** a person builds a custom system and copies the page URL
- **THEN** opening that URL elsewhere shows the same custom system

#### Scenario: The planet limit is enforced
- **WHEN** the person tries to add a ninth planet seed
- **THEN** it is refused

### Requirement: Copy seed and specs
Both pages SHALL let the person copy the seed of what is shown and its full
specifications as JSON, each with its own control: a "Copy seed" control
placed directly below the seed, and a "Copy specs" control placed directly
below the specifications. For a planet the specifications are its planetary
information; for a system they are its configuration, including its central
bodies, orbits, belt, and every planet in it. The specifications SHALL
leave out details that exist only to draw a planet (its surface features and
texture seed) and anything repeated inside them (a system's slot does not
repeat its planet's seed, which its planet already carries). When a planet of a system is
open, it SHALL carry its own two controls, the seed control directly below its
name and the specs control below its sheet, and they SHALL copy that planet's
seed and specifications. Copying SHALL give visible confirmation, and a clear
message if the browser refuses.

#### Scenario: A planet's seed and specs can be copied
- **WHEN** the person uses the copy controls on a planet page
- **THEN** the planet's seed, or its full specifications as JSON, is on the clipboard and a confirmation is shown

#### Scenario: A system's seed and specs can be copied
- **WHEN** the person uses the copy controls on a system page
- **THEN** the system's seed, or its full configuration with its central bodies and planets as JSON, is on the clipboard

#### Scenario: Drawing details and repeated seeds are not copied
- **WHEN** the person copies the specs of a planet or of a system
- **THEN** the copied JSON has no surface features or texture seed for any planet, and no slot repeats its planet's seed

#### Scenario: Each control sits under what it copies
- **WHEN** a planet or system page is shown
- **THEN** the seed control is directly below the seed and the specs control is directly below the specifications

#### Scenario: A planet opened from a system copies that planet
- **WHEN** a planet of a system is open and the person uses its copy controls
- **THEN** that planet's seed or specifications are copied, not the system's

#### Scenario: A refused copy is reported
- **WHEN** the browser refuses clipboard access
- **THEN** a message says the copy did not work

### Requirement: Loading and error feedback
The pages SHALL show progress while a planet or system is being fetched and a
clear message if fetching fails, so the person is never left without an
indication of what is happening.

#### Scenario: Progress and failure are visible
- **WHEN** a planet or system is being fetched, or the fetch fails
- **THEN** a progress indicator or an error message is shown

### Requirement: English text
Every piece of user-facing text on the new pages SHALL be in English.

#### Scenario: All new text is English
- **WHEN** any of the new pages is shown
- **THEN** all its labels, buttons, and messages are in English
