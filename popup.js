// DOM wiring for the popup. All data logic lives in lib.js; this file only
// reads browser APIs, builds row objects, renders the UI, and translates text.

import {
  FIELD_DEFS,
  SORT_DEFS,
  DEFAULT_FIELD_KEYS,
  buildCsv,
  buildJson,
  sortRows,
  formatIso,
} from './lib.js';
import {
  DEFAULT_LANG,
  SUPPORTED_LANGS,
  loadMessages,
  t,
} from './i18n.js';

const els = {
  count: document.getElementById('count'),
  sort: document.getElementById('sort'),
  sortLabelText: document.getElementById('sortLabelText'),
  fields: document.getElementById('fields'),
  fieldsLegend: document.getElementById('fieldsLegend'),
  formatLegend: document.getElementById('formatLegend'),
  fmtCsv: document.getElementById('fmtCsv'),
  fmtJson: document.getElementById('fmtJson'),
  copy: document.getElementById('copy'),
  download: document.getElementById('download'),
  lang: document.getElementById('lang'),
  langLabelText: document.getElementById('langLabelText'),
  status: document.getElementById('status'),
};

let tr = (k) => k; // current translator, (re)assigned on language load
let currentLang = DEFAULT_LANG;
let rows = [];
let rowCount = 0;

const DATE_KEYS = new Set(['openedAt', 'lastAccessedAt']);

// Convert a raw row to its export shape: date fields become ISO 8601 strings
// (formatIso returns "" for null/missing), all other fields pass through.
function toExportRow(r) {
  const out = {};
  for (const k in r) out[k] = DATE_KEYS.has(k) ? formatIso(r[k]) : r[k];
  return out;
}

function setStatus(msg) {
  els.status.textContent = msg;
}

function buildRowFromTab(tab, firstSeen) {
  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    title: tab.title,
    url: tab.url,
    // Ceiling: openedAt is first-seen time from background.js; missing -> null.
    openedAt: (tab.id != null && firstSeen[tab.id]) || null,
    lastAccessedAt: tab.lastAccessed ?? null,
    active: tab.active,
    pinned: tab.pinned,
    audible: tab.audible,
    discarded: tab.discarded,
    favIconUrl: tab.favIconUrl,
  };
}

function getSelectedFields() {
  return Array.from(
    els.fields.querySelectorAll('input[type="checkbox"]:checked')
  ).map((cb) => cb.value);
}

function isJson() {
  return document.querySelector('input[name="format"]:checked').value === 'json';
}

// Compute the export payload from current UI state.
function getPayload() {
  const fields = getSelectedFields();
  const sorted = sortRows(rows, els.sort.value);
  const view = sorted.map(toExportRow);
  return isJson() ? buildJson(view, fields) : buildCsv(view, fields);
}

// (Re)build all visible strings and dynamic controls. Safe to call on init and
// whenever the language changes.
function renderAll() {
  els.count.textContent = tr('count_prefix') + rowCount;
  els.sortLabelText.textContent = tr('sort_label');
  els.fieldsLegend.textContent = tr('fields_label');
  els.formatLegend.textContent = tr('format_label');
  els.fmtCsv.textContent = tr('format_csv');
  els.fmtJson.textContent = tr('format_json');
  els.copy.textContent = tr('copy');
  els.download.textContent = tr('download');
  els.langLabelText.textContent = tr('lang_label');

  // Language options.
  els.lang.replaceChildren();
  for (const lang of SUPPORTED_LANGS) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = tr(lang === 'en' ? 'lang_en' : 'lang_ru');
    els.lang.appendChild(opt);
  }
  els.lang.value = currentLang;

  // Sort options, preserving the user's selection across re-renders.
  const prevSort = els.sort.value;
  els.sort.replaceChildren();
  for (const s of SORT_DEFS) {
    const opt = document.createElement('option');
    opt.value = s.key;
    opt.textContent = tr(s.msgKey);
    els.sort.appendChild(opt);
  }
  els.sort.value = prevSort || 'accessOld';

  // Field checkboxes.
  els.fields.replaceChildren();
  for (const f of FIELD_DEFS) {
    const label = document.createElement('label');
    label.className = 'field';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = f.key;
    cb.checked = DEFAULT_FIELD_KEYS.includes(f.key);
    label.append(cb, ' ' + tr(f.msgKey));
    els.fields.appendChild(label);
  }
}

async function applyLang(lang) {
  currentLang = lang;
  const M = await loadMessages(lang);
  tr = (k) => t(M, k);
}

async function init() {
  const stored = await browser.storage.local.get('uiLang');
  const uiLang = SUPPORTED_LANGS.includes(stored.uiLang) ? stored.uiLang : DEFAULT_LANG;
  await applyLang(uiLang);

  const storedFs = await browser.storage.local.get('firstSeen');
  const firstSeen = storedFs.firstSeen || {};
  const tabs = await browser.tabs.query({});
  rows = tabs.map((t) => buildRowFromTab(t, firstSeen));
  rowCount = rows.length;

  renderAll();
}

els.lang.addEventListener('change', async () => {
  const uiLang = els.lang.value;
  await browser.storage.local.set({ uiLang });
  await applyLang(uiLang);
  renderAll();
});

els.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getPayload());
    setStatus(tr('status_copied'));
  } catch {
    setStatus(tr('status_copy_failed'));
  }
});

els.download.addEventListener('click', async () => {
  const payload = getPayload();
  const type = isJson() ? 'application/json' : 'text/csv';
  const ext = isJson() ? '.json' : '.csv';
  const url = URL.createObjectURL(new Blob([payload], { type }));
  try {
    const filename = 'tabs_' + new Date().toISOString().slice(0, 10) + ext;
    await browser.downloads.download({ url, filename, saveAs: false });
    setStatus(tr('status_saved'));
  } catch {
    setStatus(tr('status_save_failed'));
  } finally {
    URL.revokeObjectURL(url);
  }
});

document.addEventListener('DOMContentLoaded', init);
