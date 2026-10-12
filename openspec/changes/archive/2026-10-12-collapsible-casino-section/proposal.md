## Why

The casino's balance, bets and notice take a block of their own that crowds the side panel and, on narrow screens, the spin bar. Most of the time only the balance matters.

## What Changes

- The casino controls become a collapsible section of the current session group, right below the maximum spins field, collapsed by default.
- While collapsed it still shows the balance in toy credits and the bet, and warns when the balance can't cover the bet.
- The casino block no longer sits apart in the side column or above the spin control.

## Capabilities

### New Capabilities

### Modified Capabilities
- `slot-machine`: where the casino controls sit and that they are a collapsed-by-default section.

## Impact

- `frontend/src/slots/SlotsPage.tsx`: the casino block moves into the session group as a collapsible section.
