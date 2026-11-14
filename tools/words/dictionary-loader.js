import { parseDictionary } from './words-core.js';

// This URL is served from the SAME website as Word Finder.
// The dictionary is committed into the repository as a static asset.
export const LOCAL_DICTIONARY_URL = './dictionaries/towers-of-babble.txt';
export const EXPECTED_WORD_COUNT = 195415;

/** Validate the bundled file so incomplete deployments fail visibly. */
export function validateLocalDictionary(text) {
  const words = parseDictionary(text);
  if (words.length !== EXPECTED_WORD_COUNT) {
    throw new Error('Included dictionary is incomplete (' + words.length +
      ' of ' + EXPECTED_WORD_COUNT + ' words).');
  }
  return words;
}

/** No third-party network requests or CDN fallback. */
export async function loadLocalDictionary({
  fetcher = (...args) => fetch(...args)
} = {}) {
  const response = await fetcher(LOCAL_DICTIONARY_URL, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error('Local Towers of Babble dictionary is unavailable (HTTP ' + response.status + ').');
  }
  return { words: validateLocalDictionary(await response.text()), origin: 'local' };
}
