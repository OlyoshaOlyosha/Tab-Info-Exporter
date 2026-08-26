// Pure logic for Tab Info Exporter. No browser API, no DOM — importable by
// both popup.js (browser) and node --test.

// Field definitions, in display order. The first four are on by default in the
// popup UI; DEFAULT_FIELD_KEYS carries that fact so FIELD_DEFS stays {key,label}.
export const FIELD_DEFS = [
  { key: 'title', label: 'Название' },
  { key: 'url', label: 'Ссылка' },
  { key: 'openedAt', label: 'Дата открытия' },
  { key: 'lastAccessedAt', label: 'Дата последнего доступа' },
  { key: 'id', label: 'ID' },
  { key: 'windowId', label: 'Окно' },
  { key: 'index', label: 'Позиция' },
  { key: 'active', label: 'Активна' },
  { key: 'pinned', label: 'Закреплена' },
  { key: 'audible', label: 'Звук' },
  { key: 'discarded', label: 'Выгружена' },
  { key: 'favIconUrl', label: 'Иконка' },
];

export const DEFAULT_FIELD_KEYS = ['title', 'url', 'openedAt', 'lastAccessedAt'];

export const SORT_DEFS = [
  { key: 'accessOld', label: 'Доступ: старые сверху' },
  { key: 'accessNew', label: 'Доступ: новые сверху' },
  { key: 'openOld', label: 'Открытие: старые сверху' },
  { key: 'openNew', label: 'Открытие: новые сверху' },
  { key: 'titleAsc', label: 'Название А→Я' },
  { key: 'titleDesc', label: 'Название Я→А' },
  { key: 'urlAsc', label: 'Ссылка А→Я' },
  { key: 'urlDesc', label: 'Ссылка Я→А' },
  { key: 'browserOrder', label: 'Порядок браузера' },
];

// Finite ms -> ISO 8601 string; anything else -> "".
export function formatIso(ms) {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : '';
}

// RFC 4180 cell: every value is wrapped in double quotes; embedded quotes are
// doubled. null/undefined -> empty quoted cell.
export function csvCell(s) {
  if (s === null || s === undefined) return '""';
  return '"' + String(s).replace(/"/g, '""') + '"';
}

// Build a CSV string (CRLF line endings, trailing CRLF) from rows using the
// given subset of field keys. Header row mirrors the field order.
export function buildCsv(rows, fields) {
  const lines = [fields.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(fields.map((f) => csvCell(row[f])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

// Build a pretty JSON string; missing fields become null.
export function buildJson(rows, fields) {
  return JSON.stringify(
    rows.map((r) => Object.fromEntries(fields.map((f) => [f, r[f] ?? null]))),
    null,
    2
  );
}

// Comparable key for a date (ms) value. Nulls always sink to the bottom of the
// list regardless of direction: ascending treats them as +Infinity, descending
// negates valid dates so newer ones sort first while nulls stay largest.
function dateKey(v, asc) {
  if (v === null || v === undefined || !Number.isFinite(v)) return Infinity;
  return asc ? v : -v;
}

function str(v) {
  return v === null || v === undefined ? '' : String(v);
}

// Return a new array sorted by sortKey. Original rows are not mutated.
export function sortRows(rows, sortKey) {
  const out = rows.slice();
  const cmp = {
    accessOld: (a, b) => dateKey(a.lastAccessedAt, true) - dateKey(b.lastAccessedAt, true),
    accessNew: (a, b) => dateKey(a.lastAccessedAt, false) - dateKey(b.lastAccessedAt, false),
    openOld: (a, b) => dateKey(a.openedAt, true) - dateKey(b.openedAt, true),
    openNew: (a, b) => dateKey(a.openedAt, false) - dateKey(b.openedAt, false),
    titleAsc: (a, b) => str(a.title).localeCompare(str(b.title)),
    titleDesc: (a, b) => str(b.title).localeCompare(str(a.title)),
    urlAsc: (a, b) => str(a.url).localeCompare(str(b.url)),
    urlDesc: (a, b) => str(b.url).localeCompare(str(a.url)),
    browserOrder: (a, b) =>
      (a.windowId ?? 0) - (b.windowId ?? 0) || (a.index ?? 0) - (b.index ?? 0),
  };
  out.sort(cmp[sortKey] || cmp.browserOrder);
  return out;
}
