interface StartPositionStepProps {
  x: string
  y: string
  onChange: (value: { x: string; y: string }) => void
}

export function StartPositionStep({ x, y, onChange }: StartPositionStepProps) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Start Position</div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="start-x" className="text-muted-foreground text-xs">
            X
          </label>
          <input
            id="start-x"
            type="number"
            inputMode="numeric"
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
            placeholder="0"
            value={x}
            onChange={(e) => onChange({ x: e.target.value, y })}
          />
        </div>
        <div className="flex-1 space-y-1">
          <label htmlFor="start-y" className="text-muted-foreground text-xs">
            Y
          </label>
          <input
            id="start-y"
            type="number"
            inputMode="numeric"
            className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
            placeholder="0"
            value={y}
            onChange={(e) => onChange({ x, y: e.target.value })}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Where to center the map when it first loads. Leave blank for (0, 0)
        - you can pan anywhere from there afterward.
      </p>
    </div>
  )
}
