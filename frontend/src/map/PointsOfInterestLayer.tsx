import { useCallback, useEffect, useRef } from "react"
import { api } from "@/api/client"
import { CHUNK_CONCURRENCY, CHUNK_SIZE } from "@/map/constants"
import { SATELLITE_MAX_STEP, loadPoiIcons, poiIconPx, type PoiRole, type PoiStyle, type SettlementTier } from "@/map/poi"
import { computeChunkGrid, runWithConcurrency } from "@/map/tiling"

interface Poi {
  x: number
  y: number
  category: string
  type: string
  role: PoiRole
  tier: SettlementTier | null
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
  /** Which artwork set to draw with - switching it redraws without refetching. */
  style: PoiStyle
  /** Backend categories currently switched on - hidden ones are still fetched (one request per chunk) but never drawn. */
  visibleCategories: string[]
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
  /** Icon types of visible categories present in the current view - feeds the legend. */
  onTypesPresent?: (types: string[]) => void
}

/**
 * One canvas for every points-of-interest category: points for the whole
 * view are fetched once per chunk, then drawn (back to front, so lower
 * icons overlap higher ones) filtered by which categories are switched on -
 * toggling a category or the icon style redraws without refetching. A
 * settlement's anchor is drawn larger the bigger the settlement, and its
 * satellites (services) are dropped once zoomed out too far. Icons only, no labels.
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
  style,
  visibleCategories,
  onCanvasReady,
  onTypesPresent,
}: PointsOfInterestLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const pointsRef = useRef(new Map<string, Poi>())
  const drawTokenRef = useRef(0)
  const lastTypesRef = useRef("")

  // Latest props for the async draw, without re-creating it every render.
  const viewRef = useRef({ originX, originY, cellPx, step, style, visible: new Set(visibleCategories), onTypesPresent })
  viewRef.current = { originX, originY, cellPx, step, style, visible: new Set(visibleCategories), onTypesPresent }

  const draw = useCallback(async () => {
    const token = ++drawTokenRef.current
    const view = viewRef.current
    const points = [...pointsRef.current.values()]
      .filter((p) => view.visible.has(p.category) && (p.role !== "Satellite" || view.step <= SATELLITE_MAX_STEP))
      .sort((a, b) => a.y - b.y)
    const icons = await loadPoiIcons(view.style, points.map((p) => p.type))
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
    const present = new Set<string>()
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
      ctx.drawImage(img, px - w / 2, py - h / 2, w, h)
      if (px >= 0 && px <= cssWidth && py >= 0 && py <= cssHeight) present.add(p.type)
    }

    const key = [...present].sort().join(",")
    if (key !== lastTypesRef.current) {
      lastTypesRef.current = key
      view.onTypesPresent?.([...present].sort())
    }
  }, [])

  // A brand new view: fresh canvas, no points yet.
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
    lastTypesRef.current = ""
    void draw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation])

  // Fetch every chunk of the view once; a point near a chunk seam comes back from both, hence the keyed Map.
  useEffect(() => {
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
      void draw()
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, originX, originY, width, height, cellPx, step, generation])

  // Toggling a category or switching the icon style only redraws.
  const visibleKey = visibleCategories.join(",")
  useEffect(() => {
    void draw()
  }, [visibleKey, style, draw])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" />
}
