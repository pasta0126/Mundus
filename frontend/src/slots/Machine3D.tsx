import { useEffect, useImperativeHandle, useRef, type Ref } from "react"
import { createMachine, type Insets, type MachineHandle } from "./machineScene.ts"
import type { ReelCount, Theme } from "./themes.ts"

export interface Machine3DHandle {
  spin(symbols: string[], onSettled: () => void): void
  snap(symbols: string[]): void
}

interface Machine3DProps {
  ref?: Ref<Machine3DHandle>
  theme: Theme
  reels: ReelCount
  /** What the drums show when the theme or reel count changes: the last spin, or null for the theme's first symbols. */
  shown: string[] | null
  /** Screen space covered by the page's overlaid controls. */
  insets: Insets
  onPull: () => void
  /** Called if the 3D scene cannot be created (no WebGL), so the page can fall back to the flat reels. */
  onUnavailable: () => void
}

/** Hosts the 3D machine (see machineScene.ts) and drives it from the page. The DOM readout stays in the page. */
export function Machine3D({ ref, theme, reels, shown, insets, onPull, onUnavailable }: Machine3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const machine = useRef<MachineHandle | null>(null)
  const latest = useRef({ theme, reels, shown, insets, onPull })
  latest.current = { theme, reels, shown, insets, onPull }

  useImperativeHandle(ref, () => ({
    spin: (symbols, onSettled) => machine.current?.spin(symbols, onSettled),
    snap: (symbols) => machine.current?.snap(symbols),
  }))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let created: MachineHandle
    try {
      created = createMachine(container, () => latest.current.onPull())
    } catch {
      onUnavailable()
      return
    }
    machine.current = created
    created.setInsets(latest.current.insets)
    created.configure(latest.current.theme, latest.current.reels, latest.current.shown)
    return () => {
      created.dispose()
      machine.current = null
    }
    // The scene is created once; theme and reel changes go through configure below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    machine.current?.configure(theme, reels, latest.current.shown)
  }, [theme, reels])

  useEffect(() => {
    machine.current?.setInsets(insets)
  }, [insets.top, insets.right, insets.bottom, insets.left]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} className="absolute inset-0" role="img" aria-label={`${theme.name} slot machine with ${reels} reels`} />
}
