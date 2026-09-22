## Purpose

Makes every page of Mundus usable on a phone or tablet: it fits the screen, it
can be operated by touch, and everything hover shows is reachable by tapping.

## ADDED Requirements

### Requirement: Pages fit a phone screen
Every page SHALL be usable at a viewport width of 360 CSS pixels without
horizontal scrolling of the page. On a narrow screen a page's panels SHALL NOT
cover more than a small part of the content: they SHALL be folded away by
default or shown as a sheet the person opens and closes, and SHALL NOT overlap
each other. The home page's cards SHALL stack in one column.

#### Scenario: No sideways scroll on a phone
- **WHEN** any page is opened at 360 px wide
- **THEN** the page does not scroll horizontally

#### Scenario: A panel does not hide the content
- **WHEN** the map, planet, system or dungeon page is opened on a narrow screen
- **THEN** the content is visible and the panel is folded away or a sheet that can be opened and closed

### Requirement: The map responds to touch gestures
The map SHALL be panned by dragging with a finger or a mouse and zoomed by
pinching (and by the mouse wheel), moving through the same documented zoom steps
as the zoom buttons and updating the URL as they do. A press that moves is a drag
and SHALL NOT be treated as a tap. The pan and zoom buttons SHALL remain.

#### Scenario: Dragging pans the map
- **WHEN** the person drags across the map
- **THEN** the view moves by the distance dragged and the URL follows

#### Scenario: Pinching zooms the map
- **WHEN** the person pinches out or in on the map
- **THEN** the map moves to the next zoom step in that direction

### Requirement: Hover details are available by tapping
Everything that shows a name or description on hover - a point of interest, a
mark on a dungeon plan (entrance, treasure, boss) - SHALL show the same
information when tapped, and SHALL hide it when the person taps elsewhere. Tapping
SHALL never require hover.

#### Scenario: Tapping an icon shows what it is
- **WHEN** the person taps a point of interest on a touch screen
- **THEN** its name and description are shown until they tap elsewhere

#### Scenario: Tapping a dungeon mark names it
- **WHEN** the person taps a treasure, boss or the entrance on a dungeon plan
- **THEN** its name and description are shown

### Requirement: Entering a dungeon takes a deliberate tap
On a touch screen a dungeon SHALL be entered by tapping its icon once to show its
details and then tapping its "Enter" control (or the icon again), so that a stray
tap or the end of a drag never opens a dungeon. The pointer behavior on a computer
is unchanged.

#### Scenario: One tap shows, a second enters
- **WHEN** the person taps a dungeon icon once
- **THEN** its details are shown and the dungeon has not opened
- **WHEN** they then use the "Enter" control
- **THEN** the dungeon opens

### Requirement: Touch-sized controls
Every button, input and link SHALL have a touch target of at least 44 by 44 CSS
pixels on a touch-first device, with enough space between neighbouring controls
that a finger does not hit the wrong one.

#### Scenario: Controls are big enough
- **WHEN** any page is shown on a touch-first device
- **THEN** every interactive control measures at least 44 by 44 CSS pixels

### Requirement: The 3D and dungeon views respond to touch
On the planet and system pages a finger drag SHALL rotate the view and a pinch
SHALL zoom it, and tapping a planet in a system SHALL open it. The dungeon plan
SHALL fit the screen in either orientation.

#### Scenario: A finger rotates a planet
- **WHEN** the person drags a finger on the planet page
- **THEN** the view rotates

#### Scenario: Tapping a planet opens it
- **WHEN** the person taps a planet on the system page
- **THEN** that planet's sheet and model are shown
