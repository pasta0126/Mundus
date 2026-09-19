## Why

Mundus generates deterministic 2D maps, but its README promises "worlds,
universes, maps, and regions". Planets and planetary systems are the next
scale up: a person should be able to type a name and get the same planet or
system every time, view it in 3D, and share it as a link. Planets need no
per-cell detail (one texture, one biome), so they are cheap to add without
touching the map engine.

## What Changes

- Add deterministic **planet generation**: a text seed yields one planet
  (type, palette, radius, atmosphere and clouds, rings, own asteroid
  field, 0-3 moons, axial tilt and spin) as a small JSON description.
- Add deterministic **system generation**: a text seed yields a central
  group of one or two bodies (stars, or a lone compact object), 1-8 planet slots (each with
  its own planet seed and orbit), and at most one asteroid belt. Orbits are
  mostly coplanar, with an occasional inclined one.
- Add a **custom system** mode: a central seed plus an explicit list of
  planet seeds (and an optional belt), encoded entirely in the URL. No
  database, no server-side state.
- Add a **standalone planet** mode: any planet seed can be viewed on its
  own, identical to the same seed inside a system.
- Add a **3D viewer**: a rotatable, zoomable planet view (self-rotating
  planet, slowly orbiting moons) and an animated system view (deterministic
  initial positions, then orbiting) where clicking a planet opens its sheet
  and model.
- Add routes `/planets` and `/systems` plus an entry link from the map page,
  in the same spirit as the phone notice. Galaxies are out of scope; only a
  future outbound link is anticipated.
- Nothing about maps, regions, layers, or points of interest changes.

## Capabilities

### New Capabilities
- `planet-generation`: seed normalization and hashing, and the
  deterministic description of a single planet, including versioning.
- `system-generation`: deterministic central group, planet slots and orbits,
  optional asteroid belt, derivation of per-planet seeds, and the URL
  encoding of a custom system.
- `planet-system-viewer`: the `/planets` and `/systems` pages, the 3D planet
  and system views with their animation and controls, the planet sheet, the
  random-name button, and the entry link from the map page.

### Modified Capabilities

None. No requirement of an existing capability changes.

## Impact

- **Backend**: new generation code in `Mundus.Core` (no ASP.NET/EF Core
  dependencies), new controllers in `Mundus.Api` for planets and systems,
  new xUnit tests in `Mundus.Core.Tests`. No database or migration changes.
- **Frontend**: new `three` dependency (with its orbit controls), a small
  page switch or router for `/planets` and `/systems`, new views, a link on
  the existing page, and regenerated API types.
- **Deploy**: `nginx.conf` already falls back to `index.html`, so new routes
  need no proxy change. Every deploy still bumps semver and tags the commit.
- **Contract**: planet and system generation get their own `SpecVersion`;
  changing either later is a breaking change to what a given seed means.
