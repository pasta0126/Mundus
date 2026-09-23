## 1. History storage

- [x] 1.1 Add a `clearHistory()` function to `frontend/src/dice/history.ts` that removes the persisted history from storage.

## 2. History sheet UI

- [x] 2.1 In `frontend/src/dice/DicePage.tsx`, add a "Clear history" button to `historySheetContent`'s header, to the left of the existing "Download" button, disabled when the history is empty.
- [x] 2.2 Wire the button to clear both the `history` state and persisted storage via `clearHistory()`.

## 3. Spec sync

- [ ] 3.1 Archive this change, syncing the `dice-roller` spec's "Roll history" requirement.
