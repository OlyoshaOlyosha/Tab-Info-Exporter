// DOM wiring for the popup. All data logic lives in lib.js; this file only
// reads browser APIs, builds row objects, and renders the UI.

import {
  FIELD_DEFS,
  SORT_DEFS,
  DEFAULT_FIELD_KEYS,
  buildCsv,
  buildJson,
  sortRows,
} from './lib.js';

const els = {
  count: document.getElementById('count'),
  sort: document.getElementById('sort'),
  fields: document.getElementById('fields'),
  copy: document.getElementById('copy'),
  download: document.getElementById('download'),
  status: document.getElementById('status'),
};

// Raw tab rows (epoch ms for dates). Rebuilt on load.
let rows = [];

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
  return isJson() ? buildJson(sorted, fields) : buildCsv(sorted, fields);
}

function renderSortOptions() {
  for (const s of SORT_DEFS) {
    const opt = document.createElement('option');
    opt.value = s.key;
    opt.textContent = s.label;
    if (s.key === 'accessOld') opt.selected = true;
    els.sort.appendChild(opt);
  }
}

function renderFieldCheckboxes() {
  for (const f of FIELD_DEFS) {
    const label = document.createElement('label');
    label.className = 'field';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = f.key;
    cb.checked = DEFAULT_FIELD_KEYS.includes(f.key);
    label.append(cb, ' ' + f.label);
    els.fields.appendChild(label);
  }
}

async function init() {
  renderSortOptions();
  renderFieldCheckboxes();

  const stored = await browser.storage.local.get('firstSeen');
  const firstSeen = stored.firstSeen || {};
  const tabs = await browser.tabs.query({});
  rows = tabs.map((t) => buildRowFromTab(t, firstSeen));
  els.count.textContent = 'Вкладок: ' + rows.length;
}

els.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getPayload());
    setStatus('Скопировано ✓');
  } catch {
    setStatus('❌ Не удалось скопировать');
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
    setStatus('✅ Файл сохранён');
  } catch {
    setStatus('❌ Ошибка сохранения');
  } finally {
    URL.revokeObjectURL(url);
  }
});

document.addEventListener('DOMContentLoaded', init);
