## Why

Mundus has no page that explains what it is, and no metadata describing it when a link is shared (social preview, search results). To let people discover and understand the tool, the site needs an "About" page and basic SEO/social-preview metadata.

## What Changes

- Add an `/about` page describing what Mundus is and what it offers (map, planets, systems, dice), reachable from a small footer link on the home hub.
- Add descriptive `<meta>` tags (description) and Open Graph / Twitter Card tags (title, description, image) to `index.html` so shared links show a useful preview.
- This page will later also host the donation link and feedback form (separate changes), but this change only adds the page itself, its content and the site metadata.

## Capabilities

### New Capabilities

- `about-page`: an `/about` route describing Mundus, plus the site's shareable metadata (description, Open Graph/Twitter Card tags).

### Modified Capabilities

- `home-hub`: the home page gains a small footer with a link to `/about`.

## Impact

- `frontend/index.html`: add meta description and Open Graph/Twitter Card tags.
- `frontend/src/main.tsx`: route `/about` to a new `AboutPage`.
- `frontend/src/about/AboutPage.tsx`: new page.
- `frontend/src/home/HomePage.tsx`: add a footer with an "About" link.
