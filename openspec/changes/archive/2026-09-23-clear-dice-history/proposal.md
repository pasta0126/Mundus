## Why

The dice tray's History sheet lets a person download their roll history but gives them no way to delete it. Once the 100-entry cap is reached, or the person simply wants a clean slate, the only way to clear stored rolls is to manually clear browser storage. A person should be able to erase their history from within the app.

## What Changes

- Add a "Clear history" button in the History sheet's header, placed to the left of the existing "Download" button.
- Using this button deletes every stored history entry immediately (no per-entry deletion), clearing both the in-memory list and the persisted browser storage.
- The button is disabled when the history is already empty, matching the existing "Download" button's disabled behavior.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `dice-roller`: the "Roll history" requirement gains the ability for a person to delete the entire stored history at once, in addition to downloading it.

## Impact

- `frontend/src/dice/history.ts`: add a `clearHistory()` function that empties persisted storage.
- `frontend/src/dice/DicePage.tsx`: add the "Clear history" button to `historySheetContent`, wired to clear both state and storage.
