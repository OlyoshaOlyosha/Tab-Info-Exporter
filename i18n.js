// i18n for the popup. Pure helpers except loadMessages' single fetch, which is
// used only in the popup context (not imported by node --test).

export const DEFAULT_LANG = 'en';
export const SUPPORTED_LANGS = ['en', 'ru'];

// Load a locale's messages. Falls back to English on any failure so the UI
// never breaks if a locale file is missing or malformed.
export async function loadMessages(lang) {
  const target = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  try {
    const res = await fetch(`./_locales/${target}/messages.json`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json();
  } catch {
    const res = await fetch(`./_locales/${DEFAULT_LANG}/messages.json`);
    return await res.json();
  }
}

// Resolve a key to its message, else the key itself (so missing keys surface
// visibly rather than rendering empty).
export function t(messages, key) {
  return messages[key]?.message || key;
}
