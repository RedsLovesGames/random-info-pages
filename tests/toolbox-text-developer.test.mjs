import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const textHtml = readFileSync(new URL('../tools/text/index.html', import.meta.url), 'utf8');
const developerUrl = new URL('../tools/developer/index.html', import.meta.url);

test('Text Studio exposes the unified input workspace modes', () => {
  for (const token of ['textHistory','undoText','redoText','findReplaceTool','analyzeTool','compareTool','unicodeTool','text-workspace.js']) {
    assert.match(textHtml, new RegExp(token));
  }
});

test('Developer Lab page exists', () => {
  assert.equal(existsSync(developerUrl), true);
});

const developerHtml = existsSync(developerUrl) ? readFileSync(developerUrl, 'utf8') : '';
for (const token of ['developerInput','developerOutput','operationChain','jsonTool','base64Tool','urlTool','jwtTool','regexTool','hashTool','diffTool','apiTool','playgroundTool','developer-app.js']) {
  test(`Developer Lab exposes ${token}`, () => assert.match(developerHtml, new RegExp(token)));
}
