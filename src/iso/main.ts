/* ================= 2.5D İZOMETRİK DENEME =================
   Asıl oyundan bağımsız küçük bir görünüm denemesi (izometrik.html): haritanın küçük bir parçası,
   eğik kamera, binalar yükseltilmiş kutular, kamera aracın yönünü izler (araç hep ekranın yukarısına gider).
   Hareket oyundaki gibi kareden kareye (“Pac-Man” mantığı). Görseller sonra 2.5D çizimlerle değişecek;
   şimdilik her şey düz renkli, mürekkep konturlu kutulardan çizilir. */
import mapUrl from '/data/harita.json?url';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const cv = $('cv') as HTMLCanvasElement,
  ctx = cv.getContext('2d')!;
const INK = '#141414';

/* ---- harita parçası ---- */
const X0 = 95,
  Y0 = 78,
  CW = 36,
  CH = 34;
let rows: string[] = [];
const at = (x: number, y: number) => (x < 0 || y < 0 || x >= CW || y >= CH ? '#' : rows[y][x]);
const isRoad = (x: number, y: number) => x >= 0 && y >= 0 && x < CW && y < CH && 'AKTcs'.includes(rows[y][x]);
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/* ---- kamera ---- */
/** a: kameranın baktığı yön; yaw: aracın yönüne göre yana kaçıklık (izometrik görünüm: binaların iki yüzü görünür) */
const cam = { x: 0, y: 0, a: 0, k: 0.66, s: 50, yaw: (32 * Math.PI) / 180 };
let W = 0,
  H = 0,
  DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width = W * DPR;
  cv.height = H * DPR;
}
window.addEventListener('resize', resize);
resize();
/** dünya (kare, yükseklik) → ekran */
function proj(x: number, y: number, z: number): [number, number] {
  const dx = x - cam.x,
    dy = y - cam.y,
    c = Math.cos(cam.a),
    s = Math.sin(cam.a);
  return [
    W / 2 + cam.s * (dx * c + dy * s),
    H * 0.66 + cam.s * cam.k * (-dx * s + dy * c) - z * cam.s * Math.sqrt(1 - cam.k * cam.k),
  ];
}
/** derinlik: büyük olan öne çizilir */
const depth = (x: number, y: number) => -(x - cam.x) * Math.sin(cam.a) + (y - cam.y) * Math.cos(cam.a);

/* ---- çizim: yönlü kutu (bina, araç gövdesi) ---- */
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16),
    ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${ch(n >> 16)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
}
function box(
  cx: number,
  cy: number,
  hw: number,
  hl: number,
  rot: number,
  z0: number,
  z1: number,
  wall: string,
  roof: string,
) {
  const c = Math.cos(rot),
    s = Math.sin(rot);
  const corner = (u: number, v: number): [number, number] => [cx + u * c - v * s, cy + u * s + v * c];
  const P = [corner(-hw, -hl), corner(hw, -hl), corner(hw, hl), corner(-hw, hl)];
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, cam.s * 0.035);
  for (let i = 0; i < 4; i++) {
    const a = P[i],
      b = P[(i + 1) % 4];
    // duvarın dışa bakan yönü kameraya dönükse görünür
    const nx = b[1] - a[1],
      ny = -(b[0] - a[0]);
    const facing = -nx * Math.sin(cam.a) + ny * Math.cos(cam.a);
    if (facing <= 0.001) continue;
    const side = nx * Math.cos(cam.a) + ny * Math.sin(cam.a); // sağa mı sola mı bakıyor: ışık soldan
    const len = Math.hypot(nx, ny) || 1;
    const A0 = proj(a[0], a[1], z0),
      B0 = proj(b[0], b[1], z0),
      A1 = proj(a[0], a[1], z1),
      B1 = proj(b[0], b[1], z1);
    ctx.fillStyle = shade(wall, 0.78 - 0.2 * (side / len));
    ctx.beginPath();
    ctx.moveTo(A0[0], A0[1]);
    ctx.lineTo(B0[0], B0[1]);
    ctx.lineTo(B1[0], B1[1]);
    ctx.lineTo(A1[0], A1[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = roof;
  ctx.beginPath();
  P.forEach((p, i) => {
    const q = proj(p[0], p[1], z1);
    if (i) ctx.lineTo(q[0], q[1]);
    else ctx.moveTo(q[0], q[1]);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/* ---- sahne nesneleri ---- */
interface Obj {
  x: number;
  y: number;
  draw: () => void;
}
const ROOFS = ['#e0603b', '#f0a542', '#8fb6d9', '#f2dca0', '#8cc063', '#e07f62'];
const WALLS = ['#f4ecd8', '#ead9b8', '#e8e2d2', '#f0d9c0'];
const statics: Obj[] = [];
function buildScene() {
  // simge yapı alanları tek büyük yapı olur
  const seen = new Set<string>();
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const t = at(x, y),
        r = hash(x, y);
      if (t === '#') {
        const h = 0.45 + r * 0.75 + (hash(y, x) > 0.9 ? 1.1 : 0);
        const wall = WALLS[Math.floor(hash(x + 7, y) * WALLS.length)],
          roof = ROOFS[Math.floor(hash(x, y + 3) * ROOFS.length)];
        statics.push({ x: x + 0.5, y: y + 0.5, draw: () => box(x + 0.5, y + 0.5, 0.4, 0.4, 0, 0, h, wall, roof) });
      } else if (t === 'P' && r > 0.45) {
        const tx = x + 0.3 + hash(x, y + 9) * 0.4,
          ty = y + 0.3 + hash(x + 9, y) * 0.4;
        statics.push({ x: tx, y: ty, draw: () => tree(tx, ty, 0.5 + r * 0.5) });
      } else if (t === 'L' && !seen.has(x + ',' + y)) {
        let x1 = x,
          y1 = y;
        while (at(x1 + 1, y) === 'L') x1++;
        while (at(x, y1 + 1) === 'L') y1++;
        for (let yy = y; yy <= y1; yy++) for (let xx = x; xx <= x1; xx++) seen.add(xx + ',' + yy);
        const cx = (x + x1 + 1) / 2,
          cy = (y + y1 + 1) / 2,
          hw = (x1 - x + 1) / 2 - 0.9,
          hl = (y1 - y + 1) / 2 - 0.9;
        statics.push({
          x: cx,
          y: cy,
          draw: () => {
            box(cx, cy, hw, hl, 0, 0, 1.3, '#e6d6b4', '#d9c79e');
            box(cx, cy, hw * 0.55, hl * 0.55, 0, 1.3, 2.4, '#e6d6b4', '#8ea3b6');
          },
        });
      }
    }
}
function tree(x: number, y: number, h: number) {
  const b = proj(x, y, 0),
    t = proj(x, y, h),
    r = cam.s * 0.3;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, cam.s * 0.035);
  ctx.fillStyle = '#7a5a3a';
  ctx.fillRect(b[0] - r * 0.14, t[1], r * 0.28, b[1] - t[1]);
  ctx.fillStyle = '#4c9e33';
  ctx.beginPath();
  ctx.ellipse(t[0], t[1], r, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/* ---- zemin: tek bir afin dönüşümle (döndür + eğ) kare kare boyanır ---- */
const GROUND: Record<string, string> = {
  '~': '#3a9ce0',
  '#': '#dcd6c8',
  L: '#efe8d6',
  P: '#86cc5c',
  F: '#6fb04c',
  e: '#9aa3ab',
  q: '#9aa3ab',
  H: '#cfc9bb',
};
function drawGround() {
  const c = Math.cos(cam.a),
    s = Math.sin(cam.a),
    S = cam.s * DPR;
  const a = S * c,
    b = -S * cam.k * s,
    cc = S * s,
    d = S * cam.k * c;
  ctx.setTransform(a, b, cc, d, (W / 2) * DPR - (a * cam.x + cc * cam.y), H * 0.66 * DPR - (b * cam.x + d * cam.y));
  const R = Math.ceil(Math.hypot(W, H / cam.k) / cam.s / 2) + 2;
  const xa = Math.max(-4, Math.floor(cam.x - R)),
    xb = Math.min(CW + 4, Math.ceil(cam.x + R)),
    ya = Math.max(-4, Math.floor(cam.y - R)),
    yb = Math.min(CH + 4, Math.ceil(cam.y + R));
  for (let y = ya; y < yb; y++)
    for (let x = xa; x < xb; x++) {
      const t = at(x, y);
      const road = 'AKTcs'.includes(t);
      ctx.fillStyle = road ? (t === 's' ? '#4d5058' : '#44464d') : GROUND[t] || '#dcd6c8';
      ctx.fillRect(x, y, 1.02, 1.02);
      if (road && t !== 's') {
        // şerit çizgisi: yolun gittiği yöne göre
        ctx.fillStyle = '#f4efe2';
        const h = isRoad(x - 1, y) || isRoad(x + 1, y),
          v = isRoad(x, y - 1) || isRoad(x, y + 1);
        if (h && !v) ctx.fillRect(x + 0.3, y + 0.47, 0.4, 0.06);
        else if (v && !h) ctx.fillRect(x + 0.47, y + 0.3, 0.06, 0.4);
      }
    }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/* ---- araçlar: kareden kareye hareket ---- */
type Dir = [number, number];
const DIRS: Dir[] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
interface Car {
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Dir;
  want: Dir | null;
  rot: number;
  speed: number;
  body: string;
  roof: string;
  player?: boolean;
}
const angOf = (d: Dir) => Math.atan2(d[0], -d[1]); // 0 = kuzey (ekranda yukarı)
const lerpAng = (a: number, b: number, t: number) => {
  const d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * Math.min(1, t);
};
const cars: Car[] = [];
function spawn(body: string, roof: string, player?: boolean): Car {
  for (let i = 0; i < 500; i++) {
    const x = player ? 13 + (i % 5) : Math.floor(Math.random() * CW),
      y = player ? 17 + Math.floor(i / 5) : Math.floor(Math.random() * CH);
    if (!isRoad(x, y)) continue;
    const d = DIRS.find((q) => isRoad(x + q[0], y + q[1]));
    if (!d) continue;
    const c: Car = {
      x,
      y,
      tx: x,
      ty: y,
      dir: d,
      want: null,
      rot: angOf(d),
      speed: player ? 4.2 : 2.2 + Math.random(),
      body,
      roof,
      player,
    };
    cars.push(c);
    return c;
  }
  throw new Error('yol bulunamadı');
}
function stepCar(c: Car, dt: number) {
  let left = c.speed * dt;
  while (left > 0) {
    const dx = c.tx - c.x,
      dy = c.ty - c.y,
      dist = Math.abs(dx) + Math.abs(dy);
    if (dist > left) {
      c.x += Math.sign(dx) * left;
      c.y += Math.sign(dy) * left;
      break;
    }
    c.x = c.tx;
    c.y = c.ty;
    left -= dist;
    // kare ortası: istenen yön açıksa dön, değilse düz devam, o da kapalıysa açık bir yön seç (geri dönüş en son)
    const open = (d: Dir) => isRoad(c.tx + d[0], c.ty + d[1]);
    const back: Dir = [-c.dir[0], -c.dir[1]];
    let d: Dir | null = null;
    if (c.want && open(c.want)) ((d = c.want), (c.want = null));
    else if (!c.player) {
      const opts = DIRS.filter((q) => open(q) && !(q[0] === back[0] && q[1] === back[1]));
      d = opts.length
        ? open(c.dir) && Math.random() < 0.6
          ? c.dir
          : opts[Math.floor(Math.random() * opts.length)]
        : back;
    } else if (open(c.dir)) d = c.dir;
    else d = DIRS.find((q) => open(q) && !(q[0] === back[0] && q[1] === back[1])) || (open(back) ? back : null);
    if (!d) break;
    c.dir = d;
    c.tx += d[0];
    c.ty += d[1];
  }
  c.rot = lerpAng(c.rot, angOf(c.dir), dt * 10);
}
function drawCar(c: Car) {
  const x = c.x + 0.5,
    y = c.y + 0.5;
  // gölge
  const sh = proj(x + 0.05, y + 0.05, 0);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(sh[0], sh[1], cam.s * 0.34, cam.s * 0.34 * cam.k, 0, 0, Math.PI * 2);
  ctx.fill();
  box(x, y, 0.2, 0.36, c.rot, 0.05, 0.2, c.body, c.body);
  // kabin biraz arkada
  const bx = x - Math.sin(c.rot) * 0.04,
    by = y + Math.cos(c.rot) * 0.04;
  box(bx, by, 0.17, 0.18, c.rot, 0.2, 0.33, '#bfd9ea', c.roof);
}

/* ---- girdi: ekrana göre yön (kamera aracı izlerken yukarı = düz) ---- */
let follow = true;
let player: Car;
function steer(screen: Dir) {
  // ekran yönünü kameranın 90°’ye yuvarlanmış açısıyla dünyaya çevir
  const q = Math.round((follow ? angOf(player.dir) : 0) / (Math.PI / 2)),
    c = Math.round(Math.cos((q * Math.PI) / 2)),
    s = Math.round(Math.sin((q * Math.PI) / 2));
  const d: Dir = [screen[0] * c - screen[1] * s, screen[0] * s + screen[1] * c];
  if (d[0] === -player.dir[0] && d[1] === -player.dir[1]) {
    // geri dönüş hemen uygulanır
    const ox = player.tx - player.dir[0],
      oy = player.ty - player.dir[1];
    player.dir = d;
    player.tx = ox;
    player.ty = oy;
    player.want = null;
  } else player.want = d;
}
window.addEventListener('keydown', (e) => {
  const m: Record<string, Dir> = {
    ArrowUp: [0, -1],
    ArrowRight: [1, 0],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    w: [0, -1],
    d: [1, 0],
    s: [0, 1],
    a: [-1, 0],
  };
  if (m[e.key]) {
    steer(m[e.key]);
    e.preventDefault();
  }
});
let p0: [number, number] | null = null;
cv.addEventListener('pointerdown', (e) => (p0 = [e.clientX, e.clientY]));
cv.addEventListener('pointerup', (e) => {
  if (!p0) return;
  const dx = e.clientX - p0[0],
    dy = e.clientY - p0[1];
  p0 = null;
  if (Math.hypot(dx, dy) < 18) return;
  steer(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
});
($('follow') as HTMLInputElement).addEventListener('change', (e) => (follow = (e.target as HTMLInputElement).checked));
($('tilt') as HTMLInputElement).addEventListener('input', (e) => (cam.k = +(e.target as HTMLInputElement).value / 100));
($('yaw') as HTMLInputElement).addEventListener(
  'input',
  (e) => (cam.yaw = (+(e.target as HTMLInputElement).value * Math.PI) / 180),
);
($('zoom') as HTMLInputElement).addEventListener('input', (e) => (cam.s = +(e.target as HTMLInputElement).value));

/* ---- döngü ---- */
let last = 0;
function frame(t: number) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;
  for (const c of cars) stepCar(c, dt);
  // kamera: aracın biraz önüne bakar, yönünü yumuşakça izler
  cam.a = lerpAng(cam.a, (follow ? angOf(player.dir) : 0) + cam.yaw, dt * 3.2);
  const ahead = 1.4,
    ha = cam.a - cam.yaw;
  cam.x += (player.x + 0.5 + Math.sin(ha) * ahead - cam.x) * Math.min(1, dt * 6);
  cam.y += (player.y + 0.5 - Math.cos(ha) * ahead - cam.y) * Math.min(1, dt * 6);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#3a9ce0';
  ctx.fillRect(0, 0, W, H);
  drawGround();
  const R = Math.hypot(W, H / cam.k) / cam.s / 2 + 3;
  const objs: Obj[] = statics.filter((o) => Math.abs(o.x - cam.x) < R && Math.abs(o.y - cam.y) < R);
  for (const c of cars) objs.push({ x: c.x + 0.5, y: c.y + 0.5, draw: () => drawCar(c) });
  objs.sort((p, q) => depth(p.x, p.y) - depth(q.x, q.y));
  // aracın önünü kapatan binalar yarı saydam çizilir
  const pd = depth(player.x + 0.5, player.y + 0.5),
    px = proj(player.x + 0.5, player.y + 0.5, 0)[0];
  for (const o of objs) {
    const dd = depth(o.x, o.y) - pd,
      hide = dd > 0.2 && dd < 3.2 && Math.abs(proj(o.x, o.y, 0)[0] - px) < cam.s * 0.95;
    ctx.globalAlpha = hide ? 0.28 : 1;
    o.draw();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

async function boot() {
  const map = await (await fetch(mapUrl)).json();
  rows = (map.satirlar as string[]).slice(Y0, Y0 + CH).map((r) => r.slice(X0, X0 + CW));
  buildScene();
  player = spawn('#ffc20e', '#ffd95a', true);
  const NPC: [string, string][] = [
    ['#ffc20e', '#ffd95a'],
    ['#3b4a8f', '#5263ad'],
    ['#f2f2f2', '#ffffff'],
    ['#c9453a', '#de6a5f'],
  ];
  for (let i = 0; i < 16; i++) spawn(...NPC[i % NPC.length]);
  cam.x = player.x + 0.5;
  cam.y = player.y + 0.5;
  cam.a = angOf(player.dir) + cam.yaw;
  (window as any).__iso = { cam, player, cars };
  requestAnimationFrame(frame);
}
boot();
