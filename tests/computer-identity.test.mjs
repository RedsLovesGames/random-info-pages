import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sourceHtml = fs.readFileSync('computer-src/src/index.html', 'utf8');
const builtHtml = fs.readFileSync('computer-src/public/index.html', 'utf8');

test('vendored computer page uses Random Info identity and does not report to upstream analytics', () => {
  assert.match(sourceHtml, /<title>Random Info Computer<\/title>/);
  assert.match(sourceHtml, /name=["']description["'][^>]+Random Info Pages/i);
  assert.doesNotMatch(sourceHtml, /googletagmanager\.com|G-4FJBF6WF60|gtag\s*\(/i);
  assert.doesNotMatch(sourceHtml, /henryheffernan\.com|Henry Heffernan - (?:Portfolio|Software Engineer)/i);

  assert.doesNotMatch(sourceHtml, /href=["']\.\.\/static\/images\/favicon\.ico["']/, 'raw favicon source link must stay out of the HTML template');
  assert.ok(fs.existsSync('computer-src/static/images/favicon.ico'), 'favicon source asset must exist');
  assert.ok(fs.existsSync('computer-src/public/favicon.ico'), 'production build must emit favicon.ico');
  assert.match(builtHtml, /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']\.\/favicon\.ico["']/i, 'production HTML must link the emitted favicon');
});
