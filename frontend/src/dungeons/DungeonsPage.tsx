import { ArrowLeft, Menu, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/api/client"
import type { components } from "@/api/schema"
import mundusIcon from "@/assets/mundus-icon-header.png"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { loadPoiCatalog } from "@/map/poi"
import { CopyButton } from "@/planets/CopyButton"
import { dungeonIconUrl } from "./art"
import { DungeonCanvas } from "./DungeonCanvas"

type Dungeon = components["schemas"]["Dungeon"]
type Catalog = components["schemas"]["DungeonCatalogResponse"]

interface Source {
  map: string
  x: number
  y: number
  type: string
  zoom: string | null
}

/** /dungeons?map=&x=&y=&type=[&zoom=]: null when a required part is missing or malformed. */
function sourceFromUrl(): Source | null {
  const params = new URLSearchParams(window.location.search)
  const map = params.get("map")?.trim()
  const type = params.get("type")?.trim()
  const x = params.get("x")?.trim()
  const y = params.get("y")?.trim()
  if (!map || !type || !x || !y || !/^-?\d+$/.test(x) || !/^-?\d+$/.test(y)) return null
  return { map, x: Number(x), y: Number(y), type, zoom: params.get("zoom")?.trim() || null }
}

/** Back to the map: same seed, centred on the dungeon's point, at the zoom the person came from. */
function mapHref(source: Source): string {
  const query = new URLSearchParams({ seed: source.map, x: String(source.x), y: String(source.y) })
  if (source.zoom) query.set("zoom", source.zoom)
  return `/maps?${query}`
}

const LEGEND = [
  { icon: "entrance", label: "Entrance" },
  { icon: "chest", label: "Treasure" },
  { icon: "boss", label: "Boss" },
  { icon: "final-boss", label: "Final boss" },
]

export default function DungeonsPage() {
  const [source] = useState(sourceFromUrl)
  const [dungeon, setDungeon] = useState<Dungeon | null>(null)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [placeName, setPlaceName] = useState("")
  const [loading, setLoading] = useState(source !== null)
  const [error, setError] = useState(source ? "" : "This dungeon link is incomplete. Open a dungeon from the map.")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    setLoading(true)
    setError("")
    Promise.all([
      api.GET("/api/Dungeons", { params: { query: { seed: source.map, x: source.x, y: source.y, type: source.type } }, signal: controller.signal }),
      api.GET("/api/Dungeons/catalog", { signal: controller.signal }),
      loadPoiCatalog(),
    ])
      .then(([generated, catalogResponse, poi]) => {
        if (controller.signal.aborted) return
        if (generated.data && catalogResponse.data) {
          setDungeon(generated.data)
          setCatalog(catalogResponse.data)
          const label = poi?.entries.get(source.type)?.label ?? source.type
          setPlaceName(label)
          document.title = `${label} dungeon · Mundus`
        } else {
          setError(
            generated.response.status === 400
              ? "That dungeon link isn't valid. Open a dungeon from the map."
              : "Couldn't load the dungeon. Please try again.",
          )
        }
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setError("Couldn't load the dungeon. Please try again.")
        setLoading(false)
      })
    return () => controller.abort()
  }, [source, attempt])

  const style = dungeon && catalog ? catalog.styles.find((s) => s.style === dungeon.style) : undefined
  const back = source ? mapHref(source) : "/maps"
  const sourceText = source ? `${source.map}:dungeon:${source.x}:${source.y}:${source.type}` : ""

  const panelBody = (
    <>
      <Button asChild variant="outline" size="sm" className="w-full">
        <a href={back}>
          <ArrowLeft />
          Back to map
        </a>
      </Button>

      {dungeon && catalog && !error && (
        <>
          {sourceText && <CopyButton kind="seed" text={sourceText} />}
          <div className="space-y-2">
            <div>
              <h2 className="font-semibold">{placeName} dungeon</h2>
              <p className="text-muted-foreground text-xs">{style ? `${style.label} - ${style.description}` : ""}</p>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Bosses</dt>
              <dd className="text-right">{dungeon.bosses.length + 1}</dd>
              <dt className="text-muted-foreground">Treasures</dt>
              <dd className="text-right">{dungeon.treasures.length + 1}</dd>
              <dt className="text-muted-foreground">Size</dt>
              <dd className="text-right">
                {Number(dungeon.width)} x {Number(dungeon.height)}
              </dd>
              <dt className="text-muted-foreground">Found at</dt>
              <dd className="text-right font-mono text-xs">
                ({Number(dungeon.x)}, {Number(dungeon.y)})
              </dd>
            </dl>
            <ul className="space-y-1 border-t pt-2 text-xs">
              {LEGEND.map(({ icon, label }) => (
                <li key={icon} className="flex items-center gap-2">
                  <img src={dungeonIconUrl(icon)} alt="" className="h-6 w-6 object-contain" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <CopyButton kind="specs" text={JSON.stringify(dungeon, null, 2)} />
        </>
      )}
    </>
  )

  return (
    <div className="bg-background fixed inset-0 overflow-hidden">
      {dungeon && catalog && !error && <DungeonCanvas dungeon={dungeon} catalog={catalog} />}

      {/* Below 768px this panel folds into a sheet (see the Menu trigger below) instead of floating over the plan. */}
      <div className="fixed top-4 left-4 z-10 hidden max-h-[calc(100dvh-2rem)] max-w-64 flex-col gap-2 md:flex">
        <div className="bg-card min-h-0 space-y-3 overflow-y-auto rounded-lg border p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg font-semibold tracking-tight">
              <a href="/" className="flex items-center gap-2 hover:opacity-80" aria-label="Back to home">
                <img src={mundusIcon} alt="" className="size-6" />
                Mundus
              </a>
            </h1>
            <span className="text-muted-foreground font-mono text-xs">v{__APP_VERSION__}</span>
          </div>
          {panelBody}
        </div>
      </div>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="bg-card fixed top-4 left-4 z-10 shadow-lg md:hidden" aria-label="Open dungeon menu">
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
          {panelBody}
        </SheetContent>
      </Sheet>

      {loading && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 shadow-lg">
            <p className="text-center text-sm">Loading dungeon…</p>
            <Progress value={40} className="w-full" />
          </div>
        </div>
      )}

      {error && (
        <div className="fixed inset-x-0 top-0 z-20 flex flex-col items-center gap-2 p-4">
          <div className="bg-card w-full max-w-xs space-y-2 rounded-lg border p-3 text-center shadow-lg" role="alert">
            <p className="text-sm">{error}</p>
            {source && (
              <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
                <RefreshCw />
                Retry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
