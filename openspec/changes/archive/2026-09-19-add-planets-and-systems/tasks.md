## 1. Seed handling and contracts (backend)

- [x] 1.1 Add a seed normalizer to `Mundus.Core` (trim, collapse whitespace, invariant lower case, NFC, non-empty, max length) with unit tests for equivalent and rejected seeds
- [x] 1.2 Define the planet and system description types with their own `SpecVersion` constants

## 2. Planet generation (backend)

- [x] 2.1 Implement type selection, palette, radius, name, and descriptive text from the seed
- [x] 2.2 Implement surface parameters (texture seed and bounded geographic singularities per type)
- [x] 2.3 Implement atmosphere and clouds (gas giants always have an atmosphere; no atmosphere means no clouds)
- [x] 2.4 Implement optional rings and optional asteroid field
- [x] 2.5 Implement 0-3 moons with orbits, and the planet's spin (rotation period, axial tilt)
- [x] 2.6 Unit tests: same seed identical, different seeds differ, moon and cloud rules, bounded counts

## 3. System generation (backend)

- [x] 3.1 Implement the central group (1 or 2 bodies, a black hole always alone, kinds, sizes, colors, orbits around the common center)
- [x] 3.2 Implement 1-8 planet slots with `<seed>/<n>` planet seeds and outward-ordered orbits derived from (seed, index)
- [x] 3.3 Implement inclinations (mostly coplanar, occasional inclined orbit)
- [x] 3.4 Implement the optional single asteroid belt between two neighboring slots
- [x] 3.5 Implement custom systems (central seed, explicit planet list of 1-8, optional belt index) reusing the same derivation
- [x] 3.6 Unit tests: same seed identical, slot seeds equal standalone planets, custom equals generated, at most one belt, limits enforced

## 4. HTTP API

- [x] 4.1 Add `GET /api/planets?seed=` returning the description with its spec version, and 400 for invalid seeds
- [x] 4.2 Add `GET /api/systems?seed=` with optional `planets=` and `belt=` returning the description with its spec version, and 400 for invalid input or more than eight planets
- [x] 4.3 Regenerate the frontend API types (`npm run generate:api-types`)

## 5. Frontend foundation

- [x] 5.1 Add the `three` dependency and lazy-load the 3D code for the new routes only
- [x] 5.2 Add routing for `/planets` and `/systems` reading the seed from the URL, with an error state for invalid seeds
- [x] 5.3 Add the entry buttons on the map page, and matching buttons on the planet and system pages so all three link to each other in the same style
- [x] 5.4 Add the pronounceable random-name generator and the random control

## 6. Planet view

- [x] 6.1 Draw the sphere with a procedural low-detail surface texture from palette, texture seed, and singularities
- [x] 6.2 Add the cloud layer, rings, and asteroid field
- [x] 6.3 Animate the planet's spin (period and tilt) and the moons' slow orbits
- [x] 6.4 Add drag-to-rotate and wheel zoom
- [x] 6.5 Add the planet sheet (name, type, description, features)
- [x] 6.6 Add loading and error feedback

## 7. System view

- [x] 7.1 Draw the central group, planets, belt, and orbit lines in 3D, including inclined orbits
- [x] 7.2 Animate bodies as a pure function of time, starting from the deterministic initial positions
- [x] 7.3 Add drag-to-rotate and wheel zoom
- [x] 7.4 Add click-a-planet to open its sheet and 3D model, with a way back to the system
- [x] 7.5 Add the custom system form (central seed, up to eight planet seeds, optional belt) reflected in the URL

## 8. Release

- [x] 8.1 Verify all new user-facing text is English and the map page is unchanged
- [x] 8.2 Run backend tests and the frontend build and lint
- [x] 8.3 Bump the semver in `package.json` and tag the commit `vX.Y.Z` per the versioning workflow

## 9. Copy seed and description

- [x] 9.1 Add a "Copy seed" control under the seed and a "Copy specs" control under the specifications on the planet page, the system page, and an opened planet of a system, with confirmation and a refusal message
