import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tools/text/index.html', import.meta.url), 'utf8');

test('text tool exposes cleaner and live counts', () => {
  assert.match(html, /id="textInput"/);
  assert.match(html, /id="textOutput"/);
  assert.match(html, /id="wordCount"/);
  assert.match(html, /id="characterCount"/);
  assert.match(html, /id="lineCount"/);
  assert.match(html, /id="copyOutput"/);
  assert.match(html, /text-core\.js/);
});

test('text tool exposes list cleaner actions', () => {
  assert.match(html, /id="listMode"/);
  assert.match(html, /data-action="dedupe"/);
  assert.match(html, /data-action="sort-asc"/);
  assert.match(html, /data-action="strip-markers"/);
  assert.match(html, /data-action="number"/);
  assert.match(html, /id="separatorInput"/);
});

test('text tool exposes sanitized markdown playground', () => {
  assert.match(html, /id="markdownMode"/);
  assert.match(html, /id="markdownInput"/);
  assert.match(html, /id="markdownPreview"/);
  assert.match(html, /id="copyMarkdownHtml"/);
  assert.match(html, /DOMPurify/i);
  assert.match(html, /Marked/i);
});
