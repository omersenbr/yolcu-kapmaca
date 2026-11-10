/* ================= 2.5D (İZOMETRİK) ÇİZİM =================
   Oyun mantığı aynı; yalnızca görünüm değişir. Eldeki üstten görseller kodda 2.5D’ye uyarlanır:
   - Zemin: üstten harita parçaları (yollar, simge yapılar, etiketler) döndürülüp eğilerek yere serilir.
   - Binalar: üstten çatı görseli kutunun tepesine oturur, duvarlar ve pencere şeritleri kodla çizilir.
   - Araçlar: üstten araç görseli üst üste katmanlanarak hacim kazanır (“sprite stacking”).
   - İnsanlar, radar, kavga bulutu: ekrana dik duran figürler.
   Kamera aracın yönünü izler (ayar: src/render/isoView.ts). */
import { img, ready } from '../core/assets';
import { MANIFEST } from '../sim/content';
import { G } from '../sim/state';
import { hsh } from '../sim/util';
import { COLS, RADARS, ROWS, isTunnel } from '../sim/grid';
import { CHT, CHX, CHY, collectSprites, mapChunk, mapChunks, pal, setChunkCap, sprCell } from '../map/painter';
import { carOpts, drawAlarm, drawCar, pickCarSpr } from './cars';
import { drawDest, drawPax } from './people';
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
import { DPR, TS, VH, VW, cam, ctx, px } from './view';
import { heading, isoCfg } from './isoView';

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
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++)
        c.cells.push({
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
function drawCell(b: Cell, night: number) {
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

/* ---- araçlar: üstten görsel katmanlanır ---- */
const LAYERS = 5,
  CAR_Z0 = 0.05,
  CAR_DZ = 0.05;
function drawCarIso(e, t: number) {
  if (!e.spr) e.spr = pickCarSpr(e);
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

/* ---- kare ---- */
export function renderIso(t: number, dt: number) {
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
    ang += diff * Math.min(1, dt * 3.2);
  }
  let tg = { x: COLS * TS * 0.55, y: ROWS * TS * 0.7 };
  if (G)
    tg = G.focus
      ? { x: px(G.focus.x), y: px(G.focus.y) }
      : { x: px(G.player.x) + Math.sin(head) * TS * 1.2, y: px(G.player.y) - Math.cos(head) * TS * 1.2 };
  cam.z += ((G ? G.zoomT : 1) - cam.z) * k;
  cam.x += (tg.x - cam.x) * k;
  cam.y += (tg.y - cam.y) * k;
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
          const mx = b.x + b.w / 2,
            my = b.y + b.w / 2;
          if (!inView(mx, my)) continue;
          const d = depth(mx, my);
          // aracın önünü kapatan binalar yarı saydam
          const hide = G && d - pd > 0.3 && d - pd < 1.2 + b.h * 2.2 && Math.abs(proj(mx, my, 0)[0] - psx) < S * 0.9;
          objs.push([
            d,
            () => {
              if (hide) {
                screen();
                ctx.globalAlpha = 0.3;
              }
              drawCell(b, L.night);
              ctx.globalAlpha = 1;
            },
          ]);
        }
        for (const tr of c.trees) if (inView(tr.x, tr.y)) objs.push([depth(tr.x, tr.y), () => drawTree(tr)]);
      }
  }
  if (G) {
    ground(0);
    drawHomeStand();
    if (G.player.carry) drawDest(G.player.carry, t);
    drawWaves(t);
    for (const p of G.pax)
      if ((p.state === 'wait' || p.state === 'talk') && inView(p.x, p.y))
        objs.push([depth(p.x, p.y) + 0.05, () => upright(p.x, p.y, 0, () => drawPax(p, t))]);
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
