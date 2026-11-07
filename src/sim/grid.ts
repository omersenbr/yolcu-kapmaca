// <auto-imports>
// </auto-imports>
/* ================= HARİTA ızgarası: data/harita.json =================
   Karakterler: ~ su, A otoyol, e otoyol kenarı, K köprü, q köprü kenarı, T Avrasya Tüneli,
   c cadde, s sokak, # bina, L simge yapı alanı, P park, F orman, H havalimanı.
   Araçlar A K T c s karelerinde gider; her yol tek kare genişliğinde, ağ tek parça. */
export let MAP = null,
  COLS = 0,
  ROWS = 0,
  ASIA = 0,
  TT = null,
  RG = null,
  LMK = null,
  DBOX = null;
export const ROADS = [],
  STREETS = [];
export let ZONES = [],
  VENUES = [],
  LABELS = [],
  DISTS = [],
  TAXI_START = null,
  RADARS = [];
export const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
export const inB = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
export const tch = (c, r) => (inB(c, r) ? TT[r][c] : '#');
export const isBog = (c) => c >= 131 && c <= 140;
export const isWater = (c, r) => tch(c, r) === '~';
export const isBridge = (c, r) => tch(c, r) === 'K';
export const isTunnel = (c, r) => tch(c, r) === 'T';
export function isRoad(c, r) {
  return inB(c, r) && RG[c + r * COLS] === 1;
}
export function nearestRoad(c, r) {
  let best = null,
    bd = 1e9;
  for (let dr = -8; dr <= 8; dr++)
    for (let dc = -8; dc <= 8; dc++) {
      const x = c + dc,
        y = r + dr;
      if (isRoad(x, y) && TT[y][x] !== 'K') {
        const d = Math.abs(dc) + Math.abs(dr);
        if (d < bd) {
          bd = d;
          best = [x, y];
        }
      }
    }
  return best || ROADS[0];
}
export function mkZone(name, x0, y0, x1, y1, w) {
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2,
    pool = [];
  for (let r = y0; r <= y1; r++)
    for (let c = x0; c <= x1; c++)
      if (isRoad(c, r) && TT[r][c] !== 'A' && TT[r][c] !== 'K') pool.push([c, r, Math.hypot(c - cx, r - cy)]);
  pool.sort((a, b) => a[2] - b[2]);
  const homes = [];
  for (const p of pool) {
    if (homes.every((h) => Math.abs(h[0] - p[0]) + Math.abs(h[1] - p[1]) >= 4)) homes.push([p[0], p[1]]);
    if (homes.length === 2) break;
  }
  return { name, x0, y0, x1, y1, homes, w };
}
export const ZONE_DEFS = () => [
  mkZone('İstanbul Havalimanı', 8, 8, 56, 38, 3),
  mkZone('Sabiha Gökçen', 196, 146, 218, 170, 3),
  mkZone('Taksim Meydanı', 104, 134, 116, 146, 1),
  mkZone('Sultanahmet Meydanı', 118, 164, 130, 176, 1),
  mkZone('Esenler Otogarı', 56, 120, 68, 132, 2),
];
export const zoneAt = (c, r) => ZONES.find((z) => c >= z.x0 && c <= z.x1 && r >= z.y0 && r <= z.y1);
export const VKIND = {
  'Rams Park': 'stadium',
  'Tüpraş Stadyumu': 'stadium',
  'Şükrü Saracoğlu Stadyumu': 'stadium',
  'Atatürk Olimpiyat Stadı': 'stadium',
  'Başakşehir Fatih Terim Stadyumu': 'stadium',
  'Harbiye Açıkhava': 'venue',
  'KüçükÇiftlik Park': 'venue',
  'Volkswagen Arena': 'venue',
  'Zorlu PSM': 'venue',
};
export function district(c, r) {
  if (isBog(c)) return 'Köprü';
  {
    const z = zoneAt(c, r);
    if (z && z.w >= 2) return z.name;
  }
  for (const d of DBOX) {
    const b = d.kutu;
    if (c >= b[0] && c <= b[2] && r >= b[1] && r <= b[3]) return d.ad;
  }
  return c >= ASIA ? 'Üsküdar' : 'Fatih';
}
export const DAT = {
  Arnavutköy: 'Arnavutköy’e',
  Eyüpsultan: 'Eyüpsultan’a',
  Sarıyer: 'Sarıyer’e',
  Başakşehir: 'Başakşehir’e',
  Sultangazi: 'Sultangazi’ye',
  Gaziosmanpaşa: 'Gaziosmanpaşa’ya',
  Kağıthane: 'Kağıthane’ye',
  Levent: 'Levent’e',
  Esenyurt: 'Esenyurt’a',
  Bağcılar: 'Bağcılar’a',
  Esenler: 'Esenler’e',
  Bayrampaşa: 'Bayrampaşa’ya',
  Şişli: 'Şişli’ye',
  Beşiktaş: 'Beşiktaş’a',
  Beylikdüzü: 'Beylikdüzü’ne',
  Avcılar: 'Avcılar’a',
  Küçükçekmece: 'Küçükçekmece’ye',
  Bahçelievler: 'Bahçelievler’e',
  Bakırköy: 'Bakırköy’e',
  Zeytinburnu: 'Zeytinburnu’na',
  Aksaray: 'Aksaray’a',
  Eminönü: 'Eminönü’ne',
  Sultanahmet: 'Sultanahmet’e',
  Beyoğlu: 'Beyoğlu’na',
  Taksim: 'Taksim’e',
  Karaköy: 'Karaköy’e',
  Beykoz: 'Beykoz’a',
  Çekmeköy: 'Çekmeköy’e',
  Kavacık: 'Kavacık’a',
  Ümraniye: 'Ümraniye’ye',
  Beylerbeyi: 'Beylerbeyi’ne',
  Üsküdar: 'Üsküdar’a',
  Ataşehir: 'Ataşehir’e',
  Sancaktepe: 'Sancaktepe’ye',
  Kadıköy: 'Kadıköy’e',
  Maltepe: 'Maltepe’ye',
  Kartal: 'Kartal’a',
  Pendik: 'Pendik’e',
  Fatih: 'Fatih’e',
  'İstanbul Havalimanı': 'İstanbul Havalimanı’na',
  'Sabiha Gökçen': 'Sabiha Gökçen’e',
  'Esenler Otogarı': 'Esenler Otogarı’na',
};
export const WORK = [
  'Levent',
  'Şişli',
  'Karaköy',
  'Beşiktaş',
  'Taksim',
  'Kağıthane',
  'Ataşehir',
  'Eminönü',
  'Sultanahmet',
];
export const TARIHI = ['Sultanahmet', 'Eminönü', 'Aksaray', 'Fatih', 'Zeytinburnu', 'Beyoğlu', 'Karaköy', 'Bayrampaşa'];
export const MERKEZ = [
  'Şişli',
  'Beşiktaş',
  'Levent',
  'Kağıthane',
  'Taksim',
  'Ataşehir',
  'Kadıköy',
  'Üsküdar',
  'Bakırköy',
  'Bahçelievler',
  'Bağcılar',
  'Esenler',
  'Ümraniye',
  'Maltepe',
  'Kartal',
];
export const KIYI = ['Sarıyer', 'Beşiktaş', 'Levent', 'Beykoz', 'Kavacık', 'Beylerbeyi', 'Üsküdar'];
export function styleOf(
  c: number,
  r: number,
): { cats: [string, number][]; full: number; tree: number; garden: number } {
  const d = district(c, r);
  if (KIYI.includes(d) && ((c >= 118 && c <= 130) || (c >= 141 && c <= 154)) && r < 150)
    return {
      cats: [
        ['yali', 0.65],
        ['kiremit', 0.2],
        ['apartman', 0.15],
      ],
      full: 0,
      tree: 0.14,
      garden: 0.05,
    };
  if (TARIHI.includes(d))
    return {
      cats: [
        ['kiremit', 0.6],
        ['apartman', 0.25],
        ['mahalle', 0.15],
      ],
      full: 0.2,
      tree: 0.06,
      garden: 0.04,
    };
  if (MERKEZ.includes(d))
    return {
      cats: [
        ['apartman', 0.75],
        ['kiremit', 0.15],
        ['mahalle', 0.1],
      ],
      full: 0.3,
      tree: 0.05,
      garden: 0.04,
    };
  return {
    cats: [
      ['mahalle', 0.55],
      ['kiremit', 0.25],
      ['apartman', 0.2],
    ],
    full: 0.07,
    tree: 0.12,
    garden: 0.06,
  };
}
/* ---- radarlar: otoyol ve caddelerde sabit noktalar ---- */
export function mkRadars() {
  let s = 91;
  const rr = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const out = [];
  const cand = ROADS.filter((p) => {
    const t = tch(p[0], p[1]);
    return t === 'A' || t === 'c';
  });
  for (let i = 0; i < 4000 && out.length < 90; i++) {
    const p = cand[Math.floor(rr() * cand.length)];
    if (out.every((q) => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) > 14)) out.push([p[0], p[1], out.length]);
  }
  return out;
}

/* harita verisi yüklendikten sonra bir kez çağrılır */
export function initGrid(map) {
  MAP = map;
  COLS = map.genislik;
  ROWS = map.yukseklik;
  ASIA = map.asya_baslangic_sutunu;
  TT = map.satirlar;
  LMK = map.simge_yerler;
  DBOX = map.semtler;
  RG = new Uint8Array(COLS * ROWS);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const ch = TT[r][c];
      if (ch === 'A' || ch === 'K' || ch === 'c' || ch === 's' || ch === 'T') RG[c + r * COLS] = 1;
    }
  ROADS.length = 0;
  STREETS.length = 0;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (RG[c + r * COLS]) {
        ROADS.push([c, r]);
        if (TT[r][c] !== 'K' && TT[r][c] !== 'T') STREETS.push([c, r]);
      }
  ZONES = ZONE_DEFS();
  VENUES = Object.keys(VKIND)
    .filter((n) => LMK[n])
    .map((n) => ({ name: n, kind: VKIND[n], c: LMK[n][0] - 1, r: LMK[n][1] - 1 }));
  LABELS = DBOX.map((d) => [d.ad, (d.kutu[0] + d.kutu[2]) / 2 + 0.5, (d.kutu[1] + d.kutu[3]) / 2 + 0.5]);
  DISTS = Object.keys(DAT);
  TAXI_START = nearestRoad(108, 132);
  RADARS = mkRadars();
}
