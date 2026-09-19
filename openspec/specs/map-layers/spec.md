# map-layers Specification

## Purpose
Lets a person independently show or hide every optional map overlay (compass
rose, each points-of-interest category, region borders) from one place, and
guarantees that a downloaded map image reflects exactly the overlays
currently visible on screen.

## Requirements

### Requirement: Independent layer visibility toggles
The system SHALL expose one toggle per overlay layer - the compass rose,
each points-of-interest category (see `points-of-interest`), and region
borders - each of which SHALL show or hide only that layer, without
affecting the biome grid or any other layer's visibility.

#### Scenario: Hiding one layer leaves others untouched
- **WHEN** a user hides the region-borders layer while the compass rose is
  visible
- **THEN** region borders are no longer rendered on the canvas, while the
  compass rose remains rendered exactly as before

#### Scenario: Each points-of-interest category toggles independently
- **WHEN** a user hides the "settlements" points-of-interest category
- **THEN** settlement icons stop rendering, while icons from every other
  points-of-interest category continue to render

### Requirement: A documented default visibility per layer
Each overlay layer SHALL have a documented default visibility (shown or
hidden) applied on initial page load, so first-time users see a consistent,
intentional presentation rather than an arbitrary one.

#### Scenario: Initial load matches the documented defaults
- **WHEN** the page loads and a map is generated for the first time in a
  session
- **THEN** each overlay layer's visibility matches its documented default

### Requirement: Layer visibility persists across pan, zoom, and coordinate jumps
Toggling a layer SHALL NOT be reset by panning, zooming, or jumping to a
coordinate; only a full page reload or an explicit user action resets
layers to their documented defaults.

#### Scenario: Panning preserves layer visibility
- **WHEN** a user hides a layer and then pans the viewport
- **THEN** the layer remains hidden in the newly rendered view

### Requirement: Downloaded image matches visible layers
The system SHALL redefine "Download" (see `map-creation-wizard`) so the
saved PNG image includes the biome grid plus every overlay layer currently
visible on screen, and excludes every overlay layer currently hidden.

#### Scenario: A hidden layer is absent from the download
- **WHEN** a user hides the region-borders layer and then chooses "Download"
- **THEN** the saved image does not contain any region-border lines

#### Scenario: A visible layer is present in the download
- **WHEN** a user has the compass rose and settlements layers visible and
  chooses "Download"
- **THEN** the saved image contains the compass rose and the settlement
  icons, positioned as they appear on screen

### Requirement: A hidden layer's icons are neither drawn nor hoverable
An icon whose layer is hidden SHALL NOT be drawn and SHALL NOT show its
name on hover (see `points-of-interest`); the legend lists biomes only, so
no legend entry depends on layer visibility.

#### Scenario: Hiding a category removes its icons and their tooltips
- **WHEN** a user hides the "sea & islands" points-of-interest category
- **THEN** that category's icons are no longer drawn and hovering where one
  was shows nothing
