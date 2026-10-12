// Run with `npm test` (node's built-in runner; no test dependency).
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  addSpin,
  closeSession,
  expectedReturn,
  isSessionFull,
  makeSpin,
  newSession,
  normalizeMaxSpins,
  payoutFor,
  pickSymbol,
  readSession,
  type Spin,
} from "../src/slots/engine.ts"
import { THEMES, themeById } from "../src/slots/themes.ts"

const weather = themeById("weather")
const fortune = themeById("fortune")
const casino = themeById("casino")

function spin(...symbols: string[]): Spin {
  return { symbols, fullMatch: symbols.every((s) => s === symbols[0]), bet: null, payout: null }
}

/** A small deterministic generator so frequency tests are stable. */
function lcg(seed: number) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 0x100000000
    return state / 0x100000000
  }
}

describe("themes", () => {
  it("each theme has exactly six symbols", () => {
    for (const theme of THEMES) assert.equal(theme.symbols.length, 6, theme.id)
  })

  it("symbol ids are unique across themes", () => {
    const ids = THEMES.flatMap((t) => t.symbols.map((s) => s.id))
    assert.equal(new Set(ids).size, ids.length)
  })

  it("themes declare the agreed reading modes", () => {
    assert.equal(themeById("weather").mode, "blend")
    assert.equal(themeById("creature").mode, "blend")
    assert.equal(themeById("fortune").mode, "loot")
    assert.equal(themeById("casino").mode, "payout")
  })
})

describe("spinning", () => {
  it("gives every reel a symbol of the theme", () => {
    const ids = new Set(weather.symbols.map((s) => s.id))
    for (const reels of [3, 5] as const) {
      const result = makeSpin(weather, reels, null)
      assert.equal(result.symbols.length, reels)
      for (const id of result.symbols) assert.ok(ids.has(id))
    }
  })

  it("picks heavier symbols more often", () => {
    const rng = lcg(7)
    const counts: Record<string, number> = {}
    for (let i = 0; i < 20000; i++) {
      const id = pickSymbol(weather, rng)
      counts[id] = (counts[id] ?? 0) + 1
    }
    assert.ok(counts.sun > counts.storm * 2)
    assert.ok(counts.cloud > counts.snow * 2)
  })
})

describe("blend reading", () => {
  it("reads cloudy with sunny spells and a little rain", () => {
    const reading = readSession(weather, [spin("cloud", "sun", "sun"), spin("sun", "rain", "cloud"), spin("cloud", "cloud", "cloud")])
    assert.equal(reading.mode, "blend")
    if (reading.mode !== "blend") return
    assert.equal(reading.dominant, "cloud")
    assert.deepEqual(reading.secondary, ["sun"])
    assert.deepEqual(reading.trace, ["rain"])
    assert.deepEqual(reading.shares.map((s) => s.count), [5, 3, 1])
    assert.deepEqual(reading.fullMatches, ["cloud"])
    assert.match(reading.text, /sunny spells/)
    assert.match(reading.text, /a little rain/)
  })

  it("gives the same roles for the same proportions on 3 and 5 reels", () => {
    const three = readSession(weather, [spin("cloud", "cloud", "sun"), spin("cloud", "rain", "cloud")])
    const five = readSession(weather, [spin("cloud", "cloud", "cloud", "cloud", "sun", "sun")].concat([spin("cloud", "cloud", "cloud", "cloud", "sun", "rain")]))
    if (three.mode !== "blend" || five.mode !== "blend") return assert.fail()
    assert.equal(three.dominant, five.dominant)
  })

  it("intensifies a full match", () => {
    const reading = readSession(weather, [spin("storm", "storm", "storm")])
    if (reading.mode !== "blend") return assert.fail()
    assert.match(reading.text, /violent storm/i)
  })

  it("is empty without spins", () => {
    const reading = readSession(weather, [])
    if (reading.mode !== "blend") return assert.fail()
    assert.equal(reading.dominant, null)
    assert.equal(reading.text, "")
  })
})

describe("loot reading", () => {
  it("counts a haul and keeps the curse as a penalty", () => {
    const reading = readSession(fortune, [spin("gold", "gold", "gold", "gem", "potion"), spin("gold", "gold", "gold", "gem", "curse")])
    if (reading.mode !== "loot") return assert.fail()
    assert.equal(reading.text, "6 Gold, 2 Gems, 1 Potion - penalty: 1 Curse")
    assert.deepEqual(reading.penalties, [{ id: "curse", quantity: 1 }])
  })

  it("doubles a full match", () => {
    const reading = readSession(fortune, [spin("gem", "gem", "gem")])
    if (reading.mode !== "loot") return assert.fail()
    assert.deepEqual(reading.items, [{ id: "gem", quantity: 6 }])
  })
})

describe("casino payouts", () => {
  it("pays a pair a little and a triple a lot", () => {
    assert.equal(payoutFor(casino, ["cherry", "cherry", "bell"], 10), 4)
    assert.equal(payoutFor(casino, ["seven", "seven", "seven"], 10), 500)
  })

  it("does not care about position", () => {
    assert.equal(payoutFor(casino, ["seven", "bell", "seven"], 10), payoutFor(casino, ["seven", "seven", "bell"], 10))
  })

  it("pays nothing without two matching reels", () => {
    assert.equal(payoutFor(casino, ["cherry", "bell", "seven"], 10), 0)
  })

  it("keeps the expected return between 90% and 95% for 3 and 5 reels", () => {
    for (const reels of [3, 5] as const) {
      const value = expectedReturn(casino, reels)
      assert.ok(value >= 0.9 && value <= 0.95, `${reels} reels: ${value}`)
    }
  })

  it("carries bet and payout on a casino spin only", () => {
    const paid = makeSpin(casino, 3, 50, () => 0)
    assert.equal(paid.bet, 50)
    assert.ok(paid.payout !== null)
    assert.equal(makeSpin(weather, 3, null).bet, null)
  })

  it("reads a session's net result", () => {
    const reading = readSession(casino, [
      { symbols: ["cherry", "cherry", "bell"], fullMatch: false, bet: 10, payout: 4 },
      { symbols: ["cherry", "bell", "seven"], fullMatch: false, bet: 10, payout: 0 },
    ])
    if (reading.mode !== "payout") return assert.fail()
    assert.equal(reading.bet, 20)
    assert.equal(reading.payout, 4)
    assert.equal(reading.net, -16)
  })
})

describe("empty sessions", () => {
  it("read as no text in every mode", () => {
    for (const theme of THEMES) assert.equal(readSession(theme, []).text, "", theme.id)
  })
})

describe("sessions", () => {
  it("normalises a maximum to a whole number from 1 to 100, or null", () => {
    assert.equal(normalizeMaxSpins(null), null)
    assert.equal(normalizeMaxSpins(0), null)
    assert.equal(normalizeMaxSpins(-3), null)
    assert.equal(normalizeMaxSpins(4.9), 4)
    assert.equal(normalizeMaxSpins(500), 100)
  })

  it("a free session never fills; a bounded one does on its last spin", () => {
    let free = newSession("weather", 3, null)
    let bounded = newSession("weather", 3, 3)
    for (let i = 0; i < 3; i++) {
      free = addSpin(free, spin("sun", "sun", "cloud"))
      bounded = addSpin(bounded, spin("sun", "sun", "cloud"))
    }
    assert.equal(isSessionFull(free), false)
    assert.equal(isSessionFull(bounded), true)
  })

  it("closing an empty session records nothing", () => {
    assert.equal(closeSession(newSession("weather", 3, null)), null)
  })

  it("closing freezes the result and the closing time", () => {
    const session = addSpin(newSession("fortune", 3, null), spin("gold", "gold", "gem"))
    const closed = closeSession(session, new Date("2026-01-02T03:04:05.000Z"))
    assert.ok(closed)
    assert.equal(closed.closedAt, "2026-01-02T03:04:05.000Z")
    assert.equal(closed.maxSpins, null)
    assert.equal(closed.result.mode, "loot")
  })
})
