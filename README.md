# Tab Info Exporter

A read-only Firefox extension that exports the metadata of all open tabs to
CSV, JSON, plain text, or Markdown — either copied to the clipboard or saved as
a file. It never modifies, moves, or closes tabs.

## Features

- Export metadata for **all open tabs** across all windows in one action.
- Output formats: **Markdown**, **TXT**, **JSON**, and **CSV**.
- Send the result to the **clipboard** or **download** it as a file.
- **Sortable** with 9 modes (by title, URL, last visit, date opened, or browser order).
- **Selectable fields** — choose exactly which columns to include.
- **Group by domain** for TXT and Markdown (optional count in domain headers).
- **Per-tab "date opened"** tracked locally by the extension (see Known limitation).
- **Runtime UI language** switch: English, Russian, Spanish; the choice persists.
- UI preferences (format, sort, fields, grouping, domain counts, language) are
  remembered between popup opens.
- **Visual preview** with syntax highlighting: JSON object keys, Markdown links,
  and CSV header rows are colorized in the preview pane.

## Requirements

- **Firefox 109 or later** — the first stable Firefox release with Manifest V3
  (MV3) support.
- Firefox only. The extension uses Firefox's MV3 background model (event-page
  background scripts), so it is not directly portable to other browsers.

## Install / try it

To load the extension locally without publishing:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file from this folder.
4. The toolbar icon appears — click it to open the popup.
5. After editing any source file, click **Reload** next to the add-on on the
   `about:debugging` page.
6. Popup console: right-click the popup and choose **Inspect**. Background
   console: **Inspect** next to the add-on on the `about:debugging` page.

A temporary add-on is removed when Firefox restarts.

## Usage

The popup has the following controls:

- **Tab count** — how many tabs are included in the export.
- **Language** — English, Russian, or Spanish. Saved and restored on the next open.
- **Sort** — one of 9 orderings (see Sort options).
- **Fields** — 4 on by default: **Title**, **URL**, **Date opened**, **Date
  visited**; the rest are optional.
- **Format** — **MD** (default), **TXT**, **JSON**, or **CSV**.
- **Group by domain** — groups TXT/Markdown output under domain headers. Domain
  order follows the current sort (by the first tab of each domain in the sorted
  list).
- **Show count in domain headers** — visible only when format is TXT or MD and
  grouping is on. Headers become e.g. `## github.com (12)` or
  `=== github.com (12) ===`.
- **Copy** — writes the export to the clipboard.
- **Download file** — saves as `tabs_YYYY-MM-DD.md`, `.txt`, `.json`, or `.csv`.

A status line at the bottom reports success or failure (e.g. "Copied", "File
saved", or an error message).

In **Markdown** preview, links activate the existing tab when possible (focus
that tab and its window) instead of always opening a new one.

Dates are ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`); missing values become empty
cells (CSV), `null` (JSON), or empty text (TXT/MD). CSV follows RFC 4180
(every field quoted; embedded quotes doubled) with CRLF line endings.

## Exported fields

All 12 fields are listed below. Those marked **Default** are enabled on first open.

| Field              | Default |
| ------------------ | ------- |
| Title              | yes     |
| URL                | yes     |
| Date opened        | yes     |
| Date visited       | yes     |
| ID                 |         |
| Window             |         |
| Position           |         |
| Active             |         |
| Pinned             |         |
| Sound              |         |
| Discarded          |         |
| Favicon            |         |

## Sort options

Listed in the order they appear in the popup:

| Mode                          |
| ----------------------------- |
| Title A→Z                     |
| Title Z→A                     |
| URL A→Z                       |
| URL Z→A                       |
| Last visited: newest first    |
| Last visited: oldest first    |
| Date opened: newest first     |
| Date opened: oldest first     |
| Browser order                 |

For date-based sorts, tabs without a known date always sink to the bottom
regardless of direction. "Browser order" sorts by window, then by position
within the window. The default sort is **Last visited: oldest first**.

## Data & privacy

Everything runs locally. The extension makes **no network calls** and
**collects no data**. Permissions:

- **`tabs`** — read tab metadata (title, URL, dates, flags). No page content,
  no host permissions.
- **`storage`** — per-tab "date opened" map and UI settings (language, format,
  sort, fields, grouping, domain counts).
- **`downloads`** — save the file when you click Download.
- **`clipboardWrite`** — write text when you click Copy.

## Known limitation

**Date opened** is the first time the extension *saw* the tab (since install or
last browser restart), not the real creation time:

- Firefox's `tabs.Tab` API exposes no creation timestamp (only `lastAccessed`).
- `background.js` records first-seen time per tab id in `storage.local`.
- Session-restored tabs get the restart moment.

This matches comparable extensions; the extension does not invent a creation date.

**Date visited** maps directly to Firefox's `tabs.Tab.lastAccessed`, which is
maintained by the browser itself.

## Icons

- `icons/icon-48.png`
- `icons/icon-96.png`
- `icons/icon-128.png`

Replace them with your own artwork (same filenames and sizes) to customize the
toolbar and extension icon.

## Localization (for contributors)

UI strings live in `_locales/<code>/messages.json`. To add a language:

1. Create `_locales/<code>/messages.json` by translating every `message` value
   from `_locales/en/messages.json`, keeping all keys identical.
2. Add the code to `SUPPORTED_LANGS` in `i18n.js` so it appears in the Language
   selector.

English is the default and fallback: missing or malformed locale files fall back
to English; missing keys render as the key itself.

## License

Released under the MIT License. See the [LICENSE](LICENSE) file.

## Source & feedback

- Issues: https://github.com/OlyoshaOlyosha/Tab-Info-Exporter/issues
- Repository: https://github.com/OlyoshaOlyosha/Tab-Info-Exporter

Published on Mozilla Add-ons (AMO):
https://addons.mozilla.org/addon/tab-info-exporter/