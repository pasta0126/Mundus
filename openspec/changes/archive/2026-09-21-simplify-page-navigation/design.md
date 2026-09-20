## Context

The row of buttons is a single shared component (`PageNav`) used by the map,
planet, system and dungeon pages; every page's title already links to `/`. See
proposal.md - Why.

## Goals / Non-Goals

**Goals:**
- Remove the row everywhere and leave no dead code.

**Non-Goals:**
- Changing the home page, the routes, or how a dungeon returns to its map.

## Decisions

**Delete the component rather than hide it.** With no page using it, `PageNav`
(and its `mapHref` special case for dungeons) goes away. The dungeon page keeps
its own "Back to map" button in the panel, which is a return to a specific view,
not navigation between generators. *Alternative:* keep the component and render
nothing - rejected: dead code that invites reintroducing the row.

**No change to the title link.** It is already a link to `/` with an accessible
label on all four pages.

## Risks / Trade-offs

- [Getting from a planet to a system now takes two clicks (title, then hub)] →
  Intended: that is what the hub is for.
