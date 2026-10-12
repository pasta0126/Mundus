## Why

The maximum number of spins is a property of the session, but it sits among the spin buttons, and changing it only affected the next session. Clear also dropped the drums to rest so abruptly that it looked as if nothing happened.

## What Changes

- Move the maximum spins field into the current session group and apply it to the open session once entered.
- A session that has already made as many spins as the new maximum closes at once.
- Clear turns the drums back to their resting symbols instead of jumping.

## Capabilities

### New Capabilities

### Modified Capabilities
- `slot-machine`: where the maximum is set and how it applies; how Clear returns the drums to rest.

## Impact

- `frontend/src/slots/SlotsPage.tsx` only: the field moves from the control bar to the session panel, and Clear animates the drums.
