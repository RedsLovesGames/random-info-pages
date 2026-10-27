import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const classic = readFileSync(new URL('../classic.html', import.meta.url), 'utf8');
const registryMatch = html.match(/const projects=(\[[\s\S]*?\]);/);
assert.ok(registryMatch, 'homepage must contain the search/project registry');
const projects = runInNewContext(registryMatch[1]);

const requiredRoutes = [
  'tools', 'fiction-workspace', 'wheel', 'whenwemeet',
  'school-schedule', 'friends', 'tideborne', 'tide2',
  'vct-scout', 'stock-fights', 'oldasspolitic', 'heatmap',
  'political-grid', 'infrastructure-atlas', 'wanuiv2',
  'nerdcore-prompts', 'music-microscope', 'one-million',
  'algorithm-arena', 'cryptography-museum', '9-11-timeline',
  'belief-atlas'
];

test('new homepage has the intended editorial interface', () => {
  for (const id of ['main', 'fluidCanvas', 'featured', 'index', 'projectList', 'filters', 'about', 'searchDialog', 'dialogInput', 'randomProject']) {
    assert.match(html, new RegExp('id="' + id + '"'), id + ' exists');
  }
  assert.match(html, /class="hero-heading"/);
  assert.match(html, /class="featured-grid"/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /href="\.\/classic\.html"/);
  assert.match(html, /aria-label="Search projects"/);
});

test('classic homepage is preserved as a separate functional page', () => {
  assert.match(classic, /data-archive-home/);
  assert.match(classic, /data-folder="tools"/);
  assert.match(classic, /data-folder="experiments"/);
  assert.match(classic, /id="searchDialog"/);
  for (const route of requiredRoutes) {
    assert.ok(classic.includes('href="./' + route + '/"'), route + ' stays linked from classic');
  }
});

test('all public project routes remain in the new index without duplicates', () => {
  assert.equal(projects.length, 24);
  assert.equal(new Set(projects.map(p => p.p)).size, projects.length);
  assert.equal(new Set(projects.map(p => p.n)).size, projects.length);
  for (const route of requiredRoutes) {
    const path = './' + route + '/';
    assert.ok(projects.some(p => p.p === path), path + ' stays indexed');
    assert.ok(existsSync(new URL('../' + route + '/index.html', import.meta.url)), path + ' exists');
  }
  for (const p of projects) {
    assert.ok(p.n && p.c && p.k.length > 10, p.n + ' has searchable metadata');
  }
});

test('Device Worlds is discoverable in the new index', () => {
  const project=projects.find(p=>p.p==='./device-worlds/');
  assert.ok(project && !project.a);
  assert.equal(project.c,'Experiments');
  assert.ok(existsSync(new URL('../device-worlds/index.html', import.meta.url)));
});

test('category controls and project metadata remain in sync', () => {
  const categories = new Set(projects.map(p => p.c));
  assert.deepEqual([...categories].sort(), ['Data','Experiments','Friends','Games','School','Tools']);
  for (const category of categories) {
    assert.match(html, new RegExp('data-filter="' + category + '"'));
  }
  assert.match(html, /new Set\(activeProjects\.map\(p=>p\.c\)\)\.size/);
  assert.match(html, /activeProjects\.length/);
  assert.match(html, /currentFilter==='All'\|\|p\.c===currentFilter/);
});

test('search, random navigation, previews, and keyboard access are wired', () => {
  assert.match(html, /function renderIndex\(\)/);
  assert.match(html, /function renderSearch\(\)/);
  assert.match(html, /function randomProject\(\)/);
  assert.match(html, /function openSearch\(\)/);
  assert.match(html, /e\.key==='ArrowDown'/);
  assert.match(html, /e\.key==='Enter'/);
  for (const preview of ['infrastructure-atlas', 'music-microscope', 'stock-fights']) {
    assert.ok(html.includes('data-src="./' + preview + '/"'));
  }
  assert.match(html, /IntersectionObserver/);
  assert.match(html, /ResizeObserver/);
});

test('new homepage JavaScript parses', () => {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match, 'inline script present');
  assert.doesNotThrow(() => new Script(match[1]));
});

test('key project descriptions are specific and searchable', () => {
  for (const [name, route, category] of [
    ['Belief Atlas','belief-atlas','Data'],
    ['Stock Fights','stock-fights','Games'],
    ['Political Grid','political-grid','Data'],
    ['Infrastructure Atlas','infrastructure-atlas','Data'],
    ['Music Microscope','music-microscope','Experiments'],
    ['A Day in Messages','9-11-timeline','Data'],
    ['School Schedule','school-schedule','School']
  ]) {
    const p = projects.find(item => item.p === './' + route + '/');
    assert.ok(p, name + ' indexed');
    assert.equal(p.n, name);
    assert.equal(p.c, category);
    assert.ok(p.k.length > 15, name + ' has keywords');
  }
});

test('human-facing project labels are clear, unique, and backwards searchable', () => {
  assert.equal(new Set(projects.map(p => p.d)).size, projects.length);
  for (const p of projects) {
    assert.ok(p.d && p.d.length >= 10, p.n + ' has a human-readable public label');
    assert.ok(p.n && p.k, p.d + ' retains original name and search keywords');
  }
  for (const term of ['Novel Writing & Revision','Group Availability Planner',
      'U.S. Congress Age Explorer','Stock Image Fight Simulator']) {
    assert.ok(projects.some(p => p.d === term), term + ' is listed');
  }
  assert.match(html, /name\.textContent=p\.d\|\|p\.n/);
  assert.match(html, /title\.textContent=p\.d\|\|p\.n/);
  for (const label of ['Utilities','School & Planning','Friends & Social',
      'Games & Guides','Data & Research','Interactive Labs']) {
    assert.ok(html.includes('>'+label+'</button>'), label + ' is exposed in category filters');
  }
});


test('VCT and Tideborne are archived, remain available, and are excluded from the active project index', () => {
  const archived=projects.filter(p=>p.a);
  assert.deepEqual(Array.from(archived,p=>p.p).sort(),['./tide2/','./tideborne/','./vct-scout/'].sort());
  assert.equal(projects.filter(p=>!p.a).length,21);
  assert.match(html,/const activeProjects=projects\.filter\(p=>!p\.a\)/);
  assert.match(html,/const shown=activeProjects\.filter/);
  assert.match(html,/const p=activeProjects\[Math\.floor\(Math\.random\(\)\*activeProjects\.length\)\]/);
  assert.match(html,/:activeProjects}/);
  assert.match(html,/p\.a\?' · ARCHIVED'/);
  assert.match(html,/href="\.\/archive\/"/);
  const archive=readFileSync(new URL('../archive/index.html',import.meta.url),'utf8');
  for(const slug of ['vct-scout','tideborne','tide2']){
    assert.ok(archive.includes('href="../'+slug+'/"'),slug+' linked from archive');
    assert.ok(existsSync(new URL('../'+slug+'/index.html',import.meta.url)));
  }
  assert.match(archive,/Retained for reference/);
});
test('archive notices preserve the original project interfaces', () => {
  const vct=readFileSync(new URL('../vct-scout/index.html',import.meta.url),'utf8');
  const tide=readFileSync(new URL('../tide2/index.html',import.meta.url),'utf8');
  const wiki=readFileSync(new URL('../tideborne/assets/site.js',import.meta.url),'utf8');
  for(const page of [vct,tide,wiki]){
    assert.match(page,/rip-archive-notice/);
    assert.match(page,/archive\/archive-notice\.css/);
  }
  assert.match(vct,/Recommended Play/);
  assert.match(tide,/Fishing Luck/);
  assert.match(wiki,/function header\(\)/);
});

test('the nested Fishing System 2.0 reference is also visibly archived', () => {
  const ref=readFileSync(new URL('../tide2/mechanics-reference.html',import.meta.url),'utf8');
  assert.match(ref,/rip-archive-notice/);
  assert.match(ref,/href="\.\.\/archive\/"/);
  assert.match(ref,/Fishing 2\.0/);
});


test('Shard Market is available in the active index', () => {
  const p=projects.find(item=>item.p==='./shard-fusions/');
  assert.ok(p && !p.a && p.c==='Games');
  assert.ok(existsSync(new URL('../shard-fusions/index.html',import.meta.url)));
  assert.match(html,/Live Shard Fusion Profit Finder/);
});
