import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/api/client"
import { CHUNK_CONCURRENCY, CHUNK_SIZE } from "@/map/constants"
import {
  SATELLITE_MAX_STEP,
  loadPoiCatalog,
  loadPoiIcons,
  poiIconPx,
  type PoiCatalog,
  type PoiRole,
  type SettlementTier,
} from "@/map/poi"
import { computeChunkGrid, runWithConcurrency } from "@/map/tiling"

interface Poi {
  x: number
  y: number
  category: string
  type: string
  role: PoiRole
  tier: SettlementTier | null
}

/** Where one icon was last drawn, in CSS pixels - what hover looks up. */
interface Hit {
  type: string
  left: number
  top: number
  right: number
  bottom: number
}

interface PointsOfInterestLayerProps {
  seed: string
  originX: number
  originY: number
  width: number
  height: number
  cellPx: number
  step: number
  generation: number
  /** False while the terrain is still loading: icons are only requested (and shown) once it is done. */
  enabled: boolean
  /** Backend categories currently switched on - hidden ones are still fetched (one request per chunk) but never drawn. */
  visibleCategories: string[]
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

/** Tooltip box is kept this far from the viewport edge, and assumed at most this wide, so it flips before it clips. */
const TOOLTIP_MARGIN = 12
const TOOLTIP_MAX_WIDTH = 240

/**
 * One canvas for every points-of-interest category: points for the whole
 * view are fetched once per chunk (after the terrain has finished loading),
 * then drawn (back to front, so lower icons overlap higher ones) filtered
 * by which categories are switched on - toggling a category redraws
 * without refetching. A settlement's anchor is drawn larger the bigger the
 * settlement, and its satellites (services) are dropped once zoomed out too
 * far. Icons only, no labels - hovering one shows what it is.
 */
export function PointsOfInterestLayer({
  seed,
  originX,
  originY,
  width,
  height,
  cellPx,
  step,
  generation,
  enabled,
  visibleCategories,
  onCanvasReady,
}: PointsOfInterestLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const pointsRef = useRef(new Map<string, Poi>())
  const hitsRef = useRef<Hit[]>([])
  const drawTokenRef = useRef(0)
  const catalogRef = useRef<PoiCatalog | null>(null)
  const [shown, setShown] = useState(false)
  const [tip, setTip] = useState<{ type: string; x: number; y: number } | null>(null)

  // Latest props for the async draw, without re-creating it every render.
  const viewRef = useRef({ originX, originY, cellPx, step, visible: new Set(visibleCategories) })
  viewRef.current = { originX, originY, cellPx, step, visible: new Set(visibleCategories) }

  const draw = useCallback(async () => {
    const token = ++drawTokenRef.current
    const view = viewRef.current
    const points = [...pointsRef.current.values()]
      .filter((p) => view.visible.has(p.category) && (p.role !== "Satellite" || view.step <= SATELLITE_MAX_STEP))
      .sort((a, b) => a.y - b.y)
    const icons = await loadPoiIcons(points.map((p) => p.type))
    if (token !== drawTokenRef.current) return // a newer draw superseded this one
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const cssWidth = canvas.width / dpr
    const cssHeight = canvas.height / dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    const { x: offsetX, y: offsetY } = offsetRef.current
    const hits: Hit[] = []
    for (const p of points) {
      const img = icons.get(p.type)
      if (!img) continue
      const px = offsetX + ((p.x - view.originX) / view.step) * view.cellPx
      const py = offsetY + ((p.y - view.originY) / view.step) * view.cellPx
      // Icons are trimmed to their artwork, so they aren't square: fit the longest side.
      const size = poiIconPx(p.role, p.tier)
      const scale = size / Math.max(img.naturalWidth, img.naturalHeight)
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      // The point is where the icon stands: its base, centered - not the middle of the picture.
      ctx.drawImage(img, px - w / 2, py - h, w, h)
      hits.push({ type: p.type, left: px - w / 2, top: py - h, right: px + w / 2, bottom: py })
    }
    hitsRef.current = hits
  }, [])

  // A brand new view: fresh canvas, no points yet, hidden until its icons have arrived.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)

    const dpr = window.devicePixelRatio || 1
    const cssWidth = window.innerWidth
    const cssHeight = window.innerHeight
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    offsetRef.current = {
      x: (cssWidth - width * cellPx) / 2,
      y: (cssHeight - height * cellPx) / 2,
    }
    pointsRef.current = new Map()
    hitsRef.current = []
    setShown(false)
    void draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation])

  // Fetch every chunk of the view once the terrain is done; a point near a chunk seam comes back from both, hence the keyed Map.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const chunkSpecs = computeChunkGrid(originX, originY, width, height, CHUNK_SIZE, step)

    void runWithConcurrency(chunkSpecs, CHUNK_CONCURRENCY, async (spec) => {
      const { data, error } = await api.GET("/api/PointsOfInterest", {
        params: { query: { seed, x: spec.x, y: spec.y, width: spec.width, height: spec.height, step: spec.step } },
      })
      if (cancelled || error !== undefined || !data) return

      for (const point of data.points) {
        const x = Number(point.x)
        const y = Number(point.y)
        pointsRef.current.set(`${x},${y},${point.type}`, {
          x,
          y,
          category: point.category,
          type: point.type,
          role: point.role,
          tier: point.tier ?? null,
        })
      }
    }).then(async () => {
      if (cancelled) return
      await draw()
      if (!cancelled) setShown(true)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, seed, originX, originY, width, height, cellPx, step, generation])

  // Toggling a category only redraws.
  const visibleKey = visibleCategories.join(",")
  useEffect(() => {
    void draw()
  }, [visibleKey, draw])

  // The catalog gives every icon its name and description for the tooltip.
  useEffect(() => {
    let cancelled = false
    void loadPoiCatalog().then((catalog) => {
      if (!cancelled) catalogRef.current = catalog
    })
    return () => {
      cancelled = true
    }
  }, [])

  // The canvas is click-through (it sits above the map but must not eat its input), so hover is
  // tracked on the window: over the bare map the pointer's target is the page's <main> wrapper (or
  // a canvas); over any panel or button it is something inside them, and then no tooltip is shown.
  useEffect(() => {
    function onMove(event: MouseEvent) {
      const overMap = event.target instanceof HTMLCanvasElement || (event.target instanceof HTMLElement && event.target.tagName === "MAIN")
      let found: Hit | undefined
      if (overMap) {
        // Topmost first: later icons were drawn over earlier ones.
        for (let i = hitsRef.current.length - 1; i >= 0; i--) {
          const hit = hitsRef.current[i]
          if (event.clientX >= hit.left && event.clientX <= hit.right && event.clientY >= hit.top && event.clientY <= hit.bottom) {
            found = hit
            break
          }
        }
      }

      if (!found) {
        setTip((current) => (current === null ? current : null))
        return
      }

      // Flip to the other side of the pointer before the box would clip.
      const flipX = event.clientX + TOOLTIP_MAX_WIDTH + TOOLTIP_MARGIN * 2 > window.innerWidth
      const flipY = event.clientY + 90 > window.innerHeight
      const x = flipX ? event.clientX - TOOLTIP_MARGIN - TOOLTIP_MAX_WIDTH : event.clientX + TOOLTIP_MARGIN
      const y = flipY ? event.clientY - TOOLTIP_MARGIN - 48 : event.clientY + TOOLTIP_MARGIN + 6
      setTip({ type: found.type, x: Math.max(TOOLTIP_MARGIN, x), y: Math.max(TOOLTIP_MARGIN, y) })
    }

    function onLeave() {
      setTip(null)
    }

    window.addEventListener("mousemove", onMove)
    document.addEventListener("mouseleave", onLeave)
    return () => {
      window.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  const entry = tip ? catalogRef.current?.entries.get(tip.type) : undefined

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 h-screen w-screen transition-opacity duration-500"
        style={{ opacity: shown ? 1 : 0 }}
      />
      {tip && entry && (
        <div
          role="tooltip"
          style={{ maxWidth: TOOLTIP_MAX_WIDTH, transform: `translate(${tip.x}px, ${tip.y}px)` }}
          className="bg-card pointer-events-none fixed top-0 left-0 z-30 rounded-md border px-2.5 py-1.5 shadow-lg"
        >
          <div className="text-sm leading-tight font-medium">{entry.label}</div>
          <div className="text-muted-foreground text-xs leading-snug">{entry.description}</div>
        </div>
      )}
    </>
  )
}
