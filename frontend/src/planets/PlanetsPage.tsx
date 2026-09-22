import { ArrowRight, Dices, Menu, RefreshCw } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { api } from "@/api/client"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { randomName } from "@/lib/randomName"
import { CopyButton } from "./CopyButton"
import { PlanetScene } from "./PlanetScene"
import { PlanetSheet } from "./PlanetSheet"
import type { PlanetDto } from "./planetTexture"
import { planetSpecsText } from "./specs"

function seedFromUrl(): string {
  return new URLSearchParams(window.location.search).get("seed")?.trim() ?? ""
}

function urlForSeed(seed: string): string {
  return `/planets?seed=${encodeURIComponent(seed)}`
}

export default function PlanetsPage() {
  const [seed, setSeed] = useState(() => seedFromUrl())
  const [draft, setDraft] = useState(() => seedFromUrl())
  const [planet, setPlanet] = useState<PlanetDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)

  const goToSeed = useCallback((next: string, push = true) => {
    const trimmed = next.trim()
    if (!trimmed) return
    if (push) window.history.pushState(null, "", urlForSeed(trimmed))
    else window.history.replaceState(null, "", urlForSeed(trimmed))
    setSeed(trimmed)
    setDraft(trimmed)
  }, [])

  // No seed in the URL yet: pick a random pronounceable one.
  useEffect(() => {
    if (!seedFromUrl()) goToSeed(randomName(), false)
  }, [goToSeed])

  useEffect(() => {
    const onPop = () => {
      const fromUrl = seedFromUrl()
      setSeed(fromUrl)
      setDraft(fromUrl)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  useEffect(() => {
    if (!seed) return
    const controller = new AbortController()
    setLoading(true)
    setError("")
    api
      .GET("/api/Planets", { params: { query: { seed } }, signal: controller.signal })
      .then(({ data, response }) => {
        if (controller.signal.aborted) return
        if (data) {
          setPlanet(data)
          document.title = `${data.name} · Mundus`
        } else {
          setError(
            response.status === 400
              ? "That name isn't valid. Use 1 to 64 characters."
              : "Couldn't load the planet. Please try again.",
          )
        }
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setError("Couldn't load the planet. Please try again.")
        setLoading(false)
      })
    return () => controller.abort()
  }, [seed, attempt])

  const seedForm = (
    <form
      className="flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        goToSeed(draft)
      }}
    >
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={64} aria-label="Planet name" placeholder="Planet name" />
      <Button type="submit" variant="outline" size="icon" aria-label="Generate this planet">
        <ArrowRight />
      </Button>
      <Button type="button" variant="outline" size="icon" onClick={() => goToSeed(randomName())} aria-label="Random planet">
        <Dices />
      </Button>
    </form>
  )
  const planetDetails = planet && !error && (
    <>
      <CopyButton kind="seed" text={planet.name} />
      <PlanetSheet planet={planet} />
      <CopyButton kind="specs" text={planetSpecsText(planet)} />
    </>
  )

  return (
    <div className="bg-background fixed inset-0 overflow-hidden">
      {planet && !error && <PlanetScene planet={planet} />}

      {/* Below 768px this panel folds into a sheet (see the Menu trigger below) instead of floating over the scene. */}
      <div className="fixed top-4 left-4 z-10 hidden max-w-64 flex-col gap-2 md:flex">
        <div className="bg-card space-y-3 rounded-lg border p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight">
              <a href="/" className="flex items-center gap-2 hover:opacity-80" aria-label="Back to home">
                <img src={mundusIcon} alt="" className="size-6" />
                Mundus
              </a>
            </h1>
            <span className="text-muted-foreground font-mono text-xs">v{__APP_VERSION__}</span>
          </div>
          {seedForm}
          {planetDetails}
        </div>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="bg-card fixed top-4 left-4 z-10 shadow-lg md:hidden" aria-label="Open planet menu">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent className="overflow-y-auto md:hidden">
          <SheetHeader>
            <SheetTitle>
              <a href="/" className="flex items-center gap-2" aria-label="Back to home">
                <img src={mundusIcon} alt="" className="size-6" />
                Mundus
                <span className="text-muted-foreground font-mono text-xs font-normal">v{__APP_VERSION__}</span>
              </a>
            </SheetTitle>
          </SheetHeader>
          {seedForm}
          {planetDetails}
        </SheetContent>
      </Sheet>

      {loading && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 shadow-lg">
            <p className="text-center text-sm">Loading planet…</p>
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
