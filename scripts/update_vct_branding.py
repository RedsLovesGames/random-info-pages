#!/usr/bin/env python3
from __future__ import annotations
import html
import json
import re
import urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'vct-scout'/'team-logos.json'
TEAM_IDS=[120,6961,1034,11058,731,13576,1120,13581,8877,474,1184,2059,918,11060,624,14]
UA='Mozilla/5.0 (compatible; RandomInfoPages-VCTScout/1.0; +https://redslovesgames.github.io/random-info-pages/)'

def fetch_logo(team_id:int)->str|None:
    req=urllib.request.Request(f'https://www.vlr.gg/team/{team_id}',headers={'User-Agent':UA,'Accept-Language':'en-US,en;q=0.9'})
    with urllib.request.urlopen(req,timeout=20) as resp:
        text=resp.read().decode('utf-8','replace')
    patterns=[
        r'team-header-logo[\s\S]{0,900}?<img[^>]+src=["\']([^"\']+)',
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]+alt=["\'][^"\']*team logo',
    ]
    for pat in patterns:
        m=re.search(pat,text,re.I)
        if not m: continue
        url=html.unescape(m.group(1)).strip()
        if url.startswith('//'): url='https:'+url
        elif url.startswith('/'): url='https://www.vlr.gg'+url
        if url.startswith('http'): return url
    return None

def main()->None:
    previous={}
    try: previous=json.loads(OUT.read_text('utf-8'))
    except Exception: pass
    logos={}
    for team_id in TEAM_IDS:
        try:
            url=fetch_logo(team_id)
            if url: logos[str(team_id)]=url
            elif str(team_id) in previous: logos[str(team_id)]=previous[str(team_id)]
        except Exception as exc:
            print(f'logo {team_id}: {exc}')
            if str(team_id) in previous: logos[str(team_id)]=previous[str(team_id)]
    OUT.write_text(json.dumps(logos,indent=2,sort_keys=True)+'\n',encoding='utf-8')
    print(f'Wrote {len(logos)}/{len(TEAM_IDS)} team logos to {OUT}')

if __name__=='__main__': main()
