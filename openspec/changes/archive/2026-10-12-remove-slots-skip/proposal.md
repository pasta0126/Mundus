## Why

The Skip button that appears while the drums turn is unwanted and gets in the way of the controls.

## What Changes

- Remove the Skip control; a spin always plays its short animation to the end.
- **BREAKING**: the requirement that the person can skip the spin animation is removed. Reduced motion still lands each spin at once.

## Capabilities

### New Capabilities

### Modified Capabilities
- `slot-machine`: the spin presentation no longer offers skipping the animation.

## Impact

- `frontend/src/slots/SlotsPage.tsx`: the Skip button and its handler.
- The 3D scene's snap-to-symbols remains, used by Clear and by reduced motion.
