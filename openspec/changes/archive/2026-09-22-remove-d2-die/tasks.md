## 1. Remove the d2

- [x] 1.1 Remove `d2`/`buildD2` from `dieTypes.ts`'s `DieKind`/`DIE_KINDS`/`buildDieShape`
- [x] 1.2 Remove the d2 branch from `decals.ts`'s `buildDecals` (and its now-unused `drawCoinSymbol`)
- [x] 1.3 Remove the D2 summon button/label from `DicePage.tsx`

## 2. No more chip background

- [x] 2.1 Raise `DECAL_SIZE` (128 → 256) and increase each decal's on-die render size so ink alone survives minification
- [x] 2.2 Remove the filled circular chip from `drawNumeral` and `drawPips`, rendering ink directly on a transparent canvas
- [x] 2.3 Re-check the d100 pair's dark/light ink is still visually distinguishable without a chip, at real on-screen size

## 3. d4: three corner numerals

- [x] 3.1 In `decals.ts`, build a d4 face's numeral as three copies of the same value, each offset toward one of the face's three corners and rotated 0°/120°/240° around the face normal

## 4. d6: Mundus icon on the "1" face

- [x] 4.1 Load `mundus-icon-header.png` as a decal texture and use it in place of the single-pip layout when a d6 face's value is 1

## 5. d10 and d20 proportions

- [x] 5.1 Re-tune `buildD10`'s ring/apex heights to read closer to the reference photo (shorter ring, more prominent apex)
- [x] 5.2 Increase `buildD20`'s radius and/or reduce its decal scale so numerals aren't cramped against its small faces

## 6. Verify and release

- [x] 6.1 Manually verify: no D2 button/summon path remains anywhere
- [x] 6.2 Manually verify every remaining die kind's markings at real on-screen size - no white chip, legible ink, d4's three corner numerals, d6's Mundus-icon "1" face, d100 dark/light still distinguishable
- [x] 6.3 Run frontend type check, lint and build
- [x] 6.4 Bump the semver (minor, since a die kind is removed - breaking) and tag the commit
