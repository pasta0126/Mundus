import type { DieKind } from "./dieTypes"

export interface HistoryEntry {
  /** ISO 8601 - when this throw settled. */
  at: string
  dice: { kind: DieKind; label: string; value: number }[]
  total: number
}

const STORAGE_KEY = "mundus:dice-history"
const MAX_ENTRIES = 100

/** Reads the roll history kept in this browser - never a server, per the `dice-roller` spec. Returns an empty list if nothing is stored yet or storage isn't available (private browsing, quota). */
export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage unavailable - the history just won't survive a reload this session.
  }
}

/** Adds `entry` at the front, capped at the last MAX_ENTRIES, persisting the result. */
export function appendHistoryEntry(entries: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  saveHistory(next)
  return next
}

/** Deletes the entire persisted history. */
export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable - nothing to clear.
  }
}

/** Saves the full history as a downloaded JSON file, each entry's date/time included. */
export function downloadHistory(entries: readonly HistoryEntry[]) {
  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `mundus-dice-history-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  link.click()
  URL.revokeObjectURL(url)
}
