import * as React from "react"
import { X } from "lucide-react"
import { cn } from "cn"
import { Dialog } from "radix-ui"

/**
 * A panel that slides in from the bottom over a dimmed backdrop - used below
 * the 768px breakpoint in place of a page's normal side/top panel, so it
 * never covers more than a small part of the content while closed and is
 * easy to dismiss (tap the backdrop, the close button, or Escape) while open.
 * Built on radix-ui's Dialog primitive already in the project's
 * dependencies - no new package needed.
 */
function Sheet(props: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof Dialog.Trigger>) {
  return <Dialog.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal(props: React.ComponentProps<typeof Dialog.Portal>) {
  return <Dialog.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof Dialog.Overlay>) {
  return (
    <Dialog.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-black/50",
        className,
      )}
      {...props}
    />
  )
}

function SheetContent({ className, children, ...props }: React.ComponentProps<typeof Dialog.Content>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        data-slot="sheet-content"
        className={cn(
          "bg-card data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-40 flex max-h-[80dvh] flex-col gap-3 rounded-t-2xl border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl outline-none duration-300",
          className,
        )}
        {...props}
      >
        {/* A small drag-handle affordance - purely visual, the sheet itself is dismissed by the close button, the backdrop or Escape. */}
        <div aria-hidden className="bg-muted-foreground/30 mx-auto h-1.5 w-10 shrink-0 rounded-full" />
        {children}
        <Dialog.Close className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute top-3 right-3 flex size-11 items-center justify-center rounded-lg focus-visible:ring-3 focus-visible:outline-none">
          <X className="size-5" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-1 pr-8", className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title data-slot="sheet-title" className={cn("text-base font-semibold", className)} {...props} />
}

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger }
