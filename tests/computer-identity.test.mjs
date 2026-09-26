import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('computer-src/src/index.html', 'utf8');

test('vendored computer page uses Random Info identity and does not report to upstream analytics', () => {
  assert.match(html, /<title>Random Info Computer<\/title>/);
  assert.match(html, /name=["']description["'][^>]+Random Info Pages/i);
  assert.doesNotMatch(html, /googletagmanager\.com|G-4FJBF6WF60|gtag\s*\(/i);
  assert.doesNotMatch(html, /henryheffernan\.com|Henry Heffernan - (?:Portfolio|Software Engineer)/i);
  assert.match(html, /href=["']\.\.\/static\/images\/favicon\.ico["']/);
  assert.ok(fs.existsSync('computer-src/static/images/favicon.ico'), 'favicon source asset must exist');
});
