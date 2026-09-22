/** A curated, mutually distinguishable set of die colours - see design.md "Colour palette and per-die identity." */
export const DIE_PALETTE: readonly string[] = [
  "#e74c3c",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#1abc9c",
  "#3498db",
  "#9b59b6",
  "#e84393",
  "#795548",
  "#607d8b",
  "#2c3e50",
  "#16a085",
]

/**
 * The next colour for a newly summoned die, given the colours already in
 * use by dice of that same kind currently in the tray (the caller filters
 * to just that kind) - the first palette entry not among them, or (once
 * every entry is taken) the next one in rotation regardless.
 */
export function nextColorFor(colorsInUseForKind: readonly string[]): string {
  const unused = DIE_PALETTE.find((color) => !colorsInUseForKind.includes(color))
  if (unused) return unused
  return DIE_PALETTE[colorsInUseForKind.length % DIE_PALETTE.length]
}
