import { ICON_MARKUP } from "./iconMarkup.ts"

interface SymbolIconProps {
  id: string
  className?: string
}

/** The flat icon of a slot symbol, in the current text colour. */
export function SymbolIcon({ id, className }: SymbolIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: ICON_MARKUP[id] ?? '<circle cx="12" cy="12" r="8" />' }}
    />
  )
}
