import { useEffect, useRef } from "react"
import { api } from "@/api/client"
import { effectiveDpr } from "@/lib/dpr"
import { CHUNK_CONCURRENCY, CHUNK_SIZE } from "@/map/constants"
import { computeChunkGrid, runWithConcurrency } from "@/map/tiling"

interface RegionBordersLayerProps {
  seed: string
  originX: number
  originY: number
  width: number
  height: number
  cellPx: number
  step: number
  generation: number
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

const BORDER_COLOR = "#8a5a3d"

/**
 * Solid, thin region-boundary overlay: the backend already excludes any
 * point that falls on open water (RegionGenerator), so this just plots
 * every point it returns. Mirrors MapCanvas's own generation-reset/
 * progressive-draw split and tiled fetch, but keeps its own canvas per
 * the layer-system design (map/layers.ts) - each overlay draws
 * independently, shown/hidden by its own visibility toggle.
 */
export function RegionBordersLayer({
  seed,
  originX,
  originY,
  width,
  height,
  cellPx,
  step,
  generation,
  onCanvasReady,
}: RegionBordersLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = effectiveDpr()
    const cssWidth = window.innerWidth
    const cssHeight = window.innerHeight
    canvas.width = Math.round(cssWidth * dpr)
    canvas.height = Math.round(cssHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssWidth, cssHeight)

    const windowWidthPx = width * cellPx
    const windowHeightPx = height * cellPx
    offsetRef.current = {
      x: (cssWidth - windowWidthPx) / 2,
      y: (cssHeight - windowHeightPx) / 2,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation])

  useEffect(() => {
    let cancelled = false
    const chunkSpecs = computeChunkGrid(originX, originY, width, height, CHUNK_SIZE, step)

    void runWithConcurrency(chunkSpecs, CHUNK_CONCURRENCY, async (spec) => {
      const { data, error } = await api.GET("/api/Regions", {
        params: { query: { seed, x: spec.x, y: spec.y, width: spec.width, height: spec.height, step: spec.step } },
      })
      if (cancelled || error !== undefined || !data) return

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const { x: offsetX, y: offsetY } = offsetRef.current

      ctx.fillStyle = BORDER_COLOR
      for (const point of data.points) {
        const px = offsetX + ((Number(point.x) - originX) / step) * cellPx
        const py = offsetY + ((Number(point.y) - originY) / step) * cellPx
        ctx.fillRect(px, py, cellPx + 0.5, cellPx + 0.5)
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, originX, originY, width, height, cellPx, step, generation])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-dvh w-screen" />
}
