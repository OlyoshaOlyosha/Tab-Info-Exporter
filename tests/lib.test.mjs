import { strict as assert } from 'node:assert/strict';
import { test } from 'node:test';
import {
  FIELD_DEFS,
  SORT_DEFS,
  formatIso,
  csvCell,
  buildCsv,
  buildJson,
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
  assert.equal(SORT_DEFS[0].key, 'accessOld');
});
