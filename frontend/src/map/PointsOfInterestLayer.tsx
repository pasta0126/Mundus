import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "cn"
import { api } from "@/api/client"
import { Button } from "@/components/ui/button"
import { loadDungeonIcons } from "@/dungeons/art"
import { effectiveDpr } from "@/lib/dpr"
import { CHUNK_CONCURRENCY, CHUNK_SIZE, ZOOM_LEVELS } from "@/map/constants"
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
  /** True when this point holds a dungeon that can be entered. */
  dungeon: boolean
}

/** Where one icon was last drawn, in CSS pixels - what hover looks up. */
interface Hit {
  type: string
  x: number
  y: number
  dungeon: boolean
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

/** A press that moves further than this before release is a drag, not a click. */
const CLICK_SLOP_PX = 5

/** The "!" badge on an icon that holds a dungeon: a share of the icon's size, kept readable on small ones. */
function badgePx(iconPx: number): number {
  return Math.min(28, Math.max(18, iconPx * 0.42))
}

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
  const tipRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  // pinned: shown by a tap (touch) rather than hover (mouse) - stays until the person taps
  // elsewhere or its "Enter" control, instead of following the pointer.
  const [tip, setTip] = useState<{ type: string; dungeon: boolean; hitX: number; hitY: number; x: number; y: number; pinned: boolean } | null>(null)

  // Latest props for the async draw, without re-creating it every render.
  const seedRef = useRef(seed)
  seedRef.current = seed
  const viewRef = useRef({ originX, originY, cellPx, step, visible: new Set(visibleCategories) })
  viewRef.current = { originX, originY, cellPx, step, visible: new Set(visibleCategories) }

  const draw = useCallback(async () => {
    const token = ++drawTokenRef.current
    const view = viewRef.current
    const points = [...pointsRef.current.values()]
      .filter((p) => view.visible.has(p.category) && (p.role !== "Satellite" || view.step <= SATELLITE_MAX_STEP))
      .sort((a, b) => a.y - b.y)
    const [icons, marks] = await Promise.all([
      loadPoiIcons(points.map((p) => p.type)),
      loadDungeonIcons(points.some((p) => p.dungeon) ? ["dungeon-badge"] : []),
    ])
    if (token !== drawTokenRef.current) return // a newer draw superseded this one
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = effectiveDpr()
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
      const badge = p.dungeon ? marks.get("dungeon-badge") : undefined
      // Hovering and clicking follow the drawn area, which for a dungeon includes its badge.
      let right = px + w / 2
      let top = py - h
      if (badge) {
        // Pinned to the icon's top-right corner, half outside it, like a notification dot.
        const bh = badgePx(size)
        const bw = (badge.naturalWidth / badge.naturalHeight) * bh
        ctx.drawImage(badge, px + w / 2 - bw * 0.7, py - h - bh * 0.3, bw, bh)
        right = Math.max(right, px + w / 2 + bw * 0.3)
        top = Math.min(top, py - h - bh * 0.3)
      }
      hits.push({ type: p.type, x: p.x, y: p.y, dungeon: p.dungeon, left: px - w / 2, top, right, bottom: py })
    }
    hitsRef.current = hits
  }, [])

  // A brand new view: fresh canvas, no points yet, hidden until its icons have arrived.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)

    const dpr = effectiveDpr()
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
          dungeon: point.dungeon != null,
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

  function enter(hit: { x: number; y: number; type: string }) {
    const view = viewRef.current
    const query = new URLSearchParams({
      map: seedRef.current,
      x: String(hit.x),
      y: String(hit.y),
      type: hit.type,
      zoom: String(ZOOM_LEVELS.findIndex((level) => level.step === view.step) + 1),
    })
    window.location.assign(`/dungeons?${query}`)
  }

  // The canvas is click-through (it sits above the map but must not eat its input), so every
  // gesture is tracked on the window: over the bare map the pointer's target is the page's
  // <main> wrapper (or a canvas); over any panel or button it is something inside them, and
  // then no tooltip is shown and no tap is handled. A mouse keeps hover-shows/click-enters,
  // unchanged; a touch (or pen) shows a tip on tap that stays until tapping elsewhere or its
  // "Enter" control - or entering by tapping the same icon again (see mobile-support spec).
  useEffect(() => {
    /** The icon under the pointer, if the pointer is over the bare map (never over a panel or control). */
    function hitAt(event: PointerEvent): Hit | undefined {
      const overMap = event.target instanceof HTMLCanvasElement || (event.target instanceof HTMLElement && event.target.tagName === "MAIN")
      if (!overMap) return undefined
      // Topmost first: later icons were drawn over earlier ones.
      for (let i = hitsRef.current.length - 1; i >= 0; i--) {
        const hit = hitsRef.current[i]
        if (event.clientX >= hit.left && event.clientX <= hit.right && event.clientY >= hit.top && event.clientY <= hit.bottom) {
          return hit
        }
      }
      return undefined
    }

    /** Where the tip box goes for a hit found at (clientX, clientY) - flipped to the other side of the pointer before it would clip the viewport. */
    function tipPosition(clientX: number, clientY: number) {
      const flipX = clientX + TOOLTIP_MAX_WIDTH + TOOLTIP_MARGIN * 2 > window.innerWidth
      const flipY = clientY + 90 > window.innerHeight
      const x = flipX ? clientX - TOOLTIP_MARGIN - TOOLTIP_MAX_WIDTH : clientX + TOOLTIP_MARGIN
      const y = flipY ? clientY - TOOLTIP_MARGIN - 48 : clientY + TOOLTIP_MARGIN + 6
      return { x: Math.max(TOOLTIP_MARGIN, x), y: Math.max(TOOLTIP_MARGIN, y) }
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return // touch has no hover; its tip is shown on tap instead, below
      const found = hitAt(event)
      if (!found) {
        setTip((current) => (current === null || current.pinned ? current : null))
        return
      }
      setTip({ type: found.type, dungeon: found.dungeon, hitX: found.x, hitY: found.y, ...tipPosition(event.clientX, event.clientY), pinned: false })
    }

    function onLeave(event: PointerEvent) {
      if (event.pointerType !== "mouse") return
      setTip((current) => (current?.pinned ? current : null))
    }

    // A press that travelled is a drag and does nothing here - the map's own gestures (see
    // useMapGestures) already treat it as a pan, and a mouse click that travelled is likewise ignored.
    let pressed: { x: number; y: number; pointerType: string } | null = null
    function onDown(event: PointerEvent) {
      pressed = { x: event.clientX, y: event.clientY, pointerType: event.pointerType }
    }

    function onUp(event: PointerEvent) {
      const start = pressed
      pressed = null
      if (!start || start.pointerType !== event.pointerType) return
      if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_SLOP_PX) return
      // A tap on the pinned tip itself (its "Enter" control) is that control's own job - touch
      // fires pointerup, then a separate "click" a moment later; changing tip state here first
      // could unmount the button before that click arrives.
      if (event.target instanceof Node && tipRef.current?.contains(event.target)) return

      if (event.pointerType === "mouse") {
        // Unchanged from before touch support: a click on a dungeon enters it directly.
        const found = hitAt(event)
        if (found?.dungeon) enter(found)
        return
      }

      const found = hitAt(event)
      setTip((current) => {
        if (!found) return current?.pinned ? null : current // tapped elsewhere: dismiss a pinned tip, leave nothing else alone
        if (current?.pinned && current.hitX === found.x && current.hitY === found.y && current.type === found.type) {
          // Tapping the same icon again: the second half of "tap shows, tap (or Enter) enters".
          if (found.dungeon) enter(found)
          return current
        }
        return { type: found.type, dungeon: found.dungeon, hitX: found.x, hitY: found.y, ...tipPosition(event.clientX, event.clientY), pinned: true }
      })
    }

    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    document.addEventListener("pointerleave", onLeave)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      document.removeEventListener("pointerleave", onLeave)
    }
  }, [])

  // The pointer shows that an icon can be clicked only over a dungeon (mouse hover only - touch has no hover cursor).
  const overDungeon = tip?.dungeon === true && !tip.pinned
  useEffect(() => {
    if (!overDungeon) return
    document.body.style.cursor = "pointer"
    return () => {
      document.body.style.cursor = ""
    }
  }, [overDungeon])

  const entry = tip ? catalogRef.current?.entries.get(tip.type) : undefined

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen transition-opacity duration-500"
        style={{ opacity: shown ? 1 : 0 }}
      />
      {tip && entry && (
        <div
          ref={tipRef}
          role="tooltip"
          style={{ maxWidth: TOOLTIP_MAX_WIDTH, transform: `translate(${tip.x}px, ${tip.y}px)` }}
          className={cn("bg-card fixed top-0 left-0 z-30 rounded-md border px-2.5 py-1.5 shadow-lg", tip.pinned ? "pointer-events-auto" : "pointer-events-none")}
        >
          <div className="text-sm leading-tight font-medium">{entry.label}</div>
          <div className="text-muted-foreground text-xs leading-snug">{entry.description}</div>
          {tip.dungeon && !tip.pinned && (
            <div className="mt-1 text-xs leading-snug font-medium">
              Dungeon <span className="text-muted-foreground font-normal">– Something lurks below. Click to enter.</span>
            </div>
          )}
          {tip.dungeon && tip.pinned && (
            <Button size="sm" className="mt-1.5 w-full" onClick={() => enter({ x: tip.hitX, y: tip.hitY, type: tip.type })}>
              Enter
            </Button>
          )}
        </div>
      )}
    </>
  )
}
