## Why

Mundus is a toolbox for tabletop role-playing, and its only random-outcome tool today is the dice tray. A slot machine adds a second, different kind of chance: one that reads a *set* of spins as a single story (the weather today, how enraged a creature is, what loot a chest holds) and, with a casino theme, doubles as a small game of chance.

## What Changes

- Add a slot machine page at `/slots`: a single row of 3 or 5 reels, spun by the person, themed by a selectable theme.
- Present the reels as a low-poly 3D machine - drums with one face per symbol, a cabinet in the theme's colour and a lever - in the style of the dice and planet pages, with a flat fallback.
- Add four built-in themes, each a set of 6 weighted symbols: weather, creature mood, fortune/loot and casino.
- Group spins into sessions. A session is free (no spin limit, closed by the person) unless a maximum number of spins is set, in which case it closes itself on the last spin.
- Read a session's spins together, not one by one, in one of three modes chosen by the theme: blend (dominant symbol plus secondary and trace symbols), loot (a count per symbol) or payout (casino credits). A spin whose reels all show the same symbol is a "full match" and acts as a bonus.
- Add a casino theme with a toy-credit balance, a bet per spin and a reset, persisted in the browser, with no real money involved.
- Keep a history of closed sessions in the browser (last 100, JSON export, delete all), following the dice tray's pattern.
- Add a slot machine section to the About page.
- Change the home page from four vertical cards to five: three vertical cards (map, planet, system) in a first row and two horizontal cards (dice, slots) in a second row, each taking half of the full width.
- **BREAKING**: the home-hub requirement that the home page presents "exactly four large vertical cards" is replaced.

## Capabilities

### New Capabilities
- `slot-machine`: the `/slots` page, reels and spinning, themes and symbols, sessions, result reading modes, the casino balance, session history and export.

### Modified Capabilities
- `home-hub`: the card layout changes from four vertical cards in one row to three vertical cards plus two horizontal cards, and gains a slot machine card.
- `about-page`: the About page lists the slot machine among what Mundus offers and gets a section for it.

## Impact

- New frontend page and components under `frontend/src/slots/` and a route for `/slots`; no backend or API change.
- `frontend/src/home/HomePage.tsx` changes its card layout and gains a card.
- `frontend/src/about/AboutPage.tsx` gains a slot machine section.
- Browser storage gains two keys: the session history and the casino balance.
- No new runtime dependencies (three.js is already used by the dice and planet pages); symbol icons are inline SVG drawn in code, so no external assets are required.
