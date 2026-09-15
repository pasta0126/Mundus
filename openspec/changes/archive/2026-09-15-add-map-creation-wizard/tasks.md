## 1. Wizard shell and state

- [x] 1.1 Add `WizardState` type and a `MapCreationWizard` component holding `step` and the collected parameters in `useState`, with "Next"/"Back" controls that move `step` without losing prior values, verify manually that navigating back and forth preserves selections
- [x] 1.2 Add the Seed step (text input, optional - blank means random at confirmation), verify manually
- [x] 1.3 Add the Grid Type step (Square/Hex choice), verify manually
- [x] 1.4 Add the Size Preset step (Small/Medium/Large/Huge choice), verify manually
- [x] 1.5 Add the Shape Archetype step (all seven archetypes), verify manually
- [x] 1.6 Add the Review step showing every collected value and a Confirm action, verify manually that Confirm is the only action that triggers generation

## 2. Generation and view state

- [x] 2.1 Wire Confirm to call `api.GET('/api/Maps', ...)` with the collected parameters (generating a random seed first if blank), managing `wizard | loading | error | result` view state in `App.tsx`, verify manually against the local API
- [x] 2.2 Add an error view (failed request) with a way back to the wizard without losing selections, verify manually by forcing a failed request

## 3. Map rendering

- [x] 3.1 Add a `MapCanvas` component rendering square-grid cells (position, biome color, elevation-shaded lightness), verify manually against a Square-grid generated map
- [x] 3.2 Extend `MapCanvas` to render hex-grid cells (flat-top hexagons, alternating row offset), verify manually against a Hex-grid generated map
- [x] 3.3 Add the fixed biome color lookup table, verify manually that all seven biomes are visually distinguishable

## 4. Result view and return-to-wizard

- [x] 4.1 Add the result view (rendered `MapCanvas` + a "Back to wizard" action) replacing the current placeholder `World` card content in `App.tsx`, verify manually
- [x] 4.2 Verify manually that "Back to wizard" returns to the Review step (or wherever appropriate) with every prior selection intact, ready to change one value and regenerate

## 5. Close out

- [x] 5.1 Run `npm run build` in `frontend/` and verify it compiles
- [x] 5.2 Manually test the full flow end to end in a browser (all five steps, back/forward, both grid types, at least one of each shape archetype) against the local API
- [x] 5.3 Run `openspec validate add-map-creation-wizard --strict` and verify it passes
- [x] 5.4 Deploy to void-server and verify the flow works against `https://mundus.northernarchive.com`
- [x] 5.5 Archive the change with `openspec archive add-map-creation-wizard`
