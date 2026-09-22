## 1. Cave generation

- [x] 1.1 Implement the tunnel-and-chamber cave layout (chambers joined by winding tunnels, widened by a brush)
- [x] 1.2 Add the quality check (floor share, largest open square, specks, pockets) with the sub-seed attempt loop and a best-attempt fallback
- [x] 1.3 Increment the dungeon spec version
- [x] 1.4 Unit tests over many seeds: floor share, no large open area, no specks or pockets, still connected, final boss farthest, deterministic

## 2. Cave rendering

- [x] 2.1 Build smooth contours of the floor mask on the dungeon canvas and fill them
- [x] 2.2 Add the rock look: inner shadow and rim on the walls, texture on the floor
- [x] 2.3 Check marks and tooltips still line up, and that halls and mazes are unchanged

## 3. Verify and release

- [x] 3.1 Look at caves of every type (cave, skull cave, mine, ice cavern, crystal cave) in the browser and tune the limits
- [x] 3.2 Run backend tests, type check, lint and build
- [x] 3.3 Bump the semver (minor) and tag the commit
