"""2.5D araç sayfalarını keser: python3 scripts/cut_iso_cars.py <önden.jpg> <arkadan.jpg>
Sayfa: 4 sütun × 3 satır, okuma sırasıyla taxi1-3, police1-2, sivil, tag1-5; düz açık gri arka plan.
Arka plan kenarlardan taşırılarak ayıklanır (mürekkep konturu içeriyi korur), her araç kendi kutusuna
kırpılıp assets/cars_iso/<ad>_<on|arka>.webp olarak yazılır; ölçek sayfadaki gibi kalır (araçlar arası oran korunur)."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

NAMES = ['taxi1', 'taxi2', 'taxi3', 'police1', 'police2', 'sivil', 'tag1', 'tag2', 'tag3', 'tag4', 'tag5']
MARK = (255, 0, 255)


def cut(path, suffix, skip=()):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    work = im.copy()
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if work.getpixel((x, y)) != MARK:
                ImageDraw.floodfill(work, (x, y), MARK, thresh=42)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if work.getpixel((x, y)) != MARK:
                ImageDraw.floodfill(work, (x, y), MARK, thresh=42)
    a = np.array(work)
    fg = ~((a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255))

    def bands(v, min_len):
        out, start = [], None
        for i, on in enumerate(v):
            if on and start is None:
                start = i
            if not on and start is not None:
                if i - start >= min_len:
                    out.append((start, i))
                start = None
        if start is not None and len(v) - start >= min_len:
            out.append((start, len(v)))
        return out

    boxes = []
    for y0, y1 in bands(fg.sum(axis=1) > 2, 40):
        for x0, x1 in bands(fg[y0:y1].sum(axis=0) > 1, 40):
            ys = np.where(fg[y0:y1, x0:x1].sum(axis=1) > 0)[0]
            boxes.append((x0, y0 + ys[0], x1, y0 + ys[-1] + 1))
    assert len(boxes) == len(NAMES), f'{path}: {len(boxes)} araç bulundu, {len(NAMES)} bekleniyordu'
    # kenar: gri saçağı almamak için maskeyi 1 px daralt, sonra yumuşat
    mask = Image.fromarray((fg * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = im.convert('RGBA')
    rgba.putalpha(mask)
    out = {}
    for name, (x0, y0, x1, y1) in zip(NAMES, boxes):
        if name in skip:
            continue
        c = rgba.crop((x0 - 2, y0 - 2, x1 + 2, y1 + 2))
        f = f'assets/cars_iso/{name}_{suffix}.webp'
        c.save(f, 'WEBP', quality=90, method=6)
        out[name] = (f, c.size)
        print(f, c.size)
    return out


if __name__ == '__main__':
    front, rear = sys.argv[1], sys.argv[2]
    skip = tuple(sys.argv[3].split(',')) if len(sys.argv) > 3 else ()
    cut(front, 'on')
    cut(rear, 'arka', skip)
