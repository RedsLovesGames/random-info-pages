import { parseDictionary } from './words-core.js';

// Pinned revisions keep dictionary results stable between deployments.
// Each word list can be fetched from either GitHub or a separate CDN.
export const DICTIONARY_URLS = Object.freeze({
  enable: [
    'https://raw.githubusercontent.com/dolph/dictionary/694bf9529e986f9175dcbf5fe5875d111941b708/enable1.txt',
    'https://cdn.jsdelivr.net/gh/dolph/dictionary@694bf9529e986f9175dcbf5fe5875d111941b708/enable1.txt'
  ],
  standard: [
    'https://raw.githubusercontent.com/redbo/scrabble/45d4022a1a19130e3b848b868c408771b7f342ff/dictionary.txt',
    'https://cdn.jsdelivr.net/gh/redbo/scrabble@45d4022a1a19130e3b848b868c408771b7f342ff/dictionary.txt'
  ],
  expanded: [
    'https://raw.githubusercontent.com/dwyl/english-words/8179fe68775df3f553ef19520db065228e65d1d3/words_alpha.txt',
    'https://cdn.jsdelivr.net/gh/dwyl/english-words@8179fe68775df3f553ef19520db065228e65d1d3/words_alpha.txt'
  ]
});
const CACHE_NAME = 'rip-words-dictionaries-v1';
const MIN_WORDS = 100000;

function validatedWords(text, kind) {
  const words = parseDictionary(text);
  if (words.length < MIN_WORDS) {
    throw new Error(kind + ' dictionary is incomplete');
  }
  return words;
}

/**
 * Read a previously validated word list from the persistent browser cache.
 * If no saved copy exists, use pinned GitHub and independent CDN URLs.
 * Cache errors are nonfatal (e.g. private browsing, storage disabled).
 *
 * fetcher and cacheStorage are injectable for deterministic tests.
 */
export async function loadDictionaryWithFallback(kind, {
  fetcher = (...args) => fetch(...args),
  cacheStorage = typeof caches === 'undefined' ? null : caches
} = {}) {
  const urls = DICTIONARY_URLS[kind];
  if (!urls) throw new Error('Unknown dictionary: ' + kind);
  const key = urls[0];
  let cache = null;
  try {
    cache = await cacheStorage?.open(CACHE_NAME);
    const saved = await cache?.match(key);
    if (saved) {
      const words = validatedWords(await saved.text(), kind);
      return { words, origin: 'cached' };
    }
  } catch {
    // Ignore unsupported/disabled cache and invalid previously cached data.
  }

  const errors = [];
  for (const [index, url] of urls.entries()) {
    try {
      const response = await fetcher(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const content = await response.text();
      const words = validatedWords(content, kind);
      if (cache) {
        try {
          // Store a same-origin opaque-free response, not a third-party response.
          await cache.put(key, new Response(content, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          }));
        } catch {
          // Lack of storage permission must never prevent a successful search.
        }
      }
      return { words, origin: index === 0 ? 'primary' : 'mirror' };
    } catch (error) {
      errors.push((index === 0 ? 'Primary' : 'Backup') + ': ' + (error?.message || String(error)));
    }
  }
  throw new Error('Could not load ' + kind + ' dictionary. ' + errors.join('; '));
}
