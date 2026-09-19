import { ArrowLeft, ArrowRight, Dices, Globe, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { MobileNotice } from "@/components/MobileNotice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { randomName } from "@/lib/randomName"
import { CopyButtons } from "./CopyButtons"
import { PlanetScene } from "./PlanetScene"
import { PlanetSheet, TYPE_LABELS } from "./PlanetSheet"
import { SystemScene, type SystemDto } from "./SystemScene"

const MAX_PLANETS = 8

const KIND_LABELS: Record<components["schemas"]["CentralBodyKind"], string> = {
  RedDwarf: "red dwarf",
  Orange: "orange star",
  Yellow: "yellow star",
  BlueGiant: "blue giant",
  WhiteDwarf: "white dwarf",
  Pulsar: "pulsar",
  BlackHole: "black hole",
}

/** What the URL says: a central seed and, for a custom system, its planets and belt. */
interface View {
  seed: string
  planets: string[]
  belt: number | null
}

function viewFromUrl(): View {
  const params = new URLSearchParams(window.location.search)
  const belt = Number(params.get("belt"))
  return {
    seed: params.get("seed")?.trim() ?? "",
    planets: params.getAll("planet").map((p) => p.trim()).filter(Boolean),
    belt: Number.isInteger(belt) && belt > 0 ? belt : null,
  }
}

function urlForView(view: View): string {
  const params = new URLSearchParams({ seed: view.seed })
  for (const planet of view.planets) params.append("planet", planet)
  if (view.planets.length > 0 && view.belt !== null) params.set("belt", String(view.belt))
  return `/systems?${params.toString()}`
}

function describeCentral(system: SystemDto): string {
  const names = system.central.map((body) => KIND_LABELS[body.kind])
  const kind = names.length === 1 ? "Single" : "Binary"
  return `${kind} system: ${names.join(", ")}`
}

export default function SystemsPage() {
  const [view, setView] = useState<View>(() => viewFromUrl())
  const [draftSeed, setDraftSeed] = useState(() => viewFromUrl().seed)
  const [system, setSystem] = useState<SystemDto | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  const [editing, setEditing] = useState(false)
  const [draftPlanets, setDraftPlanets] = useState<string[]>([])
  const [draftBelt, setDraftBelt] = useState<number | null>(null)
  const [newPlanet, setNewPlanet] = useState("")

  const navigate = useCallback((next: View, push = true) => {
    const url = urlForView(next)
    if (push) window.history.pushState(null, "", url)
    else window.history.replaceState(null, "", url)
    setView(next)
    setDraftSeed(next.seed)
    setSelected(null)
  }, [])

  // No seed in the URL yet: pick a random pronounceable one.
  useEffect(() => {
    if (!viewFromUrl().seed) navigate({ seed: randomName(), planets: [], belt: null }, false)
  }, [navigate])

  useEffect(() => {
    const onPop = () => {
      const fromUrl = viewFromUrl()
      setView(fromUrl)
      setDraftSeed(fromUrl.seed)
      setSelected(null)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  useEffect(() => {
    if (!view.seed) return
    const controller = new AbortController()
    setLoading(true)
    setError("")
    api
      .GET("/api/Systems", {
        params: {
          query: {
            seed: view.seed,
            planets: view.planets.length > 0 ? view.planets : undefined,
            belt: view.planets.length > 0 && view.belt !== null ? view.belt : undefined,
          },
        },
        signal: controller.signal,
      })
      .then(({ data, response }) => {
        if (controller.signal.aborted) return
        if (data) {
          setSystem(data)
          document.title = `${data.name} · Mundus`
        } else {
          setError(
            response.status === 400
              ? "That system isn't valid. Names take 1 to 62 characters, with at most 8 planets."
              : "Couldn't load the system. Please try again.",
          )
        }
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setError("Couldn't load the system. Please try again.")
        setLoading(false)
      })
    return () => controller.abort()
  }, [view, attempt])

  const openEditor = () => {
    // Start from what is on screen, so customizing means tweaking, not starting over.
    setDraftPlanets(system ? system.slots.map((s) => s.planetSeed) : [])
    setDraftBelt(system?.belt ? Number(system.belt.afterSlot) : null)
    setNewPlanet("")
    setEditing(true)
  }

  const addPlanet = () => {
    const name = newPlanet.trim()
    if (!name || draftPlanets.length >= MAX_PLANETS) return
    setDraftPlanets([...draftPlanets, name])
    setNewPlanet("")
  }

  const removePlanet = (index: number) => {
    setDraftPlanets(draftPlanets.filter((_, i) => i !== index))
  }

  const beltChoices = Array.from({ length: Math.max(0, draftPlanets.length - 1) }, (_, i) => i + 1)
  const effectiveBelt = draftBelt !== null && draftBelt <= draftPlanets.length - 1 ? draftBelt : null

  const applyCustom = () => {
    if (draftPlanets.length === 0 || !draftSeed.trim()) return
    navigate({ seed: draftSeed.trim(), planets: draftPlanets, belt: effectiveBelt })
    setEditing(false)
  }

  const selectedSlot = system && selected !== null ? system.slots.find((s) => Number(s.index) === selected) : undefined
  const isCustom = view.planets.length > 0

  return (
    <div className="bg-background fixed inset-0 overflow-hidden">
      {system && !error && (selectedSlot ? <PlanetScene key={selectedSlot.planetSeed} planet={selectedSlot.planet} /> : <SystemScene system={system} onSelectPlanet={setSelected} />)}

      <div className="fixed top-4 left-4 z-10 flex max-h-[calc(100vh-2rem)] max-w-64 flex-col gap-2">
        <MobileNotice />
        <div className="bg-card min-h-0 space-y-3 overflow-y-auto rounded-lg border p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight">
              <a href="/" className="flex items-center gap-2 hover:opacity-80" aria-label="Back to the map">
                <img src={mundusIcon} alt="" className="size-6" />
                Mundus
              </a>
            </h1>
            <span className="text-muted-foreground font-mono text-xs">v{__APP_VERSION__}</span>
          </div>

          <form
            className="flex gap-1.5"
            onSubmit={(e) => {
              e.preventDefault()
              if (draftSeed.trim()) navigate({ seed: draftSeed.trim(), planets: [], belt: null })
            }}
          >
            <Input value={draftSeed} onChange={(e) => setDraftSeed(e.target.value)} maxLength={62} aria-label="System name" placeholder="System name" />
            <Button type="submit" variant="outline" size="icon" aria-label="Generate this system">
              <ArrowRight />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => navigate({ seed: randomName(), planets: [], belt: null })}
              aria-label="Random system"
            >
              <Dices />
            </Button>
          </form>

          {selectedSlot ? (
            <div className="space-y-3">
              <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="w-full">
                <ArrowLeft />
                Back to system
              </Button>
              <PlanetSheet planet={selectedSlot.planet} />
              <CopyButtons seed={selectedSlot.planet.name} json={selectedSlot.planet} />
            </div>
          ) : (
            system &&
            !error && (
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg leading-tight font-semibold">{system.name}</h2>
                  <p className="text-muted-foreground text-xs">
                    {describeCentral(system)}
                    {isCustom ? " · custom" : ""}
                  </p>
                </div>
                <ul className="space-y-1 text-sm">
                  {system.slots.map((slot) => (
                    <li key={slot.index}>
                      <button
                        type="button"
                        onClick={() => setSelected(Number(slot.index))}
                        className="hover:bg-muted flex w-full items-baseline justify-between gap-2 rounded px-1.5 py-0.5 text-left"
                      >
                        <span className="truncate">{slot.planet.name}</span>
                        <span className="text-muted-foreground shrink-0 text-xs">{TYPE_LABELS[slot.planet.type]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">
                  {system.belt ? `Asteroid belt after planet ${system.belt.afterSlot}.` : "No asteroid belt."} Click a planet to see it up close.
                </p>

                <CopyButtons seed={system.name} json={system} />

                {editing ? (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium">Custom system</p>
                    <p className="text-muted-foreground text-xs">The name above sets the star and orbits. Choose the planets by name.</p>
                    <ul className="space-y-1 text-sm">
                      {draftPlanets.map((planet, i) => (
                        <li key={`${planet}-${i}`} className="flex items-center justify-between gap-2 px-1.5">
                          <span className="truncate">{planet}</span>
                          <Button variant="ghost" size="icon-sm" onClick={() => removePlanet(i)} aria-label={`Remove ${planet}`}>
                            <X />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <form
                      className="flex gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault()
                        addPlanet()
                      }}
                    >
                      <Input
                        value={newPlanet}
                        onChange={(e) => setNewPlanet(e.target.value)}
                        maxLength={64}
                        aria-label="Planet name to add"
                        placeholder="Add a planet"
                        disabled={draftPlanets.length >= MAX_PLANETS}
                      />
                      <Button type="submit" variant="outline" size="icon" aria-label="Add planet" disabled={draftPlanets.length >= MAX_PLANETS}>
                        <Plus />
                      </Button>
                    </form>
                    {draftPlanets.length >= MAX_PLANETS && <p className="text-muted-foreground text-xs">A system holds at most {MAX_PLANETS} planets.</p>}
                    <label className="flex items-center justify-between gap-2 text-xs">
                      Asteroid belt
                      <select
                        value={effectiveBelt ?? ""}
                        onChange={(e) => setDraftBelt(e.target.value === "" ? null : Number(e.target.value))}
                        className="bg-background rounded-md border px-2 py-1"
                        disabled={beltChoices.length === 0}
                      >
                        <option value="">None</option>
                        {beltChoices.map((n) => (
                          <option key={n} value={n}>
                            After planet {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={applyCustom} disabled={draftPlanets.length === 0} className="flex-1">
                        Apply
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditing(false)} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={openEditor} className="flex-1">
                      <SlidersHorizontal />
                      Customize
                    </Button>
                    {isCustom && (
                      <Button variant="outline" size="sm" onClick={() => navigate({ seed: view.seed, planets: [], belt: null })} className="flex-1">
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
        <Button asChild variant="outline" className="shadow-lg">
          <a href="/planets">
            <Globe />
            Planets
          </a>
        </Button>
      </div>

      {loading && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 shadow-lg">
            <p className="text-center text-sm">Loading system…</p>
            <Progress value={40} className="w-full" />
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 text-center shadow-lg" role="alert">
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              <RefreshCw />
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
