import type { DieKind } from "./dieTypes"

/** Standard HSL -> hex conversion (h in degrees, s/l in percent). */
function hexFromHsl(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(light, 1 - light)
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

/** Matches `MAX_DICE` (DiceScene.tsx) - the worst case is every die in a full tray sharing one kind, so each kind's family needs this many shades to guarantee 16 distinct colours even then. */
const MAX_FAMILY_SIZE = 16

/**
 * `count` shades of one hue/saturation family. Lightness alone spread
 * across [lightMin, lightMax] reads as barely-different steps of the same
 * colour once the range has to stay narrow (bone/cream needs to stay
 * light, so it can't use a wide one) - adding a hue swing on top of it
 * (alternating direction, growing with `t`) keeps every shade reading as
 * clearly its own colour without losing the family's overall identity.
 */
function family(hue: number, saturation: number, lightMin: number, lightMax: number, hueSwing = 12, count = MAX_FAMILY_SIZE): string[] {
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1)
    const swing = (i % 2 === 0 ? 1 : -1) * hueSwing * t
    colors.push(hexFromHsl(hue + swing, saturation, lightMin + (lightMax - lightMin) * t))
  }
  return colors
}

/**
 * Every die kind gets its own fixed colour family - so a die's colour
 * always says something about *what kind* it is, not just "whichever
 * colour came up first." Each family has one shade per possible die in a
 * full tray (see `MAX_FAMILY_SIZE`), so even 16 dice of the same kind can
 * all come out visibly different (see `nextColorFor`).
 */
export const DIE_COLOR_FAMILIES: Record<DieKind, readonly string[]> = {
  d4: family(6, 68, 36, 58, 14), // reds
  d6: family(38, 42, 76, 95, 22), // bone/cream - "colores claros" (a wider hue swing since it can't lean on lightness alone and stay light)
  d8: family(168, 62, 30, 52, 14), // teals
  d10: family(28, 78, 42, 64, 14), // oranges
  d12: family(283, 42, 36, 58, 14), // purples
  d20: family(207, 62, 38, 60, 14), // blues
  d100: family(46, 68, 38, 60, 14), // golds - kept distinct from the standalone d10's oranges
}

/**
 * The next colour for a newly summoned die of `kind`, given the colours
 * already in use by dice of that same kind currently in the tray (the
 * caller filters to just that kind) - a random pick among that kind's
 * family entries not already in use, or (once every entry is taken, which
 * `MAX_FAMILY_SIZE` means only happens past a full tray of one kind) a
 * random pick from the whole family regardless.
 */
export function nextColorFor(kind: DieKind, colorsInUseForKind: readonly string[]): string {
  const family = DIE_COLOR_FAMILIES[kind]
  const unused = family.filter((color) => !colorsInUseForKind.includes(color))
  const pool = unused.length > 0 ? unused : family
  return pool[Math.floor(Math.random() * pool.length)]
}
