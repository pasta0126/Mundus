## Why

Every submission currently goes to both Discord and GitHub. Conversation-style feedback belongs in Discord, while bugs and feature requests belong in GitHub Issues where they can be tracked. Visitors should also be able to jump straight to either place.

## What Changes

- Comments are relayed only to Discord; bugs and feature requests only create a GitHub Issue.
- The About page's feedback section gains a "Join the Discord" button and a "View the repository" button.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `feedback`: routing by kind, plus direct links to Discord and the repository.

## Impact

- `backend/src/Mundus.Api/Controllers/FeedbackController.cs`: route by kind.
- `frontend/src/about/AboutPage.tsx`: two link buttons.
