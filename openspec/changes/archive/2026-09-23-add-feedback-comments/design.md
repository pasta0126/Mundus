## Context

Mundus's backend is an ASP.NET Core API (`Mundus.Api`) with no existing outbound-webhook or GitHub integration. Configuration flows through `.env` on the server (see `docker-compose.yml`'s `env_file: .env` for `mundus-api`), read as environment variables/`IConfiguration` - no secrets are committed. There is no database in this backend for anything comparable to user-submitted content, and this change must not introduce one (see proposal.md - Why).

## Goals / Non-Goals

**Goals:**
- Relay a feedback submission to Discord and GitHub with no server-side persistence.
- Keep the Discord webhook URL and GitHub token out of source control.
- Fail gracefully: if one sink (Discord or GitHub) fails, the other still gets attempted, and the person gets a clear success/failure response.

**Non-Goals:**
- No moderation, rate-limiting beyond basic abuse protection, or spam filtering beyond what's trivial (this is a low-traffic hobby site).
- No reading back of past submissions in the app (GitHub Issues and Discord history are the record).

## Decisions

- **Discord via incoming webhook**: the simplest integration with no OAuth - a POST of `{ content: "..." }` (or an embed) to a per-channel webhook URL. Stored as `Feedback__DiscordWebhookUrl` in the server `.env`.
- **GitHub via REST API** (`POST /repos/{owner}/{repo}/issues`) using a fine-grained personal access token with only "Issues: write" on the `Mundus` repo, stored as `Feedback__GitHubToken` (plus `Feedback__GitHubRepo`, e.g. `pasta0126/Mundus`) in the server `.env`. A plain `HttpClient` call - no SDK needed for one endpoint.
- **One backend endpoint** (`POST /api/Feedback`) fans out to both sinks server-side, rather than having the frontend call Discord/GitHub directly - keeps the webhook URL and token off the client entirely.
- **Kind → GitHub label mapping**: `comment` → no extra label (or `feedback`), `bug` → `bug`, `feature request` → `enhancement` - reusing GitHub's own default labels where they already mean the same thing.
- **Partial failure**: attempt both sinks independently; the endpoint succeeds (200) if at least one sink accepts the submission, and logs (server-side only) whichever sink failed. The person isn't shown which specific sink failed - just an overall success or "please try again" failure.

## Risks / Trade-offs

- [Discord webhook URL or GitHub token leak] → kept only in server-side `.env`/environment, never sent to or read by the frontend.
- [Spam/abuse via the public endpoint] → basic server-side validation (non-empty message, a reasonable max length); no CAPTCHA for this iteration given the site's low traffic - can be revisited if abused.
- [GitHub API rate limits] → a personal access token's rate limit (5000/hr) is far above any plausible traffic for this site.
- [One sink down] → the other still receives the submission; nothing is lost silently since it either lands in Discord, GitHub, or both.
