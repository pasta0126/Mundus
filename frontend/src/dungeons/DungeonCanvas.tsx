import { useEffect, useMemo, useRef, useState } from "react"
import type { components } from "@/api/schema"
import { loadDungeonIcons } from "@/dungeons/art"
import { paintCaveTerrain } from "@/dungeons/caveRender"
import { paintHallsTerrain, paintMazeTerrain } from "@/dungeons/gridDressing"

type Dungeon = components["schemas"]["Dungeon"]
type Catalog = components["schemas"]["DungeonCatalogResponse"]

/** What one mark on the map is called, for its tooltip. */
interface Named {
  title: string
  description: string
}

interface Placed extends Named {
  icon: string
  /** Badge drawn on the icon's corner: which kind of boss it is. */
  badge?: "boss" | "final-boss"
  x: number
  y: number
  /** Longest side of the icon, in cells. */
  cells: number
  /** Painted after everything else: a hoard lies beside its boss and must not vanish behind it. */
  front?: boolean
}

interface Hit extends Named {
  left: number
  top: number
  right: number
  bottom: number
}

const MARGIN = 24

/** The left-hand panel's footprint: on a wide window the plan sits beside it rather than under it. */
const PANEL_WIDTH = 288
const WIDE_WINDOW = 900
const TOOLTIP_OFFSET = 14

/** Every mark of a dungeon, named from the backend's catalog. Painted back to front by row. */
function marksOf(dungeon: Dungeon, catalog: Catalog): Placed[] {
  const boss = (id: string) => catalog.bosses.find((b) => b.id === id)
  const treasure = (id: string) => (id === catalog.hoard.id ? catalog.hoard : catalog.treasures.find((t) => t.id === id))
  const marks: Placed[] = [
    {
      icon: "entrance",
      title: "Entrance",
      description: "The way in, and the only way out.",
      x: Number(dungeon.entrance.x),
      y: Number(dungeon.entrance.y),
      cells: 3.2,
    },
  ]
  for (const t of [...dungeon.treasures, dungeon.hoard]) {
    const entry = treasure(t.id)
    marks.push({ icon: t.id, title: entry?.label ?? t.id, description: entry?.description ?? "", x: Number(t.x), y: Number(t.y), cells: t.id === dungeon.hoard.id ? 2.6 : 2.8, front: t.id === dungeon.hoard.id })
  }
  for (const b of dungeon.bosses) {
    const entry = boss(b.id)
    marks.push({ icon: b.id, badge: "boss", title: entry?.label ?? b.id, description: `${entry?.description ?? ""}. Guards the passages ahead.`, x: Number(b.x), y: Number(b.y), cells: 3.6 })
  }
  const final = boss(dungeon.finalBoss.id)
  marks.push({
    icon: dungeon.finalBoss.id,
    badge: "final-boss",
    title: `${final?.label ?? dungeon.finalBoss.id} - final boss`,
    description: `${final?.description ?? ""}. Waits in the deepest chamber.`,
    x: Number(dungeon.finalBoss.x),
    y: Number(dungeon.finalBoss.y),
    cells: 4.4,
  })
  return marks.sort((a, b) => Number(a.front ?? false) - Number(b.front ?? false) || a.y - b.y)
}

/** The dungeon as a 2D plan scaled to fit the window: walls, floors, then every mark standing on its cell. */
export function DungeonCanvas({ dungeon, catalog }: { dungeon: Dungeon; catalog: Catalog }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hitsRef = useRef<Hit[]>([])
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const inset = size.w >= WIDE_WINDOW ? PANEL_WIDTH + MARGIN : 0
  const [tip, setTip] = useState<(Named & { x: number; y: number }) | null>(null)
  const marks = useMemo(() => marksOf(dungeon, catalog), [dungeon, catalog])

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const cols = Number(dungeon.width)
    const rows = Number(dungeon.height)
    const cell = Math.max(4, Math.floor(Math.min((size.w - inset - MARGIN * 2) / cols, (size.h - MARGIN * 2) / rows)))
    const dpr = window.devicePixelRatio || 1
    const cssW = cols * cell
    const cssH = rows * cell
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    void loadDungeonIcons([...marks.map((m) => m.icon), "boss", "final-boss"]).then((icons) => {
      if (cancelled) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (dungeon.style === "Cave") {
        // Smooth, organic contours instead of the square grid.
        paintCaveTerrain(ctx, dungeon.rows, cols, rows, cell * dpr, canvas.width, canvas.height)
      } else if (dungeon.style === "Halls") {
        paintHallsTerrain(ctx, dungeon.rows, cols, rows, cell)
      } else {
        paintMazeTerrain(ctx, dungeon.rows, cols, rows, cell)
      }

      ctx.imageSmoothingQuality = "high"
      const hits: Hit[] = []
      for (const m of marks) {
        const img = icons.get(m.icon)
        if (!img) continue
        const scale = (m.cells * cell) / Math.max(img.naturalWidth, img.naturalHeight)
        const w = img.naturalWidth * scale
        const h = img.naturalHeight * scale
        // Stands on its cell: the icon's base rests on the cell's lower edge, centered on the cell.
        const px = (m.x + 0.5) * cell
        const py = (m.y + 1) * cell
        ctx.drawImage(img, px - w / 2, py - h, w, h)
        const badge = m.badge ? icons.get(m.badge) : undefined
        if (badge) {
          const bh = Math.max(14, cell * 1.6)
          const bw = (badge.naturalWidth / badge.naturalHeight) * bh
          ctx.drawImage(badge, px + w / 2 - bw * 0.75, py - h - bh * 0.25, bw, bh)
        }
        hits.push({ title: m.title, description: m.description, left: px - w / 2, top: py - h, right: px + w / 2, bottom: py })
      }
      hitsRef.current = hits
    })
    return () => {
      cancelled = true
    }
  }, [dungeon, marks, size, inset])

  function onMove(event: React.MouseEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    // Topmost first: later marks were painted over earlier ones.
    const found = [...hitsRef.current].reverse().find((h) => x >= h.left && x <= h.right && y >= h.top && y <= h.bottom)
    if (!found) {
      setTip((current) => (current === null ? current : null))
      return
    }
    const flip = event.clientX + 260 > window.innerWidth
    setTip({ title: found.title, description: found.description, x: flip ? event.clientX - 250 : event.clientX + TOOLTIP_OFFSET, y: event.clientY + TOOLTIP_OFFSET })
  }

  return (
    <>
      <div className="fixed inset-0 flex items-center justify-center" style={{ paddingLeft: inset }}>
        <canvas ref={canvasRef} onMouseMove={onMove} onMouseLeave={() => setTip(null)} className="rounded-md shadow-2xl" aria-label="Dungeon map" />
      </div>
      {tip && (
        <div
          role="tooltip"
          style={{ maxWidth: 240, transform: `translate(${tip.x}px, ${tip.y}px)` }}
          className="bg-card pointer-events-none fixed top-0 left-0 z-30 rounded-md border px-2.5 py-1.5 shadow-lg"
        >
          <div className="text-sm leading-tight font-medium">{tip.title}</div>
          <div className="text-muted-foreground text-xs leading-snug">{tip.description}</div>
        </div>
      )}
    </>
  )
}
