import { useEffect, useRef } from "react"
import { api } from "@/api/client"
import { CHUNK_CONCURRENCY, CHUNK_SIZE } from "@/map/constants"
import { computeChunkGrid, runWithConcurrency } from "@/map/tiling"

interface RiversLayerProps {
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

const RIVER_COLOR = "#4a7fa8"

/**
 * Solid river-stroke overlay: draws each segment the backend returns as
 * a line (RiverGenerator already handles meander/confluence/termination
 * server-side). Mirrors RegionBordersLayer's structure - its own canvas,
 * generation-reset/tiled-fetch split - per the layer-system design
 * (map/layers.ts).
 */
export function RiversLayer({ seed, originX, originY, width, height, cellPx, step, generation, onCanvasReady }: RiversLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    onCanvasReady?.(canvas)
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
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
      const { data, error } = await api.GET("/api/Rivers", {
        params: { query: { seed, x: spec.x, y: spec.y, width: spec.width, height: spec.height, step: spec.step } },
      })
      if (cancelled || error !== undefined || !data) return

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const { x: offsetX, y: offsetY } = offsetRef.current

      ctx.strokeStyle = RIVER_COLOR
      ctx.lineWidth = Math.max(1, cellPx)
      ctx.lineCap = "round"
      for (const segment of data.segments) {
        const x1 = offsetX + ((Number(segment.x1) - originX) / step) * cellPx
        const y1 = offsetY + ((Number(segment.y1) - originY) / step) * cellPx
        const x2 = offsetX + ((Number(segment.x2) - originX) / step) * cellPx
        const y2 = offsetY + ((Number(segment.y2) - originY) / step) * cellPx
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, originX, originY, width, height, cellPx, step, generation])

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-screen w-screen" />
}
