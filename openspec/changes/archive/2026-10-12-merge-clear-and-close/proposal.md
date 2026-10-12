## Why

Close session and Clear overlapped and confused: both left an empty session, and only the history differed. The casino controls also crowded the bottom bar.

## What Changes

- Clear does what Close session did: it records the session in the history, shows its result as the last closed session and starts a new one. The Close session control is removed.
- **BREAKING**: the requirement that Clear discards the result without recording it is replaced.
- The spin control becomes the largest button of the bottom bar, filling the free width and taking the theme's colour.
- In the casino, the balance, bets, reset and toy-credit notice move below the current session group.

## Capabilities

### New Capabilities

### Modified Capabilities
- `slot-machine`: Clear closes the session; the spin control's size and colour; where the casino controls sit.

## Impact

- `frontend/src/slots/SlotsPage.tsx`: the action row and the casino block's position.
