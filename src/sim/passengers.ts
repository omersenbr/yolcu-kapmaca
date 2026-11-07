// <auto-imports>
import { MANIFEST } from './content';
import { G, demand, mods } from './state';
import { rnd } from './util';
import { ASIA, DIRS, KIYI, MERKEZ, STREETS, TARIHI, WORK, ZONES, district, tch, zoneAt } from './grid';
import { randNear } from './pathfinding';
import type { Pax } from './types';
import { maybeSpawnMudavim } from './ridelife';
// </auto-imports>
/* ================= YOLCULAR: görünüş, profil, doğma, hedef ================= */
export const SKINS = ['#f1c9a5', '#e0ac7e', '#c68a5a', '#8d5a3b', '#f6d6bd'];
export const HAIRC = ['#1c1a17', '#3b2a1e', '#6b4428', '#a8743f', '#d8d2c8', '#b23a26'];
export const SHIRTS = [
  '#e4572e',
  '#2e86ab',
  '#7b2cbf',
  '#2a9d8f',
  '#f4a261',
  '#e63946',
  '#3d405b',
  '#ff8fab',
  '#ffd166',
];
export const SCARFS = ['#8e2c48', '#2d6a4f', '#5e60ce', '#c77d4b', '#264653', '#b5838d'];
export const FN = ['Ayşe', 'Zeynep', 'Elif', 'Fatma', 'Selin', 'Hatice', 'Merve', 'Derya'],
  MN = ['Mehmet', 'Ahmet', 'Can', 'Emre', 'Mustafa', 'Burak', 'Kemal', 'Oğuz'];
export const TNF = ['Emma', 'Yuki', 'Maria', 'Olga', 'Fatima', 'Sofia', 'Anna', 'Leila'],
  TNM = ['John', 'Hans', 'Ahmed', 'Lucas', 'Chen', 'Pierre', 'Mohammed', 'Kenji'];
export const TOURDIST = ['Sultanahmet', 'Eminönü', 'Taksim', 'Karaköy'];
export function mkTourist() {
  const fem = Math.random() < 0.5,
    hair = fem ? rnd(['long', 'bun', 'long']) : rnd(['short', 'bald', 'short']);
  return {
    skin: rnd(SKINS),
    hair,
    hc: rnd(HAIRC),
    shirt: rnd(['#ff6b6b', '#4dabf7', '#ffd43b', '#69db7c', '#f783ac', '#ffa94d']),
    hat: 'sunhat',
    cam: true,
    fem,
    tourist: true,
    vlog: Math.random() < 0.25,
    rec: false,
    name: rnd(fem ? TNF : TNM),
  };
}
export function mkLook() {
  if (G && G.role === 'tag' && Math.random() < 0.12)
    return {
      skin: rnd(SKINS),
      hair: 'cap',
      hc: '#6b6257',
      hat: 'kasket',
      stache: true,
      shirt: rnd(['#efe3c2', '#6d597a', '#3a5a40']),
      fem: false,
      rec: false,
      sting: true,
      name: rnd(MN),
    };
  const hair = rnd(['short', 'short', 'long', 'long', 'scarf', 'bun', 'bald', 'cap']);
  const fem = ['long', 'scarf', 'bun'].includes(hair);
  return {
    skin: rnd(SKINS),
    hair,
    hc: hair === 'scarf' ? rnd(SCARFS) : rnd(HAIRC),
    shirt: rnd(SHIRTS),
    fem,
    rec: Math.random() < 0.28,
    name: rnd(fem ? FN : MN),
  };
}
/* sabit karakter görünüşleri (art: characters/ altındaki çizim seti) */
export const LOOK = {
  taxi1: {
    art: 'taksici',
    skin: '#d9a27a',
    hair: 'short',
    hc: '#2a211b',
    shirt: '#efe3c2',
    hat: 'kasket',
    stache: true,
  },
  taxi2: { art: 'durakci', skin: '#c68a5a', hair: 'short', hc: '#8c8c8c', shirt: '#6d597a', stache: true },
  police: { art: 'polis', skin: '#e0ac7e', hair: 'short', hc: '#222', shirt: '#1d3557', hat: 'police' },
  tag: { art: 'tag', skin: '#f1c9a5', hair: 'cap', hc: '#4f5bd5', shirt: '#2b2d42' },
  tagNpc: { art: 'tag', skin: '#e0ac7e', hair: 'cap', hc: '#2b2d42', shirt: '#4f5bd5' },
  taxi3: { skin: '#f1c9a5', hair: 'bald', hc: '#5a4636', shirt: '#3a5a40', stache: true },
  komsu: { skin: '#e0ac7e', hair: 'bald', hc: '#cfcfcf', shirt: '#6c757d', stache: true },
};
export const VENUE_FANS = {
  'Rams Park': 'gs',
  'Şükrü Saracoğlu Stadyumu': 'fb',
  'Tüpraş Stadyumu': 'bjk',
  'Başakşehir Fatih Terim Stadyumu': 'bsk',
  'Atatürk Olimpiyat Stadı': 'milli',
};
export const PLAZA_D = ['Levent', 'Şişli', 'Ataşehir', 'Beşiktaş', 'Kağıthane', 'Taksim'];
export const UNIS = [
  [126, 90],
  [118, 56],
  [110, 166],
  [152, 170],
  [100, 140],
];
export const nearUni = (x, y) => UNIS.some((u) => Math.abs(u[0] - x) + Math.abs(u[1] - y) <= 12);
export const nearBogaz = (x, y) =>
  ((x >= 116 && x <= 130) || (x >= 141 && x <= 156)) && y < 150 && KIYI.includes(district(x, y));
/* yolcu profili cinsiyet tablosu: assets/manifest.json → passengers.genders */
export const PGEN = () => MANIFEST.passengers.genders;
export const TOUR_IDX = [0, 1, 2, 3, 4, 5, 8, 9, 12, 13, 15];
/* profil seçimi: turist → turist; maç → stadyuma göre; konser; havalimanı/otogar; kampüs → öğrenci; Boğaz → zengin; plaza; dış semt → kenar */
export function assignProf(p: Pax, ev?: string | null, venue?: string) {
  const L = p.look;
  if (L.sting) return;
  let k;
  if (L.tourist) k = 'turist';
  else if (ev && /Maç|Derbi/.test(ev)) k = VENUE_FANS[venue] || rnd(['gs', 'fb', 'bjk']);
  else if (ev && /Konser/.test(ev)) k = 'konser';
  else if (ev && /Uçak|Otobüs/.test(ev)) k = 'havalimani';
  else {
    const z = zoneAt(p.x, p.y),
      d = district(p.x, p.y);
    if (z && z.w >= 2) k = 'havalimani';
    else if (nearUni(p.x, p.y) && Math.random() < 0.55) k = 'ogrenci';
    else if (nearBogaz(p.x, p.y) && Math.random() < 0.65) k = 'zengin';
    else if (PLAZA_D.includes(d)) k = Math.random() < 0.65 ? 'plaza' : 'kenar';
    else if (TARIHI.includes(d)) k = Math.random() < 0.5 ? 'kenar' : 'plaza';
    else if (MERKEZ.includes(d)) k = Math.random() < 0.5 ? 'plaza' : 'kenar';
    else k = 'kenar';
  }
  const gs = PGEN()[k] || '';
  let pool = [];
  for (let i = 0; i < 16; i++) {
    if (gs[i] === 'c') continue;
    if (k === 'turist' && !TOUR_IDX.includes(i)) continue;
    pool.push(i);
  }
  if (!pool.length) pool = [0];
  const i = rnd(pool),
    fem = gs[i] === 'f';
  L.prof = k;
  L.pidx = i;
  if (L.fem !== fem) {
    L.fem = fem;
    L.name = rnd(L.tourist ? (fem ? TNF : TNM) : fem ? FN : MN);
  }
}
export let _tourPool = null;
export const _zonePools = {};
export function TOUR_POOL() {
  if (!_tourPool)
    _tourPool = STREETS.filter((s) => {
      const z2 = zoneAt(s[0], s[1]);
      return (
        (TOURDIST.includes(district(s[0], s[1])) || (z2 && z2.w === 3)) &&
        !(z2 && z2.homes.some((h) => h[0] === s[0] && h[1] === s[1]))
      );
    });
  return _tourPool;
}
export function ZONE_POOL(z) {
  if (!_zonePools[z.name])
    _zonePools[z.name] = STREETS.filter(
      (s) => zoneAt(s[0], s[1]) === z && !z.homes.some((h) => h[0] === s[0] && h[1] === s[1]),
    );
  return _zonePools[z.name];
}
export function spawnPax() {
  // kariyer: ara sıra bir müdavim kendi semtinde çıkar
  const md = maybeSpawnMudavim();
  if (md) {
    G.pax.push(md);
    return;
  }
  let tc = 0;
  for (const q of G.pax) if (q.look.tourist && q.state === 'wait') tc++;
  const tour = G.role === 'taxi' && Math.random() < 0.1 && tc < 40;
  const inZone = !tour && Math.random() < 0.05,
    z = rnd(ZONES.flatMap((z) => Array(z.w).fill(z)));
  const pool = tour ? TOUR_POOL() : inZone ? ZONE_POOL(z) : STREETS;
  const P = G.player;
  for (let i = 0; i < 20; i++) {
    const t = rnd(pool);
    if (tch(t[0], t[1]) === 'A') continue;
    if (
      Math.random() < 0.95 &&
      DIRS.some((v) => {
        const q = tch(t[0] + v[0], t[1] + v[1]);
        return q === 'A' || q === 'e';
      })
    )
      continue;
    if (P && Math.abs(P.x - t[0]) + Math.abs(P.y - t[1]) < 3) continue;
    if (G.pax.some((p) => p.x === t[0] && p.y === t[1])) continue;
    const np: Pax = {
      x: t[0],
      y: t[1],
      state: 'wait',
      claim: null,
      look: tour ? mkTourist() : mkLook(),
      ph: Math.random() * 6,
    };
    assignProf(np);
    G.pax.push(np);
    return;
  }
}
/** taksimetre: açılış 30 + kare başına 11 + Boğaz geçişi 40; kariyerde vardiya çarpanıyla */
export function taximeter(dist: number, cross: boolean) {
  const base = 30 + 11 * dist + (cross ? 40 : 0),
    k = mods().fareMul;
  return k === 1 ? base : Math.round(base * k);
}
export function pickDest(p, kind) {
  const rush = demand().rush;
  let best = null;
  const Rr = kind === 'short' ? 9 : kind === 'any' ? 40 : 60;
  for (let i = 0; i < 160; i++) {
    const t = kind === 'tour' && i < 60 ? rnd(TOUR_POOL()) : randNear(p.x, p.y, Rr);
    const m = Math.abs(t[0] - p.x) + Math.abs(t[1] - p.y);
    if (tch(t[0], t[1]) === 'K') continue;
    best = t;
    if (rush && i < 100 && Math.random() < 0.7) {
      const isW = WORK.includes(district(t[0], t[1]));
      if (rush === 'am' ? !isW : isW) continue;
    }
    if (kind === 'tour') {
      if (m >= 10) break;
      continue;
    }
    if (kind === 'short' && m >= 3 && m <= 8 && t[0] >= ASIA === p.x >= ASIA) break;
    if (kind === 'long' && m >= 18) break;
    if (kind === 'any' && m >= 10) break;
  }
  p.dx = best[0];
  p.dy = best[1];
  p.m = Math.round((Math.abs(p.dx - p.x) + Math.abs(p.dy - p.y)) * 1.15);
  p.cross = p.x >= ASIA !== p.dx >= ASIA;
  p.fare = taximeter(p.m, p.cross);
  p.dest = district(p.dx, p.dy);
  p.short = p.m <= 10 && !p.cross;
}
