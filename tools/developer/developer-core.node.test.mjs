import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prettyJson, minifyJson, base64Encode, base64Decode, textToHex, hexToText,
  decodeJwt, parseUrlParts, runRegex, diffLines, htmlEntityEncode, htmlEntityDecode,
} from './developer-core.js';

test('JSON pretty/minify preserve data', () => {
  const pretty = prettyJson('{"a":1,"b":[2]}');
  assert.match(pretty, /\n/);
  assert.equal(minifyJson(pretty), '{"a":1,"b":[2]}');
});

test('Base64 round trips Unicode text', () => {
  const encoded = base64Encode('héllo 🌊');
  assert.equal(base64Decode(encoded), 'héllo 🌊');
});

test('hex conversion round trips UTF-8 text', () => {
  const hex = textToHex('Hi ✓');
  assert.equal(hexToText(hex), 'Hi ✓');
});

test('JWT decode returns header and payload without claiming verification', () => {
  const token = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWxleCJ9.';
  const result = decodeJwt(token);
  assert.equal(result.header.alg, 'none');
  assert.equal(result.payload.name, 'Alex');
  assert.equal(result.verified, false);
});

test('URL parser exposes query parameters', () => {
  const result = parseUrlParts('https://example.com/a?x=1&x=2#z');
  assert.equal(result.hostname, 'example.com');
  assert.deepEqual(result.query.x, ['1','2']);
});

test('regex runner returns matches and groups', () => {
  const result = runRegex('a12 b34', '(\\w)(\\d+)', 'g');
  assert.equal(result.matches.length, 2);
  assert.deepEqual(result.matches[0].groups, ['a','12']);
});

test('line diff marks additions and removals', () => {
  const diff = diffLines('a\nb', 'a\nc');
  assert.ok(diff.some(x => x.type === 'remove' && x.value === 'b'));
  assert.ok(diff.some(x => x.type === 'add' && x.value === 'c'));
});

test('HTML entities round trip reserved characters', () => {
  const encoded = htmlEntityEncode('<a>&"');
  assert.equal(encoded, '&lt;a&gt;&amp;&quot;');
  assert.equal(htmlEntityDecode(encoded), '<a>&"');
});
