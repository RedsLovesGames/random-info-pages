import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('fiction-workspace/index.html',root),'utf8');
const script = readFileSync(new URL('fiction-workspace/app.js',root),'utf8');
const source = readFileSync(new URL('fiction-workspace/templates.js',root),'utf8');
const context = {window:{}};
runInNewContext(source,context);
const templates=context.window.FICTION_TEMPLATES;
test('Draftroom is linked in the archive search index',()=>{
 const home=readFileSync(new URL('index.html',root),'utf8');
 assert.match(home,/const projects=\[/);
 assert.match(home,/\{n:'Draftroom',d:'Novel Writing & Revision',p:'\.\/fiction-workspace\/',c:'Tools'/);
});
test('source workbook rubric stays at fourteen categories and 100 weighted points',()=>{
 const rubric=templates.find(x=>x.id==='rubric');
 assert.equal(rubric.items.length,14);
 assert.equal(rubric.items.reduce((s,x)=>s+x.weight,0),100);
 assert.ok(rubric.items.every(x=>x.questions.length>=2));
 assert.equal(templates.find(x=>x.id==='scene').items.length,5);
 assert.equal(templates.find(x=>x.id==='chapter').items.length,6);
 assert.equal(new Set(templates.map(x=>x.id)).size,templates.length);
});
test('workspace includes local profile gate, backup, chapter sorting and separate checklists',()=>{
 for(const id of ['authForm','username','password','addProject','addChapter','chapterSort','backupFile','newReviewDialog']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const symbol of ['localStorage','sessionStorage','crypto.subtle','URL.createObjectURL','normalizeReviews','sortReviews','data-rating']){
  assert.ok(script.includes(symbol),symbol);
 }
 assert.match(html,/not real security/);
});
