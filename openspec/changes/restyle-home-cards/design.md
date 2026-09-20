## Context

The home page is a static component (`home/HomePage.tsx`) that renders a grid of
four cards from a list. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Three tall stacked cards with distinct pastel backgrounds, still plain links with no requests.

**Non-Goals:**
- Any change to routes, the header or the version line.

## Decisions

**One column at every width.** The cards stack top to bottom on phones and
desktops alike, in a column capped at a readable width and centered, rather than
switching to a grid on wide screens. *Alternative:* a row of three on desktop -
rejected: the request is explicitly for vertical, top-down cards.

**Colours as Tailwind palette steps, with dark counterparts.** Each card uses a
light step of one palette (green for the map, violet for the planet, amber for
the system) with a deep matching step under `dark:`, so a dark theme would not
turn them into glare. Text keeps the theme's foreground colours, which stay
readable on both. *Alternative:* custom hex values - rejected: the palette steps
already give tuned pastels.

## Risks / Trade-offs

- [Pastel backgrounds could clash with the theme's muted text] → Body text uses
  the normal foreground colour, not the muted one, on the coloured cards.
