// DOM wiring for the popup. All data logic lives in lib.js; this file only
// reads browser APIs, builds row objects, renders the UI, and translates text.

import {
  FIELD_DEFS,
  SORT_DEFS,
  DEFAULT_FIELD_KEYS,
  buildCsv,
  buildJson,
  buildMarkdown,
  buildText,
  domainOf,
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
  fmtTxt: document.getElementById('fmtTxt'),
  fmtMd: document.getElementById('fmtMd'),
  copy: document.getElementById('copy'),
  download: document.getElementById('download'),
  lang: document.getElementById('lang'),
  langLabelText: document.getElementById('langLabelText'),
  status: document.getElementById('status'),
  preview: document.getElementById('preview'),
  groupByDomain: document.getElementById('groupByDomain'),
  groupByDomainLabel: document.getElementById('groupByDomainLabel'),
  viewLinks: document.getElementById('viewLinks'),
  viewTitleLink: document.getElementById('viewTitleLink'),
  viewLegend: document.getElementById('viewLegend'),
};

let tr = (k) => k;
let currentLang = DEFAULT_LANG;
let rows = [];
let rowCount = 0;
let currentFormat = 'csv';
let currentViewMode = 'links';

const DATE_KEYS = new Set(['openedAt', 'lastAccessedAt']);

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

function getViewMode() {
  const checked = document.querySelector('input[name="viewMode"]:checked');
  return checked ? checked.value : 'links';
}

// Compute the output string from current UI state for the given format.
function buildOutput(format) {
  const fields = getSelectedFields();
  const sorted = sortRows(rows, els.sort.value);
  const viewMode = getViewMode();
  const groupByDomain = els.groupByDomain.checked;

  if (format === 'csv') {
    let exportFields = [...fields];
    let exportRows = sorted.map(toExportRow);
    if (groupByDomain) {
      exportRows = exportRows.map((r) => ({ ...r, domain: r.url ? domainOf(r.url) : 'Other' }));
      if (!exportFields.includes('domain')) exportFields.push('domain');
    }
    return buildCsv(exportRows, exportFields);
  }
  if (format === 'json') {
    let exportFields = [...fields];
    let exportRows = sorted.map(toExportRow);
    if (groupByDomain) {
      exportRows = exportRows.map((r) => ({ ...r, domain: r.url ? domainOf(r.url) : 'Other' }));
      if (!exportFields.includes('domain')) exportFields.push('domain');
    }
    return buildJson(exportRows, exportFields);
  }
  if (format === 'txt') {
    return buildText(sorted, fields, viewMode, groupByDomain);
  }
  if (format === 'md') {
    return buildMarkdown(sorted, fields, viewMode, groupByDomain);
  }
  return '';
}

function renderPreview() {
  els.preview.textContent = buildOutput(currentFormat);
}

async function copyToClipboard() {
  const payload = buildOutput(currentFormat);
  try {
    await navigator.clipboard.writeText(payload);
    setStatus(tr('status_copied'));
  } catch {
    setStatus(tr('status_copy_failed'));
  }
}

async function downloadFile() {
  const payload = buildOutput(currentFormat);
  const type = currentFormat === 'json' ? 'application/json' : 'text/plain';
  const ext = currentFormat === 'json' ? '.json' : `.${currentFormat}`;
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
}

// (Re)build all visible strings and dynamic controls. Safe to call on init
// and whenever the language changes.
function renderAll() {
  els.count.textContent = tr('count_prefix') + rowCount;
  els.sortLabelText.textContent = tr('sort_label');
  els.fieldsLegend.textContent = tr('fields_label');
  els.formatLegend.textContent = tr('format_label');
  els.fmtCsv.textContent = tr('format_csv');
  els.fmtJson.textContent = tr('format_json');
  els.fmtTxt.textContent = tr('format_txt');
  els.fmtMd.textContent = tr('format_md');
  els.copy.textContent = tr('copy');
  els.download.textContent = tr('download');
  els.langLabelText.textContent = tr('lang_label');
  els.groupByDomainLabel.textContent = tr('groupByDomain');
  els.viewLinks.textContent = tr('viewLinks');
  els.viewTitleLink.textContent = tr('viewTitleLink');

  // Language options.
  els.lang.replaceChildren();
  for (const lang of SUPPORTED_LANGS) {
    const opt = document.createElement('option');
    opt.value = lang;
    opt.textContent = tr('lang_' + lang) + ' (' + lang + ')';
    els.lang.appendChild(opt);
  }
  els.lang.value = currentLang;

  // Sort options.
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

function onAnyChange() {
  renderPreview();
}

async function applyLang(lang) {
  currentLang = lang;
  const M = await loadMessages(lang);
  tr = (k) => t(M, k);
  renderAll();
  onAnyChange();
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
  onAnyChange();
}

// Event listeners
els.lang.addEventListener('change', async () => {
  const uiLang = els.lang.value;
  await browser.storage.local.set({ uiLang });
  await applyLang(uiLang);
});

els.sort.addEventListener('change', onAnyChange);
els.groupByDomain.addEventListener('change', onAnyChange);

document.querySelectorAll('input[name="format"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    currentFormat = e.target.value;
    renderPreview();
  });
});

document.querySelectorAll('input[name="viewMode"]').forEach((radio) => {
  radio.addEventListener('change', (e) => {
    currentViewMode = e.target.value;
    renderPreview();
  });
});

// Field checkbox changes.
els.fields.addEventListener('change', onAnyChange);

els.copy.addEventListener('click', copyToClipboard);
els.download.addEventListener('click', downloadFile);

document.addEventListener('DOMContentLoaded', init);
