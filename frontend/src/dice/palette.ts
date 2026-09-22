/**
 * 32 mutually distinguishable colours - double `MAX_DICE` (DiceScene.tsx),
 * so a full tray never has to repeat a colour even once. Shared by every
 * die kind: which 32 come up, and in what order, is down to `nextColor`
 * alone, not the kind being summoned.
 */
export const DIE_PALETTE: readonly string[] = [
  "#e74c3c",
  "#c0392b",
  "#e67e22",
  "#d35400",
  "#f1c40f",
  "#f39c12",
  "#2ecc71",
  "#27ae60",
  "#1abc9c",
  "#16a085",
  "#3498db",
  "#2980b9",
  "#9b59b6",
  "#8e44ad",
  "#e84393",
  "#d63031",
  "#fd79a8",
  "#00b894",
  "#0984e3",
  "#6c5ce7",
  "#fdcb6e",
  "#e17055",
  "#795548",
  "#a1887f",
  "#607d8b",
  "#455a64",
  "#2c3e50",
  "#34495e",
  "#b2bec3",
  "#dfe6e9",
  "#ff7675",
  "#74b9ff",
]

/**
 * The next colour for a newly summoned die, given every colour already in
 * use by any die currently in the tray - a random pick among the palette
 * entries not among them, or (once all 32 are taken, past two full trays'
 * worth) a random pick from the whole palette regardless. No per-kind
 * families - just one shared pool, one colour requested and assigned per
 * die; a person can still change it afterwards from the tray's colour
 * picker.
 */
export function nextColor(colorsInUse: readonly string[]): string {
  const unused = DIE_PALETTE.filter((color) => !colorsInUse.includes(color))
  const pool = unused.length > 0 ? unused : DIE_PALETTE
  return pool[Math.floor(Math.random() * pool.length)]
}
