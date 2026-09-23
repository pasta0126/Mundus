## 1. Backend endpoint

- [x] 1.1 Add `Feedback__DiscordWebhookUrl`, `Feedback__GitHubToken` and `Feedback__GitHubRepo` configuration options to `Mundus.Api`.
- [x] 1.2 Add a `FeedbackController` with `POST /api/Feedback` accepting `{ kind: "Comment" | "Bug" | "Feature", message, name? }`, validating a non-empty, length-capped `message`.
- [x] 1.3 Implement the Discord relay: POST a formatted message to the webhook URL.
- [x] 1.4 Implement the GitHub relay: create an Issue via the GitHub REST API, titled from the kind/message, labeled per the kind → label mapping, using the configured token and repo.
- [x] 1.5 Fan out to both sinks independently; return success if at least one succeeds, logging any failure server-side.

## 2. Frontend form

- [x] 2.1 Add a feedback form section to `frontend/src/about/AboutPage.tsx`: kind selector, message textarea, optional name field, submit button.
- [x] 2.2 Wire submission to `POST /api/Feedback`, show a confirmation on success and an error message on failure, and reject an empty message client-side too.

## 3. Deploy configuration

- [x] 3.1 Document the required `.env` entries (`Feedback__DiscordWebhookUrl`, `Feedback__GitHubToken`, `Feedback__GitHubRepo`) for the server deploy.

## 4. Spec sync

- [ ] 4.1 Archive this change, syncing the new `feedback` capability into the main specs.
