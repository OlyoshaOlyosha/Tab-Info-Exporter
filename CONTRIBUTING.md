# Contributing to Tab Info Exporter

## Setup

This is a plain ES-module Firefox MV3 extension — no build step, bundler, or runtime dependency. The browser loads source files directly.

**Quick start:**

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json`.
3. After editing any source file, click **Reload** on the add-on page.
4. Popup console: right-click the popup → **Inspect**. Background console: **Inspect** next to the add-on on the `about:debugging` page.

## Testing & linting

- Unit tests: `node --test` (covers `tests/lib.test.mjs`).
- Lint: `npx web-ext lint`.

## Icons

The extension reads `icons/icon-48.png`, `icons/icon-96.png`, and `icons/icon-128.png`. Replace them (same names and sizes) to customize the toolbar and extension icon.

## Known ceiling

Firefox's `tabs.Tab` API exposes no tab creation timestamp (only `lastAccessed`). The "Date opened" value is the first time the extension *saw* the tab, tracked by `background.js` as first-seen time per tab id in `storage.local`. Session-restored tabs receive the restart moment. This matches comparable extensions — it is not a bug.

## Permissions

Minimal and unchanged: `tabs`, `storage`, `downloads`, `clipboardWrite`. No host permissions are requested.

## Architecture

- `manifest.json` — MV3 entry point (popup + event-page background).
- `background.js` — first-seen tracking per tab id.
- `lib.js` — pure logic: CSV builder (RFC 4180), JSON builder, sort comparators, ISO 8601 dates. Imported by both `popup.js` and `node --test`.
- `popup.js` / `popup.html` — DOM wiring and UI.
- `i18n.js` + `_locales/` — localization.
- `tests/lib.test.mjs` — unit tests.
