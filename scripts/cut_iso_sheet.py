"""2.5D bina/ağaç sayfasını keser ve atlas yapar: python3 scripts/cut_iso_sheet.py <görsel> <tür> [sütun=4]
Sayfa: düz açık gri arka plan üzerinde ızgara hâlinde nesneler (her bina kendi arsa kaidesinde).
Çıktı: assets/sprites_iso/<tür>.webp (hücreler eşit boy, her nesne hücrenin alt ortasına oturur) ve
manifest → sprites_iso.<tür> = {file, cols, count, cw, ch, w: [her nesnenin kaide genişliği (px)]}."""
import json
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MARK = (255, 0, 255)


def main(path, kind, cols=4):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    work = im.copy()
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if work.getpixel((x, y)) != MARK:
                ImageDraw.floodfill(work, (x, y), MARK, thresh=40)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if work.getpixel((x, y)) != MARK:
                ImageDraw.floodfill(work, (x, y), MARK, thresh=40)
    a = np.array(work)
    fg = ~((a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255))

    def bands(v, min_len):
        out, start = [], None
        for i, on in enumerate(list(v) + [False]):
            if on and start is None:
                start = i
            if not on and start is not None:
                if i - start >= min_len:
                    out.append((start, i))
                start = None
        return out

    boxes = []
    for y0, y1 in bands(fg.sum(axis=1) > 2, 40):
        for x0, x1 in bands(fg[y0:y1].sum(axis=0) > 1, 40):
            ys = np.where(fg[y0:y1, x0:x1].sum(axis=1) > 0)[0]
            boxes.append((x0, y0 + ys[0], x1, y0 + ys[-1] + 1))
    mask = Image.fromarray((fg * 255).astype('uint8')).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = im.convert('RGBA')
    rgba.putalpha(mask)
    cw = max(b[2] - b[0] for b in boxes) + 4
    ch = max(b[3] - b[1] for b in boxes) + 4
    rows = -(-len(boxes) // cols)
    sheet = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
    widths = []
    for i, (x0, y0, x1, y1) in enumerate(boxes):
        c = rgba.crop((x0, y0, x1, y1))
        sheet.paste(c, ((i % cols) * cw + (cw - c.size[0]) // 2, (i // cols) * ch + ch - c.size[1] - 2))
        widths.append(int(x1 - x0))
    f = f'assets/sprites_iso/{kind}.webp'
    sheet.save(f, 'WEBP', quality=90, method=6)
    p = 'assets/manifest.json'
    m = json.load(open(p, encoding='utf-8'))
    m.setdefault('sprites_iso', {'_not': "2.5D bina sayfaları (sabit kamera, 45°): her nesne hücrenin alt ortasında; w: kaide (arsa) genişliği px."})
    m['sprites_iso'][kind] = {'file': f, 'cols': cols, 'count': len(boxes), 'cw': int(cw), 'ch': int(ch), 'w': widths}
    txt = json.dumps(m, ensure_ascii=False, indent=1) + '\n'  # önce üret: hata olursa dosya bozulmasın
    open(p, 'w', encoding='utf-8').write(txt)
    print(f, len(boxes), 'nesne', sheet.size, widths)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 4)
