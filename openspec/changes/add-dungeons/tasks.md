## 1. Catalog and dungeon flag (backend)

- [x] 1.1 Add a dungeon marking (style and probability) to `PoiEntry` and mark cave, skull-cave, crystal-cave, ice-cavern, mine, ruins, hidden-temple, wizard-tower, dragon, dark-castle and hedge-maze; no id, artwork or placement changes
- [x] 1.2 Add the independent per-point roll from `"{seed}:dungeon:{x}:{y}:{type}"` and a nullable dungeon style on `PointOfInterest`
- [x] 1.3 Unit tests: existing points unchanged, roll agrees across overlapping windows, dragons always hold one, some caves do not

## 2. Dungeon catalog and generator (backend)

- [x] 2.1 Add the boss and treasure catalogs (id, label, description, rarity, allowed styles) with frozen ids matching the artwork file names in `frontend/src/assets/dungeon/`, and a dungeon spec version
- [x] 2.1b Add a catalog test that every boss, treasure and style id has an image in `assets/dungeon/` and that every image is a catalog id or a shared mark (`entrance`, `boss`, `final-boss`, `dungeon-badge`)
- [x] 2.2 Implement the cave layout (cellular automaton, largest region kept)
- [x] 2.3 Implement the halls layout (BSP rooms and corridors)
- [x] 2.4 Implement the maze layout (perfect maze) and the type-to-style mapping
- [x] 2.5 Place the entrance, run the distance search, drop unreachable cells, place the final boss, lesser bosses and treasures
- [x] 2.6 Unit tests: determinism, reachability, one entrance, boss farthest, dragon boss, maze has one path, treasure count and rarity balance

## 3. HTTP API

- [x] 3.1 Add `GET /api/dungeons?seed=&x=&y=&type=` returning the dungeon (compact grid rows) with 400 for missing/invalid input or a type that cannot hold a dungeon
- [x] 3.2 Regenerate the frontend API types (`npm run generate:api-types`)

## 4. Map: badge, tooltip and click (frontend)

- [x] 4.1 Draw the `dungeon-badge` "!" on dungeon points, following the icon's category visibility
- [x] 4.2 Add the dungeon line to the tooltip
- [x] 4.3 Add click handling with a press-to-release movement threshold, reusing the hover hit list, and the pointer cursor over dungeons; navigate to `/dungeons` with map seed, x, y, type and zoom

## 5. Dungeon page (frontend)

- [x] 5.1 Add the lazy `/dungeons` route and page shell (URL parsing, errors, loading, touch notice, navigation row with a Map button back to the point)
- [x] 5.2 Draw the dungeon on a canvas scaled to fit: walls, floors, and the `entrance`, treasure, boss and `final-boss` icons from `assets/dungeon/` (final boss distinct), with hover tooltips
- [x] 5.3 Add the legend, the sheet and the copy-source and copy-JSON controls

## 6. Verify and release

- [x] 6.1 Run the backend tests and the frontend lint and build
- [x] 6.2 Manually check: badge and tooltip, click into a dungeon and back to the same map view, reload reproduces the dungeon, a plain drag never opens one
- [ ] 6.3 Update the README, bump the semver (minor) and tag the commit `vX.Y.Z`
