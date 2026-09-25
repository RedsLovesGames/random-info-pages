(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TextCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const lines = (text) => String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const wordMatches = (text) => String(text ?? '').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];

  function stats(text) {
    const value = String(text ?? '');
    const normalized = value.replace(/\r\n?/g, '\n');
    const words = wordMatches(normalized);
    return {
      words: words.length,
      characters: [...normalized].length,
      charactersNoSpaces: [...normalized].filter((character) => !/\s/u.test(character)).length,
      lines: normalized.length ? normalized.split('\n').length : 0,
    };
  }

  function trimLines(text) { return lines(text).map((line) => line.trim()).join('\n'); }
  function collapseWhitespace(text) { return lines(text).map((line) => line.trim().replace(/[\t ]+/g, ' ')).join('\n'); }
  function removeBlankLines(text) { return lines(text).filter((line) => line.trim().length > 0).join('\n'); }

  function dedupeLines(text, caseSensitive = true) {
    const seen = new Set();
    const output = [];
    for (const line of lines(text)) {
      const key = caseSensitive ? line : line.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      output.push(line);
    }
    return output.join('\n');
  }

  function upperCase(text) { return String(text ?? '').toLocaleUpperCase(); }
  function lowerCase(text) { return String(text ?? '').toLocaleLowerCase(); }

  function titleCase(text) {
    return String(text ?? '').toLocaleLowerCase().replace(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu, (word) => {
      const chars = [...word];
      return chars.length ? chars[0].toLocaleUpperCase() + chars.slice(1).join('') : word;
    });
  }

  function sentenceCase(text) {
    const lower = String(text ?? '').toLocaleLowerCase();
    let capitalizeNext = true;
    let output = '';
    for (const character of lower) {
      if (capitalizeNext && /\p{L}/u.test(character)) {
        output += character.toLocaleUpperCase();
        capitalizeNext = false;
      } else output += character;
      if (/[.!?]/u.test(character)) capitalizeNext = true;
    }
    return output;
  }

  function stripListMarkers(text) { return lines(text).map((line) => line.replace(/^\s*(?:[-*+•]\s+|\d+[.)]\s+)/u, '')).join('\n'); }

  function listItems(text, options = {}) {
    let items = lines(text);
    if (options.stripMarkers) items = lines(stripListMarkers(items.join('\n')));
    if (options.trim !== false) items = items.map((item) => item.trim());
    if (options.removeBlank !== false) items = items.filter(Boolean);
    if (options.dedupe) {
      const seen = new Set();
      items = items.filter((item) => {
        const key = options.caseSensitive === false ? item.toLocaleLowerCase() : item;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return items;
  }

  function sortLines(text, direction = 'asc') {
    const items = listItems(text);
    items.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    if (direction === 'desc') items.reverse();
    return items.join('\n');
  }
  function reverseLines(text) { return listItems(text, { removeBlank: false, trim: false }).reverse().join('\n'); }
  function addBullets(text, bullet = '•') { return listItems(text).map((item) => `${bullet} ${item}`).join('\n'); }
  function addNumbers(text) { return listItems(text).map((item, index) => `${index + 1}. ${item}`).join('\n'); }
  function separatorToLines(text, separator = ',') { return String(text ?? '').split(separator).map((item) => item.trim()).filter(Boolean).join('\n'); }
  function linesToSeparator(text, separator = ', ') { return listItems(text).join(separator); }

  function shuffleLines(text, random = Math.random) {
    const items = listItems(text, { removeBlank: false, trim: false });
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items.join('\n');
  }

  function unicodeCleanup(text) {
    return String(text ?? '')
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...');
  }

  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function replaceText(text, find, replacement = '', options = {}) {
    const source = String(text ?? '');
    const needle = String(find ?? '');
    if (!needle) return source;
    const flags = `g${options.caseSensitive ? '' : 'i'}${options.multiline ? 'm' : ''}`;
    const pattern = options.regex ? new RegExp(needle, flags) : new RegExp(escapeRegExp(needle), flags);
    return source.replace(pattern, String(replacement ?? ''));
  }

  function multiReplace(text, rules = [], options = {}) {
    return rules.reduce((value, rule) => replaceText(value, rule.find, rule.replace, { ...options, ...rule }), String(text ?? ''));
  }

  function estimateSyllables(word) {
    const clean = String(word || '').toLocaleLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return 1;
    if (clean.length <= 3) return 1;
    const stripped = clean.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '').replace(/^y/, '');
    const groups = stripped.match(/[aeiouy]{1,2}/g);
    return Math.max(1, groups ? groups.length : 1);
  }

  function analyzeText(text) {
    const source = String(text ?? '');
    const words = wordMatches(source);
    const sentenceMatches = source.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];
    const sentences = sentenceMatches.map((item) => item.trim()).filter(Boolean).length;
    const counts = new Map();
    for (const word of words) {
      const key = word.toLocaleLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const frequency = [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word));
    const syllables = words.reduce((sum, word) => sum + estimateSyllables(word), 0);
    const safeSentences = Math.max(1, sentences);
    const safeWords = Math.max(1, words.length);
    const fleschReadingEase = words.length ? 206.835 - 1.015 * (words.length / safeSentences) - 84.6 * (syllables / safeWords) : 0;
    return {
      ...stats(source),
      sentences,
      uniqueWords: counts.size,
      readingMinutes: words.length / 225,
      fleschReadingEase: Number(fleschReadingEase.toFixed(1)),
      frequency,
    };
  }

  function diffText(before, after) {
    const a = lines(before), b = lines(after);
    const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const result = [];
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ type: 'equal', value: a[i++] }); j++; }
      else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) result.push({ type: 'add', value: b[j++] });
      else result.push({ type: 'remove', value: a[i++] });
    }
    return result;
  }

  return {
    stats, trimLines, collapseWhitespace, removeBlankLines, dedupeLines,
    upperCase, lowerCase, titleCase, sentenceCase, stripListMarkers, listItems,
    sortLines, reverseLines, addBullets, addNumbers, separatorToLines, linesToSeparator,
    shuffleLines, unicodeCleanup, replaceText, multiReplace, analyzeText, diffText,
  };
});
