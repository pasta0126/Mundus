## Why

Visitors have no way to leave a comment, report a bug or request a feature without going to GitHub directly. A simple in-app form lowers that bar, and routing it to Discord and GitHub Issues keeps the owner informed in real time without standing up a database or a comments moderation system.

## What Changes

- Add a feedback form on the About page (`/about`, from `add-about-page`) where a visitor can leave a name (optional), a message, and pick a kind (comment / bug / feature request).
- Add a backend endpoint that, on submission: posts the feedback to a Discord channel via a webhook, and creates a GitHub Issue in the project's repository (labeled by kind).
- No database: each submission is relayed immediately to Discord and GitHub: nothing is stored server-side.

## Capabilities

### New Capabilities

- `feedback`: a visitor-facing form that relays comments, bugs and feature requests to Discord and GitHub Issues, with no server-side storage.

### Modified Capabilities

(none)

## Impact

- `backend/src/Mundus.Api/Controllers`: new `FeedbackController` (or endpoint) accepting `{ kind, message, name? }`, posting to a Discord webhook and creating a GitHub Issue.
- `backend/src/Mundus.Api` configuration: new settings for the Discord webhook URL, the GitHub repository and a GitHub personal access token (from environment/`.env`, not committed).
- `frontend/src/about/AboutPage.tsx`: add a feedback form section.
- `docker-compose.yml` / server `.env`: new environment variables for the Discord webhook URL and GitHub token.
