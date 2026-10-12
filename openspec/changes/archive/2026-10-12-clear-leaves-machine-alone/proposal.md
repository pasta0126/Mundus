## Why

Clear is about the session memory, yet it turned the drums back to rest. Closing a session should never move the machine.

## What Changes

- Clear no longer turns the drums; it records the session and starts a new one, leaving the machine exactly as it is.
- Setting the maximum so that it closes the open session does not move the machine either.
- **BREAKING**: the requirement that Clear returns the drums to rest is replaced.

## Capabilities

### New Capabilities

### Modified Capabilities
- `slot-machine`: Clear and session closing leave the machine untouched.

## Impact

- `frontend/src/slots/SlotsPage.tsx`: Clear and the maximum commit no longer drive the machine.
