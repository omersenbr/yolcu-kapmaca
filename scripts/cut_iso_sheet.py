"""2.5D sayfaları keser (bina, ağaç, simge yapı). Düz açık gri arka plan üzerinde ızgara hâlinde nesneler.

Atlas (bina/ağaç türü):  python3 scripts/cut_iso_sheet.py atlas <tür> <görsel> [<görsel> ...] [--dolu 0.96] [--kaide 0.05] [--ic] [--ac N]
   → assets/sprites_iso/<tür>.webp (eşit hücreler, her nesne hücrenin alt ortasında) ve
     manifest → sprites_iso.<tür> = {file, cols, count, cw, ch, w: [nesne genişlikleri], dolu, kaide}
     dolu: nesne genişliğinin haritadaki yerine oranı (arsa kaideli sayfalarda ~0,96, kaidesizlerde ~0,8)
     kaide: arsa kaidesinin kalınlığı (genişliğe oran)
Tek tek (simge yapı):    python3 scripts/cut_iso_sheet.py tek <görsel> "Ad 1" "Ad 2" ...
   → assets/landmarks_iso/<ad>.webp ve manifest → landmarks_iso.<Ad> = {file, w, h}

--ic: arka plan rengindeki kapalı alanları da ayıkla (çizgiyle çevrili boş arsalar)
--ac N: N pikselden ince parçaları at (arsa çizgisi, yer gölgesindeki noktalar); nesnenin kendisi korunur"""
import json
import re
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

MARK = (255, 0, 255)


def objects(path, inner=False, open_px=0, grid=None):
    """görseldeki nesneleri (RGBA kırpım) okuma sırasıyla döndürür"""
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
    a = np.array(work).astype(int)
    fg = ~((a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255))
    if inner:
        # çizgiyle çevrili boş arsalar: her nesnenin dört ucunun hemen içinden arka plan rengi taşırılır
        # (binanın içindeki açık gri yüzeyler mürekkep konturuyla korunur)
        src = np.array(im).astype(int)
        bg = np.median(src[~fg], axis=0)
        isbg = lambda x, y: 0 <= x < w and 0 <= y < h and np.abs(src[y, x] - bg).sum() < 24 and work.getpixel((x, y)) != MARK
        ys_any = np.where(fg.sum(axis=1) > 2)[0]
        rows_b, start = [], ys_any[0]
        for a0, b0 in zip(ys_any, ys_any[1:]):
            if b0 - a0 > 8:
                rows_b.append((start, a0 + 1))
                start = b0
        rows_b.append((start, ys_any[-1] + 1))
        for y0, y1 in rows_b:
            xs_any = np.where(fg[y0:y1].sum(axis=0) > 1)[0]
            cols_b, start = [], xs_any[0]
            for a0, b0 in zip(xs_any, xs_any[1:]):
                if b0 - a0 > 8:
                    cols_b.append((start, a0 + 1))
                    start = b0
            cols_b.append((start, xs_any[-1] + 1))
            for x0, x1 in cols_b:
                sub = fg[y0:y1, x0:x1]
                yl = y0 + int(np.where(sub[:, 1])[0].mean()) if sub[:, 1].any() else (y0 + y1) // 2
                yr = y0 + int(np.where(sub[:, -2])[0].mean()) if sub[:, -2].any() else (y0 + y1) // 2
                xb = x0 + int(np.where(sub[-2])[0].mean()) if sub[-2].any() else (x0 + x1) // 2
                for sx, sy in [(x0 + d, yl) for d in (8, 14, 22)] + [(x1 - d, yr) for d in (8, 14, 22)] + [(xb, y1 - d) for d in (8, 14, 22)]:
                    if isbg(sx, sy):
                        ImageDraw.floodfill(work, (sx, sy), MARK, thresh=40)
        a = np.array(work).astype(int)
        fg = ~((a[:, :, 0] == 255) & (a[:, :, 1] == 0) & (a[:, :, 2] == 255))
    mask = Image.fromarray((fg * 255).astype('uint8'))
    core = mask
    if open_px:
        k = open_px | 1
        core = mask.filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))
        # ince parçalar atılır ama nesneye bitişik ayrıntılar (anten, korkuluk) kalır
        mask = Image.fromarray(np.minimum(np.array(mask), np.array(core.filter(ImageFilter.MaxFilter(7)))))
    cf = np.array(core) > 0

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
    if grid:
        # sütunlar sabit, satırlar her sütunda ayrı bulunur: yüksek bir nesne (kule) komşu satırın
        # hizasına taşsa da kendi sütununda ayrı kalır
        gc, gr = grid
        cols_boxes = []
        for i in range(gc):
            x0, x1 = w * i // gc, w * (i + 1) // gc
            bs = bands(cf[:, x0:x1].sum(axis=1) > 0, 40)
            assert len(bs) == gr, f'{path}: {i + 1}. sütunda {len(bs)} nesne bulundu, {gr} bekleniyordu'
            col = []
            for y0, y1 in bs:
                xs = np.where(cf[y0:y1, x0:x1].sum(axis=0) > 0)[0]
                col.append((int(x0 + xs.min()), int(y0), int(x0 + xs.max() + 1), int(y1)))
            cols_boxes.append(col)
        boxes = [cols_boxes[i][j] for j in range(gr) for i in range(gc)]
    for y0, y1 in [] if grid else bands(cf.sum(axis=1) > 2, 40):
        for x0, x1 in bands(cf[y0:y1].sum(axis=0) > 1, 40):
            ys = np.where(cf[y0:y1, x0:x1].sum(axis=1) > 0)[0]
            boxes.append((int(x0), int(y0 + ys[0]), int(x1), int(y0 + ys[-1] + 1)))
    alpha = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    rgba = im.convert('RGBA')
    rgba.putalpha(alpha)
    return [rgba.crop(b) for b in boxes]


def save_manifest(fn):
    p = 'assets/manifest.json'
    m = json.load(open(p, encoding='utf-8'))
    fn(m)
    txt = json.dumps(m, ensure_ascii=False, indent=1) + '\n'  # önce üret: hata olursa dosya bozulmasın
    open(p, 'w', encoding='utf-8').write(txt)


def atlas(kind, paths, dolu, kaide, inner, open_px, cols=4):
    objs = [o for p in paths for o in objects(p, inner, open_px)]
    cw = max(o.size[0] for o in objs) + 4
    ch = max(o.size[1] for o in objs) + 4
    rows = -(-len(objs) // cols)
    sheet = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
    for i, c in enumerate(objs):
        sheet.paste(c, ((i % cols) * cw + (cw - c.size[0]) // 2, (i // cols) * ch + ch - c.size[1] - 2))
    f = f'assets/sprites_iso/{kind}.webp'
    sheet.save(f, 'WEBP', quality=88, method=6)

    def upd(m):
        m.setdefault('sprites_iso', {'_not': '2.5D bina/ağaç sayfaları (scripts/cut_iso_sheet.py): her nesne hücrenin alt ortasında.'})
        m['sprites_iso'][kind] = {'file': f, 'cols': cols, 'count': len(objs), 'cw': cw, 'ch': ch, 'w': [o.size[0] for o in objs], 'dolu': dolu, 'kaide': kaide}

    save_manifest(upd)
    print(f, len(objs), 'nesne', sheet.size)


def slug(s):
    tr = str.maketrans('çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU')
    return re.sub(r'[^a-z0-9]+', '-', s.translate(tr).lower()).strip('-')


def single(path, names):
    objs = objects(path, grid=(2, -(-len(names) // 2)))
    assert len(objs) == len(names), f'{len(objs)} nesne bulundu, {len(names)} ad verildi'
    out = {}
    for n, c in zip(names, objs):
        f = f'assets/landmarks_iso/{slug(n)}.webp'
        c.save(f, 'WEBP', quality=88, method=6)
        out[n] = {'file': f, 'w': c.size[0], 'h': c.size[1]}
        print(f, c.size)

    def upd(m):
        m.setdefault('landmarks_iso', {'_not': '2.5D simge yapılar: arsanın uzun kenarı sol alttan sağ üste; haritadaki alan daha derinse aynalanır.', 'yapilar': {}})
        m['landmarks_iso']['yapilar'].update(out)

    save_manifest(upd)


if __name__ == '__main__':
    args = sys.argv[1:]

    def opt(name, default=None, flag=False):
        if name in args:
            i = args.index(name)
            if flag:
                args.pop(i)
                return True
            v = args[i + 1]
            del args[i:i + 2]
            return v
        return False if flag else default

    dolu = float(opt('--dolu', 0.96))
    kaide = float(opt('--kaide', 0.05))
    inner = opt('--ic', flag=True)
    open_px = int(opt('--ac', 0))
    if args[0] == 'atlas':
        atlas(args[1], args[2:], dolu, kaide, inner, open_px)
    else:
        single(args[1], args[2:])
