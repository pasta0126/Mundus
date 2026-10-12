## Why

Trying the slot machine showed that switching theme leaves the previous theme's result on screen, that there is no way to wipe the result without closing the session, and that the casino's bet and notice crowd the theme bar.

## What Changes

- Add a Clear action to the results section that discards the current result without recording it.
- Changing the theme or the number of reels resets the results area: the closed session is still recorded in the history, but its result is no longer shown and the drums return to rest.
- Group the controls by purpose: the theme bar holds only the themes and the number of reels, the casino's balance, bet and toy-credit notice sit in their own block that appears only in the casino, and the maximum spins sit with the spin controls.

## Capabilities

### New Capabilities

### Modified Capabilities
- `slot-machine`: changing theme or reels resets the results area; a Clear action; the controls are grouped by purpose.

## Impact

- `frontend/src/slots/SlotsPage.tsx` only: session reset behaviour and the layout of the control bar.
- No change to the engine, storage format or other pages.
