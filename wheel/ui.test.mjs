import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');

test('top toolbar matches the compact wheel app workflow',()=>{
  for(const id of ['customizeBtn','newTopBtn','openBtn','saveBtn','shareBtn','moreBtn','fullscreenTopBtn']) assert.match(html,new RegExp(`id="${id}"`));
});

test('wheel is the spin control and default editor is a multiline entries panel',()=>{
  assert.match(html,/id="entriesInput"[^>]*textarea|<textarea[^>]*id="entriesInput"/);
  assert.match(html,/id="entriesTab"/);
  assert.match(html,/id="resultsTab"/);
  assert.match(html,/id="advancedToggle"/);
  assert.match(html,/id="addImageBtn"/);
  assert.doesNotMatch(html,/id="spinBtn"/);
});

test('workspace uses a dominant wheel stage and right sidebar',()=>{
  assert.match(html,/class="[^"]*wheel-stage/);
  assert.match(html,/class="[^"]*side-panel/);
  assert.match(css,/grid-template-columns:[^;]*minmax\(0,1fr\)[^;]*3(?:4|5|6|7|8)0px/);
});

test('multiple wheel controls remain available at the bottom of the sidebar',()=>{
  assert.match(html,/id="wheelTabs"/);
  assert.match(html,/id="addWheelBtn"/);
});
