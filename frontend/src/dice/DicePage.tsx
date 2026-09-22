import { Dices, Download, Loader2, Plus, RotateCw, Smartphone, Trash2, X } from "lucide-react"
import { useRef, useState } from "react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DiceScene, type DiceSceneHandle, MAX_DICE, type TrayItem } from "./DiceScene"
import { DIE_KINDS, type DieKind } from "./dieTypes"
import { appendHistoryEntry, downloadHistory, loadHistory, type HistoryEntry } from "./history"

const DIE_LABELS: Record<DieKind, string> = {
  d4: "D4",
  d6: "D6",
  d8: "D8",
  d10: "D10",
  d12: "D12",
  d20: "D20",
  d100: "D100",
}

/**
 * The dice tray: a 3D space with real physics (see DiceScene.tsx) where any
 * number of dice can be summoned, each with its own colour and an optional
 * name, thrown together or one at a time, and read off once settled -
 * genuinely random, no seed, nothing here is reproducible by URL (see the
 * `dice-roller` spec). The last 100 throws are kept in this browser and can
 * be downloaded as JSON.
 *
 * Below the 768px breakpoint, the always-visible tray panel and the full
 * row of summon buttons (11+ controls at once on a phone-width screen)
 * collapse into three sheets - Add, Tray, History - reached from a small,
 * fixed bottom bar, so only a handful of controls are ever on screen at
 * once (see `mobile-support`'s breakpoint convention).
 */
export default function DicePage() {
  const sceneRef = useRef<DiceSceneHandle>(null)
  const [ready, setReady] = useState(false)
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false)
  const [shakeEnabled, setShakeEnabled] = useState(false)
  const [tray, setTray] = useState<TrayItem[]>([])
  const [labels, setLabels] = useState<Record<string, string>>({})
  const [values, setValues] = useState<Record<string, number>>({})
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [showHistory, setShowHistory] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showTray, setShowTray] = useState(false)

  const anyAirborne = tray.some((t) => t.airborne)
  const disabled = !ready || anyAirborne

  function summon(kind: DieKind) {
    if (disabled || tray.length >= MAX_DICE) return
    sceneRef.current?.summon(kind)
  }

  function remove(trayId: string) {
    if (disabled) return
    sceneRef.current?.remove(trayId)
    setLabels((prev) => {
      const next = { ...prev }
      delete next[trayId]
      return next
    })
    setValues((prev) => {
      const next = { ...prev }
      delete next[trayId]
      return next
    })
  }

  function clear() {
    if (disabled || tray.length === 0) return
    sceneRef.current?.clear()
    setLabels({})
    setValues({})
  }

  function roll() {
    if (disabled || tray.length === 0) return
    sceneRef.current?.roll()
  }

  function throwOne(trayId: string, airborne: boolean) {
    if (!ready || airborne) return
    sceneRef.current?.throwOne(trayId)
  }

  function onThrowSettled(newValues: Record<string, number>, total: number) {
    setValues((prev) => ({ ...prev, ...newValues }))
    const entry: HistoryEntry = {
      at: new Date().toISOString(),
      dice: Object.entries(newValues).map(([trayId, value]) => ({
        kind: tray.find((t) => t.trayId === trayId)?.kind ?? "d6",
        label: labels[trayId] ?? "",
        value,
      })),
      total,
    }
    setHistory((prev) => appendHistoryEntry(prev, entry))
  }

  async function enableShake() {
    const enabled = await sceneRef.current?.enableShakeDetection()
    if (enabled) setShakeEnabled(true)
  }

  // The live total only counts dice thrown at least once (see the "Live roll total" requirement).
  const liveTotal = tray.some((t) => t.trayId in values) ? tray.reduce((sum, t) => (t.trayId in values ? sum + values[t.trayId] : sum), 0) : null

  const trayRows = (
    <ul className="space-y-2">
      {tray.map((item) => (
        <li key={item.trayId} className="space-y-1 border-b pb-2 last:border-b-0 last:pb-0">
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={item.color}
              onChange={(e) => sceneRef.current?.setColor(item.trayId, e.target.value)}
              className="coarse:min-h-11 size-7 shrink-0 rounded border"
              aria-label={`Colour for this ${DIE_LABELS[item.kind]}`}
            />
            <span className="shrink-0 text-sm font-semibold">{DIE_LABELS[item.kind]}</span>
            <Input
              value={labels[item.trayId] ?? ""}
              onChange={(e) => setLabels((prev) => ({ ...prev, [item.trayId]: e.target.value }))}
              placeholder="Name (optional)"
              className="h-7 flex-1 text-xs"
              aria-label={`Name for this ${DIE_LABELS[item.kind]}`}
            />
            <Button variant="ghost" size="icon-sm" onClick={() => remove(item.trayId)} disabled={disabled} aria-label={`Remove this ${DIE_LABELS[item.kind]}`}>
              <X />
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 pl-9 text-sm">
            <span className="text-muted-foreground truncate">{labels[item.trayId] ? `${DIE_LABELS[item.kind]} ${labels[item.trayId]}` : ""}</span>
            <div className="flex items-center gap-2">
              {item.trayId in values && <span className="font-mono font-semibold">{values[item.trayId]}</span>}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => throwOne(item.trayId, item.airborne)}
                disabled={!ready || item.airborne}
                aria-label={`Throw this ${DIE_LABELS[item.kind]}`}
              >
                <RotateCw />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )

  const trayFooter = (
    <>
      {liveTotal !== null && (
        <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono">{liveTotal}</span>
        </div>
      )}
      {anyAirborne && <p className="text-muted-foreground text-xs">Rolling…</p>}
    </>
  )

  const historySheetContent = (
    <SheetContent>
      <SheetHeader className="flex-row items-center justify-between pr-8">
        <SheetTitle>History ({history.length}/100)</SheetTitle>
        <Button variant="outline" size="sm" onClick={() => downloadHistory(history)} disabled={history.length === 0}>
          <Download />
          Download
        </Button>
      </SheetHeader>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">No rolls yet.</p>
      ) : (
        <ul className="space-y-1.5 overflow-y-auto text-sm">
          {history.map((entry, i) => (
            <li key={i} className="border-b pb-1.5 last:border-b-0">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{new Date(entry.at).toLocaleString()}</span>
                <span className="font-mono font-semibold">{entry.total}</span>
              </div>
              <p className="text-muted-foreground truncate text-xs">{entry.dice.map((d) => `${DIE_LABELS[d.kind]}${d.label ? ` ${d.label}` : ""}: ${d.value}`).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </SheetContent>
  )

  return (
    <div className="bg-background fixed inset-0 overflow-hidden">
      <DiceScene
        ref={sceneRef}
        onReady={(needsPermission) => {
          setReady(true)
          setNeedsMotionPermission(needsPermission)
        }}
        onTrayChange={setTray}
        onThrowSettled={onThrowSettled}
      />

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
            Enable shake to roll
          </Button>
        )}
      </div>

      {!ready && (
        <div className="fixed inset-x-0 top-4 z-20 flex justify-center">
          <div className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading physics…
          </div>
        </div>
      )}

      {/* Desktop: the tray is always visible in a side panel. Below md, it moves into a sheet (see the mobile bottom bar). */}
      {tray.length > 0 && (
        <div className="bg-card fixed top-4 right-4 z-10 hidden max-h-[calc(100dvh-2rem)] w-72 space-y-2 overflow-y-auto rounded-lg border p-3 shadow-lg md:block">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Tray ({tray.length}/{MAX_DICE})
          </h2>
          {trayRows}
          {trayFooter}
        </div>
      )}

      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        {historySheetContent}
      </Sheet>

      <Sheet open={showTray} onOpenChange={setShowTray}>
        <SheetContent className="md:hidden">
          <SheetHeader className="flex-row items-center justify-between pr-8">
            <SheetTitle>
              Tray ({tray.length}/{MAX_DICE})
            </SheetTitle>
            <Button variant="outline" size="sm" onClick={clear} disabled={disabled || tray.length === 0}>
              <Trash2 />
              Clear
            </Button>
          </SheetHeader>
          {tray.length === 0 ? (
            <p className="text-muted-foreground text-sm">No dice yet - add one below.</p>
          ) : (
            <div className="space-y-2 overflow-y-auto">
              {trayRows}
              {trayFooter}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={showAdd} onOpenChange={setShowAdd}>
        <SheetContent className="md:hidden">
          <SheetHeader>
            <SheetTitle>Add a die</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2">
            {DIE_KINDS.map((kind) => (
              <Button
                key={kind}
                variant="outline"
                disabled={disabled || tray.length >= MAX_DICE}
                onClick={() => summon(kind)}
                aria-label={`Summon a ${DIE_LABELS[kind]}`}
              >
                {DIE_LABELS[kind]}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop bottom bar: every summon button plus Roll/Clear/History, all at once - fine with a mouse and a wide screen. */}
      <div className="fixed inset-x-0 bottom-4 z-10 hidden flex-col items-center gap-2 px-4 md:flex">
        <div className="bg-card flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-lg border p-2 shadow-lg">
          {DIE_KINDS.map((kind) => (
            <Button key={kind} variant="outline" size="sm" disabled={disabled || tray.length >= MAX_DICE} onClick={() => summon(kind)} aria-label={`Summon a ${DIE_LABELS[kind]}`}>
              {DIE_LABELS[kind]}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="lg" onClick={roll} disabled={disabled || tray.length === 0}>
            <Dices />
            Roll
          </Button>
          <Button variant="outline" size="lg" onClick={clear} disabled={disabled || tray.length === 0}>
            <Trash2 />
            Clear tray
          </Button>
          <Button variant="outline" size="lg" onClick={() => setShowHistory(true)}>
            History
          </Button>
        </div>
      </div>

      {/* Mobile bottom bar: just 4 controls (Add/Tray/Roll/History behind sheets, Roll direct) instead of 10+ at once. */}
      <div className="fixed inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2 px-4 md:hidden">
        {anyAirborne ? (
          <div className="bg-card rounded-lg border px-3 py-1 text-xs shadow-lg">Rolling…</div>
        ) : (
          liveTotal !== null && (
            <div className="bg-card flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-semibold shadow-lg">
              <span className="text-muted-foreground text-xs font-normal">Total</span>
              <span className="font-mono">{liveTotal}</span>
            </div>
          )
        )}
        <div className="bg-card flex max-w-full items-center gap-1.5 rounded-lg border p-1.5 shadow-lg">
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)} disabled={disabled || tray.length >= MAX_DICE} aria-label="Add a die">
            <Plus />
            Add
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTray(true)} aria-label={`Tray, ${tray.length} of ${MAX_DICE} dice`}>
            Tray{tray.length > 0 ? ` (${tray.length})` : ""}
          </Button>
          <Button size="sm" onClick={roll} disabled={disabled || tray.length === 0}>
            <Dices />
            Roll
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)} aria-label="Roll history">
            History
          </Button>
        </div>
      </div>
    </div>
  )
}
