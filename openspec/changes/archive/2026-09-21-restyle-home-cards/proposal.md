## Why

Dungeons are always reached through a map, so a card for them on the home page
promises a destination that does not exist on its own. The hub reads better as
three big choices side by side, one per thing that can be generated, each easy to
tell apart at a glance.

## What Changes

- Remove the dungeons card from the home page.
- Lay the remaining three cards (map, planet, system) out side by side in three columns, each a tall vertical card; on a narrow window they stack.
- Give each card its own pastel background colour.
- **BREAKING**: the requirement that the hub has a dungeons card is removed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `home-hub`: the home page presents exactly three large vertical cards in three columns, each in its own pastel colour, and no dungeons card.

## Impact

- Frontend: the home page component only.
- No backend, API or route change.
