## 1. Foundations

- [x] 1.1 Set up a way to test at the 768px breakpoint, at 360px minimum width, and on a real phone (iOS Safari and Android Chrome)
- [x] 1.2 Add a shared sheet component for panels below the breakpoint and use dynamic viewport units

## 2. Map

- [x] 2.1 Pointer-event drag to pan and pinch/wheel to zoom on the map, sharing the existing zoom steps and URL updates
- [x] 2.2 Tap on a point of interest shows its card; tap elsewhere dismisses; dungeons show an "Enter" control
- [x] 2.3 Fold the map panel, layers and legend into a sheet on narrow screens; enlarge controls to 44 px
- [x] 2.4 Measure load time and memory of a full view on a phone and reduce the window or pixel ratio if needed

## 3. Other pages

- [x] 3.1 Home: single-column cards at narrow widths (verify) and touch-sized targets
- [x] 3.2 Planet and system pages: sheet-style panels, touch rotate/zoom, tap a planet to open it
- [x] 3.3 Dungeon page: fit either orientation, tap marks for their names, sheet-style panel

## 4. Finish

- [x] 4.1 Remove the mobile notice component and every use of it
- [ ] 4.2 Test on iOS Safari and Android Chrome; check no page scrolls sideways at 360 px
- [x] 4.3 Bump the semver (minor) and tag the commit
