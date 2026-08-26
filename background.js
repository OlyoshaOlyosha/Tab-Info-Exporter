// Tracks first-seen time (epoch ms) per tab id in storage.local.
//
// Ceiling: Firefox exposes no tab creation timestamp in tabs.Tab (only
// lastAccessed). "openedAt" is therefore first-seen since install / last
// restart; session-restored tabs get the restart moment. This matches how
// comparable extensions behave — do not "fix" it by inventing data.

const STORAGE_KEY = 'firstSeen';

async function getMap() {
  const { [STORAGE_KEY]: map = {} } = await browser.storage.local.get(STORAGE_KEY);
  return map;
}

// Set entry for a single tab if absent.
async function ensureEntry(tabId) {
  if (tabId == null) return;
  const map = await getMap();
  if (map[tabId] == null) {
    map[tabId] = Date.now();
    await browser.storage.local.set({ [STORAGE_KEY]: map });
  }
}

// Seed every currently open tab at install / startup.
async function seedOpenTabs() {
  const tabs = await browser.tabs.query({});
  const map = await getMap();
  let changed = false;
  for (const t of tabs) {
    if (t.id != null && map[t.id] == null) {
      map[t.id] = Date.now();
      changed = true;
    }
  }
  if (changed) await browser.storage.local.set({ [STORAGE_KEY]: map });
}

browser.runtime.onInstalled.addListener(seedOpenTabs);
browser.runtime.onStartup.addListener(seedOpenTabs);
browser.tabs.onCreated.addListener((tab) => ensureEntry(tab.id));
browser.tabs.onRemoved.addListener((tabId) => {
  getMap().then((map) => {
    if (map[tabId] != null) {
      delete map[tabId];
      browser.storage.local.set({ [STORAGE_KEY]: map });
    }
  });
});
