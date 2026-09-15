# Tab Info Exporter v1.1.0 — Release Notes

Tab Info Exporter lists all open tabs and exports their metadata
(title, URL, dates, flags) to CSV, JSON, Markdown, or Text via
clipboard or file download. Read-only by design — it never modifies,
moves, or closes tabs.

## What's New

### Categorized tab view with live preview
Tabs are now grouped by domain in a categorized view. A live preview
panel is always visible on the left; controls (language, sort, field
checkboxes, grouping) are on the right. The preview updates instantly
as you change any setting.

### Persistent settings
Format, sort mode, field selection, and domain grouping are now saved
to `storage.local`. Your preferences survive popup closes.

### Markdown is now the default export format
The popup defaults to Markdown output. Format selection uses a
segmented control with SVG icons. JSON keys are highlighted in the
preview.

### Rich Markdown preview
The Markdown preview renders with proper headings (`<h2>` domain
sections), bullet lists, and clickable links. Domain headers can show
tab counts.

### Domain counts in grouped headers
A `showDomainCounts` setting (available for TXT/Markdown with
grouping enabled) renders the number of tabs next to each domain
header (e.g. `## example.com (3)`).

### Clean favicon URLs
Favicons are now shown as clean URLs (`https://…/favicon.ico`) in
TXT/Markdown/CSV/JSON output instead of raw base64 data URIs. The
popup preview renders favicons as small images.

### CSV preview with styling
CSV preview shows the header row and quotes with proper styling.
Format icons (SVG) are added for formats and the Copy/Download buttons.

### Reorganized sort order and field labels
Sort options are reordered (Title, URL, then dates). Field labels are
relabeled, and a grouping legend was added. Preview height syncs to
the controls column.

### Spanish language support
Added Spanish (`es`) localization, language labels now show the
language name (e.g. "Español (es)"), and localization documentation
was added for contributors.

## Fixes

- Fixed popup scrollbars; the popup no longer scrolls — only the
  preview panel scrolls internally.
- Fixed format tab order to `TXT → Markdown → CSV → JSON`.
- Removed the redundant Title+Link / Link view toggle (field
  checkboxes already control title and URL presence).
- Fixed export so all checked fields render correctly in every format
  (TXT/Markdown/CSV/JSON).
- Grouped CSV/JSON exports are now sorted by domain (without adding
  a domain column); grouped TXT/Markdown use domain headers.
- Updated the `groupByDomain` test to match the insertion-order
  behavior.

## Permissions

Unchanged: `tabs`, `storage`, `downloads`, `clipboardWrite`.

## Verification

- `npx web-ext lint` → 0 errors, 0 warnings, 0 notices.
- `node --test` → 37 tests, 37 pass, 0 fail.

## Known Limitations

- Firefox does not expose a real tab-creation timestamp. The
  "Date opened" field is the first-seen time (tracked by the
  background script), which is the same approach used by comparable
  extensions.
- Session-restored tabs get the restore moment as their opened date.
