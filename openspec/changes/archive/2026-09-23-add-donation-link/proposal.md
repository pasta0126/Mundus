## Why

Mundus has no way for a visitor to support the project financially. The owner already has an active Buy Me a Coffee page (`buymeacoffee.com/pasta0126`); the site should link to it.

## What Changes

- Add a "Support" / "Buy me a coffee" link on the About page (`/about`, added in `add-about-page`) that opens the owner's existing Buy Me a Coffee page in a new tab.

## Capabilities

### New Capabilities

- `donations`: a visible link on the site that lets a visitor go donate via Buy Me a Coffee.

### Modified Capabilities

(none - this only adds content to the About page created by `add-about-page`, not a new requirement of that capability)

## Impact

- `frontend/src/about/AboutPage.tsx`: add a "Support this project" section with a Buy Me a Coffee link/button.
