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
};

const SETTINGS_KEY = 'uiSettings';
const DEFAULT_SETTINGS = {
  format: 'csv',
  sort: 'accessOld',
  fields: DEFAULT_FIELD_KEYS.slice(),
  groupByDomain: false,
};

async function loadSettings() {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const s = stored[SETTINGS_KEY] || {};
  return {
    format: ['txt', 'md', 'csv', 'json'].includes(s.format) ? s.format : DEFAULT_SETTINGS.format,
    sort: SORT_DEFS.some((d) => d.key === s.sort) ? s.sort : DEFAULT_SETTINGS.sort,
    fields: Array.isArray(s.fields) && s.fields.length
      ? s.fields.filter((k) => FIELD_DEFS.some((f) => f.key === k))
      : DEFAULT_SETTINGS.fields.slice(),
    groupByDomain: !!s.groupByDomain,
  };
}

async function saveSettings() {
  const settings = {
    format: currentFormat,
    sort: els.sort.value,
    fields: getSelectedFields(),
    groupByDomain: els.groupByDomain.checked,
  };
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
}

let tr = (k) => k;
let currentLang = DEFAULT_LANG;
let rows = [];
let rowCount = 0;
let currentFormat = 'csv';
let currentSettings = { ...DEFAULT_SETTINGS };

const DATE_KEYS = new Set(['openedAt', 'lastAccessedAt']);

function toExportRow(r) {
  const out = {};
  for (const k in r) out[k] = DATE_KEYS.has(k) ? formatIso(r[k]) : r[k];
  return out;
}

function setStatus(msg) {
  els.status.textContent = msg;
}

function cleanFavIconUrl(tab) {
  const fav = tab.favIconUrl;
  if (fav && (fav.startsWith('http://') || fav.startsWith('https://'))) return fav;
  try {
    const u = new URL(tab.url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin + '/favicon.ico';
  } catch {}
  return '';
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
    favIconUrl: cleanFavIconUrl(tab),
  };
}

function getSelectedFields() {
  return Array.from(
    els.fields.querySelectorAll('input[type="checkbox"]:checked')
  ).map((cb) => cb.value);
}

function buildOutput(format) {
  const fields = getSelectedFields();
  let sorted = sortRows(rows, els.sort.value);
  const groupByDomain = els.groupByDomain.checked;

  if (format === 'csv') {
    return buildCsv(sorted.map(toExportRow), fields);
  }
  if (format === 'json') {
    return buildJson(sorted.map(toExportRow), fields);
  }
  if (format === 'txt') {
    return buildText(sorted.map(toExportRow), fields, groupByDomain);
  }
  if (format === 'md') {
    return buildMarkdown(sorted.map(toExportRow), fields, groupByDomain);
  }
  return '';
}

function renderMarkdownToPreview(md) {
  els.preview.replaceChildren();
  const lines = md.split('\n');
  let currentBlock = null;

  const newBlock = () => {
    currentBlock = document.createElement('div');
    currentBlock.className = 'md-item';
    els.preview.appendChild(currentBlock);
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      currentBlock = null;
      const h2 = document.createElement('h2');
      h2.textContent = line.slice(3);
      els.preview.appendChild(h2);
    } else if (line.startsWith('- [')) {
      const m = line.match(/^- \[([^\]]*)\]\(([^)]*)\)/);
      if (m) {
        newBlock();
        const a = document.createElement('a');
        a.href = m[2];
        a.textContent = m[1] || m[2];
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        currentBlock.appendChild(a);
      }
    } else if (line.startsWith('- ')) {
      newBlock();
      const span = document.createElement('span');
      span.className = 'md-title';
      span.textContent = line.slice(2);
      currentBlock.appendChild(span);
    } else if (line.startsWith('  ') && line.includes(': ')) {
      if (!currentBlock) newBlock();
      const idx = line.indexOf(': ');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 2);
      const meta = document.createElement('div');
      meta.className = 'mv-field';
      if (key === 'favIconUrl' && val) {
        const img = document.createElement('img');
        img.src = val;
        img.width = 14;
        img.height = 14;
        img.alt = '';
        meta.appendChild(img);
        meta.appendChild(document.createTextNode(' ' + val));
      } else {
        meta.textContent = key + ': ' + val;
      }
      currentBlock.appendChild(meta);
    }
  }
}

function renderPreview() {
  const output = buildOutput(currentFormat);
  if (currentFormat === 'md') {
    els.preview.classList.remove('plain');
    if (!output) {
      els.preview.textContent = tr('preview_empty_fields');
      return;
    }
    renderMarkdownToPreview(output);
  } else {
    els.preview.classList.add('plain');
    els.preview.textContent = output || tr('preview_empty_tabs');
  }
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
  const prevSort = els.sort.value || currentSettings.sort;
  els.sort.replaceChildren();
  for (const s of SORT_DEFS) {
    const opt = document.createElement('option');
    opt.value = s.key;
    opt.textContent = tr(s.msgKey);
    els.sort.appendChild(opt);
  }
  els.sort.value = prevSort;

  // Field checkboxes.
  const selectedFields = new Set(
    getSelectedFields().length ? getSelectedFields() : currentSettings.fields
  );
  els.fields.replaceChildren();
  for (const f of FIELD_DEFS) {
    const label = document.createElement('label');
    label.className = 'field';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = f.key;
    cb.checked = selectedFields.has(f.key);
    label.append(cb, ' ' + tr(f.msgKey));
    els.fields.appendChild(label);
  }
}

function onAnyChange() {
  saveSettings();
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

  currentSettings = await loadSettings();
  currentFormat = currentSettings.format;

  await applyLang(uiLang);

  const storedFs = await browser.storage.local.get('firstSeen');
  const firstSeen = storedFs.firstSeen || {};
  const tabs = await browser.tabs.query({});
  rows = tabs.map((t) => buildRowFromTab(t, firstSeen));
  rowCount = rows.length;

  // Restore format radio
  const formatRadio = document.querySelector(`input[name="format"][value="${currentFormat}"]`);
  if (formatRadio) formatRadio.checked = true;

  // Restore groupByDomain
  els.groupByDomain.checked = currentSettings.groupByDomain;

  // Restore sort (renderAll will use currentSettings.sort)
  els.sort.value = currentSettings.sort;

  renderAll();
  renderPreview();
}

els.preview.addEventListener('click', async (e) => {
  const a = e.target.closest('a');
  if (!a || !els.preview.contains(a)) return;
  e.preventDefault();
  const url = a.href;
  const tab = rows.find((r) => r.url === url);
  if (tab && tab.id != null) {
    try {
      await browser.tabs.update(tab.id, { active: true });
      if (tab.windowId != null) {
        await browser.windows.update(tab.windowId, { focused: true });
      }
      window.close();
    } catch {
      await browser.tabs.create({ url });
    }
  } else {
    await browser.tabs.create({ url });
  }
});

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
    saveSettings();
    renderPreview();
  });
});

// Field checkbox changes.
els.fields.addEventListener('change', onAnyChange);

els.copy.addEventListener('click', copyToClipboard);
els.download.addEventListener('click', downloadFile);

document.addEventListener('DOMContentLoaded', init);
