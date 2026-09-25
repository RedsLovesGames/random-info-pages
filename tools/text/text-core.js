(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TextCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const lines = (text) => String(text ?? '').replace(/\r\n?/g, '\n').split('\n');

  function stats(text) {
    const value = String(text ?? '');
    const normalized = value.replace(/\r\n?/g, '\n');
    const words = normalized.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu) || [];
    return {
      words: words.length,
      characters: [...normalized].length,
      charactersNoSpaces: [...normalized].filter((character) => !/\s/u.test(character)).length,
      lines: normalized.length ? normalized.split('\n').length : 0,
    };
  }

  function trimLines(text) {
    return lines(text).map((line) => line.trim()).join('\n');
  }

  function collapseWhitespace(text) {
    return lines(text).map((line) => line.trim().replace(/[\t ]+/g, ' ')).join('\n');
  }

  function removeBlankLines(text) {
    return lines(text).filter((line) => line.trim().length > 0).join('\n');
  }

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
      } else {
        output += character;
      }
      if (/[.!?]/u.test(character)) capitalizeNext = true;
    }
    return output;
  }

  function stripListMarkers(text) {
    return lines(text).map((line) => line.replace(/^\s*(?:[-*+•]\s+|\d+[.)]\s+)/u, '')).join('\n');
  }

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

  function reverseLines(text) {
    return listItems(text, { removeBlank: false, trim: false }).reverse().join('\n');
  }

  function addBullets(text, bullet = '•') {
    return listItems(text).map((item) => `${bullet} ${item}`).join('\n');
  }

  function addNumbers(text) {
    return listItems(text).map((item, index) => `${index + 1}. ${item}`).join('\n');
  }

  function separatorToLines(text, separator = ',') {
    return String(text ?? '').split(separator).map((item) => item.trim()).filter(Boolean).join('\n');
  }

  function linesToSeparator(text, separator = ', ') {
    return listItems(text).join(separator);
  }

  return {
    stats,
    trimLines,
    collapseWhitespace,
    removeBlankLines,
    dedupeLines,
    upperCase,
    lowerCase,
    titleCase,
    sentenceCase,
    stripListMarkers,
    listItems,
    sortLines,
    reverseLines,
    addBullets,
    addNumbers,
    separatorToLines,
    linesToSeparator,
  };
});
