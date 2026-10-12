// Themes are plain data (see the `slot-machine` spec and design.md): the spin,
// session and reading logic in engine.ts never names a theme. Imports use
// explicit `.ts` extensions so the logic runs under `node --test` unchanged.

export type ReadingMode = "blend" | "loot" | "payout"
export type ThemeId = "weather" | "creature" | "fortune" | "casino"
export type ReelCount = 3 | 5

export interface SymbolDef {
  /** Unique across all themes - also keys the icon in icons.tsx. */
  id: string
  name: string
  /** Relative chance of appearing on a reel. */
  weight: number
  /** Blend mode wording: as the dominant, as a secondary, as a trace, and when part of a full match. */
  blend?: { dominant: string; secondary: string; trace: string; intense: string }
  /** Loot mode wording, and whether the symbol is a penalty rather than a reward. */
  loot?: { singular: string; plural: string; penalty?: boolean }
}

export interface Theme {
  id: ThemeId
  name: string
  description: string
  /** Accent colour (CSS) used for the theme's reels and icons. */
  accent: string
  mode: ReadingMode
  symbols: readonly SymbolDef[]
  /** Casino only: bet multiplier per symbol, indexed by (matching reels - 2), for each reel count. */
  payTable?: Record<ReelCount, Record<string, readonly number[]>>
}

const weather: Theme = {
  id: "weather",
  name: "Weather",
  description: "What is the sky doing? Spin a few times and read the day.",
  accent: "#0ea5e9",
  mode: "blend",
  symbols: [
    { id: "sun", name: "Sun", weight: 6, blend: { dominant: "sunny and clear", secondary: "sunny spells", trace: "a touch of sun", intense: "cloudless and scorching" } },
    { id: "cloud", name: "Cloud", weight: 6, blend: { dominant: "cloudy", secondary: "patchy cloud", trace: "a few clouds", intense: "a heavy, overcast sky" } },
    { id: "rain", name: "Rain", weight: 4, blend: { dominant: "rainy", secondary: "passing showers", trace: "a little rain", intense: "pouring rain" } },
    { id: "wind", name: "Wind", weight: 4, blend: { dominant: "windy", secondary: "gusts of wind", trace: "a light breeze", intense: "howling winds" } },
    { id: "snow", name: "Snow", weight: 2, blend: { dominant: "snowy", secondary: "snow flurries", trace: "a few snowflakes", intense: "a blizzard" } },
    { id: "storm", name: "Storm", weight: 2, blend: { dominant: "stormy", secondary: "rumbling thunder", trace: "distant thunder", intense: "a violent storm" } },
  ],
}

const creature: Theme = {
  id: "creature",
  name: "Creature mood",
  description: "How is the creature feeling? Calm, wary, or ready to tear into you?",
  accent: "#f97316",
  mode: "blend",
  symbols: [
    { id: "calm", name: "Calm", weight: 6, blend: { dominant: "calm and placid", secondary: "moments of calm", trace: "a hint of calm", intense: "utterly serene" } },
    { id: "curious", name: "Curious", weight: 4, blend: { dominant: "curious and investigative", secondary: "bouts of curiosity", trace: "a flicker of curiosity", intense: "intensely inquisitive" } },
    { id: "wary", name: "Wary", weight: 4, blend: { dominant: "wary and watchful", secondary: "a wary edge", trace: "a trace of wariness", intense: "on high alert" } },
    { id: "hungry", name: "Hungry", weight: 4, blend: { dominant: "hungry", secondary: "a hungry streak", trace: "a rumbling stomach", intense: "ravenous" } },
    { id: "frightened", name: "Frightened", weight: 2, blend: { dominant: "frightened", secondary: "flashes of fear", trace: "a nervous twitch", intense: "terrified and ready to flee" } },
    { id: "furious", name: "Furious", weight: 2, blend: { dominant: "furious", secondary: "angry outbursts", trace: "a flash of temper", intense: "in a frenzy, attacking on sight" } },
  ],
}

const fortune: Theme = {
  id: "fortune",
  name: "Fortune",
  description: "What does luck deliver? Count the haul - and mind the curses.",
  accent: "#a855f7",
  mode: "loot",
  symbols: [
    { id: "gold", name: "Gold", weight: 8, loot: { singular: "Gold", plural: "Gold" } },
    { id: "gem", name: "Gem", weight: 4, loot: { singular: "Gem", plural: "Gems" } },
    { id: "potion", name: "Potion", weight: 4, loot: { singular: "Potion", plural: "Potions" } },
    { id: "scroll", name: "Scroll", weight: 2, loot: { singular: "Scroll", plural: "Scrolls" } },
    { id: "curse", name: "Curse", weight: 2, loot: { singular: "Curse", plural: "Curses", penalty: true } },
    { id: "relic", name: "Relic", weight: 1, loot: { singular: "Relic", plural: "Relics" } },
  ],
}

// Multipliers per reel count, tuned (see engine.ts `expectedReturn`) so the
// expected return is between 90% and 95% of the bets: a 3-reel pair is common,
// a 5-reel pair almost always happens, so it pays far less.
const casino: Theme = {
  id: "casino",
  name: "Casino",
  description: "Toy credits, no stakes. Place a bet and see if the reels pay.",
  accent: "#ef4444",
  mode: "payout",
  symbols: [
    { id: "cherry", name: "Cherry", weight: 6 },
    { id: "lemon", name: "Lemon", weight: 6 },
    { id: "bell", name: "Bell", weight: 4 },
    { id: "bar", name: "Bar", weight: 4 },
    { id: "seven", name: "Seven", weight: 2 },
    { id: "diamond", name: "Diamond", weight: 1 },
  ],
  payTable: {
    3: {
      cherry: [0.4, 10],
      lemon: [0.4, 10],
      bell: [0.8, 20],
      bar: [0.8, 20],
      seven: [2, 50],
      diamond: [4, 100],
    },
    5: {
      cherry: [0.2, 1, 4, 12],
      lemon: [0.2, 1, 4, 12],
      bell: [0.3, 2, 8, 24],
      bar: [0.3, 2, 8, 24],
      seven: [0.8, 5, 20, 60],
      diamond: [2, 10, 40, 120],
    },
  },
}

export const THEMES: readonly Theme[] = [weather, creature, fortune, casino]

export function themeById(id: ThemeId): Theme {
  return THEMES.find((t) => t.id === id) ?? weather
}

export function symbolById(theme: Theme, id: string): SymbolDef {
  return theme.symbols.find((s) => s.id === id) ?? theme.symbols[0]
}
