// <auto-imports>
import { img } from '../core/assets';
import { MANIFEST } from '../core/content';
import { hsh } from '../core/util';
import { COLS, LABELS, LMK, MAP, ROWS, TT, isBog, styleOf, tch } from './grid';
import { DPR, TS, mini } from '../render/view';
// </auto-imports>
export const PAL_WALK = { light: ['#ddd5c4', 'rgba(120,105,85,.18)'], dark: ['#4a4640', 'rgba(0,0,0,.22)'] };
export const PAL = {
  light: {
    ground: '#dcd6c8',
    road: '#44464d',
    line: '#f4efe2',
    water: '#3a9ce0',
    wave: 'rgba(255,255,255,.45)',
    roofs: ['#e0603b', '#f0a542', '#8fb6d9', '#f2dca0', '#8cc063', '#e07f62'],
    edge: 'rgba(0,0,0,.3)',
    tower: ['#4f79a3', '#6493bf', '#40688f'],
    glass: 'rgba(255,255,255,.32)',
    park: '#86cc5c',
    tree: '#4c9e33',
    tree2: '#3a8a25',
    plaza: '#efe8d6',
    shadow: 'rgba(0,0,0,.22)',
    label: '#16171a',
    halo: 'rgba(255,255,255,.88)',
    waterLabel: 'rgba(255,255,255,.92)',
    cable: '#f2f2f2',
    pillar: '#9aa3ab',
    stone: '#e6d6b4',
    dome: '#8ea3b6',
  },
  dark: {
    ground: '#25272d',
    road: '#3a3d45',
    line: '#6c707a',
    water: '#173a55',
    wave: 'rgba(255,255,255,.13)',
    roofs: ['#6e3a2c', '#6f5233', '#4a5560', '#5d5444', '#465440', '#6a4a3e'],
    edge: 'rgba(0,0,0,.5)',
    tower: ['#2c3a48', '#33465a', '#283542'],
    glass: 'rgba(255,214,120,.25)',
    park: '#263f27',
    tree: '#3a6b34',
    tree2: '#2f5a2b',
    plaza: '#3a3830',
    shadow: 'rgba(0,0,0,.45)',
    label: '#f1efe9',
    halo: 'rgba(0,0,0,.72)',
    waterLabel: 'rgba(255,255,255,.6)',
    cable: '#cfd6dd',
    pillar: '#7b848d',
    stone: '#8f8168',
    dome: '#58697a',
  },
};
export const mq = window.matchMedia('(prefers-color-scheme: dark)');
export function dark() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return mq.matches;
}
export let pal: any = PAL.light;
/* ---- harita çizimi: parça parça (8×8 kare), sadece görünen ve hemen çevresindeki bölgeler;
   önbellek görüş alanına göre sınırlı (telefon belleği için) ---- */
export const CHT = 8;
/** önbellekte tutulacak en fazla parça; çizim her kare görüş alanına göre ayarlar */
export let chunkCap = 28;
export function setChunkCap(n: number) {
  chunkCap = n;
}
export let CHX = 0,
  CHY = 0,
  chMS = 1,
  mapChunks = null,
  chunkOrder = [],
  miniCv = null;
export function paintRegion(m, c0, r0, c1, r1) {
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const ch = tch(c, r),
        x = c * TS,
        y = r * TS;
      if (ch === 'T') {
        m.fillStyle = pal.water;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
        m.fillStyle = 'rgba(30,34,44,.38)';
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      } else if (ch === '~') {
        m.fillStyle = pal.water;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
        if (hsh(c, r) < 0.12) {
          m.strokeStyle = pal.wave;
          m.lineWidth = Math.max(1, TS * 0.05);
          m.beginPath();
          m.moveTo(x + TS * 0.2, y + TS * 0.5);
          m.quadraticCurveTo(x + TS * 0.35, y + TS * 0.35, x + TS * 0.5, y + TS * 0.5);
          m.quadraticCurveTo(x + TS * 0.65, y + TS * 0.65, x + TS * 0.8, y + TS * 0.5);
          m.stroke();
        }
      } else if (ch === 'F') {
        m.fillStyle = pal.park;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      } else if (ch === 'P') {
        m.fillStyle = pal.park;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      } else if (ch === 'H') {
        m.fillStyle = pal.plaza;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      } else if ((ch === 'K' || ch === 'q') && (isBog(c) || (c >= 115 && c <= 117 && r >= 146 && r <= 152))) {
        m.fillStyle = pal.water;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      } else if (ch === 'A' || ch === 'K' || ch === 'c' || ch === 's' || ch === 'e' || ch === 'q') {
        m.fillStyle = pal.road;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      } else if (ch === '#' || ch === 'L') {
        m.fillStyle = pal.walk;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
        m.strokeStyle = pal.walkLine;
        m.lineWidth = 1;
        m.beginPath();
        m.moveTo(x, y + TS * 0.5);
        m.lineTo(x + TS, y + TS * 0.5);
        m.moveTo(x + TS * (r & 1 ? 0.25 : 0.75), y);
        m.lineTo(x + TS * (r & 1 ? 0.25 : 0.75), y + TS * 0.5);
        m.moveTo(x + TS * (r & 1 ? 0.75 : 0.25), y + TS * 0.5);
        m.lineTo(x + TS * (r & 1 ? 0.75 : 0.25), y + TS);
        m.stroke();
      } else {
        m.fillStyle = pal.ground;
        m.fillRect(x, y, TS + 0.5, TS + 0.5);
      }
    }
  paintSprites(m, c0, r0, c1, r1);
  // Avrasya Tüneli: kesik kenar çizgileri ve giriş ağızları
  m.strokeStyle = pal.edge;
  m.lineWidth = Math.max(1.5, TS * 0.07);
  m.setLineDash([TS * 0.3, TS * 0.22]);
  m.beginPath();
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (tch(c, r) !== 'T') continue;
      const x = c * TS,
        y = r * TS,
        ok = (a, b) => {
          const t = tch(a, b);
          return t === 'T' || t === 'A' || t === 'c' || t === 's';
        };
      if (!ok(c + 1, r)) {
        m.moveTo(x + TS, y);
        m.lineTo(x + TS, y + TS);
      }
      if (!ok(c - 1, r)) {
        m.moveTo(x, y);
        m.lineTo(x, y + TS);
      }
      if (!ok(c, r + 1)) {
        m.moveTo(x, y + TS);
        m.lineTo(x + TS, y + TS);
      }
      if (!ok(c, r - 1)) {
        m.moveTo(x, y);
        m.lineTo(x + TS, y);
      }
    }
  m.stroke();
  m.setLineDash([]);
  if (MAP.tunel) {
    for (const [pc, pr] of [
      [92, 182],
      [152, 180],
    ]) {
      if (pc < c0 - 2 || pc > c1 + 2 || pr < r0 - 2 || pr > r1 + 2) continue;
      const x = pc * TS,
        y = pr * TS;
      m.fillStyle = pal.edge;
      m.beginPath();
      m.moveTo(x - TS * 0.15, y + TS);
      m.lineTo(x - TS * 0.15, y + TS * 0.35);
      m.quadraticCurveTo(x + TS * 0.5, y - TS * 0.2, x + TS * 1.15, y + TS * 0.35);
      m.lineTo(x + TS * 1.15, y + TS);
      m.lineTo(x + TS * 0.9, y + TS);
      m.lineTo(x + TS * 0.9, y + TS * 0.5);
      m.quadraticCurveTo(x + TS * 0.5, y + TS * 0.15, x + TS * 0.1, y + TS * 0.5);
      m.lineTo(x + TS * 0.1, y + TS);
      m.closePath();
      m.fill();
    }
    const mx = 122,
      my = 186.5;
    if (mx >= c0 - 10 && mx <= c1 + 10 && my >= r0 - 2 && my <= r1 + 2) {
      m.font = `700 ${Math.round(TS * 0.4)}px "Archivo",system-ui,sans-serif`;
      m.textAlign = 'center';
      m.textBaseline = 'middle';
      m.lineWidth = 3;
      m.strokeStyle = pal.halo;
      m.strokeText('Avrasya Tüneli', mx * TS, (my + 1.2) * TS);
      m.fillStyle = pal.label;
      m.fillText('Avrasya Tüneli', mx * TS, (my + 1.2) * TS);
    }
  }
  // yol kenarları (mürekkep)
  m.fillStyle = pal.edge;
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const ch = tch(c, r);
      if (!(ch === 'A' || ch === 'K' || ch === 'c' || ch === 'e' || ch === 'q')) continue;
      if ((ch === 'K' || ch === 'q') && (isBog(c) || (c >= 115 && c <= 117 && r >= 146 && r <= 152))) continue;
      const x = c * TS,
        y = r * TS,
        w = ch === 'c' ? Math.max(1, TS * 0.05) : Math.max(1.5, TS * 0.08),
        vr = (a, b) => {
          const t = tch(a, b);
          return t === 'A' || t === 'K' || t === 'c' || t === 's' || t === 'e' || t === 'q';
        };
      if (!vr(c + 1, r)) m.fillRect(x + TS - w, y, w, TS);
      if (!vr(c - 1, r)) m.fillRect(x, y, w, TS);
      if (!vr(c, r + 1)) m.fillRect(x, y + TS - w, TS, w);
      if (!vr(c, r - 1)) m.fillRect(x, y, TS, w);
    }
  // cadde orta çizgileri
  m.strokeStyle = pal.line;
  m.lineWidth = Math.max(1, TS * 0.05);
  m.setLineDash([TS * 0.28, TS * 0.24]);
  m.beginPath();
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (tch(c, r) !== 'c') continue;
      if (c % 20 === 0 && tch(c, r - 1) === 'c' && tch(c, r + 1) === 'c') {
        m.moveTo((c + 0.5) * TS, r * TS);
        m.lineTo((c + 0.5) * TS, (r + 1) * TS);
      }
      if (r % 20 === 0 && tch(c - 1, r) === 'c' && tch(c + 1, r) === 'c') {
        m.moveTo(c * TS, (r + 0.5) * TS);
        m.lineTo((c + 1) * TS, (r + 0.5) * TS);
      }
    }
  m.stroke();
  // otoyol şerit çizgileri
  m.lineWidth = Math.max(1.5, TS * 0.07);
  m.beginPath();
  // kesik çizgi deseni 16 karelik sınırlardan başlar (prototiptekiyle aynı desen, parça boyundan bağımsız)
  const dc0 = c0 - (c0 % 16),
    dr0 = r0 - (r0 % 16);
  for (const s of MAP.otoyollar) {
    if (s[0] === 'h') {
      const r = s[1];
      if (r + 1 < r0 || r - 1 > r1) continue;
      for (const k of [0, 1]) {
        m.moveTo(Math.max(s[2], dc0 - 1) * TS, (r + k) * TS);
        m.lineTo((Math.min(s[3], c1 + 1) + 1) * TS, (r + k) * TS);
      }
    } else {
      const c = s[1];
      if (c + 1 < c0 || c - 1 > c1) continue;
      for (const k of [0, 1]) {
        m.moveTo((c + k) * TS, Math.max(s[2], dr0 - 1) * TS);
        m.lineTo((c + k) * TS, (Math.min(s[3], r1 + 1) + 1) * TS);
      }
    }
  }
  m.stroke();
  m.setLineDash([]);
  // köprüler: çizilmiş görseller
  {
    const BRS = {
      40: ['Yavuz Sultan Selim Köprüsü', 15, 0.5],
      76: ['FSM Köprüsü', 17.2, 0.5],
      116: ['15 Temmuz Şehitler Köprüsü', 20, 0.6],
    };
    for (const [br] of MAP.kopruler) {
      const b = BRS[br];
      if (!b) continue;
      const L = LMD[b[0]],
        Wt = b[1],
        Ht = (Wt * L.h) / L.w,
        x0 = 136 - Wt / 2,
        y0 = br + 0.5 - Ht * b[2];
      if (x0 + Wt < c0 - 1 || x0 > c1 + 1 || y0 + Ht < r0 - 1 || y0 > r1 + 1) continue;
      m.drawImage(LIMG[b[0]], x0 * TS, y0 * TS, Wt * TS, Ht * TS);
    }
    {
      const L = LMD['Galata Köprüsü'],
        Wt = 10,
        Ht = (Wt * L.h) / L.w;
      if (!(116 + Ht < c0 - 1 || 116 - Ht > c1 + 1 || 155 < r0 || 144 > r1)) {
        m.save();
        m.translate(116.5 * TS, 149.5 * TS);
        m.rotate(Math.PI / 2);
        m.drawImage(LIMG['Galata Köprüsü'], (-Wt / 2) * TS, -Ht * 0.46 * TS, Wt * TS, Ht * TS);
        m.restore();
      }
    }
  }
  // havalimanı pistleri
  for (const a of MAP.havalimanlari) {
    const [ax0, ay0, ax1, ay1, n] = a;
    if (ax1 < c0 || ax0 > c1 || ay1 < r0 || ay0 > r1) continue;
    for (let k = 0; k < n; k++) {
      const yy = (ay0 + 3 + k * 7) * TS;
      m.fillStyle = '#8b8f95';
      m.fillRect((ax0 + 3) * TS, yy, (ax1 - ax0 - 6) * TS, TS * 3);
      m.strokeStyle = '#f4efe2';
      m.lineWidth = Math.max(1, TS * 0.08);
      m.setLineDash([TS * 0.6, TS * 0.5]);
      m.beginPath();
      m.moveTo((ax0 + 4) * TS, yy + TS * 1.5);
      m.lineTo((ax1 - 4) * TS, yy + TS * 1.5);
      m.stroke();
      m.setLineDash([]);
    }
    const tx = (ax0 + ax1) / 2;
    {
      const L = LMD['Havalimanı terminali'],
        Wt = Math.min(20, (ax1 - ax0) * 0.7),
        Ht = (Wt * L.h) / L.w;
      m.drawImage(LIMG['Havalimanı terminali'], (tx - Wt / 2) * TS, (ay1 + 0.5 - Ht) * TS, Wt * TS, Ht * TS);
    }
  }
  // simge yapılar
  const near = (c, r, pad) => c >= c0 - pad && c <= c1 + pad && r >= r0 - pad && r <= r1 + pad;
  {
    const IMN = { 'Ataşehir finans merkezi': 'Maslak gökdelenleri' };
    for (const [n, fp] of Object.entries(MAP.simge_alanlari || {}) as [string, number[]][]) {
      const [x0, y0, w, h] = fp,
        key = IMN[n] || n,
        L = LMD[key];
      if (x0 + w < c0 - 2 || x0 > c1 + 2 || y0 + h < r0 - 2 || y0 > r1 + 2) continue;
      if (!L) {
        if (n === 'Dolmabahçe Sarayı') {
          m.fillStyle = pal.shadow;
          m.fillRect((x0 + 0.2) * TS, (y0 + 0.25) * TS, w * TS, h * TS * 0.9);
          m.fillStyle = pal.stone;
          m.strokeStyle = pal.edge;
          m.lineWidth = 1.5;
          m.fillRect(x0 * TS, y0 * TS, w * TS, h * TS * 0.85);
          m.strokeRect(x0 * TS, y0 * TS, w * TS, h * TS * 0.85);
          m.fillStyle = pal.dome;
          for (let k = 0; k < w; k++) {
            m.beginPath();
            m.arc((x0 + 0.5 + k) * TS, (y0 + h * 0.42) * TS, TS * 0.28, Math.PI, 0);
            m.fill();
          }
        }
        continue;
      }
      const sc = Math.min(w / L.w, h / L.h) * 0.98,
        dw = L.w * sc,
        dh = L.h * sc;
      m.drawImage(LIMG[key], (x0 + w / 2 - dw / 2) * TS, (y0 + h / 2 - dh / 2) * TS, dw * TS, dh * TS);
    }
    {
      const p = LMK['Kız Kulesi'];
      if (p && near(p[0], p[1], 4)) {
        const L = LMD['Kız Kulesi'],
          s2 = 3.4;
        m.drawImage(
          LIMG['Kız Kulesi'],
          (p[0] + 0.5 - s2 / 2) * TS,
          (p[1] + 0.5 - s2 / 2) * TS,
          s2 * TS,
          (s2 * TS * L.h) / L.w,
        );
      }
    }
    {
      const L = LMD['Avrasya Tüneli girişi'];
      for (const [px2, py2] of [
        [92.5, 184.6],
        [152.5, 182.6],
      ]) {
        if (!near(px2, py2, 4)) continue;
        const s2 = 3,
          h2 = (s2 * L.h) / L.w;
        m.save();
        m.translate(px2 * TS, py2 * TS);
        m.rotate(Math.PI);
        m.drawImage(LIMG['Avrasya Tüneli girişi'], (-s2 / 2) * TS, (-h2 / 2) * TS, s2 * TS, h2 * TS);
        m.restore();
      }
    }
  }
  // etiketler
  m.textAlign = 'center';
  m.textBaseline = 'middle';
  m.lineJoin = 'round';
  m.font = `${Math.round(TS * 0.72)}px "Bangers","Archivo Black",system-ui,sans-serif`;
  for (const [n, x, y] of LABELS) {
    if (!near(x, y, 8)) continue;
    m.lineWidth = Math.max(3, TS * 0.16);
    m.strokeStyle = pal.halo;
    m.strokeText(n, x * TS, y * TS);
    m.fillStyle = pal.label;
    m.fillText(n, x * TS, y * TS);
  }
  m.font = `700 ${Math.round(TS * 0.36)}px "Grandstander","Archivo",system-ui,sans-serif`;
  const bl = [];
  const SA = MAP.simge_alanlari || {};
  for (const [n, fp] of Object.entries(SA)) bl.push([n, fp[0] + fp[2] / 2, fp[1] + fp[3] + 0.65]);
  for (const [r, n] of MAP.kopruler) bl.push([n, 136, r + 3.2]);
  bl.push(['Galata Köprüsü', 118.6, 149.5]);
  for (const n of ['Kız Kulesi', 'İstanbul Havalimanı', 'Sabiha Gökçen'])
    if (LMK[n]) bl.push([n, LMK[n][0] + 0.5, LMK[n][1] + 2.6]);
  for (const [n, x, y] of bl) {
    if (!near(x, y, 8)) continue;
    m.lineWidth = 3;
    m.strokeStyle = pal.halo;
    m.strokeText(n, x * TS, y * TS);
    m.fillStyle = pal.label;
    m.fillText(n, x * TS, y * TS);
  }
  m.font = `${Math.round(TS * 0.7)}px "Bangers","Archivo",system-ui,sans-serif`;
  m.fillStyle = pal.waterLabel;
  for (const [t, x, y, rot] of [
    ['İstanbul Boğazı', 135.5, 60, 1],
    ['Boğaz', 135.5, 140, 1],
    ['Haliç', 98, 149.5, 0],
    ['Marmara Denizi', 60, 195, 0],
    ['Karadeniz', 140, 1.5, 0],
  ] as [string, number, number, number][]) {
    if (!near(x, y, 10)) continue;
    m.save();
    m.translate(x * TS, y * TS);
    if (rot) m.rotate(-Math.PI / 2);
    m.fillText(t, 0, 0);
    m.restore();
  }
}
/* ---- simge yapı ve çizilmiş parça görselleri (assets/manifest.json) ---- */
export let LMD = {},
  LIMG = {},
  SPR = {},
  SIMG = {};
export function spr(
  m: CanvasRenderingContext2D,
  cat: string,
  i: number,
  x: number,
  y: number,
  s: number,
  rot?: number,
) {
  const A = SPR[cat],
    im = SIMG[cat];
  if (!A || !im) return;
  const n = A.count,
    ix = ((i % n) + n) % n,
    sz = A.cell,
    sx = (ix % 4) * sz,
    sy = Math.floor(ix / 4) * sz;
  if (rot) {
    m.save();
    m.translate(x + s / 2, y + s / 2);
    m.rotate(rot);
    m.drawImage(im, sx, sy, sz, sz, -s / 2, -s / 2, s, s);
    m.restore();
  } else m.drawImage(im, sx, sy, sz, sz, x, y, s, s);
}
export function blockFull(c, r) {
  const ox = c - (c % 4) + 1,
    oy = r - (r % 4) + 1;
  if (c % 4 === 0 || r % 4 === 0) return null;
  const st = styleOf(ox, oy);
  if (!(hsh(ox * 3 + 1, oy * 5 + 2) < st.full)) return null;
  for (let y = oy; y < oy + 3; y++) for (let x = ox; x < ox + 3; x++) if (tch(x, y) !== '#') return null;
  return [ox, oy];
}
export function paintSprites(m, c0, r0, c1, r1) {
  for (let r = r0 - 1; r <= r1 + 1; r++)
    for (let c = c0 - 1; c <= c1 + 1; c++) {
      const t = tch(c, r),
        h = hsh(c, r),
        x = c * TS,
        y = r * TS;
      if (t === 'F') {
        if (h < 0.6) {
          const s = TS * (1.05 + hsh(r, c) * 0.45);
          spr(m, 'agac', Math.floor(hsh(c + 3, r) * 16), x + TS / 2 - s / 2, y + TS / 2 - s / 2, s);
        }
        continue;
      }
      if (t === 'P') {
        if (h < 0.18) spr(m, 'bahce', Math.floor(hsh(c, r + 9) * 16), x, y, TS);
        else if (h < 0.6) {
          const s = TS * 0.95;
          spr(m, 'agac', Math.floor(hsh(c + 5, r) * 16), x + TS / 2 - s / 2, y + TS / 2 - s / 2, s);
        }
        continue;
      }
      if (t === 'e' && h < 0.05) {
        const hz = tch(c - 1, r) === 'e' || tch(c + 1, r) === 'e';
        spr(m, 'sokak', h < 0.025 ? 11 : 14, x + TS * 0.1, y + TS * 0.1, TS * 0.8, hz ? Math.PI / 2 : 0);
        continue;
      }
    }
  // tam bloklar (3x3)
  const done = new Set();
  for (let r = r0 - 3; r <= r1 + 3; r++)
    for (let c = c0 - 3; c <= c1 + 3; c++) {
      if (tch(c, r) !== '#') continue;
      const b = blockFull(c, r);
      if (!b) continue;
      const k = b[0] + ',' + b[1];
      if (done.has(k)) continue;
      done.add(k);
      const cat = hsh(b[0], b[1] + 7) < 0.12 ? 'bahce' : 'blok';
      spr(m, cat, Math.floor(hsh(b[0] + 2, b[1]) * 16), b[0] * TS - TS * 0.06, b[1] * TS - TS * 0.06, TS * 3.12);
    }
  // evler: her bloğu kendi alanı içinde, 1,5 kat büyük parçalarla doldur (yola taşmaz)
  for (let r = r0 - 3; r <= r1 + 3; r++)
    for (let c = c0 - 3; c <= c1 + 3; c++) {
      if (c % 4 !== 1 || r % 4 !== 1) continue;
      if (blockFull(c, r)) continue;
      let mx0 = 9,
        my0 = 9,
        mx1 = -1,
        my1 = -1,
        cnt = 0;
      for (let y = r; y < r + 3; y++)
        for (let x = c; x < c + 3; x++)
          if (tch(x, y) === '#') {
            cnt++;
            mx0 = Math.min(mx0, x - c);
            my0 = Math.min(my0, y - r);
            mx1 = Math.max(mx1, x - c);
            my1 = Math.max(my1, y - r);
          }
      if (!cnt) continue;
      const bw = mx1 - mx0 + 1,
        bh = my1 - my0 + 1;
      let rect = cnt === bw * bh;
      const slots = [];
      if (rect) {
        const nx = bw >= 3 ? 2 : 1,
          ny = bh >= 3 ? 2 : 1,
          sw = bw / nx,
          sh = bh / ny;
        for (let j = 0; j < ny; j++)
          for (let i = 0; i < nx; i++) slots.push([c + mx0 + i * sw, r + my0 + j * sh, sw, sh]);
      } else
        for (let y = r; y < r + 3; y++) for (let x = c; x < c + 3; x++) if (tch(x, y) === '#') slots.push([x, y, 1, 1]);
      const st = styleOf(c, r);
      slots.forEach(([sx2, sy2, sw, sh], k) => {
        const sz = Math.min(sw, sh),
          x = (sx2 + sw / 2 - sz / 2) * TS,
          y = (sy2 + sh / 2 - sz / 2) * TS,
          S2 = sz * TS,
          h = hsh(c * 3 + k, r * 5 + k);
        if (h < st.tree) {
          spr(m, 'agac', Math.floor(hsh(c + k, r + 4) * 16), x, y, S2);
          return;
        }
        if (h < st.tree + st.garden) {
          spr(m, 'bahce', Math.floor(hsh(c + 8 + k, r) * 16), x, y, S2);
          return;
        }
        let q = hsh(c + 13 + k, r + 29),
          cat = st.cats[0][0];
        for (const [kk, p] of st.cats) {
          if (q < p) {
            cat = kk;
            break;
          }
          q -= p;
        }
        spr(m, cat, Math.floor(hsh(c + 31 + k, r + 7) * 16), x, y, S2);
      });
    }
}
export function mapChunk(i, j) {
  const k = j * CHX + i;
  if (mapChunks[k]) {
    const ix = chunkOrder.indexOf(k);
    if (ix >= 0) chunkOrder.splice(ix, 1);
    chunkOrder.push(k);
    return mapChunks[k];
  }
  const W = CHT * TS,
    c = document.createElement('canvas');
  c.width = Math.ceil(W * chMS);
  c.height = Math.ceil(W * chMS);
  const m = c.getContext('2d');
  m.scale(chMS, chMS);
  m.translate(-i * W, -j * W);
  m.beginPath();
  m.rect(i * W, j * W, W, W);
  m.clip();
  m.fillStyle = pal.ground;
  m.fillRect(i * W, j * W, W, W);
  paintRegion(m, i * CHT, j * CHT, Math.min(COLS - 1, (i + 1) * CHT - 1), Math.min(ROWS - 1, (j + 1) * CHT - 1));
  mapChunks[k] = c;
  chunkOrder.push(k);
  while (chunkOrder.length > chunkCap) {
    const old = chunkOrder.shift();
    mapChunks[old] = null;
  }
  return c;
}
export function buildMap() {
  pal = dark() ? PAL.dark : PAL.light;
  pal.walk = PAL_WALK[dark() ? 'dark' : 'light'][0];
  pal.walkLine = PAL_WALK[dark() ? 'dark' : 'light'][1];
  chMS = DPR;
  CHX = Math.ceil(COLS / CHT);
  CHY = Math.ceil(ROWS / CHT);
  mapChunks = new Array(CHX * CHY).fill(null);
  chunkOrder = [];
  miniCv = document.createElement('canvas');
  miniCv.width = COLS;
  miniCv.height = ROWS;
  const n = miniCv.getContext('2d');
  const im = n.createImageData(COLS, ROWS),
    hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const cw = hex(pal.water),
    cr = hex(pal.road),
    cf = hex(pal.park),
    cg = hex(pal.ground),
    ca = hex('#f5e8c2'),
    ch = hex(pal.plaza);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const t = TT[r][c],
        col =
          t === 'T'
            ? [95, 110, 130]
            : t === '~'
              ? cw
              : t === 'A' || t === 'K' || t === 'e' || t === 'q'
                ? ca
                : t === 'c' || t === 's'
                  ? cr
                  : t === 'F' || t === 'P'
                    ? cf
                    : t === 'H'
                      ? ch
                      : cg;
      const o = (r * COLS + c) * 4;
      im.data[o] = col[0];
      im.data[o + 1] = col[1];
      im.data[o + 2] = col[2];
      im.data[o + 3] = 255;
    }
  n.putImageData(im, 0, 0);
  const mr = mini.getBoundingClientRect();
  mini.width = Math.round((mr.width || 86) * DPR);
  mini.height = Math.round((mr.height || 82) * DPR);
}
/* görseller yüklendikten sonra çağrılır */
export function initPainter() {
  LMD = MANIFEST.landmarks;
  SPR = MANIFEST.sprites;
  for (const k in LMD) LIMG[k] = img(LMD[k].file);
  for (const k in SPR) SIMG[k] = img(SPR[k].file);
  mq.addEventListener && mq.addEventListener('change', buildMap);
  if (document.fonts && document.fonts.ready)
    document.fonts.ready.then(() => {
      if (mapChunks) buildMap();
    });
}
