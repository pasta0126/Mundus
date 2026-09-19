const ONSETS = ["b", "d", "g", "k", "l", "m", "n", "r", "s", "t", "v", "z", "br", "dr", "kr", "tr", "th", "sh"]
const VOWELS = ["a", "e", "i", "o", "u", "ae", "ia", "ou"]
const CODAS = ["", "", "", "n", "r", "s", "x", "th", "m"]

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * A random, pronounceable name ("Zorvath", "Kelia") to use as a seed. It only
 * chooses *which* seed to ask for; the planet or system itself is still fully
 * determined by that seed on the server.
 */
export function randomName(): string {
  const syllables = 2 + Math.floor(Math.random() * 2)
  let name = ""
  for (let i = 0; i < syllables; i++) {
    name += pick(ONSETS) + pick(VOWELS)
  }
  name += pick(CODAS)
  return name.charAt(0).toUpperCase() + name.slice(1)
}
