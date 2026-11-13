// Pure, dependency-free letter-rack solver. No word list is bundled here.
export const TILE_VALUES = Object.freeze({
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
  N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
});

export function normalizeRack(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z?]/g, '');
}

export function parseDictionary(text) {
  return [...new Set(String(text || '').toUpperCase().split(/\r?\n/)
    .map(word => word.trim()).filter(word => /^[A-Z]{2,}$/.test(word)))];
}

export function isPalindrome(word) {
  const text = String(word || '').toUpperCase();
  return text.length >= 2 && text === [...text].reverse().join('');
}

export function counts(text) {
  const out = Object.create(null);
  for (const char of text) out[char] = (out[char] || 0) + 1;
  return out;
}

export function fitsRack(word, rack, exact = false) {
  const w = String(word || '').toUpperCase();
  const letters = normalizeRack(rack);
  if (!/^[A-Z]{2,}$/.test(w) || w.length > letters.length) return false;
  if (exact && w.length !== letters.length) return false;
  const pool = counts(letters);
  let wildcards = pool['?'] || 0;
  for (const char of w) {
    if (pool[char] > 0) pool[char]--;
    else if (wildcards > 0) wildcards--;
    else return false;
  }
  return true;
}

export function leftoverLetters(word, rack) {
  const pool = counts(normalizeRack(rack));
  let wildcards = pool['?'] || 0;
  for (const char of String(word).toUpperCase()) {
    if (pool[char] > 0) pool[char]--;
    else if (wildcards > 0) wildcards--;
  }
  pool['?'] = wildcards;
  return Object.keys(pool).sort().map(char => char.repeat(pool[char])).join('');
}

export function tileScore(word, rack) {
  const pool = counts(normalizeRack(rack));
  let sum = 0;
  for (const char of String(word).toUpperCase()) {
    if (pool[char] > 0) { pool[char]--; sum += TILE_VALUES[char] || 0; }
    else if (pool['?'] > 0) pool['?']--;
  }
  return sum;
}

export function scoreWord(word, rack, options = {}) {
  const palindrome = isPalindrome(word);
  const mode = options.mode === 'tiles' ? 'tiles' : 'length';
  const base = mode === 'tiles' ? tileScore(word, rack) : word.length;
  const rawBonus = Number(options.bonus);
  const bonus = Number.isFinite(rawBonus) ? Math.max(1, Math.min(20, rawBonus)) : 2;
  return { base, score: base * (palindrome ? bonus : 1), palindrome };
}

export function solveRack(words, rack, options = {}) {
  const letters = normalizeRack(rack);
  const minimum = Number.isFinite(Number(options.minLength))
    ? Math.max(2, Math.min(letters.length, Number(options.minLength))) : 2;
  const exact = Boolean(options.exact);
  const palindromeOnly = Boolean(options.palindromeOnly);
  const output = [];
  if (letters.length < 2) return output;
  const pool = counts(letters);
  for (const original of words) {
    const word = String(original).trim().toUpperCase();
    if (!/^[A-Z]{2,}$/.test(word) || word.length < minimum || word.length > letters.length) continue;
    if (exact && word.length !== letters.length) continue;
    const pal = isPalindrome(word);
    if (palindromeOnly && !pal) continue;
    const used = Object.create(null);
    let excess = 0;
    let valid = true;
    for (const char of word) {
      const count = (used[char] || 0) + 1;
      used[char] = count;
      if (count > (pool[char] || 0)) {
        excess++;
        if (excess > (pool['?'] || 0)) { valid = false; break; }
      }
    }
    if (!valid) continue;
    const result = scoreWord(word, letters, options);
    output.push({
      word, length: word.length, palindrome: result.palindrome,
      base: result.base, score: result.score, leftovers: leftoverLetters(word, letters)
    });
  }
  output.sort((a,b) => b.score - a.score || b.length - a.length || a.word.localeCompare(b.word));
  return output;
}
