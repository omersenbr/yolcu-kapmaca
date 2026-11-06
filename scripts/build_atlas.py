#!/usr/bin/env python3
"""Atlas üretici: her karede canvas’a çizilen küçük görselleri tek dokuda toplar.

Şimdilik araçlar (assets/cars/*.webp) → assets/atlas/cars.webp.
Manifest’teki her araca atlas içindeki yeri yazılır: "atlas": {"file": ..., "x", "y", "w", "h"}.
Tekil dosyalar silinmez (menüdeki <img> ve olası eski kullanım için).

Kullanım:  python3 scripts/build_atlas.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / 'assets' / 'manifest.json'
PAD = 2  # dokular arası boşluk: ölçeklenirken komşu görsel taşmasın


def pack(items, max_w=1024):
    """Basit raf yerleşimi: boya göre sıralayıp satırlara diz."""
    items = sorted(items, key=lambda it: -it[1].height)
    x = y = row_h = 0
    pos, width = {}, 0
    for name, im in items:
        if x and x + im.width + PAD > max_w:
            x, y, row_h = 0, y + row_h + PAD, 0
        pos[name] = (x, y)
        x += im.width + PAD
        row_h = max(row_h, im.height)
        width = max(width, x - PAD)
    return pos, width, y + row_h


def build(group, out_name):
    man = json.loads(MANIFEST.read_text(encoding='utf-8'))
    entries = man[group]
    items = [(k, Image.open(ROOT / v['file']).convert('RGBA')) for k, v in entries.items()]
    pos, w, h = pack(items)
    atlas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for name, im in items:
        atlas.paste(im, pos[name])
    out = ROOT / 'assets' / 'atlas' / f'{out_name}.webp'
    out.parent.mkdir(exist_ok=True)
    # kayıpsız: atlas, tekil dosyalarla piksel piksel aynı olmalı
    atlas.save(out, 'WEBP', lossless=True, quality=100, method=6, exact=True)
    rel = out.relative_to(ROOT).as_posix()
    for name, im in items:
        x, y = pos[name]
        entries[name]['atlas'] = {'file': rel, 'x': x, 'y': y, 'w': im.width, 'h': im.height}
    MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    before = sum((ROOT / v['file']).stat().st_size for v in entries.values())
    print(f'{group}: {len(items)} görsel → {rel} ({w}×{h}), {before // 1024} KB → {out.stat().st_size // 1024} KB')


if __name__ == '__main__':
    build('cars', 'cars')
