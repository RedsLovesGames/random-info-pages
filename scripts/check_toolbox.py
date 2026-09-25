#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    'tools/index.html','tools/shared/toolbox.css','tools/shared/toolbox.js','tools/shared/artifacts.js','tools/shared/command-core.js','tools/shared/command.js','tools/shared/handoff-receiver.js','tools/shared/handoff-producers.js',
    'tools/time/index.html','tools/time/time.js','tools/time/time-app.js','tools/time/time-utils.js','tools/time/time-tools.js','tools/time/time-tools.css',
    'tools/image/index.html','tools/image/image-core.js','tools/image/image-engine.js','tools/image/image-app.js','tools/image/image-workspace.js','tools/image/gif-maker.js','tools/image/bg-remove-core.js','tools/image/bg-remove.js',
    'tools/money/index.html','tools/money/money-core.js','tools/money/fx-core.js','tools/money/finance-core.js','tools/money/money-scenario.js','tools/money/money-scenario.css','tools/money/data/us-cpi.json',
    'tools/text/index.html','tools/text/text-core.js','tools/text/text-workspace.js',
    'tools/pdf/index.html','tools/pdf/pdf-core.js','tools/pdf/pdf-engine.js','tools/pdf/pdf-app.js','tools/pdf/pdf.css',
    'tools/files/index.html','tools/files/files-core.js','tools/files/files-app.js','tools/files/files.css',
    'tools/media/index.html','tools/media/media-core.js','tools/media/media-app.js','tools/media/media.css','tools/media/media-quick.js','tools/media/media-quick.css','tools/media/mediabunny-loader.js',
    'tools/data/index.html','tools/data/data-core.js','tools/data/data-engines.js','tools/data/data-io.js','tools/data/data-charts.js','tools/data/data-app.js','tools/data/data-route.js','tools/data/data.css',
    'tools/developer/index.html','tools/developer/developer-core.js','tools/developer/developer-app.js','tools/developer/developer.css',
    'tools/math/index.html','tools/math/math.css','tools/math/math-app.js','tools/math/calc-core.js','tools/math/units-core.js','tools/math/science-core.js','tools/math/grade-core.js',
    'tools/random/index.html','tools/random/random.css','tools/random/random-core.js','tools/random/random-app.js',
    'tools/codes/index.html','tools/codes/codes.css','tools/codes/codes-core.js','tools/codes/codes-app.js',
    'tools/network/index.html','tools/network/network.css','tools/network/network-core.js','tools/network/network-app.js',
    'tools/OPEN_SOURCE.md','tools/DATA_OPEN_SOURCE.md','tools/DEVELOPER_OPEN_SOURCE.md',
]


def fail(message: str) -> None:
    raise SystemExit(f'FAIL: {message}')


for relative in REQUIRED:
    if not (ROOT / relative).is_file(): fail(f'missing required file: {relative}')

home = (ROOT / 'index.html').read_text(encoding='utf-8')
if 'href="./tools/"' not in home: fail('homepage does not link ./tools/')

routes = ('time','image','money','text','pdf','files','media','data','developer','math','random','codes','network')
hub = (ROOT / 'tools/index.html').read_text(encoding='utf-8')
for name in routes:
    route = f'./{name}/'
    if f'href="{route}"' not in hub: fail(f'toolbox hub missing route {route}')
if './shared/command.js' not in hub: fail('toolbox hub does not load shared command search')

for name in routes:
    path = ROOT / f'tools/{name}/index.html'
    text = path.read_text(encoding='utf-8')
    if 'href="../"' not in text: fail(f'{path.relative_to(ROOT)} has no relative link back to toolbox')

asset_guards = {
    'time': ('time.css','time-app.js','time-utils.js','time-tools.js','time-tools.css'),
    'money': ('money.css','money-scenario.css','money-core.js','fx-core.js','finance-core.js','money-app.js','money-scenario.js'),
    'image': ('image-core.js','image-engine.js','image-app.js','image-workspace.js','crop-editor.js','gif-maker.js','bg-remove-core.js','bg-remove.js'),
    'pdf': ('pdf.css','pdf-app.js','handoff-producers.js'),
    'files': ('files.css','files-app.js','handoff-producers.js'),
    'media': ('media.css','media-quick.css','mediabunny-loader.js','media-app.js','media-quick.js'),
    'data': ('data.css','data-app.js','data-route.js','handoff-producers.js','handoff-receiver.js'),
    'text': ('text.css','text-core.js','text-app.js','text-workspace.js','handoff-receiver.js'),
    'developer': ('developer.css','developer-app.js','handoff-receiver.js'),
    'math': ('math.css','calc-core.js','units-core.js','science-core.js','grade-core.js','math-app.js'),
    'random': ('random.css','random-app.js'),
    'codes': ('codes.css','codes-app.js'),
    'network': ('network.css','network-app.js'),
}
for name, assets in asset_guards.items():
    text = (ROOT / f'tools/{name}/index.html').read_text(encoding='utf-8')
    for asset in assets:
        if asset not in text: fail(f'{name} workspace does not load {asset}')

with (ROOT / 'tools/money/data/us-cpi.json').open(encoding='utf-8') as handle: cpi = json.load(handle)
values = cpi.get('values', {})
expected_years = [str(year) for year in range(1800, 2026)]
missing = [year for year in expected_years if year not in values]
extra = [year for year in values if year not in expected_years]
if missing: fail(f'CPI data missing years: {", ".join(missing[:8])}')
if extra: fail(f'CPI data contains unexpected years: {", ".join(extra[:8])}')
if len(values) != 226: fail(f'expected 226 CPI annual observations, got {len(values)}')
if not str(cpi.get('sourceUrl', '')).startswith('https://www.minneapolisfed.org/'): fail('CPI data source metadata is missing Minneapolis Fed URL')

open_source = (ROOT / 'tools/OPEN_SOURCE.md').read_text(encoding='utf-8')
for token in ('pica@10.0.3','fflate@0.8.3','cropperjs@2.2.0','gifenc@1.0.3','onnxruntime-web@1.30.0','marked@18.0.14','dompurify@3.4.16','hash-wasm@4.12.0','mediabunny@1.59.1','bwip-js@4.11.4','Frankfurter'):
    if token not in open_source: fail(f'OPEN_SOURCE.md missing incorporated source: {token}')

data_open_source = (ROOT / 'tools/DATA_OPEN_SOURCE.md').read_text(encoding='utf-8')
for token in ('papaparse@5.7.0','SheetJS CE 0.20.3','@duckdb/duckdb-wasm@1.33.1-dev57.0','@observablehq/plot@0.6.17'):
    if token not in data_open_source: fail(f'DATA_OPEN_SOURCE.md missing incorporated source: {token}')

developer_open_source = (ROOT / 'tools/DEVELOPER_OPEN_SOURCE.md').read_text(encoding='utf-8')
for token in ('js-yaml@5.4.2','ajv@8.17.1','marked@18.0.14','dompurify@3.4.16'):
    if token not in developer_open_source: fail(f'DEVELOPER_OPEN_SOURCE.md missing incorporated source: {token}')

absolute_tool_paths = []
for html_path in (ROOT / 'tools').rglob('*.html'):
    text = html_path.read_text(encoding='utf-8')
    if re.search(r'(?:href|src)=["\']/tools/', text): absolute_tool_paths.append(str(html_path.relative_to(ROOT)))
if absolute_tool_paths: fail(f'root-absolute /tools paths break project-site deployment: {absolute_tool_paths}')

print('PASS toolbox static routes, assets, Step 10 integration, disclosures, CPI coverage, attribution, and relative paths')
