"""2.5D bina atlasları: yeni (2. sürüm) ve eski çizimler karışık. Yeni çizimler çoğunlukta, eskiler arada.
python3 scripts/build_iso_mix.py  → assets/sprites_iso/<tür>.webp ve manifest → sprites_iso.<tür>
Her nesnenin kendi w (genişlik), dolu (yerine oranı) ve kaide (arsa kalınlığı) değeri var; yeni: ilk kaç nesne yeni."""
import json
import sys
sys.path.insert(0, 'scripts')
from cut_iso_sheet import objects
from PIL import Image

K = 'kaynak/2.5d/'
# (dosya, dolu, kaide, ic, ac)
NEW = dict(dolu=0.96, kaide=0.04)
TURLER = {
    'mahalle': ([K + 'v2/05-mahalle.jpg'], [(K + 'mahalle-tek-kat.jpg', 0.96, 0.05, False, 0), (K + 'mahalle-iki-kat.jpg', 0.96, 0.05, False, 0)]),
    'apartman': ([K + 'v2/07-apartman.jpg'], [(K + 'apartman.jpg', 0.96, 0.05, False, 0)]),
    'kiremit': ([K + 'v2/09-kiremit.jpg'], [(K + 'kiremit.jpg', 0.8, 0.0, False, 0)]),
    'yali': ([K + 'v2/11-yali.jpg'], [(K + 'yali.jpg', 0.82, 0.0, False, 9)]),
    'blok': ([K + 'v2/13-blok.jpg'], [(K + 'blok.jpg', 0.8, 0.0, True, 7)]),
}
YENI_PAY = 0.75  # bir binanın yeni çizimden seçilme olasılığı

m = json.load(open('assets/manifest.json', encoding='utf-8'))
for tur, (yeni, eski) in TURLER.items():
    items = []
    for f in yeni:
        items += [(o, NEW['dolu'], NEW['kaide']) for o in objects(f)]
    n_new = len(items)
    for f, dolu, kaide, ic, ac in eski:
        items += [(o, dolu, kaide) for o in objects(f, ic, ac)]
    cols = 4
    cw = max(o.size[0] for o, _, _ in items) + 4
    ch = max(o.size[1] for o, _, _ in items) + 4
    # hücreyi küçült: atlas çok büyümesin (en uzun kenar 260 px)
    k = min(1.0, 260 / max(cw, ch))
    cw, ch = int(cw * k) + 2, int(ch * k) + 2
    rows = -(-len(items) // cols)
    sheet = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
    ws = []
    for i, (o, _, _) in enumerate(items):
        o = o.resize((max(1, round(o.size[0] * k)), max(1, round(o.size[1] * k))), Image.LANCZOS)
        sheet.paste(o, ((i % cols) * cw + (cw - o.size[0]) // 2, (i // cols) * ch + ch - o.size[1] - 2))
        ws.append(o.size[0])
    f = f'assets/sprites_iso/{tur}.webp'
    sheet.save(f, 'WEBP', quality=86, method=6)
    m.setdefault('sprites_iso', {})[tur] = {
        'file': f, 'cols': cols, 'count': len(items), 'cw': cw, 'ch': ch, 'w': ws,
        'dolu': [d for _, d, _ in items], 'kaide': [kd for _, _, kd in items],
        'yeni': n_new, 'yeniPay': YENI_PAY,
    }
    print(tur, 'yeni', n_new, 'toplam', len(items), sheet.size)
txt = json.dumps(m, ensure_ascii=False, indent=1) + '\n'
open('assets/manifest.json', 'w', encoding='utf-8').write(txt)
