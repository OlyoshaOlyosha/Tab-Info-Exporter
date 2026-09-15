import { strict as assert } from 'node:assert/strict';
import { test } from 'node:test';
import {
  FIELD_DEFS,
  SORT_DEFS,
  formatIso,
  cleanFavIconUrl,
  toExportRow,
  buildRowFromTab,
  csvCell,
  buildCsv,
  buildJson,
  domainOf,
  groupByDomain,
  buildMarkdown,
  buildText,
  sortRows,
} from '../lib.js';

test('csvCell quotes embedded quotes and commas', () => {
  assert.equal(csvCell('a"b'), '"a""b"');
  assert.equal(csvCell('a,b'), '"a,b"');
});

test('csvCell null/undefined -> empty quoted cell', () => {
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell(undefined), '""');
});

test('buildCsv header matches fields and uses CRLF, trailing CRLF', () => {
  const csv = buildCsv([{ title: 'x', url: 'y' }], ['title', 'url']);
  assert.equal(csv, '"title","url"\r\n"x","y"\r\n');
  assert.ok(csv.endsWith('\r\n'), 'must end with CRLF');
  assert.ok(csv.includes('\r\n'), 'must separate lines with CRLF');
});

test('buildCsv preserves comma, quote and newline inside a field (no semicolon mangling)', () => {
  const title = 'a,"b\nc';
  const csv = buildCsv([{ title }], ['title']);
  // Header + single data line, all CRLF-terminated.
  assert.equal(csv, '"title"\r\n"a,""b\nc"\r\n');
  // The embedded comma and newline must survive intact, never turned into ';'.
  assert.ok(csv.includes('a,""b\nc'), 'raw characters preserved');
  assert.ok(!csv.includes(';'), 'no semicolon substitution');
});

test('buildJson shapes objects and fills missing fields with null', () => {
  const json = buildJson([{ title: 'x', url: undefined }], ['title', 'url']);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed, [{ title: 'x', url: null }]);
});

test('buildJson keeps key order from fields', () => {
  const json = buildJson([{ a: 1, b: 2 }], ['b', 'a']);
  assert.deepEqual(Object.keys(JSON.parse(json)[0]), ['b', 'a']);
});

test('sortRows: accessOld puts oldest first, nulls sink to bottom', () => {
  const rows = [
    { id: 1, lastAccessedAt: 300 },
    { id: 2, lastAccessedAt: 100 },
    { id: 3, lastAccessedAt: null },
  ];
  const out = sortRows(rows, 'accessOld').map((r) => r.id);
  assert.deepEqual(out, [2, 1, 3]);
});

test('sortRows: accessNew puts newest first, nulls sink to bottom', () => {
  const rows = [
    { id: 1, lastAccessedAt: 300 },
    { id: 2, lastAccessedAt: 100 },
    { id: 3, lastAccessedAt: null },
  ];
  const out = sortRows(rows, 'accessNew').map((r) => r.id);
  assert.deepEqual(out, [1, 2, 3]);
});

test('sortRows: openOld / openNew direction and null sinking', () => {
  const rows = [
    { id: 1, openedAt: 300 },
    { id: 2, openedAt: 100 },
    { id: 3, openedAt: null },
  ];
  assert.deepEqual(
    sortRows(rows, 'openOld').map((r) => r.id),
    [2, 1, 3]
  );
  assert.deepEqual(
    sortRows(rows, 'openNew').map((r) => r.id),
    [1, 2, 3]
  );
});

test('sortRows: titleAsc / titleDesc via localeCompare', () => {
  const rows = [{ id: 1, title: 'B' }, { id: 2, title: 'A' }, { id: 3, title: 'C' }];
  assert.deepEqual(
    sortRows(rows, 'titleAsc').map((r) => r.title),
    ['A', 'B', 'C']
  );
  assert.deepEqual(
    sortRows(rows, 'titleDesc').map((r) => r.title),
    ['C', 'B', 'A']
  );
});

test('sortRows: urlAsc / urlDesc via localeCompare', () => {
  const rows = [{ id: 1, url: 'http://b' }, { id: 2, url: 'http://a' }, { id: 3, url: 'http://c' }];
  assert.deepEqual(
    sortRows(rows, 'urlAsc').map((r) => r.url),
    ['http://a', 'http://b', 'http://c']
  );
  assert.deepEqual(
    sortRows(rows, 'urlDesc').map((r) => r.url),
    ['http://c', 'http://b', 'http://a']
  );
});

test('sortRows: browserOrder by windowId then index', () => {
  const rows = [
    { id: 1, windowId: 2, index: 1 },
    { id: 2, windowId: 1, index: 0 },
    { id: 3, windowId: 1, index: 2 },
  ];
  assert.deepEqual(
    sortRows(rows, 'browserOrder').map((r) => r.id),
    [2, 3, 1]
  );
});

test('sortRows: unknown sortKey falls back to browserOrder and does not mutate input', () => {
  const rows = [{ id: 1, windowId: 2, index: 1 }, { id: 2, windowId: 1, index: 0 }];
  const snapshot = JSON.stringify(rows);
  sortRows(rows, 'nope');
  assert.equal(JSON.stringify(rows), snapshot, 'input must not be mutated');
});

test('formatIso: finite ms -> ISO string, null/undefined -> empty', () => {
  assert.equal(formatIso(0), '1970-01-01T00:00:00.000Z');
  assert.equal(formatIso(null), '');
  assert.equal(formatIso(undefined), '');
  assert.equal(formatIso(NaN), '');
});

test('FIELD_DEFS / SORT_DEFS are ordered exports', () => {
  assert.equal(FIELD_DEFS[0].key, 'title');
  assert.equal(SORT_DEFS[0].key, 'titleAsc');
});

// --- domainOf tests ---
test('domainOf returns hostname with www stripped', () => {
  assert.equal(domainOf('https://www.example.com/page'), 'example.com');
  assert.equal(domainOf('https://example.com/page'), 'example.com');
});

test('domainOf returns Other for invalid URLs', () => {
  assert.equal(domainOf(''), 'Other');
  assert.equal(domainOf('not-a-url'), 'Other');
});

test('domainOf returns Other for about: and chrome: URIs', () => {
  assert.equal(domainOf('about:blank'), 'Other');
  assert.equal(domainOf('chrome://settings'), 'Other');
});

// --- groupByDomain tests ---
test('groupByDomain returns Map preserving insertion order of domains', () => {
   const rows = [
     { id: 1, url: 'https://www.google.com/a' },
     { id: 2, url: 'https://www.example.com/b' },
     { id: 3, url: 'https://www.google.com/c' },
   ];
   const map = groupByDomain(rows);
   assert.equal(map.size, 2);
   const keys = [...map.keys()];
   assert.deepEqual(keys, ['google.com', 'example.com']);
   assert.equal(map.get('google.com').length, 2);
   assert.equal(map.get('example.com').length, 1);
 });

test('groupByDomain returns empty Map for empty rows', () => {
  const map = groupByDomain([]);
  assert.equal(map.size, 0);
});

// --- buildMarkdown tests ---
test('buildMarkdown returns grouped sections when groupByDomain is true', () => {
  const rows = [
    { title: 'A', url: 'https://www.google.com/a' },
    { title: 'B', url: 'https://www.example.com/b' },
  ];
  const md = buildMarkdown(rows, ['title', 'url'], true);
  assert.ok(md.includes('## example.com'));
  assert.ok(md.includes('## google.com'));
  assert.ok(md.includes('[A](https://www.google.com/a)'));
  assert.ok(md.includes('[B](https://www.example.com/b)'));
});

test('buildMarkdown returns flat rows when groupByDomain is false', () => {
  const rows = [{ title: 'A', url: 'https://example.com' }];
  const md = buildMarkdown(rows, ['title', 'url'], false);
  assert.ok(md.includes('[A](https://example.com)'));
  assert.ok(!md.includes('##'));
});

test('buildMarkdown returns empty string for no rows', () => {
  assert.equal(buildMarkdown([], [], false), '');
});

test('buildMarkdown returns empty string for no fields', () => {
  assert.equal(buildMarkdown([{ title: 'A' }], [], false), '');
});

test('buildMarkdown renders all checked fields when all are selected', () => {
  const rows = [{ title: 'A', url: 'https://ex.com', openedAt: 1000, active: true }];
  const allFields = ['title', 'url', 'openedAt', 'lastAccessedAt', 'id', 'windowId', 'index', 'active', 'pinned', 'audible', 'discarded', 'favIconUrl'];
  const md = buildMarkdown(rows, allFields, false);
  assert.ok(md.includes('[A](https://ex.com)'));
  assert.ok(md.includes('openedAt:'));
  assert.ok(md.includes('active:'));
  assert.ok(md.includes('lastAccessedAt:'));
  assert.ok(md.includes('id:'));
  assert.ok(md.includes('windowId:'));
  assert.ok(md.includes('index:'));
  assert.ok(md.includes('pinned:'));
  assert.ok(md.includes('audible:'));
  assert.ok(md.includes('discarded:'));
  assert.ok(md.includes('favIconUrl:'));
});

test('buildMarkdown renders url-only as a bare link', () => {
  const rows = [{ url: 'https://example.com' }];
  const md = buildMarkdown(rows, ['url'], false);
  assert.ok(md.includes('[https://example.com](https://example.com)'));
});

test('buildMarkdown renders title-only as plain text', () => {
  const rows = [{ title: 'A' }];
  const md = buildMarkdown(rows, ['title'], false);
  assert.ok(md.includes('- A'));
  assert.ok(!md.includes(']('));
});

test('buildMarkdown renders favIconUrl field with a clean URL when favIconUrl is checked', () => {
  const rows = [{ title: 'A', url: 'https://ex.com', favIconUrl: 'https://ex.com/fav.ico' }];
  const md = buildMarkdown(rows, ['title', 'url', 'favIconUrl'], false);
  assert.ok(md.includes('favIconUrl: https://ex.com/fav.ico'));
});

test('buildMarkdown renders favIconUrl as empty when field is checked but favIconUrl is absent', () => {
  const rows = [{ title: 'A', url: 'https://ex.com' }];
  const md = buildMarkdown(rows, ['title', 'url', 'favIconUrl'], false);
  assert.ok(md.includes('favIconUrl: '));
});

test('buildText renders favIconUrl field when favIconUrl is checked', () => {
  const rows = [{ title: 'A', url: 'https://ex.com', favIconUrl: 'https://ex.com/fav.ico' }];
  const txt = buildText(rows, ['title', 'url', 'favIconUrl'], false);
  assert.ok(txt.includes('favIconUrl: https://ex.com/fav.ico'));
});

// --- buildText tests ---
test('buildText returns grouped sections when groupByDomain is true', () => {
  const rows = [
    { title: 'A', url: 'https://www.google.com/a' },
    { title: 'B', url: 'https://www.example.com/b' },
  ];
  const txt = buildText(rows, ['title', 'url'], true);
  assert.ok(txt.includes('=== example.com ==='));
  assert.ok(txt.includes('=== google.com ==='));
  assert.ok(txt.includes('A (https://www.google.com/a)'));
  assert.ok(txt.includes('B (https://www.example.com/b)'));
});

test('buildText returns flat lines when groupByDomain is false', () => {
  const rows = [{ title: 'A', url: 'https://example.com' }];
  const txt = buildText(rows, ['title', 'url'], false);
  assert.ok(txt.includes('A (https://example.com)'));
  assert.ok(!txt.includes('==='));
});

test('buildText returns empty string for no rows', () => {
  assert.equal(buildText([], [], false), '');
});

test('buildText returns empty string for no fields', () => {
  assert.equal(buildText([{ title: 'A' }], [], false), '');
});

test('buildText renders all checked fields when all are selected', () => {
  const rows = [{ title: 'A', url: 'https://ex.com', openedAt: 1000, active: true }];
  const allFields = ['title', 'url', 'openedAt', 'lastAccessedAt', 'id', 'windowId', 'index', 'active', 'pinned', 'audible', 'discarded', 'favIconUrl'];
  const txt = buildText(rows, allFields, false);
  assert.ok(txt.includes('A (https://ex.com)'));
  assert.ok(txt.includes('openedAt:'));
  assert.ok(txt.includes('active:'));
});

test('buildText renders url-only as bare url', () => {
  const rows = [{ url: 'https://example.com' }];
  const txt = buildText(rows, ['url'], false);
  assert.ok(txt.includes('https://example.com'));
});

test('buildText renders title-only as plain text', () => {
  const rows = [{ title: 'A' }];
  const txt = buildText(rows, ['title'], false);
  assert.ok(txt.includes('A'));
});

// --- cleanFavIconUrl tests ---
test('cleanFavIconUrl keeps http(s) favIconUrl as-is', () => {
  assert.equal(cleanFavIconUrl({ favIconUrl: 'https://ex.com/fav.ico', url: 'https://ex.com' }), 'https://ex.com/fav.ico');
});
test('cleanFavIconUrl derives favicon.ico from tab origin', () => {
  assert.equal(cleanFavIconUrl({ favIconUrl: '', url: 'https://example.com/page' }), 'https://example.com/favicon.ico');
});
test('cleanFavIconUrl returns empty for non-http(s) tab URL', () => {
  assert.equal(cleanFavIconUrl({ favIconUrl: '', url: 'about:blank' }), '');
});
test('cleanFavIconUrl returns empty when tab URL is invalid', () => {
  assert.equal(cleanFavIconUrl({ favIconUrl: '', url: 'not-a-url' }), '');
});

// --- toExportRow tests ---
test('toExportRow converts date fields to ISO strings', () => {
  const row = { title: 'A', openedAt: 1700000000000, lastAccessedAt: 1700000000000, url: 'https://ex.com' };
  const out = toExportRow(row);
  assert.equal(out.title, 'A');
  assert.ok(typeof out.openedAt === 'string' && out.openedAt.endsWith('Z'));
  assert.ok(typeof out.lastAccessedAt === 'string' && out.lastAccessedAt.endsWith('Z'));
  assert.equal(out.url, 'https://ex.com');
});
test('toExportRow leaves non-date fields unchanged', () => {
  const row = { title: 'A', id: 1, active: true };
  const out = toExportRow(row);
  assert.deepEqual(out, { title: 'A', id: 1, active: true });
});
test('toExportRow turns null date fields into empty string', () => {
  const out = toExportRow({ title: 'A', openedAt: null, lastAccessedAt: undefined });
  assert.equal(out.openedAt, '');
  assert.equal(out.lastAccessedAt, '');
});

// --- buildRowFromTab tests ---
test('buildRowFromTab constructs a row from tab + firstSeen', () => {
  const tab = { id: 42, title: 'A', url: 'https://ex.com', lastAccessed: 1700000000000, active: true, pinned: false, windowId: 1, index: 0, audible: false, discarded: false, favIconUrl: '' };
  const firstSeen = { 42: 1600000000000 };
  const row = buildRowFromTab(tab, firstSeen);
  assert.equal(row.openedAt, 1600000000000);
  assert.equal(row.lastAccessedAt, 1700000000000);
  assert.equal(row.favIconUrl, 'https://ex.com/favicon.ico');
  assert.equal(row.active, true);
});
test('buildRowFromTab returns null openedAt when tab id not in firstSeen', () => {
  const tab = { id: 99, title: 'A', url: 'https://ex.com', lastAccessed: null, active: false, pinned: false, windowId: 1, index: 0, audible: false, discarded: false, favIconUrl: '' };
  const row = buildRowFromTab(tab, {});
  assert.equal(row.openedAt, null);
  assert.equal(row.lastAccessedAt, null);
});
