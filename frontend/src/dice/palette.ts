import type { DieKind } from "./dieTypes"

/**
 * Every die kind gets its own fixed colour family - so a die's colour
 * always says something about *what kind* it is, not just "whichever
 * colour came up first" (the old shared palette put red first for every
 * kind). Summoning a second, third, ... die of the same kind rotates
 * through that kind's own variations rather than reusing its first shade.
 */
export const DIE_COLOR_FAMILIES: Record<DieKind, readonly string[]> = {
  d4: ["#c0392b", "#e74c3c", "#a93226", "#f1948a"], // reds
  d6: ["#f5ecd9", "#efe0c0", "#e8d3ab", "#f7f0e3"], // bone/cream - "colores claros"
  d8: ["#16a085", "#1abc9c", "#0e6655", "#48c9b0"], // teals
  d10: ["#e67e22", "#d35400", "#f39c12", "#eb984e"], // oranges
  d12: ["#8e44ad", "#9b59b6", "#6c3483", "#af7ac5"], // purples
  d20: ["#2980b9", "#3498db", "#1f618d", "#5dade2"], // blues
  d100: ["#b7950b", "#d4ac0d", "#9a7d0a", "#f1c40f"], // golds - kept distinct from the standalone d10's oranges
}

/**
 * The next colour for a newly summoned die of `kind`, given the colours
 * already in use by dice of that same kind currently in the tray (the
 * caller filters to just that kind) - the first entry in that kind's own
 * family not among them, or (once every entry is taken) the next one in
 * rotation regardless.
 */
export function nextColorFor(kind: DieKind, colorsInUseForKind: readonly string[]): string {
  const family = DIE_COLOR_FAMILIES[kind]
  const unused = family.find((color) => !colorsInUseForKind.includes(color))
  if (unused) return unused
  return family[colorsInUseForKind.length % family.length]
}
