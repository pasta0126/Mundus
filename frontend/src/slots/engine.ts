// Pure slot machine logic - spinning, sessions, readings, casino payouts. No
// React and no browser APIs beyond the optional secure RNG, so it can be
// tested with `node --test` (see frontend/tests/slots.test.ts).

import { symbolById, themeById, type ReelCount, type Theme, type ThemeId } from "./themes.ts"

export const MAX_SPINS_LIMIT = 100
export const BETS = [10, 50, 100] as const
export const STARTING_BALANCE = 1000
/** A symbol above this share of everything shown is a secondary (strictly above). */
export const SECONDARY_SHARE = 0.25
/** A symbol above this share, up to the secondary share, is a trace (strictly above). */
export const TRACE_SHARE = 0.1

export type Rng = () => number

/** A uniform number in [0, 1) from the browser's secure RNG, falling back to Math.random only where unavailable. No seed: spins are not reproducible. */
export function secureRandom(): number {
  const c = globalThis.crypto
  if (c && typeof c.getRandomValues === "function") {
    const buffer = new Uint32Array(1)
    c.getRandomValues(buffer)
    return buffer[0] / 0x100000000
  }
  return Math.random()
}

export interface Spin {
  /** One symbol id per reel, left to right. */
  symbols: string[]
  /** Every reel shows the same symbol. */
  fullMatch: boolean
  /** Casino only: the bet this spin cost; null elsewhere. */
  bet: number | null
  /** Casino only: what this spin paid (0 for nothing); null elsewhere. */
  payout: number | null
}

/** Picks one symbol by weight. */
export function pickSymbol(theme: Theme, rng: Rng = secureRandom): string {
  const total = theme.symbols.reduce((sum, s) => sum + s.weight, 0)
  let r = rng() * total
  for (const symbol of theme.symbols) {
    r -= symbol.weight
    if (r < 0) return symbol.id
  }
  return theme.symbols[theme.symbols.length - 1].id
}

export function isFullMatch(symbols: readonly string[]): boolean {
  return symbols.length > 0 && symbols.every((s) => s === symbols[0])
}

function countSymbols(symbols: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const id of symbols) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** The bet multiplier a row of symbols earns: every symbol shown on at least two reels adds its multiplier for that many matching reels, anywhere in the row. */
export function payoutMultiplier(theme: Theme, symbols: readonly string[]): number {
  const table = theme.payTable?.[symbols.length as ReelCount]
  if (!table) return 0
  let multiplier = 0
  for (const [id, count] of countSymbols(symbols)) {
    if (count >= 2) multiplier += table[id]?.[count - 2] ?? 0
  }
  return multiplier
}

/** What a casino spin pays for a bet, in whole credits. */
export function payoutFor(theme: Theme, symbols: readonly string[], bet: number): number {
  return Math.round(payoutMultiplier(theme, symbols) * bet)
}

/** One spin: an independent weighted pick per reel, with a casino spin also carrying its bet and payout. */
export function makeSpin(theme: Theme, reels: ReelCount, bet: number | null, rng: Rng = secureRandom): Spin {
  const symbols = Array.from({ length: reels }, () => pickSymbol(theme, rng))
  const isCasino = theme.mode === "payout" && bet !== null
  return {
    symbols,
    fullMatch: isFullMatch(symbols),
    bet: isCasino ? bet : null,
    payout: isCasino ? payoutFor(theme, symbols, bet) : null,
  }
}

/** The casino's expected return per unit bet for a reel count, computed exactly from the weights. */
export function expectedReturn(theme: Theme, reels: ReelCount): number {
  const total = theme.symbols.reduce((sum, s) => sum + s.weight, 0)
  const combo: string[] = []
  function walk(depth: number, probability: number): number {
    if (depth === reels) return probability * payoutMultiplier(theme, combo)
    let sum = 0
    for (const symbol of theme.symbols) {
      combo[depth] = symbol.id
      sum += walk(depth + 1, probability * (symbol.weight / total))
    }
    return sum
  }
  return walk(0, 1)
}

// -- Sessions ----------------------------------------------------------------

export interface Session {
  themeId: ThemeId
  reels: ReelCount
  /** null = a free session with no spin limit. */
  maxSpins: number | null
  spins: Spin[]
}

/** A usable maximum: a whole number from 1 to MAX_SPINS_LIMIT, otherwise null (free). */
export function normalizeMaxSpins(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  const whole = Math.floor(value)
  if (whole < 1) return null
  return Math.min(whole, MAX_SPINS_LIMIT)
}

export function newSession(themeId: ThemeId, reels: ReelCount, maxSpins: number | null): Session {
  return { themeId, reels, maxSpins: normalizeMaxSpins(maxSpins), spins: [] }
}

export function addSpin(session: Session, spin: Spin): Session {
  return { ...session, spins: [...session.spins, spin] }
}

/** A bounded session that has used all its spins closes by itself and takes no more. */
export function isSessionFull(session: Session): boolean {
  return session.maxSpins !== null && session.spins.length >= session.maxSpins
}

// -- Readings ----------------------------------------------------------------

export interface BlendReading {
  mode: "blend"
  total: number
  shares: { id: string; count: number; share: number }[]
  dominant: string | null
  secondary: string[]
  trace: string[]
  /** Symbols of the session's full matches, each once. */
  fullMatches: string[]
  text: string
}

export interface LootReading {
  mode: "loot"
  items: { id: string; quantity: number }[]
  penalties: { id: string; quantity: number }[]
  text: string
}

export interface PayoutReading {
  mode: "payout"
  bet: number
  payout: number
  net: number
  text: string
}

export type Reading = BlendReading | LootReading | PayoutReading

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function joinList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join("")
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

function readBlend(theme: Theme, spins: readonly Spin[], rng: Rng): BlendReading {
  const counts = new Map<string, number>()
  let total = 0
  for (const spin of spins) {
    for (const id of spin.symbols) {
      counts.set(id, (counts.get(id) ?? 0) + 1)
      total += 1
    }
  }
  const fullMatches = [...new Set(spins.filter((s) => s.fullMatch).map((s) => s.symbols[0]))]
  if (total === 0) return { mode: "blend", total, shares: [], dominant: null, secondary: [], trace: [], fullMatches, text: "" }

  const shares = theme.symbols
    .map((s) => ({ id: s.id, count: counts.get(s.id) ?? 0 }))
    .filter((s) => s.count > 0)
    .map((s) => ({ ...s, share: s.count / total }))
    .sort((a, b) => b.count - a.count)

  const top = shares.filter((s) => s.count === shares[0].count)
  const dominant = top[Math.min(top.length - 1, Math.floor(rng() * top.length))].id
  const others = shares.filter((s) => s.id !== dominant)
  const secondary = others.filter((s) => s.share > SECONDARY_SHARE).map((s) => s.id)
  const trace = others.filter((s) => s.share > TRACE_SHARE && s.share <= SECONDARY_SHARE).map((s) => s.id)

  const intensified = new Set(fullMatches)
  const wording = (id: string, role: "dominant" | "secondary" | "trace") => {
    const blend = symbolById(theme, id).blend
    if (!blend) return id
    return intensified.has(id) ? blend.intense : blend[role]
  }
  const rest = [...secondary.map((id) => wording(id, "secondary")), ...trace.map((id) => wording(id, "trace"))]
  let text = `${capitalize(wording(dominant, "dominant"))}${rest.length > 0 ? ` with ${joinList(rest)}` : ""}.`
  const inRoles = new Set([dominant, ...secondary, ...trace])
  for (const id of fullMatches) {
    if (!inRoles.has(id)) text += ` Bonus: ${wording(id, "dominant")}.`
  }
  return { mode: "blend", total, shares, dominant, secondary, trace, fullMatches, text }
}

function readLoot(theme: Theme, spins: readonly Spin[]): LootReading {
  const quantities = new Map<string, number>()
  for (const spin of spins) {
    for (const id of spin.symbols) quantities.set(id, (quantities.get(id) ?? 0) + 1)
    // A full match doubles that symbol's quantity from this spin.
    if (spin.fullMatch) quantities.set(spin.symbols[0], (quantities.get(spin.symbols[0]) ?? 0) + spin.symbols.length)
  }
  const items: LootReading["items"] = []
  const penalties: LootReading["penalties"] = []
  for (const symbol of theme.symbols) {
    const quantity = quantities.get(symbol.id) ?? 0
    if (quantity === 0) continue
    ;(symbol.loot?.penalty ? penalties : items).push({ id: symbol.id, quantity })
  }
  items.sort((a, b) => b.quantity - a.quantity)
  const describe = (list: { id: string; quantity: number }[]) =>
    list
      .map(({ id, quantity }) => {
        const loot = symbolById(theme, id).loot
        return `${quantity} ${quantity === 1 ? (loot?.singular ?? id) : (loot?.plural ?? id)}`
      })
      .join(", ")
  const reward = items.length > 0 ? describe(items) : "No reward"
  const text = penalties.length > 0 ? `${reward} - penalty: ${describe(penalties)}` : reward
  return { mode: "loot", items, penalties, text }
}

function readPayout(spins: readonly Spin[]): PayoutReading {
  const bet = spins.reduce((sum, s) => sum + (s.bet ?? 0), 0)
  const payout = spins.reduce((sum, s) => sum + (s.payout ?? 0), 0)
  const net = payout - bet
  return { mode: "payout", bet, payout, net, text: `Bet ${bet}, won ${payout} (net ${net >= 0 ? "+" : ""}${net})` }
}

/** Reads a whole session at once, in the theme's mode. `rng` only breaks ties for the dominant symbol. */
export function readSession(theme: Theme, spins: readonly Spin[], rng: Rng = secureRandom): Reading {
  if (theme.mode === "blend") return readBlend(theme, spins, rng)
  if (theme.mode === "loot") return readLoot(theme, spins)
  return readPayout(spins)
}

// -- Closing -------------------------------------------------------------------

export interface ClosedSession {
  themeId: ThemeId
  reels: ReelCount
  maxSpins: number | null
  spins: Spin[]
  result: Reading
  /** ISO 8601 - when the session closed. */
  closedAt: string
}

/** Freezes a session with its result; an empty session closes to nothing so it is never recorded. */
export function closeSession(session: Session, now: Date = new Date(), rng: Rng = secureRandom): ClosedSession | null {
  if (session.spins.length === 0) return null
  const theme = themeById(session.themeId)
  return {
    themeId: session.themeId,
    reels: session.reels,
    maxSpins: session.maxSpins,
    spins: session.spins,
    result: readSession(theme, session.spins, rng),
    closedAt: now.toISOString(),
  }
}
