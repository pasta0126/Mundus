import { ChevronDown, ChevronRight, Coins, Download, Eraser, History, List, Play, RotateCcw, Smartphone, Trash2 } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  BETS,
  MAX_SPINS_LIMIT,
  STARTING_BALANCE,
  addSpin,
  closeSession,
  isSessionFull,
  makeSpin,
  newSession,
  normalizeMaxSpins,
  readSession,
  type ClosedSession,
  type Reading,
  type Session,
  type Spin,
} from "./engine.ts"
import { SymbolIcon } from "./icons"
import { Machine3D, type Machine3DHandle } from "./Machine3D"
import { appendHistoryEntry, clearHistory, downloadHistory, loadBalance, loadHistory, saveBalance } from "./storage.ts"
import { THEMES, symbolById, themeById, type ReelCount, type Theme, type ThemeId } from "./themes.ts"

const SHAKE_THRESHOLD = 18
const SHAKE_COOLDOWN_MS = 1500
/** A reel stops this long after the spin starts, plus a stagger per reel. */
const FIRST_STOP_MS = 500
const STOP_STAGGER_MS = 300
const SETTLE_MS = 250
const CYCLE_MS = 70

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"))
  } catch {
    return false
  }
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** A row of small symbol icons - one spin, as listed in a session. */
function SpinRow({ theme, spin }: { theme: Theme; spin: Spin }) {
  return (
    <li className="flex items-center gap-2 py-1">
      <span className="flex gap-1" style={{ color: theme.accent }}>
        {spin.symbols.map((id, i) => (
          <SymbolIcon key={i} id={id} className="size-6" />
        ))}
      </span>
      <span className="sr-only">{spin.symbols.map((id) => symbolById(theme, id).name).join(", ")}</span>
      {spin.fullMatch && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">Full match</span>}
      {spin.bet !== null && spin.payout !== null && (
        <span className={`ml-auto font-mono text-xs ${spin.payout > 0 ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
          {spin.payout > 0 ? `+${spin.payout}` : "0"} / bet {spin.bet}
        </span>
      )}
    </li>
  )
}

/** The session result, in the theme's reading mode. */
function ReadingView({ theme, reading }: { theme: Theme; reading: Reading }) {
  return (
    <div className="space-y-2">
      <p className="text-base font-semibold" aria-live="polite">
        {reading.text || "Spin to see a result."}
      </p>
      {reading.mode === "blend" && reading.shares.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {reading.shares.map((s) => (
            <li key={s.id} className="bg-muted flex items-center gap-1 rounded-full py-0.5 pr-2 pl-1 text-xs" style={{ color: theme.accent }}>
              <SymbolIcon id={s.id} className="size-4" />
              <span className="text-foreground">
                {symbolById(theme, s.id).name} {Math.round(s.share * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}
      {reading.mode === "loot" && (reading.items.length > 0 || reading.penalties.length > 0) && (
        <ul className="flex flex-wrap gap-1.5">
          {[...reading.items, ...reading.penalties].map((s) => (
            <li key={s.id} className="bg-muted flex items-center gap-1 rounded-full py-0.5 pr-2 pl-1 text-xs" style={{ color: theme.accent }}>
              <SymbolIcon id={s.id} className="size-4" />
              <span className="text-foreground">
                {s.quantity} x {symbolById(theme, s.id).name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The slot machine: one row of 3 or 5 reels, spun any number of times; the
 * spins gather into a session that is read as a whole (a weather, a mood, a
 * loot haul or a casino result) - see the `slot-machine` spec. Frontend only:
 * the history and the casino's toy-credit balance live in this browser.
 */
export default function SlotsPage() {
  const [themeId, setThemeId] = useState<ThemeId>("weather")
  const [reels, setReels] = useState<ReelCount>(3)
  // The maximum is edited as text (maxInput) and takes effect, on the open session too, when committed (blur or Enter).
  const [maxInput, setMaxInput] = useState("")
  const [maxSpins, setMaxSpins] = useState<number | null>(null)
  const [session, setSession] = useState<Session>(() => newSession("weather", 3, null))
  const [lastClosed, setLastClosed] = useState<ClosedSession | null>(null)
  const [history, setHistory] = useState<ClosedSession[]>(() => loadHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [balance, setBalance] = useState(() => loadBalance())
  const [bet, setBet] = useState<number>(BETS[0])
  const [spinning, setSpinning] = useState(false)
  const [display, setDisplay] = useState<string[]>([])
  const [stopped, setStopped] = useState<boolean[]>([])
  const [shown, setShown] = useState<string[] | null>(null)
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false)
  const [shakeEnabled, setShakeEnabled] = useState(false)
  // The 3D machine is used unless the device can't draw it, then the flat reels take over.
  const [flat, setFlat] = useState(() => !webglAvailable())
  const machineRef = useRef<Machine3DHandle>(null)
  const [showSession, setShowSession] = useState(false)
  const [casinoOpen, setCasinoOpen] = useState(false)
  // Space taken by the overlaid controls, so the 3D machine can sit centred in what's left of the screen.
  const barRef = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState(180)
  const [wide, setWide] = useState(() => window.matchMedia("(min-width: 768px)").matches)

  const theme = themeById(themeId)
  const isCasino = theme.mode === "payout"
  const canAfford = !isCasino || balance >= bet

  // Timers and the spin in flight outlive renders, so they read the latest state through refs.
  const sessionRef = useRef(session)
  const balanceRef = useRef(balance)
  const timers = useRef<number[]>([])
  const pending = useRef<Spin | null>(null)

  function applySession(next: Session) {
    sessionRef.current = next
    setSession(next)
  }

  function applyBalance(next: number) {
    balanceRef.current = next
    setBalance(next)
    saveBalance(next)
  }

  /** Records a session in the history; an empty session is never recorded. */
  function recordClosed(current: Session) {
    const closed = closeSession(current)
    if (!closed) return
    setHistory((prev) => appendHistoryEntry(prev, closed))
    setLastClosed(closed)
  }

  /** Closes the open session (recording it) and starts a fresh one with the given settings. This is session memory only: it never touches the machine. */
  function restart(nextTheme: ThemeId, nextReels: ReelCount, nextMax: number | null, wipeResult = false) {
    recordClosed(sessionRef.current)
    applySession(newSession(nextTheme, nextReels, nextMax))
    if (wipeResult) setLastClosed(null)
  }

  function chooseTheme(id: ThemeId) {
    if (spinning || id === themeId) return
    setThemeId(id)
    setShown(null) // the new theme's machine starts at rest
    restart(id, reels, maxSpins, true)
  }

  function chooseReels(count: ReelCount) {
    if (spinning || count === reels) return
    setReels(count)
    setShown(null)
    restart(themeId, count, maxSpins, true)
  }

  /** Closes the open session - recorded in the history and shown as the last closed session. Memory only: the machine is left exactly as it is. */
  function clearResults() {
    if (spinning || sessionRef.current.spins.length === 0) return
    restart(themeId, reels, maxSpins)
  }

  /** Applies the typed maximum to the open session. If the session has already made that many spins it closes at once, like a bounded session reaching its last spin. */
  function commitMax() {
    if (spinning) return
    const value = normalizeMaxSpins(maxInput === "" ? null : Number(maxInput))
    setMaxInput(value === null ? "" : String(value))
    setMaxSpins(value)
    const current = sessionRef.current
    if (value === current.maxSpins) return
    const updated: Session = { ...current, maxSpins: value }
    if (value !== null && updated.spins.length >= value) {
      recordClosed(updated)
      applySession(newSession(themeId, reels, value))
    } else {
      applySession(updated)
    }
  }

  function clearTimers() {
    for (const id of timers.current) window.clearTimeout(id)
    for (const id of timers.current) window.clearInterval(id)
    timers.current = []
  }

  function commit(spin: Spin) {
    clearTimers()
    pending.current = null
    setSpinning(false)
    setDisplay(spin.symbols)
    setStopped(spin.symbols.map(() => true))
    setShown(spin.symbols)
    machineRef.current?.snap(spin.symbols)
    if (spin.bet !== null && spin.payout !== null) applyBalance(balanceRef.current - spin.bet + spin.payout)
    const next = addSpin(sessionRef.current, spin)
    if (isSessionFull(next)) {
      recordClosed(next)
      applySession(newSession(next.themeId, next.reels, next.maxSpins))
    } else {
      applySession(next)
    }
  }

  function startSpin() {
    if (spinning || !canAfford) return
    const spin = makeSpin(theme, reels, isCasino ? bet : null)
    pending.current = spin
    if (prefersReducedMotion()) {
      commit(spin)
      return
    }
    setSpinning(true)
    if (!flat && machineRef.current) {
      // The 3D drums own the timeline and report when they have all settled.
      machineRef.current.spin(spin.symbols, () => commit(spin))
      return
    }
    setStopped(spin.symbols.map(() => false))
    setDisplay(spin.symbols.map(() => randomItem(theme.symbols).id))
    const live = spin.symbols.map(() => false)
    const cycle = window.setInterval(() => {
      setDisplay((prev) => prev.map((id, i) => (live[i] ? id : randomItem(theme.symbols).id)))
    }, CYCLE_MS)
    timers.current.push(cycle)
    spin.symbols.forEach((id, i) => {
      timers.current.push(
        window.setTimeout(
          () => {
            live[i] = true
            setDisplay((prev) => prev.map((current, j) => (j === i ? id : current)))
            setStopped((prev) => prev.map((s, j) => (j === i ? true : s)))
          },
          FIRST_STOP_MS + i * STOP_STAGGER_MS,
        ),
      )
    })
    timers.current.push(window.setTimeout(() => commit(spin), FIRST_STOP_MS + (reels - 1) * STOP_STAGGER_MS + SETTLE_MS))
  }

  // Shake to spin, with the same motion handling as the dice tray.
  const spinRef = useRef(startSpin)
  spinRef.current = startSpin
  const shakeAttached = useRef(false)
  const lastMagnitude = useRef<number | null>(null)
  const lastShakeAt = useRef(0)
  const onDeviceMotion = useRef((event: DeviceMotionEvent) => {
    const acc = event.acceleration?.x != null ? event.acceleration : event.accelerationIncludingGravity
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return
    const magnitude = Math.hypot(acc.x, acc.y, acc.z)
    if (lastMagnitude.current !== null) {
      const now = performance.now()
      if (Math.abs(magnitude - lastMagnitude.current) > SHAKE_THRESHOLD && now - lastShakeAt.current > SHAKE_COOLDOWN_MS) {
        lastShakeAt.current = now
        spinRef.current()
      }
    }
    lastMagnitude.current = magnitude
  }).current
  function attachShake() {
    if (shakeAttached.current) return
    shakeAttached.current = true
    window.addEventListener("devicemotion", onDeviceMotion)
  }
  interface MotionPermissionApi {
    requestPermission: () => Promise<"granted" | "denied">
  }
  async function enableShake() {
    const ctor = window.DeviceMotionEvent as unknown as Partial<MotionPermissionApi> | undefined
    if (typeof ctor?.requestPermission === "function") {
      try {
        if ((await ctor.requestPermission()) !== "granted") return
      } catch {
        return
      }
    }
    attachShake()
    setShakeEnabled(true)
  }
  useEffect(() => {
    const ctor = window.DeviceMotionEvent as unknown as Partial<MotionPermissionApi> | undefined
    if (typeof window.DeviceMotionEvent === "undefined") return
    if (typeof ctor?.requestPermission === "function") setNeedsMotionPermission(true)
    else attachShake()
    return () => {
      window.removeEventListener("devicemotion", onDeviceMotion)
      shakeAttached.current = false
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)")
    const onChange = () => setWide(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight))
    observer.observe(bar)
    setBarHeight(bar.offsetHeight)
    return () => observer.disconnect()
  }, [])

  const insets = useMemo(() => ({ top: 72, right: wide ? 304 : 0, bottom: barHeight + 24, left: 0 }), [wide, barHeight])

  const reading = useMemo(() => readSession(theme, session.spins), [theme, session.spins])
  const idle = theme.symbols.slice(0, reels).map((s) => s.id)
  const reelSymbols = spinning ? display : (shown ?? idle)
  const showingLast = session.spins.length === 0 && lastClosed !== null

  const historySheet = (
    <SheetContent>
      <SheetHeader className="flex-row items-center justify-between pr-8">
        <SheetTitle>History ({history.length}/100)</SheetTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearHistory()
              setHistory([])
            }}
            disabled={history.length === 0}
          >
            <Trash2 />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadHistory(history)} disabled={history.length === 0}>
            <Download />
            Download
          </Button>
        </div>
      </SheetHeader>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">No closed sessions yet.</p>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto text-sm">
          {history.map((entry, i) => (
            <li key={i} className="border-b pb-1.5 last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">{new Date(entry.closedAt).toLocaleString()}</span>
                <span className="text-xs font-semibold">
                  {themeById(entry.themeId).name} - {entry.reels} reels - {entry.spins.length}
                  {entry.maxSpins !== null ? `/${entry.maxSpins}` : ""} spins
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{entry.result.text}</p>
            </li>
          ))}
        </ul>
      )}
    </SheetContent>
  )

  const resultText = (showingLast && lastClosed ? lastClosed.result.text : reading.text) || "Spin to see a result."

  // The casino's money controls: a section of the session group, collapsed by default. Its header always shows the balance (as toy credits) and the bet.
  const casinoSection = (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setCasinoOpen((open) => !open)}
        aria-expanded={casinoOpen}
        className="coarse:min-h-11 flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm"
      >
        {casinoOpen ? <ChevronDown className="size-4 shrink-0" aria-hidden /> : <ChevronRight className="size-4 shrink-0" aria-hidden />}
        <Coins className="size-4 shrink-0" aria-hidden />
        <span className="font-semibold">Casino</span>
        <span className="text-muted-foreground ml-auto text-xs">
          <span className="font-mono" data-testid="balance">
            {balance}
          </span>{" "}
          toy credits - bet {bet}
        </span>
      </button>
      {!canAfford && <p className="px-2 pb-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">Not enough credits for this bet - lower it or reset the balance.</p>}
      {casinoOpen && (
        <div className="flex flex-col items-center gap-1.5 border-t p-2">
          <div className="flex items-center gap-1" role="group" aria-label="Bet per spin">
            {BETS.map((amount) => (
              <Button key={amount} variant={bet === amount ? "default" : "outline"} size="sm" onClick={() => setBet(amount)} disabled={spinning} aria-pressed={bet === amount}>
                Bet {amount}
              </Button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => applyBalance(STARTING_BALANCE)} disabled={spinning}>
            <RotateCcw />
            Reset to {STARTING_BALANCE}
          </Button>
          <p className="text-muted-foreground text-center text-xs">Toy credits only - no real-money value, nothing here can be bought or cashed out.</p>
        </div>
      )}
    </div>
  )

  // The open session (or, right after one closes, the last closed one): its count, its reading and its spins.
  const sessionBody = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{showingLast ? "Last closed session" : "Current session"}</h2>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">
            {showingLast && lastClosed
              ? `${lastClosed.spins.length}${lastClosed.maxSpins !== null ? `/${lastClosed.maxSpins}` : ""} spins`
              : `${session.spins.length}${session.maxSpins !== null ? `/${session.maxSpins}` : ""} spins${session.maxSpins === null ? " - free" : ""}`}
          </span>
          <Button variant="outline" size="xs" onClick={clearResults} disabled={spinning || session.spins.length === 0}>
            <Eraser />
            Clear
          </Button>
        </div>
      </div>
      <label className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">Max spins</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_SPINS_LIMIT}
          value={maxInput}
          onChange={(e) => setMaxInput(e.target.value)}
          onBlur={commitMax}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="Free"
          disabled={spinning}
          className="border-input bg-background coarse:min-h-11 h-7 w-20 rounded-md border px-2 text-sm"
        />
      </label>
      {isCasino && casinoSection}
      {showingLast && lastClosed ? <ReadingView theme={themeById(lastClosed.themeId)} reading={lastClosed.result} /> : <ReadingView theme={theme} reading={reading} />}
      {session.spins.length > 0 && (
        <ul className="min-h-0 divide-y overflow-y-auto">
          {[...session.spins].reverse().map((spin, i) => (
            <SpinRow key={session.spins.length - i} theme={theme} spin={spin} />
          ))}
        </ul>
      )}
    </>
  )

  return (
    <div className="bg-background fixed inset-0 overflow-hidden">
      {!flat && (
        <>
          <Machine3D ref={machineRef} theme={theme} reels={reels} shown={shown} insets={insets} onPull={startSpin} onUnavailable={() => setFlat(true)} />
          <p className="sr-only" aria-live="polite">
            {reelSymbols.map((id) => symbolById(theme, id).name).join(", ")}
          </p>
        </>
      )}

      {/* The flat fallback, only when the device can't draw the 3D machine. */}
      {flat && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="flex w-full max-w-xl items-center justify-center gap-2 sm:gap-3" style={{ color: theme.accent }}>
            {reelSymbols.map((id, i) => {
              const settling = spinning && !stopped[i]
              return (
                <div
                  key={`${i}-${settling}`}
                  className={`bg-card flex aspect-square w-full max-w-28 flex-col items-center justify-center gap-1 rounded-xl border-2 ${settling ? "scale-95 opacity-80 blur-[1px]" : "animate-in zoom-in-90 duration-150"} ${!spinning && shown === null ? "opacity-40" : ""}`}
                  style={{ borderColor: theme.accent }}
                >
                  <SymbolIcon id={id} className="size-1/2" />
                  <span className="text-foreground text-[0.7rem] font-medium">{symbolById(theme, id).name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="fixed top-4 left-4 z-10 flex flex-wrap items-start gap-2">
        <h1 className="text-lg font-semibold tracking-tight">
          <a href="/" className="bg-card coarse:min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg hover:opacity-80" aria-label="Back to home">
            <img src={mundusIcon} alt="" className="size-6" />
            Mundus
          </a>
        </h1>
        {needsMotionPermission && !shakeEnabled && (
          <Button variant="outline" className="bg-card shadow-lg" onClick={() => void enableShake()}>
            <Smartphone />
            Enable shake to spin
          </Button>
        )}
      </div>

      {/* Desktop: the session is always visible in a side column, with the casino block below it. Below md the session moves into a sheet. */}
      <div className="fixed top-4 right-4 z-10 hidden w-72 flex-col gap-3 md:flex" style={{ maxHeight: `calc(100dvh - ${barHeight + 40}px)` }}>
        <div className="bg-card flex min-h-0 flex-col gap-3 overflow-hidden rounded-lg border p-3 shadow-lg">{sessionBody}</div>
      </div>

      <Sheet open={showSession} onOpenChange={setShowSession}>
        <SheetContent className="md:hidden">
          <SheetHeader>
            <SheetTitle>Session</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-3">{sessionBody}</div>
        </SheetContent>
      </Sheet>

      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        {historySheet}
      </Sheet>

      <div ref={barRef} className="fixed inset-x-0 bottom-4 z-10 flex justify-center px-4 md:pr-[19rem]">
        {/* One column as wide as the choices bar: the casino block and the actions follow its width. */}
        <div className="flex w-fit max-w-full flex-col items-stretch gap-2">
          {/* Below md the session panel is a sheet: its result stays in view as a small pill that opens it. */}
          <button
            type="button"
            onClick={() => setShowSession(true)}
            className="bg-card max-w-full self-center truncate rounded-lg border px-3 py-1 text-xs shadow-lg md:hidden"
            aria-label="Open the session"
          >
            {resultText}
          </button>

          <div className="bg-card flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-lg border p-2 shadow-lg">
            <div className="flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.description}
                  onClick={() => chooseTheme(t.id)}
                  disabled={spinning}
                  aria-pressed={t.id === themeId}
                  className="bg-background coarse:min-h-11 rounded-lg border-2 px-2.5 py-1 text-sm font-medium transition-colors disabled:opacity-60"
                  style={{ borderColor: t.id === themeId ? t.accent : "transparent" }}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1" role="group" aria-label="Number of reels">
              {([3, 5] as const).map((count) => (
                <Button key={count} variant={reels === count ? "default" : "outline"} size="sm" onClick={() => chooseReels(count)} disabled={spinning} aria-pressed={reels === count}>
                  {count} reels
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-stretch gap-2">
            <Button
              size="lg"
              className="h-12 flex-1 text-base font-semibold text-white shadow-lg hover:brightness-110"
              style={{ backgroundColor: theme.accent }}
              onClick={startSpin}
              disabled={spinning || !canAfford}
            >
              <Play />
              Spin
            </Button>
            <Button variant="outline" size="lg" className="bg-card h-12 md:hidden" onClick={() => setShowSession(true)}>
              <List />
              Session
            </Button>
            <Button variant="outline" size="lg" className="bg-card h-12" onClick={() => setShowHistory(true)}>
              <History />
              History
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
