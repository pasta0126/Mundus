import { useEffect, useRef } from "react"

/** A press that moves further than this before release is a drag, not a tap - matches the same slop used for dungeon-icon clicks. */
const CLICK_SLOP_PX = 5
/** A pinch must grow or shrink by this fraction from its last step before another zoom step fires - it moves through zoom steps, not continuously. */
const PINCH_STEP_THRESHOLD = 0.15
/** Successive wheel ticks within this long of each other count as the same zoom gesture, so a fast scroll doesn't fire one fetch per tick. */
const WHEEL_COOLDOWN_MS = 350

/**
 * Pointer-event drag-to-pan, pinch-to-zoom and wheel-to-zoom for the map,
 * all built on the same pointer events so a mouse, a finger or a stylus
 * are handled identically (see design.md - "Pointer events for
 * everything"). A press only starts a pan once it moves past the click
 * slop, so a tap (handled by PointsOfInterestLayer) is never mistaken for
 * a drag. Gestures are ignored when they start over a panel or control -
 * only the bare map (the canvas, or `<main>` itself) responds.
 */
export function useMapGestures({
  wrapperRef,
  onPanBy,
  onZoomStep,
}: {
  /** The element visually translated during a drag, for immediate feedback before the real re-fetch lands. */
  wrapperRef: React.RefObject<HTMLDivElement | null>
  /** Called once, at the end of a drag, with the total distance dragged in CSS pixels. */
  onPanBy: (dxPx: number, dyPx: number) => void
  /** Called for each zoom step a pinch or wheel gesture crosses. */
  onZoomStep: (direction: 1 | -1) => void
}) {
  // Latest callbacks, read fresh on every gesture without re-subscribing the
  // window listeners every render (same pattern App.tsx uses for viewWindowRef).
  const onPanByRef = useRef(onPanBy)
  onPanByRef.current = onPanBy
  const onZoomStepRef = useRef(onZoomStep)
  onZoomStepRef.current = onZoomStep

  useEffect(() => {
    /** True only for a pointerdown on the bare map - never a panel, button or input. */
    function overMap(event: PointerEvent | WheelEvent): boolean {
      return event.target instanceof HTMLCanvasElement || (event.target instanceof HTMLElement && event.target.tagName === "MAIN")
    }

    // -- Drag to pan (single active pointer) --------------------------------
    const active = new Map<number, { x: number; y: number }>()
    let dragPointerId: number | null = null
    let dragStart = { x: 0, y: 0 }
    let dragMoved = false

    // -- Pinch to zoom (two active pointers) ---------------------------------
    let pinchBaseDistance: number | null = null

    function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    function resetWrapperTransform() {
      if (wrapperRef.current) wrapperRef.current.style.transform = ""
    }

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return
      active.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (active.size === 1) {
        if (!overMap(event)) {
          active.clear()
          return
        }
        dragPointerId = event.pointerId
        dragStart = { x: event.clientX, y: event.clientY }
        dragMoved = false
      } else if (active.size === 2) {
        // A second finger joined mid-drag: this is a pinch, not a pan - cancel any drag in progress.
        dragPointerId = null
        dragMoved = false
        resetWrapperTransform()
        const [a, b] = [...active.values()]
        pinchBaseDistance = distance(a, b)
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (!active.has(event.pointerId)) return
      active.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (active.size >= 2) {
        const [a, b] = [...active.values()]
        const current = distance(a, b)
        if (pinchBaseDistance === null || pinchBaseDistance === 0) {
          pinchBaseDistance = current
          return
        }
        const ratio = current / pinchBaseDistance
        if (ratio >= 1 + PINCH_STEP_THRESHOLD) {
          onZoomStepRef.current(-1) // pinch out (fingers spreading) - one step in, matching the "Zoom in" button's direction
          pinchBaseDistance = current
        } else if (ratio <= 1 - PINCH_STEP_THRESHOLD) {
          onZoomStepRef.current(1)
          pinchBaseDistance = current
        }
        return
      }

      if (event.pointerId !== dragPointerId) return
      const dx = event.clientX - dragStart.x
      const dy = event.clientY - dragStart.y
      if (!dragMoved && Math.hypot(dx, dy) < CLICK_SLOP_PX) return
      dragMoved = true
      if (wrapperRef.current) wrapperRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }

    function endPointer(event: PointerEvent) {
      active.delete(event.pointerId)
      if (active.size < 2) pinchBaseDistance = null

      if (event.pointerId === dragPointerId) {
        dragPointerId = null
        if (dragMoved) {
          const dx = event.clientX - dragStart.x
          const dy = event.clientY - dragStart.y
          // The wrapper is left translated by (dx, dy) - App.tsx clears it once the re-fetched view lands, so the dragged position holds instead of snapping back while loading.
          onPanByRef.current(dx, dy)
        }
        dragMoved = false
      }
    }

    // -- Wheel to zoom --------------------------------------------------------
    let lastWheelAt = 0
    function onWheel(event: WheelEvent) {
      if (!overMap(event)) return
      event.preventDefault()
      const now = performance.now()
      if (now - lastWheelAt < WHEEL_COOLDOWN_MS) return
      lastWheelAt = now
      onZoomStepRef.current(event.deltaY < 0 ? -1 : 1)
    }

    window.addEventListener("pointerdown", onPointerDown)
    window.addEventListener("pointermove", onPointerMove)
    window.addEventListener("pointerup", endPointer)
    window.addEventListener("pointercancel", endPointer)
    window.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", endPointer)
      window.removeEventListener("pointercancel", endPointer)
      window.removeEventListener("wheel", onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
