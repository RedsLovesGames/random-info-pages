#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED = [
    'tools/index.html',
    'tools/shared/toolbox.css',
    'tools/shared/toolbox.js',
    'tools/time/index.html',
    'tools/time/time.js',
    'tools/time/time-app.js',
    'tools/image/index.html',
    'tools/image/image-core.js',
    'tools/image/image-engine.js',
    'tools/image/image-app.js',
    'tools/image/gif-maker.js',
    'tools/image/bg-remove-core.js',
    'tools/image/bg-remove.js',
    'tools/money/index.html',
    'tools/money/money-core.js',
    'tools/money/fx-core.js',
    'tools/money/data/us-cpi.json',
    'tools/text/index.html',
    'tools/text/text-core.js',
    'tools/OPEN_SOURCE.md',
]


def fail(message: str) -> None:
    raise SystemExit(f'FAIL: {message}')


for relative in REQUIRED:
    if not (ROOT / relative).is_file():
        fail(f'missing required file: {relative}')

home = (ROOT / 'index.html').read_text(encoding='utf-8')
if 'href="./tools/"' not in home:
    fail('homepage does not link ./tools/')

hub = (ROOT / 'tools/index.html').read_text(encoding='utf-8')
for route in ('./time/', './image/', './money/', './text/'):
    if f'href="{route}"' not in hub:
        fail(f'toolbox hub missing route {route}')

for path in ('tools/time/index.html', 'tools/image/index.html', 'tools/money/index.html', 'tools/text/index.html'):
    text = (ROOT / path).read_text(encoding='utf-8')
    if 'href="../"' not in text:
        fail(f'{path} has no relative link back to toolbox')

image = (ROOT / 'tools/image/index.html').read_text(encoding='utf-8')
for asset in ('image-core.js', 'image-engine.js', 'image-app.js', 'crop-editor.js', 'gif-maker.js', 'bg-remove-core.js', 'bg-remove.js'):
    if asset not in image:
        fail(f'Image Studio does not load {asset}')

with (ROOT / 'tools/money/data/us-cpi.json').open(encoding='utf-8') as handle:
    cpi = json.load(handle)
values = cpi.get('values', {})
expected_years = [str(year) for year in range(1800, 2026)]
missing = [year for year in expected_years if year not in values]
extra = [year for year in values if year not in expected_years]
if missing:
    fail(f'CPI data missing years: {", ".join(missing[:8])}')
if extra:
    fail(f'CPI data contains unexpected years: {", ".join(extra[:8])}')
if len(values) != 226:
    fail(f'expected 226 CPI annual observations, got {len(values)}')
if not str(cpi.get('sourceUrl', '')).startswith('https://www.minneapolisfed.org/'):
    fail('CPI data source metadata is missing Minneapolis Fed URL')

open_source = (ROOT / 'tools/OPEN_SOURCE.md').read_text(encoding='utf-8')
for token in ('pica@10.0.3', 'fflate@0.8.3', 'cropperjs@2.2.0', 'gifenc@1.0.3', 'onnxruntime-web@1.30.0', 'marked@18.0.14', 'dompurify@3.4.16', 'Frankfurter'):
    if token not in open_source:
        fail(f'OPEN_SOURCE.md missing incorporated source: {token}')

absolute_tool_paths = []
for html_path in (ROOT / 'tools').rglob('*.html'):
    text = html_path.read_text(encoding='utf-8')
    if re.search(r'(?:href|src)=["\']/tools/', text):
        absolute_tool_paths.append(str(html_path.relative_to(ROOT)))
if absolute_tool_paths:
    fail(f'root-absolute /tools paths break project-site deployment: {absolute_tool_paths}')

print('PASS toolbox static routes, assets, CPI coverage, attribution, and relative paths')
