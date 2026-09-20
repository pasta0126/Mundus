## Context

The home page is a static component (`home/HomePage.tsx`) that renders a grid of
four cards from a list. See proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Three tall cards side by side with distinct pastel backgrounds, still plain links with no requests.

**Non-Goals:**
- Any change to routes, the header or the version line.

## Decisions

**Three columns from a medium width up, one column below.** A three-column grid
with cards given a minimum height well above their width makes them vertical; on
a narrow window the grid collapses to one column so the cards stay legible.
Inside a card the icon sits at the top and the text at the bottom, which reads
better in a tall card than a centred block. *Alternative:* always stack the
cards - rejected: the request is for three columns.

**Colours as Tailwind palette steps, with dark counterparts.** Each card uses a
light step of one palette (green for the map, violet for the planet, amber for
the system) with a deep matching step under `dark:`, so a dark theme would not
turn them into glare. Text keeps the theme's foreground colours, which stay
readable on both. *Alternative:* custom hex values - rejected: the palette steps
already give tuned pastels.

## Risks / Trade-offs

- [Pastel backgrounds could clash with the theme's muted text] → Body text uses
  the normal foreground colour, not the muted one, on the coloured cards.
