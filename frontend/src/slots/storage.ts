import { STARTING_BALANCE, type ClosedSession } from "./engine.ts"

const HISTORY_KEY = "mundus:slots-history"
const BALANCE_KEY = "mundus:slots-balance"
const MAX_ENTRIES = 100

/** Reads the closed-session history kept in this browser - never a server, per the `slot-machine` spec. Empty if nothing is stored or storage isn't available. */
export function loadHistory(): ClosedSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(entries: ClosedSession[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))
  } catch {
    // Storage unavailable - the history just won't survive a reload this session.
  }
}

/** Adds `entry` at the front, capped at the last MAX_ENTRIES (oldest dropped), persisting the result. */
export function appendHistoryEntry(entries: readonly ClosedSession[], entry: ClosedSession): ClosedSession[] {
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  saveHistory(next)
  return next
}

/** Deletes the entire persisted history. */
export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    // Storage unavailable - nothing to clear.
  }
}

/** Saves the full history as a downloaded JSON file: one object per session, closing time included. */
export function downloadHistory(entries: readonly ClosedSession[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `mundus-slots-history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/** The casino's toy-credit balance, STARTING_BALANCE when none is stored. */
export function loadBalance(): number {
  try {
    const raw = localStorage.getItem(BALANCE_KEY)
    if (raw === null) return STARTING_BALANCE
    const value = Number(raw)
    return Number.isFinite(value) && value >= 0 ? value : STARTING_BALANCE
  } catch {
    return STARTING_BALANCE
  }
}

export function saveBalance(balance: number) {
  try {
    localStorage.setItem(BALANCE_KEY, String(balance))
  } catch {
    // Storage unavailable - the balance just won't survive a reload this session.
  }
}
