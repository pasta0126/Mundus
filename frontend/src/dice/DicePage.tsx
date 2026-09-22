import { Dices, Loader2, Trash2, X } from "lucide-react"
import { useRef, useState } from "react"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { DiceScene, type DiceSceneHandle, MAX_DICE, type TrayItem } from "./DiceScene"
import { DIE_KINDS, type DieKind } from "./dieTypes"

const DIE_LABELS: Record<DieKind, string> = {
  d2: "D2",
  d3: "D3",
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
 * number of dice can be summoned, thrown in one roll, and read off once
 * they've all settled. Unlike every other Mundus page, a roll here is
 * genuinely random - there is no seed and nothing here is reproducible by
 * URL (see the `dice-roller` spec).
 */
export default function DicePage() {
  const sceneRef = useRef<DiceSceneHandle>(null)
  const [ready, setReady] = useState(false)
  const [tray, setTray] = useState<TrayItem[]>([])
  const [rolling, setRolling] = useState(false)
  const [results, setResults] = useState<Record<string, number> | null>(null)
  const [total, setTotal] = useState<number | null>(null)

  const disabled = !ready || rolling

  function clearResults() {
    setResults(null)
    setTotal(null)
  }

  function summon(kind: DieKind) {
    if (disabled || tray.length >= MAX_DICE) return
    sceneRef.current?.summon(kind)
    clearResults()
  }

  function remove(trayId: string) {
    if (disabled) return
    sceneRef.current?.remove(trayId)
    clearResults()
  }

  function clear() {
    if (disabled || tray.length === 0) return
    sceneRef.current?.clear()
    clearResults()
  }

  function roll() {
    if (disabled || tray.length === 0) return
    clearResults()
    sceneRef.current?.roll()
  }

  return (
    <div className="bg-background fixed inset-0 overflow-hidden">
      <DiceScene
        ref={sceneRef}
        onReady={() => setReady(true)}
        onTrayChange={setTray}
        onRollStateChange={setRolling}
        onSettled={(values, sum) => {
          setResults(values)
          setTotal(sum)
        }}
      />

      <div className="fixed top-4 left-4 z-10">
        <h1 className="text-lg font-semibold tracking-tight">
          <a href="/" className="bg-card coarse:min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-lg hover:opacity-80" aria-label="Back to home">
            <img src={mundusIcon} alt="" className="size-6" />
            Mundus
          </a>
        </h1>
      </div>

      {!ready && (
        <div className="fixed inset-x-0 top-4 z-20 flex justify-center">
          <div className="bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading physics…
          </div>
        </div>
      )}

      {tray.length > 0 && (
        <div className="bg-card fixed top-4 right-4 z-10 max-h-[calc(100dvh-2rem)] w-64 space-y-2 overflow-y-auto rounded-lg border p-3 shadow-lg">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Tray ({tray.length}/{MAX_DICE})
          </h2>
          <ul className="space-y-1">
            {tray.map((item) => (
              <li key={item.trayId} className="flex items-center justify-between gap-2 text-sm">
                <span>{DIE_LABELS[item.kind]}</span>
                <span className="flex items-center gap-2">
                  {results && item.trayId in results && <span className="font-mono font-semibold">{results[item.trayId]}</span>}
                  <Button variant="ghost" size="icon-sm" onClick={() => remove(item.trayId)} disabled={disabled} aria-label={`Remove this ${DIE_LABELS[item.kind]}`}>
                    <X />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
          {total !== null && (
            <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
              <span>Total</span>
              <span className="font-mono">{total}</span>
            </div>
          )}
          {rolling && <p className="text-muted-foreground text-xs">Rolling…</p>}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-4 z-10 flex flex-col items-center gap-2 px-4">
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
        </div>
      </div>
    </div>
  )
}
