/* ================= 2.5D (İZOMETRİK) ÇİZİM =================
   Oyun mantığı aynı; yalnızca görünüm değişir. Eldeki üstten görseller kodda 2.5D’ye uyarlanır:
   - Zemin: üstten harita parçaları (yollar, simge yapılar, etiketler) döndürülüp eğilerek yere serilir.
   - Binalar: üstten çatı görseli kutunun tepesine oturur, duvarlar ve pencere şeritleri kodla çizilir.
   - Araçlar: üstten araç görseli üst üste katmanlanarak hacim kazanır (“sprite stacking”).
   - İnsanlar, radar, kavga bulutu: ekrana dik duran figürler.
   Kamera aracın yönünü izler (ayar: src/render/isoView.ts). */
import { img, ready } from '../core/assets';
import { MANIFEST } from '../sim/content';
import { G, ORN } from '../sim/state';
import { hsh } from '../sim/util';
import { COLS, DIRS, LMK, MAP, RADARS, ROWS, isRoad, isTunnel } from '../sim/grid';
import {
  CHT,
  CHX,
  CHY,
  buildMap,
  collectSprites,
  mapChunk,
  mapChunks,
  pal,
  painterOpts,
  setChunkCap,
  sprCell,
} from '../map/painter';
import { carOpts, drawAlarm, drawCar, drawCarryBadge, pickCarSpr } from './cars';
import { drawPax, paxOpts } from './people';
import { drawRemotes } from './remotes';
import { smoothRemotes } from '../net/mp';
import {
  drawCheckCones,
  drawCloud,
  drawFerry,
  drawFx,
  drawHomeStand,
  drawMarks,
  drawMini,
  drawNitro,
  drawRadar,
  drawWaves,
  drawWeather,
  light,
} from './render';
import { DPR, TS, VH, VW, cam, ctx, px, rr, setCtx } from './view';
import { heading, isoCfg, lmState } from './isoView';

const INK = '#141414';
/** kamera açısı (radyan) ve o karedeki ölçek */
let ang = isoCfg.aci * (Math.PI / 180),
  S = 40,
  K = 0.66,
  HZ = 0.75,
  CX = 0,
  CY = 0,
  SN = 0,
  CS = 1;
const Y0 = () => VH * 0.62;
/** kare koordinatı (araçlardaki gibi: kare ortası tam sayı) + yükseklik → ekran */
function proj(vx: number, vy: number, z: number): [number, number] {
  const dx = vx - CX,
    dy = vy - CY;
  return [VW / 2 + S * (dx * CS + dy * SN), Y0() + S * K * (-dx * SN + dy * CS) - z * S * HZ];
}
const depth = (vx: number, vy: number) => -(vx - CX) * SN + (vy - CY) * CS;
/** zemin düzlemi: bundan sonra üstten çizim kodu (px, TS) olduğu gibi çalışır; z kadar yukarıda */
function ground(z = 0) {
  const s = (S / TS) * DPR,
    a = s * CS,
    b = -s * K * SN,
    c = s * SN,
    d = s * K * CS,
    wx = px(CX),
    wy = px(CY);
  ctx.setTransform(a, b, c, d, (VW / 2) * DPR - (a * wx + c * wy), (Y0() - z * S * HZ) * DPR - (b * wx + d * wy));
}
/** ekrana dik figür: (vx, vy) karesinin ortası ekrandaki yerine oturur, çizim üstten koddaki gibi yapılır */
function upright(vx: number, vy: number, z: number, fn: () => void) {
  const [X, Y] = proj(vx, vy, z),
    s = S / TS;
  ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * (X - px(vx) * s), DPR * (Y - px(vy) * s));
  fn();
}
const screen = () => ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

/* ---- binalar: harita parçası başına bir kez hesaplanır ---- */
interface Cell {
  /** sol üst köşe ve kenar (kare; köşe koordinatı: kare ortası = tam sayı + 0) */
  x: number;
  y: number;
  w: number;
  h: number;
  cat: string;
  i: number;
  /** atlas hücresinin kullanılacak kısmı (0–1) */
  u: number;
  v: number;
  uw: number;
  /** dış duvarlar: kuzey, doğu, güney, batı */
  walls: boolean[];
  /** 3×3 bloğun bütünü (2.5D çizim varsa parçaların yerine çizilir) ve parçaları */
  whole?: boolean;
  part?: boolean;
}
interface Tree {
  x: number;
  y: number;
  s: number;
  i: number;
}
const HEIGHT: Record<string, [number, number]> = {
  apartman: [1.0, 1.1],
  blok: [1.5, 1.7],
  kiremit: [0.55, 0.3],
  mahalle: [0.5, 0.3],
  yali: [0.6, 0.25],
};
const WALL: Record<string, string[]> = {
  apartman: ['#e9e2d0', '#d9d4c8', '#ecd9bd'],
  blok: ['#d5dbe0', '#c9d3da', '#e0dccf'],
  kiremit: ['#f1e3c8', '#ead2b0'],
  mahalle: ['#ead7bd', '#e3cfae', '#efe2cb'],
  yali: ['#f6f1e6', '#e9dcc4'],
};
const INSET = 0.07; // atlas hücresinde çatının çevresindeki boşluk (gölge payı)
const chunkCells = new Map<number, { cells: Cell[]; trees: Tree[] }>();
function cellsOf(ci: number, cj: number) {
  const key = cj * CHX + ci;
  let c = chunkCells.get(key);
  if (c) return c;
  c = { cells: [], trees: [] };
  const c0 = ci * CHT,
    r0 = cj * CHT,
    c1 = c0 + CHT - 1,
    r1 = r0 + CHT - 1;
  for (const sl of collectSprites(c0, r0, c1, r1)) {
    // yerleşim kare köşesinden verilir (kare c’nin sol kenarı = c); araç koordinatına çevir (−0,5)
    const mx = sl.x + sl.s / 2,
      my = sl.y + sl.s / 2;
    if (mx < c0 || mx >= c0 + CHT || my < r0 || my >= r0 + CHT) continue; // komşu parçanın işi
    if (sl.cat === 'agac') {
      c.trees.push({ x: mx - 0.5, y: my - 0.5, s: sl.s, i: sl.i });
      continue;
    }
    const H = HEIGHT[sl.cat];
    if (!H) continue; // bahçe, sokak eşyası: yerde kalır
    const hh = hsh(Math.floor(mx) * 7 + 3, Math.floor(my) * 11 + 5),
      h = H[0] + hh * H[1] + (sl.cat === 'blok' && hsh(Math.floor(my), Math.floor(mx)) > 0.8 ? 1.4 : 0);
    const n = sl.s > 1.7 ? 3 : 1,
      x0 = sl.x + sl.s * INSET,
      w = (sl.s * (1 - 2 * INSET)) / n,
      uw = (1 - 2 * INSET) / n;
    if (n > 1)
      c.cells.push({
        x: x0 - 0.5,
        y: sl.y + sl.s * INSET - 0.5,
        w: w * n,
        h,
        cat: sl.cat,
        i: sl.i,
        u: INSET,
        v: INSET,
        uw: 1 - 2 * INSET,
        walls: [true, true, true, true],
        whole: true,
      });
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++)
        c.cells.push({
          part: n > 1,
          x: x0 + i * w - 0.5,
          y: sl.y + sl.s * INSET + j * w - 0.5,
          w,
          h,
          cat: sl.cat,
          i: sl.i,
          u: INSET + i * uw,
          v: INSET + j * uw,
          uw,
          walls: [j === 0, i === n - 1, j === n - 1, i === 0],
        });
  }
  chunkCells.set(key, c);
  return c;
}
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16),
    ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
/** bina hücresi: görünen dış duvarlar (pencere şeritleriyle) + çatı görseli */
/** 2.5D çizimler yalnızca sabit kamerada ve çizildikleri açıda (45°) kullanılır */
const spriteMode = () => !isoCfg.takip && Math.abs(isoCfg.aci - 45) <= 4;
const isoSheet = (cat: string) => {
  const SI = MANIFEST.sprites_iso && MANIFEST.sprites_iso[cat];
  return SI && ready(img(SI.file)) ? SI : null;
};
/** bu hücre bu karede çizilmeli mi: blok çizimi varsa bütün, yoksa parçalar */
function cellActive(b: Cell) {
  if (!b.whole && !b.part) return true;
  const whole = spriteMode() && !!isoSheet(b.cat);
  return b.whole ? whole : !whole;
}
/* ---- yolu görünür tutmak: binalar basık, kapatan binalar saydam, arkada kalanlar siluetle ---- */
/** dikey basıklık: bina, simge yapı, ağaç (yalnızca yerden yukarı kalan kısım basılır) */
/** yolcuların neon rengi (şehirde, taksilerde ve parklarda olmayan bir renk) */
const NEON = '#ff2fd0';
const SQ_BINA = 0.6,
  SQ_SIMGE = 0.7,
  SQ_AGAC = 0.8;
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** görseli tabanı (yere oturan kısmı, ekranda foot yüksekliği) bozulmadan, üst kısmı sq oranında basık çizer; ekran kutusunu döner */
function drawSquashed(
  im: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  X: number,
  bottom: number,
  k: number,
  foot: number,
  sq: number,
  flip = false,
  draw = true,
): Box {
  const dw = sw * k,
    fs = Math.min(sh, foot / k), // tabanın kaynaktaki yüksekliği
    top = (sh - fs) * k * sq,
    box = { x0: X - dw / 2, y0: bottom - fs * k - top, x1: X + dw / 2, y1: bottom };
  if (!draw) return box;
  screen();
  if (flip) {
    ctx.translate(X, 0);
    ctx.scale(-1, 1);
    X = 0;
  }
  if (fs > 0.5) ctx.drawImage(im, sx, sy + sh - fs, sw, fs, X - dw / 2, bottom - fs * k, dw, fs * k + 0.5);
  ctx.drawImage(im, sx, sy, sw, sh - fs, X - dw / 2, box.y0, dw, top + 0.5);
  screen();
  return box;
}
/** binanın 2.5D çizimi: nesne genişliği haritadaki yerinin “dolu” oranı kadar, alt ucu yerin alt köşesinde.
    draw=false: yalnızca ekran kutusunu hesaplar (saydamlık için) */
function cellSprite(b: Cell, draw = true): Box | null {
  if (!spriteMode()) return null;
  const SI = isoSheet(b.cat);
  if (!SI) return null;
  // tür sayfası birden çok sayfadan oluşabilir (mahalle: tek ve iki katlı); yere göre karıştırılır
  const ix = (b.i + Math.floor(hsh(Math.round(b.x * 3) + 11, Math.round(b.y * 5) + 7) * SI.count)) % SI.count,
    slot = b.w / (1 - 2 * INSET), // binanın haritadaki yeri (kare)
    plot = slot * Math.SQRT2 * S * (SI.dolu || 0.96), // yerin ekrandaki genişliği
    k = plot / SI.w[ix],
    [X, Y] = proj(b.x + b.w / 2, b.y + b.w / 2, 0),
    kaide = plot * (SI.kaide ?? 0.05),
    bottom = Y + plot * K * 0.5 + kaide;
  return drawSquashed(
    img(SI.file),
    (ix % SI.cols) * SI.cw,
    Math.floor(ix / SI.cols) * SI.ch,
    SI.cw,
    SI.ch - 2,
    X,
    bottom,
    k,
    plot * K + kaide,
    SQ_BINA,
    false,
    draw,
  );
}
const drawCellSprite = (b: Cell) => !!cellSprite(b);
function drawCell(b: Cell, night: number) {
  if (drawCellSprite(b)) return;
  const P: [number, number][] = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x + b.w, b.y + b.w],
    [b.x, b.y + b.w],
  ];
  // kenar sırası: kuzey (0→1), doğu (1→2), güney (2→3), batı (3→0)
  const N: [number, number][] = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const cols = WALL[b.cat],
    wall = cols[Math.floor(hsh(Math.round(b.x * 3), Math.round(b.y * 5)) * cols.length)];
  screen();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, S * 0.03);
  const floors = Math.max(1, Math.round(b.h / 0.42));
  for (let e = 0; e < 4; e++) {
    if (!b.walls[e]) continue;
    const [nx, ny] = N[e];
    if (-nx * SN + ny * CS <= 0.01) continue; // kameraya bakmıyor
    const side = nx * CS + ny * SN; // ışık soldan
    const a = P[e],
      c = P[(e + 1) % 4];
    const A0 = proj(a[0], a[1], 0),
      B0 = proj(c[0], c[1], 0),
      up = b.h * S * HZ;
    ctx.fillStyle = shade(wall, 0.8 - 0.18 * side);
    ctx.beginPath();
    ctx.moveTo(A0[0], A0[1]);
    ctx.lineTo(B0[0], B0[1]);
    ctx.lineTo(B0[0], B0[1] - up);
    ctx.lineTo(A0[0], A0[1] - up);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // pencere şeritleri: her kat için bir bant
    if (S > 22) {
      ctx.fillStyle = night > 0.5 ? '#ffd76a' : '#5b7186';
      ctx.beginPath();
      const ex = B0[0] - A0[0],
        ey = B0[1] - A0[1];
      for (let f = 0; f < floors; f++) {
        const z0 = ((f + 0.38) / floors) * up,
          z1 = ((f + 0.78) / floors) * up;
        ctx.moveTo(A0[0] + ex * 0.12, A0[1] + ey * 0.12 - z0);
        ctx.lineTo(A0[0] + ex * 0.88, A0[1] + ey * 0.88 - z0);
        ctx.lineTo(A0[0] + ex * 0.88, A0[1] + ey * 0.88 - z1);
        ctx.lineTo(A0[0] + ex * 0.12, A0[1] + ey * 0.12 - z1);
        ctx.closePath();
      }
      ctx.fill();
    }
  }
  // çatı: atlas hücresinin ilgili kısmı, bina yüksekliğinde zemin düzlemine paralel
  const cell = sprCell(b.cat, b.i);
  ground(b.h);
  const X = (b.x + 0.5) * TS,
    Y = (b.y + 0.5) * TS,
    W = b.w * TS;
  if (cell && ready(cell[0])) {
    const [im, sx, sy, sz] = cell;
    ctx.drawImage(im, sx + b.u * sz, sy + b.v * sz, b.uw * sz, b.uw * sz, X, Y, W + 0.5, W + 0.5);
  } else {
    ctx.fillStyle = pal.roofs[b.i % pal.roofs.length];
    ctx.fillRect(X, Y, W, W);
  }
}
function drawTree(tr: Tree) {
  const TI = spriteMode() && isoSheet('agac');
  if (TI) {
    const ix = tr.i % TI.count,
      k = (tr.s * S * 1.15) / Math.max(...TI.w),
      [X, Y] = proj(tr.x, tr.y, 0);
    screen();
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(X, Y, tr.s * S * 0.32, tr.s * S * 0.32 * K, 0, 0, Math.PI * 2);
    ctx.fill();
    drawSquashed(
      img(TI.file),
      (ix % TI.cols) * TI.cw,
      Math.floor(ix / TI.cols) * TI.ch,
      TI.cw,
      TI.ch - 2,
      X,
      Y,
      k,
      0,
      SQ_AGAC,
    );
    return;
  }
  const cell = sprCell('agac', tr.i);
  if (!cell || !ready(cell[0])) return;
  const [im, sx, sy, sz] = cell;
  // gövde
  screen();
  const b = proj(tr.x, tr.y, 0),
    tp = proj(tr.x, tr.y, 0.45);
  ctx.strokeStyle = '#6b4a2e';
  ctx.lineWidth = Math.max(2, S * 0.09);
  ctx.beginPath();
  ctx.moveTo(b[0], b[1]);
  ctx.lineTo(tp[0], tp[1]);
  ctx.stroke();
  // taç: aynı görsel üst üste, yukarı doğru küçülerek
  for (let l = 0; l < 4; l++) {
    const k = 1 - l * 0.14,
      s = tr.s * 0.9 * k * TS;
    ground(0.3 + l * 0.13);
    ctx.drawImage(im, sx, sy, sz, sz, px(tr.x) - s / 2, px(tr.y) - s / 2, s, s);
  }
}

/* ---- araçlar: 2.5D çizim (sabit kamera) ---- */
/** aracın 2.5D çizimi varsa onu çizer; yoksa (ya da kamera dönüyorsa) false döner ve katmanlı çizime düşülür */
function drawCarSprite(e, t: number): boolean {
  if (isoCfg.takip) return false; // dönen kamerada tek açılı çizim uymaz
  const CI = MANIFEST.cars_iso,
    A = CI && CI.araclar[e.spr];
  if (!A) return false;
  // aracın ekrandaki yönü: aşağı geliyorsa ön, yukarı gidiyorsa arka çizim; yatay yön aynalamayla
  const d = e.dir || [0, -1],
    sxv = d[0] * CS + d[1] * SN,
    syv = -d[0] * SN + d[1] * CS,
    front = syv > 0,
    C = front ? A.on : A.arka;
  if (!C) return false;
  const im = img(C.file);
  if (!ready(im)) return false;
  const flip = front ? sxv > 0 : sxv < 0; // ön çizim sol alta, arka çizim sağ üste bakar
  const x = px(e.x),
    y = px(e.y),
    blink = e.isPlayer && G.invuln > 0 && Math.floor(t * 10) % 2 === 0;
  // yerde: gölge, oyuncu halkası, yardım halkası
  ground(0);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.arc(x, y, TS * 0.46, 0, Math.PI * 2);
  ctx.fill();
  if (e.isPlayer || G.assist === e) {
    ctx.strokeStyle = G.assist === e ? '#ff922b' : G.role === 'taxi' ? '#ffc20e' : '#8e98ff';
    ctx.lineWidth = Math.max(2, TS * 0.09);
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.beginPath();
    ctx.arc(x, y, TS * 0.66, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  screen();
  const [X, Y] = proj(e.x, e.y, 0),
    k = (S * 1.3) / CI.refGenislik,
    w = C.w * k,
    h = C.h * k;
  ctx.globalAlpha = (isTunnel(Math.round(e.x), Math.round(e.y)) ? 0.5 : 1) * (blink ? 0.45 : 1);
  if (flip) {
    ctx.translate(X, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(im, -w / 2, Y - h * 0.62, w, h);
    screen();
  } else ctx.drawImage(im, X - w / 2, Y - h * 0.62, w, h);
  ctx.globalAlpha = 1;
  // kovalayan polis: tepe lambası yanıp söner
  if (e.kind === 'police' && e.chase) {
    const on = Math.floor(t * 6) % 2 === 0;
    ctx.fillStyle =
      e.spr === 'sivil' ? (on ? '#1c7ed6' : 'rgba(28,126,214,.3)') : on ? 'rgba(255,59,59,.6)' : 'rgba(59,139,255,.6)';
    ctx.beginPath();
    ctx.arc(X, Y - h * 0.5, S * (e.spr === 'sivil' ? 0.08 : 0.22), 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.isPlayer && ORN !== 'none') {
    const of = MANIFEST.items.ornaments[ORN],
      oi = of ? img(of) : null;
    if (ready(oi)) ctx.drawImage(oi, X - S * 0.25, Y - h * 0.62 - S * 0.25, S * 0.5, S * 0.5);
  }
  if (e.carry) upright(e.x, e.y, 0.35, () => drawCarryBadge(e));
  upright(e.x, e.y, 0.5, () => drawAlarm(e, t));
  return true;
}
/* ---- araçlar (yedek): üstten görsel katmanlanır ---- */
const LAYERS = 5,
  CAR_Z0 = 0.05,
  CAR_DZ = 0.05;
function drawCarIso(e, t: number) {
  if (!e.spr) e.spr = pickCarSpr(e);
  if (drawCarSprite(e, t)) return;
  const CSP = MANIFEST.cars[e.spr],
    AT = CSP && CSP.atlas,
    CIM = CSP ? img(AT ? AT.file : CSP.file) : null,
    inT = isTunnel(Math.round(e.x), Math.round(e.y));
  const x = px(e.x),
    y = px(e.y);
  // gölge
  ground(0);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.arc(x + TS * 0.06, y + TS * 0.06, TS * 0.42, 0, Math.PI * 2);
  ctx.fill();
  if (inT) ctx.globalAlpha = 0.5;
  if (CSP && ready(CIM)) {
    const d = e.dir || [0, -1],
      a = Math.atan2(d[1], d[0]) + Math.PI / 2,
      h = TS * 1.32,
      w = (h * CSP.w) / CSP.h;
    for (let l = 0; l < LAYERS - 1; l++) {
      ground(CAR_Z0 + l * CAR_DZ);
      ctx.translate(x, y);
      ctx.rotate(a);
      if (AT) ctx.drawImage(CIM, AT.x, AT.y, AT.w, AT.h, -w / 2, -h / 2, w, h);
      else ctx.drawImage(CIM, -w / 2, -h / 2, w, h);
    }
  }
  // en üst katman: üstten çizim kodunun kendisi (oyuncu halkası, yolcunun başı, siren, süs)
  ground(CAR_Z0 + (LAYERS - 1) * CAR_DZ);
  carOpts.flat = true;
  drawCar(e, t);
  carOpts.flat = false;
  ctx.globalAlpha = 1;
  upright(e.x, e.y, 0.5, () => drawAlarm(e, t));
}

/* ---- simge yapılar: ayakta duran 2.5D çizim, haritadaki alanına oturur ---- */
interface Lm {
  name: string;
  /** alan (kare köşe koordinatı) */
  x: number;
  y: number;
  w: number;
  h: number;
}
let LMS: Lm[] | null = null;
function landmarks(): Lm[] {
  if (LMS) return LMS;
  LMS = [];
  const L = MANIFEST.landmarks_iso && MANIFEST.landmarks_iso.yapilar;
  if (!L) return LMS;
  for (const [n, fp] of Object.entries((MAP && MAP.simge_alanlari) || {}) as [string, number[]][])
    if (L[n]) LMS.push({ name: n, x: fp[0], y: fp[1], w: fp[2], h: fp[3] });
  const kk = LMK && LMK['Kız Kulesi'];
  if (kk && L['Kız Kulesi']) LMS.push({ name: 'Kız Kulesi', x: kk[0] - 1.2, y: kk[1] - 1.2, w: 3.4, h: 3.4 });
  return LMS;
}
const lmReady = (n: string) => {
  const L = MANIFEST.landmarks_iso && MANIFEST.landmarks_iso.yapilar[n];
  return L && ready(img(L.file)) ? L : null;
};
function drawLandmark(m: Lm, draw = true): Box | null {
  const L = lmReady(m.name);
  if (!L) return null;
  // çizimde arsanın uzun kenarı sol alttan sağ üste (haritada x yönü); alan derinse aynalanır
  const flip = m.h > m.w,
    wScr = (m.w + m.h) * S * CS * 0.98,
    k = wScr / L.w,
    [X] = proj(m.x + m.w / 2 - 0.5, m.y + m.h / 2 - 0.5, 0),
    [, Yb] = proj(m.x - 0.5, m.y + m.h - 0.5, 0),
    foot = (m.w * SN + m.h * CS) * S * K + wScr * 0.03,
    bottom = Yb + wScr * 0.03;
  return drawSquashed(img(L.file), 0, 0, L.w, L.h, X, bottom, k, foot, SQ_SIMGE, flip, draw);
}

/** binanın arkasında kalan önemli nesnenin siluet işareti (binanın üstüne çizilir) */
interface Key {
  x: number;
  y: number;
  d: number;
  sx: number;
  sy: number;
  col: string;
  car?: number[] | null;
  /** yolcu: siluet olarak figürün kendi hattı çizilir */
  pax?: any;
}
/* ---- yolcunun neon hattı: figür ayrı tuvale çizilir, rengi neona boyanıp her yöne kaydırılarak
   arkasına basılır; böylece hat figürün kendi biçimini izler. Pahalı olduğu için sonuç yolcu başına
   önbelleğe alınır ve birkaç karede bir yenilenir (el sallama yine akıcı görünür). ---- */
const NEON_STEP = 6, // kaç karede bir yenilenir
  NEON_DIRS = 8,
  NEON_MAX = 80; // önbellekteki en fazla yolcu
let neonFrame = 0,
  neonSeq = 0,
  figCv: HTMLCanvasElement | null = null,
  tintCv: HTMLCanvasElement | null = null;
interface NeonEntry {
  cv: HTMLCanvasElement;
  ghost: HTMLCanvasElement | null;
  f: number;
  s: number;
  W: number;
  H: number;
}
const neonCache = new Map<any, NeonEntry>();
const neonBox = () => ({ w: S * 3.2, h: S * 3.8, up: S * 0.9 });
const sized = (c: HTMLCanvasElement, W: number, H: number) => {
  if (c.width !== W || c.height !== H) {
    c.width = W;
    c.height = H;
  } else c.getContext('2d').clearRect(0, 0, W, H);
  return c.getContext('2d');
};
/** figürü figCv’ye, neon boyalı kopyasını tintCv’ye çizer (ekran konumundan bağımsız) */
function paxFigure(p, t, W: number, H: number) {
  const { w, h, up } = neonBox(),
    s = S / TS;
  if (!figCv) {
    figCv = document.createElement('canvas');
    tintCv = document.createElement('canvas');
  }
  const f = sized(figCv, W, H),
    main = ctx;
  // yolcunun ayak noktası tuvalde (w/2, h − up)
  f.setTransform(DPR * s, 0, 0, DPR * s, DPR * (w / 2 - px(p.x) * s), DPR * (h - up - px(p.y) * s));
  setCtx(f);
  paxOpts.part = 'figure';
  try {
    drawPax(p, t);
  } finally {
    paxOpts.part = 'all';
    setCtx(main);
  }
  const g = sized(tintCv, W, H);
  g.drawImage(figCv, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = NEON;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
}
const neonRad = () => Math.max(1.2, S * 0.035) * DPR; // ince hat
function stamp(g: CanvasRenderingContext2D, W: number, H: number) {
  const r = neonRad();
  for (let i = 0; i < NEON_DIRS; i++) {
    const a = (i / NEON_DIRS) * Math.PI * 2;
    g.drawImage(tintCv, 0, 0, W, H, Math.cos(a) * r, Math.sin(a) * r, W, H);
  }
}
/** yolcunun önbellekteki neon hatlı figürü (gerekirse yeniler) */
function neonEntry(p, t): NeonEntry {
  const { w, h } = neonBox(),
    W = Math.ceil(w * DPR),
    H = Math.ceil(h * DPR);
  let e = neonCache.get(p);
  if (e && e.s === S && neonFrame - e.f < NEON_STEP) return e;
  if (!e) {
    if (neonCache.size >= NEON_MAX) neonCache.delete(neonCache.keys().next().value);
    e = { cv: document.createElement('canvas'), ghost: null, f: 0, s: 0, W, H };
    neonCache.set(p, e);
  }
  paxFigure(p, t, W, H);
  const g = sized(e.cv, W, H);
  stamp(g, W, H);
  g.drawImage(figCv, 0, 0);
  // bina arkası için yalnızca hat (içi boş); tintCv bu karede hazırken üretilir
  if (!e.ghost) e.ghost = document.createElement('canvas');
  const r = sized(e.ghost, W, H);
  stamp(r, W, H);
  r.globalCompositeOperation = 'destination-out';
  r.drawImage(figCv, 0, 0);
  r.globalCompositeOperation = 'source-over';
  // ilk çizimde yenileme anı yolcuya göre kaydırılır: hepsi aynı karede yenilenip takılma yapmasın
  Object.assign(e, { f: e.s ? neonFrame : neonFrame - (neonSeq++ % NEON_STEP), s: S, W, H });
  return e;
}
function blitNeon(p, c: HTMLCanvasElement, W: number, H: number) {
  const [X, Y] = proj(p.x, p.y, 0),
    { w, h, up } = neonBox();
  screen();
  ctx.drawImage(c, 0, 0, W, H, X - w / 2, Y - h + up, w, h);
}
/** bekleyen yolcu: yerdeki halka, neon hatlı figür */
function drawPaxNeon(p, t) {
  upright(p.x, p.y, 0, () => {
    paxOpts.part = 'halo';
    drawPax(p, t);
    paxOpts.part = 'all';
  });
  const e = neonEntry(p, t);
  blitNeon(p, e.cv, e.W, e.H);
}
/** bina arkasında kalan yolcu: yalnızca figürün neon hattı binanın üstüne */
function drawPaxGhost(p, t) {
  const e = neonEntry(p, t);
  ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 6);
  blitNeon(p, e.ghost, e.W, e.H);
  ctx.globalAlpha = 1;
}
function drawSilhouette(k: Key, t: number) {
  if (k.pax) return drawPaxGhost(k.pax, t);
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  ctx.lineJoin = 'round';
  if (k.car) {
    // araç: yere paralel yuvarlak gövde, rengiyle
    ground(0.18);
    const a = Math.atan2(k.car[1], k.car[0]);
    ctx.translate(px(k.x), px(k.y));
    ctx.rotate(a);
    const L = TS * 0.9,
      W = TS * 0.48;
    ctx.globalAlpha = 0.45 * pulse;
    ctx.fillStyle = k.col;
    rr(ctx, -L / 2, -W / 2, L, W, W * 0.35);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = TS * 0.09;
    ctx.strokeStyle = k.col;
    ctx.stroke();
    ctx.lineWidth = TS * 0.03;
    ctx.strokeStyle = '#141414';
    ctx.stroke();
  } else {
    // insan: baş ve gövde
    screen();
    const s = S * 0.36;
    ctx.globalAlpha = 0.55 * pulse;
    ctx.fillStyle = k.col;
    ctx.beginPath();
    ctx.ellipse(k.sx, k.sy - s * 0.75, s * 0.42, s * 0.62, 0, 0, Math.PI * 2);
    ctx.moveTo(k.sx + s * 0.3, k.sy - s * 1.75);
    ctx.arc(k.sx, k.sy - s * 1.75, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = Math.max(2, S * 0.06);
    ctx.strokeStyle = k.col;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#141414';
    ctx.stroke();
  }
  screen();
}

/* ---- navigasyon (GTA / Crazy Taxi gibi): yolda çizgi, aracın üstünde ok, varışta ışık sütunu ----
   Yol, çizim için ayrı bir genişlik öncelikli aramayla bulunur (oyunun rastgele sayılarına dokunmaz). */
const NAV = '#3cff7a',
  NAV_INK = '#0b5a23';
let navKey = '',
  navPath: number[][] = [],
  navPrev: Int32Array | null = null,
  navSeen: Int32Array | null = null,
  navStamp = 0;
function routeTo(sx: number, sy: number, gx: number, gy: number): number[][] {
  const key = sx + ',' + sy + '>' + gx + ',' + gy;
  if (key === navKey) return navPath;
  navKey = key;
  const n = COLS * ROWS;
  if (!navPrev || navPrev.length !== n) {
    navPrev = new Int32Array(n);
    navSeen = new Int32Array(n);
  }
  const st = ++navStamp,
    s0 = sx + sy * COLS,
    g0 = gx + gy * COLS,
    q = [s0];
  navSeen[s0] = st;
  navPrev[s0] = -1;
  let found = false;
  for (let h = 0; h < q.length && q.length < 60000; h++) {
    const k = q[h];
    if (k === g0) {
      found = true;
      break;
    }
    const x = k % COLS,
      y = (k / COLS) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx,
        ny = y + dy;
      if (!isRoad(nx, ny)) continue;
      const nk = nx + ny * COLS;
      if (navSeen[nk] === st) continue;
      navSeen[nk] = st;
      navPrev[nk] = k;
      q.push(nk);
    }
  }
  navPath = [];
  if (found) for (let k = g0; k >= 0; k = navPrev[k]) navPath.push([k % COLS, (k / COLS) | 0]);
  navPath.reverse();
  return navPath;
}
/** yolda rota çizgisi: mürekkep alt hat + parlak yeşil + akan oklar */
function drawRoute(path: number[][], t: number) {
  if (path.length < 2) return;
  const P = G.player;
  ground(0.02);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(px(P.x), px(P.y));
  for (let i = 1; i < path.length; i++) ctx.lineTo(px(path[i][0]), px(path[i][1]));
  ctx.strokeStyle = NAV_INK;
  ctx.lineWidth = TS * 0.36;
  ctx.stroke();
  ctx.strokeStyle = NAV;
  ctx.lineWidth = TS * 0.24;
  ctx.stroke();
  // akan şeritler: yön hissi
  ctx.setLineDash([TS * 0.25, TS * 0.55]);
  ctx.lineDashOffset = -t * TS * 2.4;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = TS * 0.1;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
}
/** aracın üstünde büyük ok: rotanın birkaç kare ilerisini gösterir */
function drawNavArrow(path: number[][], t: number) {
  const P = G.player;
  const tgt = path[Math.min(path.length - 1, 3)];
  if (!tgt) return;
  const a = Math.atan2(tgt[1] - P.y, tgt[0] - P.x);
  ground(1.15 + Math.sin(t * 5) * 0.08);
  ctx.translate(px(P.x), px(P.y));
  ctx.rotate(a);
  const L = TS * 1.6,
    W = TS * 1.0;
  ctx.beginPath();
  ctx.moveTo(L * 0.6, 0);
  ctx.lineTo(-L * 0.05, -W * 0.5);
  ctx.lineTo(-L * 0.05, -W * 0.2);
  ctx.lineTo(-L * 0.5, -W * 0.2);
  ctx.lineTo(-L * 0.5, W * 0.2);
  ctx.lineTo(-L * 0.05, W * 0.2);
  ctx.lineTo(-L * 0.05, W * 0.5);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = TS * 0.14;
  ctx.strokeStyle = '#141414';
  ctx.stroke();
  ctx.fillStyle = NAV;
  ctx.fill();
  ctx.lineWidth = TS * 0.05;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}
/** varış yerinde ekranın tepesine uzanan ışık sütunu ve kalan mesafe (binaların üstünde çizilir) */
function drawDestBeam(dx: number, dy: number, left: number, t: number) {
  const [X, Y] = proj(dx, dy, 0);
  screen();
  const w = S * 0.55,
    pulse = 0.55 + 0.2 * Math.sin(t * 4);
  ctx.globalAlpha = pulse * 0.55;
  ctx.fillStyle = NAV;
  ctx.fillRect(X - w / 2, 0, w, Y);
  ctx.globalAlpha = pulse;
  ctx.fillRect(X - w * 0.14, 0, w * 0.28, Y);
  ctx.globalAlpha = 1;
  // yerde halka
  ground(0.01);
  ctx.strokeStyle = NAV_INK;
  ctx.lineWidth = TS * 0.16;
  ctx.beginPath();
  ctx.arc(px(dx), px(dy), TS * 0.75, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = NAV;
  ctx.lineWidth = TS * 0.1;
  ctx.stroke();
  // mesafe etiketi
  screen();
  if (left > 1) {
    const txt = left * 50 >= 1000 ? (left * 0.05).toFixed(1).replace('.', ',') + ' km' : left * 50 + ' m';
    const ly = Math.max(26, Math.min(Y - S * 1.6, VH - 40));
    ctx.font = `400 ${Math.round(S * 0.5)}px "Bangers","Archivo Black",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#141414';
    ctx.strokeText(txt, X, ly);
    ctx.fillStyle = NAV;
    ctx.fillText(txt, X, ly);
  }
}

/* ---- kare ---- */
export function renderIso(t: number, dt: number) {
  neonFrame++;
  screen();
  ctx.fillStyle = pal.water;
  ctx.fillRect(0, 0, VW, VH);
  // kamera: aracın biraz önüne bakar, yönünü yumuşakça izler; sorgu sahnesinde olaya yaklaşır
  const k = Math.min(1, dt * 7),
    yaw = (isoCfg.aci * Math.PI) / 180,
    head = G && isoCfg.takip ? heading() : 0;
  {
    const want = head + yaw,
      diff = ((want - ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    ang += diff * Math.min(1, dt * 1.8); // yavaş dönüş: ani savrulma olmasın
  }
  let tg = { x: COLS * TS * 0.55, y: ROWS * TS * 0.7 };
  if (G)
    tg = G.focus
      ? { x: px(G.focus.x), y: px(G.focus.y) }
      : { x: px(G.player.x) + Math.sin(head) * TS * 1.2, y: px(G.player.y) - Math.cos(head) * TS * 1.2 };
  cam.z += ((G ? G.zoomT : 1) - cam.z) * k;
  cam.x += (tg.x - cam.x) * k;
  cam.y += (tg.y - cam.y) * k;
  {
    // ayakta çizilen simge yapılar zemine basılmasın; görseller yüklendikçe harita parçaları yeniden çizilir
    const sig = spriteMode() ? landmarks().filter((m) => lmReady(m.name)).length : -1;
    if (sig !== lmState.sig) {
      lmState.sig = sig;
      painterOpts.skipLm = sig >= 0 ? (n: string) => !!lmReady(n) : null;
      buildMap();
    }
  }
  K = isoCfg.egim;
  HZ = Math.sqrt(1 - K * K);
  S = TS * isoCfg.yakin * (1 + (cam.z - 1) * 0.5);
  CX = cam.x / TS - 0.5;
  CY = cam.y / TS - 0.5;
  SN = Math.sin(ang);
  CS = Math.cos(ang);
  ctx.imageSmoothingQuality = 'low';
  // görünen alanı saran çemberin yarıçapı (kare)
  const R = Math.hypot(VW / 2, Math.max(Y0(), VH - Y0()) / K) / S + 2;
  // zemin: üstten harita parçaları
  ground(0);
  if (mapChunks) {
    let built = 0;
    const tb = performance.now();
    const CW = CHT * TS,
      i0 = Math.max(0, Math.floor((CX - R) / CHT)),
      i1 = Math.min(CHX - 1, Math.floor((CX + R) / CHT)),
      j0 = Math.max(0, Math.floor((CY - R) / CHT)),
      j1 = Math.min(CHY - 1, Math.floor((CY + R) / CHT));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        // ekrana değmeyen parçalar atlanır (dönen görünümde çevreleyen karenin yarısından azı görünür)
        const [mx, my] = proj((i + 0.5) * CHT - 0.5, (j + 0.5) * CHT - 0.5, 0),
          rad = CHT * 0.71 * S;
        if (mx < -rad || mx > VW + rad || my < -rad * K || my > VH + rad * K) continue;
        let c = mapChunks[j * CHX + i];
        if (!c && (built === 0 || performance.now() - tb < 6)) {
          c = mapChunk(i, j);
          built++;
        } else if (c) mapChunk(i, j);
        if (c) ctx.drawImage(c, i * CW, j * CW, CW + 0.5, CW + 0.5);
      }
    setChunkCap((i1 - i0 + 3) * (j1 - j0 + 3) + 6);
  }
  // ekrana düşmeyen nesneler çizilmez (üstte yüksek binalar için pay)
  const inView = (x: number, y: number) => {
    const dx = x - CX,
      dy = y - CY,
      sx = VW / 2 + S * (dx * CS + dy * SN),
      sy = Y0() + S * K * (-dx * SN + dy * CS);
    return sx > -S * 2 && sx < VW + S * 2 && sy > -S && sy < VH + S * 4;
  };
  const ft = G ? G.clock : t;
  for (const [x0, span, y, sp, ph] of [
    [131.8, 8.4, 150, 0.22, 0],
    [131.8, 8.4, 96, 0.17, 2],
    [100, 40, 189, 0.12, 1],
    [140, 30, 194, 0.09, 2],
  ])
    drawFerry((x0 + ((Math.sin(ft * sp + ph) + 1) / 2) * span) * TS, y * TS, true, t);
  const L = light();
  // sıralı nesneler: [derinlik, çizim]
  const objs: [number, () => void][] = [];
  const pd = G ? depth(G.player.x, G.player.y) : 0,
    psx = G ? proj(G.player.x, G.player.y, 0)[0] : 0;
  // önemli noktalar: oyuncu ve önündeki yol, yolcular, araçlar, varış yeri. Bunları kapatan binalar
  // saydamlaşır, arkada kalanlar binanın üstüne siluetle çizilir
  const keys: Key[] = [];
  const key = (x: number, y: number, col: string, car?: number[] | null, z = 0.25, pax?: any) => {
    if (!inView(x, y)) return;
    const [sx, sy] = proj(x, y, z);
    keys.push({ x, y, d: depth(x, y), sx, sy, col, car, pax });
  };
  if (G && spriteMode()) {
    const P = G.player,
      d = P.dir || [0, -1];
    key(P.x, P.y, G.role === 'taxi' ? '#ffc20e' : '#8e98ff', d);
    for (let n = 1; n <= 4; n++) key(P.x + d[0] * n, P.y + d[1] * n, '', undefined, 0); // gideceği yol
    if (P.carry) {
      key(P.carry.dx, P.carry.dy, '#2f9e44', undefined, 0);
      // rotanın yakın kısmını kapatan binalar da saydamlaşsın
      const r = routeTo(Math.round(P.x), Math.round(P.y), P.carry.dx, P.carry.dy);
      for (let i = 1; i < Math.min(r.length, 12); i++) key(r[i][0], r[i][1], '', undefined, 0);
    }
    for (const p of G.pax) if (p.state === 'wait' || p.state === 'talk') key(p.x, p.y, NEON, undefined, 0.25, p);
    for (const e of G.ents)
      if (!e.isPlayer)
        key(e.x, e.y, e.kind === 'police' ? '#1c7ed6' : e.kind === 'tag' ? '#ff922b' : '#ffc20e', e.dir || [1, 0]);
  }
  /** binanın ekran kutusu bir önemli noktayı kapatıyor mu (bina noktadan önde ve kutusu üstünde) */
  const covered: Set<Key> = new Set();
  const occludes = (bd: number, box: Box | null) => {
    if (!box) return false;
    let hit = false;
    for (const k of keys)
      if (
        bd > k.d + 0.25 &&
        k.sx > box.x0 + S * 0.1 &&
        k.sx < box.x1 - S * 0.1 &&
        k.sy > box.y0 &&
        k.sy < box.y1 - S * 0.15
      ) {
        hit = true;
        if (k.col) covered.add(k);
      }
    return hit;
  };
  {
    const i0 = Math.max(0, Math.floor((CX - R) / CHT)),
      i1 = Math.min(CHX - 1, Math.floor((CX + R) / CHT)),
      j0 = Math.max(0, Math.floor((CY - R) / CHT)),
      j1 = Math.min(CHY - 1, Math.floor((CY + R) / CHT));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const [mx0, my0] = proj((i + 0.5) * CHT - 0.5, (j + 0.5) * CHT - 0.5, 0),
          rad0 = CHT * 0.71 * S;
        if (mx0 < -rad0 || mx0 > VW + rad0 || my0 < -rad0 * K || my0 > VH + rad0 * K + S * 4) continue;
        const c = cellsOf(i, j);
        for (const b of c.cells) {
          if (!cellActive(b)) continue;
          const mx = b.x + b.w / 2,
            my = b.y + b.w / 2;
          if (!inView(mx, my)) continue;
          const d = depth(mx, my);
          // kapatan binalar yarı saydam: çizimli binada ekran kutusuyla, kutu binada aracın önü
          const box = keys.length ? cellSprite(b, false) : null;
          const hide = box
            ? occludes(d, box)
            : G && d - pd > 0.3 && d - pd < 1.2 + b.h * 2.2 && Math.abs(proj(mx, my, 0)[0] - psx) < S * 0.9;
          objs.push([
            d,
            () => {
              if (hide) {
                screen();
                ctx.globalAlpha = 0.32;
              }
              ctx.globalAlpha = hide ? 0.32 : 1;
              drawCell(b, L.night);
              ctx.globalAlpha = 1;
            },
          ]);
        }
        for (const tr of c.trees) if (inView(tr.x, tr.y)) objs.push([depth(tr.x, tr.y), () => drawTree(tr)]);
      }
    if (painterOpts.skipLm)
      for (const m of landmarks()) {
        const cx = m.x + m.w / 2 - 0.5,
          cy = m.y + m.h / 2 - 0.5;
        if (Math.abs(cx - CX) < R + 6 && Math.abs(cy - CY) < R + 6 && lmReady(m.name)) {
          const d = depth(cx, cy),
            hide = occludes(d, drawLandmark(m, false));
          objs.push([
            d,
            () => {
              ctx.globalAlpha = hide ? 0.4 : 1;
              drawLandmark(m);
              ctx.globalAlpha = 1;
            },
          ]);
        }
      }
  }
  if (G) {
    ground(0);
    drawHomeStand();
    const C = G.player.carry,
      route = C ? routeTo(Math.round(G.player.x), Math.round(G.player.y), C.dx, C.dy) : [];
    if (C) drawRoute(route, t);
    drawWaves(t);
    for (const p of G.pax)
      if ((p.state === 'wait' || p.state === 'talk') && inView(p.x, p.y))
        objs.push([depth(p.x, p.y) + 0.05, () => drawPaxNeon(p, t)]);
    for (const q of RADARS)
      if (inView(q[0], q[1])) objs.push([depth(q[0], q[1]), () => upright(q[0], q[1], 0, () => drawRadar(q))]);
    for (const ck of G.checks)
      if (ck.shown > 0 && inView(ck.x, ck.y)) {
        ground(0);
        drawCheckCones(ck);
        const pol = {
          kind: 'police',
          isPlayer: false,
          x: ck.x,
          y: ck.y - 0.12,
          dir: [1, 0],
          carry: null,
          chase: false,
          revealed: 0,
          spr: 'police1',
        };
        objs.push([depth(pol.x, pol.y), () => drawCarIso(pol, t)]);
      }
    for (const e of G.ents) if (!e.isPlayer && inView(e.x, e.y)) objs.push([depth(e.x, e.y), () => drawCarIso(e, t)]);
    objs.push([
      pd,
      () => {
        drawCarIso(G.player, t);
        ground(0.12);
        drawNitro();
      },
    ]);
    for (const c of G.clouds) objs.push([depth(c.x, c.y) + 0.3, () => upright(c.x, c.y, 0.3, () => drawCloud(c, t))]);
  }
  objs.sort((a, b) => a[0] - b[0]);
  for (const o of objs) o[1]();
  ctx.globalAlpha = 1;
  for (const k of covered) drawSilhouette(k, t);
  if (G && G.player.carry && !G.cine) {
    const C = G.player.carry,
      route = routeTo(Math.round(G.player.x), Math.round(G.player.y), C.dx, C.dy);
    drawDestBeam(C.dx, C.dy, route.length - 1, t);
    drawNavArrow(route, t);
    screen();
  }
  if (G) {
    smoothRemotes(dt);
    ground(0.25);
    drawRemotes(t, inView);
    // ışık: renkleri çarpma ile koyulaştır
    screen();
    if (L.tint) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = L.tint;
      ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    }
    if (G.hava && G.hava !== 'acik') drawWeather(G.hava, t, 0, 0, VW, VH);
    for (const f of G.fx) upright(f.x, f.y, 0.4, () => drawFx(f));
    screen();
    drawMarks((wx, wy) => proj(wx / TS - 0.5, wy / TS - 0.5, 0));
  }
  screen();
  drawMini();
}
