# Tab Info Exporter

A read-only Firefox extension that exports the metadata of all open tabs to CSV or
JSON, either copied to the clipboard or saved as a file. It never modifies, moves,
or closes tabs.

## Features

- Export metadata for **all open tabs** across all windows in one action.
- Output to **CSV** or **JSON**.
- Send the result to the **clipboard** or **download** it as a file.
- **Sortable** with 9 modes (by access time, open time, title, URL, or browser order).
- **Selectable fields** — choose exactly which columns to include.
- **Per-tab "date opened"** tracked locally by the extension (see Known limitation).
- **Runtime UI language switch** between English and Russian; the choice persists.

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

- **Tab count** — shows how many tabs are included in the export.
- **Language** selector — English by default; switch to Russian to change all
  UI text at runtime. The selection is saved in `storage.local` and restored on
  the next open.
- **Sort** dropdown — one of 9 orderings (see Sort options).
- **Fields** checkboxes — 4 are on by default: **Title**, **URL**, **Date
  opened**, **Date last accessed**; the rest are optional.
- **Format** radio — **CSV** (default) or **JSON**.
- **Copy** button — writes the result to the clipboard.
- **Download file** button — saves the result as `tabs_YYYY-MM-DD.csv` or
  `tabs_YYYY-MM-DD.json`.

A status line at the bottom reports success or failure for each action
(e.g. "Copied", "File saved", or an error message).

Dates are formatted as ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`); missing values
become empty cells (CSV) or `null` (JSON). CSV output follows RFC 4180
quoting (every field is quoted; embedded quotes are doubled) and uses CRLF line
endings.

## Exported fields

All 12 fields are listed below. Those marked **Default** are enabled in the
popup on first open.

| Field              | Default |
| ------------------ | ------- |
| Title              | yes     |
| URL                | yes     |
| Date opened        | yes     |
| Date last accessed | yes     |
| ID                 |         |
| Window             |         |
| Index              |         |
| Active             |         |
| Pinned             |         |
| Audible            |         |
| Discarded          |         |
| Favicon URL        |         |

## Sort options

The Sort dropdown offers 9 modes:

| Mode                          |
| ----------------------------- |
| Last accessed: oldest first  |
| Last accessed: newest first   |
| Date opened: oldest first     |
| Date opened: newest first     |
| Title A→Z                     |
| Title Z→A                     |
| URL A→Z                       |
| URL Z→A                       |
| Browser order                 |

For the date-based sorts, tabs without a known date always sink to the bottom
regardless of direction. "Browser order" sorts by window, then by the tab's
position within the window — this is also the initial selection.

## Data & privacy

Everything runs locally in your browser. The extension makes **no network calls**
and **collects no data**. Only four permissions are requested, each used
minimally:

- **`tabs`** — read tab metadata (title, URL, dates, flags). No access to page
  content, and no host permissions are requested.
- **`storage`** — remember the per-tab "date opened" map and the chosen UI
  language between sessions.
- **`downloads`** — save the exported file when you click Download.
- **`clipboardWrite`** — write the exported text when you click Copy.

## Known limitation

The **Date opened** value is the first time the extension *saw* the tab
(tracked by `background.js` since install or the last browser restart), not the
tab's real creation time. Reasons:

- Firefox's `tabs.Tab` API exposes no tab-creation timestamp (only
  `lastAccessed`).
- The background script records `openedAt` as first-seen time per tab id, kept
  in `storage.local`.
- Session-restored tabs receive the restart moment, because they were unknown
  to the extension before that.

This matches the approach used by comparable extensions; the extension does not
invent a creation date.

## Icons

The extension reads these three icon files:

- `icons/icon-48.png`
- `icons/icon-96.png`
- `icons/icon-128.png`

These icon files are committed in this repository. Replace them with your own artwork (same filenames and sizes) to customize the toolbar and extension icon.

## Localization (for contributors)

UI strings live in `_locales/<code>/messages.json`. To add a language:

1. Copy `_locales/en/messages.json` to `_locales/<code>/messages.json` (where
   `<code>` is the locale code, e.g. `de`) and translate every `message` value,
   keeping all keys identical to the English file.
2. Add the code to `SUPPORTED_LANGS` in `i18n.js` so it appears in the Language
   selector.

English is the default and the fallback: if a locale file is missing or
malformed, the UI falls back to English, and any missing key renders as its key
rather than breaking the layout.

## License

Released under the MIT License. See the [LICENSE](LICENSE) file.

## Source & feedback

The source code lives on GitHub. To report a bug or suggest a feature, open an
issue there:

- Issues: https://github.com/OlyoshaOlyosha/Tab-Info-Exporter/issues
- Repository: https://github.com/OlyoshaOlyosha/Tab-Info-Exporter

The published add-on is listed on Mozilla Add-ons (AMO):
https://addons.mozilla.org/addon/tab-info-exporter/
