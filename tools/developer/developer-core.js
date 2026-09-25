const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export function prettyJson(text, space = 2) {
  return JSON.stringify(JSON.parse(String(text ?? '')), null, space);
}
export function minifyJson(text) { return JSON.stringify(JSON.parse(String(text ?? ''))); }
export function validateJson(text) {
  try { JSON.parse(String(text ?? '')); return { valid: true, error: null }; }
  catch (error) { return { valid: false, error: error.message || String(error) }; }
}

function bytesToBinary(bytes) { return Array.from(bytes, byte => String.fromCharCode(byte)).join(''); }
function binaryToBytes(binary) { return Uint8Array.from(binary, char => char.charCodeAt(0)); }

export function base64Encode(text) {
  const bytes = utf8Encoder.encode(String(text ?? ''));
  if (typeof btoa === 'function') return btoa(bytesToBinary(bytes));
  return Buffer.from(bytes).toString('base64');
}
export function base64Decode(text) {
  const value = String(text ?? '').replace(/\s+/g, '');
  const binary = typeof atob === 'function' ? atob(value) : Buffer.from(value, 'base64').toString('binary');
  return utf8Decoder.decode(binaryToBytes(binary));
}
export function base64UrlDecode(text) {
  const normalized = String(text ?? '').replace(/-/g, '+').replace(/_/g, '/');
  return base64Decode(normalized + '='.repeat((4 - normalized.length % 4) % 4));
}
export function textToHex(text) { return Array.from(utf8Encoder.encode(String(text ?? '')), byte => byte.toString(16).padStart(2, '0')).join(' '); }
export function hexToText(text) {
  const clean = String(text ?? '').replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  if (clean.length % 2) throw new Error('Hex input must contain whole bytes.');
  return utf8Decoder.decode(Uint8Array.from(clean.match(/.{2}/g) || [], pair => parseInt(pair, 16)));
}
export function textToBinary(text) { return Array.from(utf8Encoder.encode(String(text ?? '')), byte => byte.toString(2).padStart(8, '0')).join(' '); }
export function binaryToText(text) {
  const groups = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (groups.some(group => !/^[01]{8}$/.test(group))) throw new Error('Binary input must be groups of 8 bits.');
  return utf8Decoder.decode(Uint8Array.from(groups, group => parseInt(group, 2)));
}
export function urlEncode(text) { return encodeURIComponent(String(text ?? '')); }
export function urlDecode(text) { return decodeURIComponent(String(text ?? '')); }
export function htmlEntityEncode(text) { return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
export function htmlEntityDecode(text) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
  return String(text ?? '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|#39);/gi, (_, entity) => {
    if (/^#x/i.test(entity)) return String.fromCodePoint(parseInt(entity.slice(2), 16));
    if (/^#\d+/.test(entity)) return String.fromCodePoint(parseInt(entity.slice(1), 10));
    return entities[entity.toLowerCase()] ?? _;
  });
}

export function decodeJwt(token) {
  const parts = String(token ?? '').trim().split('.');
  if (parts.length < 2) throw new Error('JWT must contain at least header and payload segments.');
  return { header: JSON.parse(base64UrlDecode(parts[0])), payload: JSON.parse(base64UrlDecode(parts[1])), signature: parts[2] || '', verified: false };
}

export function parseUrlParts(value) {
  const url = new URL(String(value ?? ''));
  const query = {};
  for (const [key, val] of url.searchParams.entries()) {
    if (!(key in query)) query[key] = val;
    else query[key] = Array.isArray(query[key]) ? [...query[key], val] : [query[key], val];
  }
  return { href: url.href, protocol: url.protocol, username: url.username, password: url.password, hostname: url.hostname, port: url.port, pathname: url.pathname, hash: url.hash, query };
}

export function runRegex(text, pattern, flags = 'g') {
  const safeFlags = [...new Set(String(flags || '').split(''))].join('');
  const regex = new RegExp(String(pattern ?? ''), safeFlags);
  const input = String(text ?? '');
  const matches = [];
  if (regex.global) {
    let match;
    while ((match = regex.exec(input))) {
      matches.push({ match: match[0], index: match.index, groups: match.slice(1), namedGroups: match.groups || null });
      if (match[0] === '') regex.lastIndex += 1;
    }
  } else {
    const match = regex.exec(input);
    if (match) matches.push({ match: match[0], index: match.index, groups: match.slice(1), namedGroups: match.groups || null });
  }
  return { matches, pattern: regex.source, flags: regex.flags };
}

export function diffLines(before, after) {
  const a = String(before ?? '').replace(/\r\n?/g, '\n').split('\n');
  const b = String(after ?? '').replace(/\r\n?/g, '\n').split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const result = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { result.push({ type: 'equal', value: a[i++] }); j++; }
    else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) result.push({ type: 'add', value: b[j++] });
    else result.push({ type: 'remove', value: a[i++] });
  }
  return result;
}

export function detectInputType(text) {
  const value = String(text ?? '').trim();
  if (!value) return 'text';
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.?[A-Za-z0-9_-]*$/.test(value)) {
    try { decodeJwt(value); return 'jwt'; } catch {}
  }
  try { JSON.parse(value); return 'json'; } catch {}
  try { const url = new URL(value); if (url.protocol) return 'url'; } catch {}
  if (/^-----BEGIN [A-Z ]+-----/.test(value)) return 'pem';
  return 'text';
}

export function operationApply(id, input, options = {}) {
  switch (id) {
    case 'json-pretty': return prettyJson(input, options.space || 2);
    case 'json-minify': return minifyJson(input);
    case 'base64-encode': return base64Encode(input);
    case 'base64-decode': return base64Decode(input);
    case 'url-encode': return urlEncode(input);
    case 'url-decode': return urlDecode(input);
    case 'html-encode': return htmlEntityEncode(input);
    case 'html-decode': return htmlEntityDecode(input);
    case 'hex-encode': return textToHex(input);
    case 'hex-decode': return hexToText(input);
    case 'binary-encode': return textToBinary(input);
    case 'binary-decode': return binaryToText(input);
    default: throw new Error(`Unknown operation: ${id}`);
  }
}
