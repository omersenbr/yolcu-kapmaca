// <auto-imports>
import { DLG } from './content';
import { load, save } from './storage';
import type { Game } from './types';
// </auto-imports>
/* ================= OYUN DURUMU ================= */
/* Modüller arası paylaşılan, değişen durum. Okuma doğrudan (canlı bağlantı), yazma setter ile. */
export let G: Game | null = null;
export function setG(g: Game | null) {
  G = g;
}
export const DIFFS = {
  kolay: { label: 'Kolay', day: 600, world: 0.85, chase: 0.92, timer: 10, patience: 1.4, fight: 1.5, radius: 3.0 },
  orta: { label: 'Orta', day: 480, world: 1, chase: 1, timer: 7, patience: 1, fight: 1, radius: 3.6 },
  zor: { label: 'Zor', day: 360, world: 1.08, chase: 1.06, timer: 5, patience: 0.8, fight: 0.7, radius: 4.2 },
};
export let DIFF = load('yk-diff', 'orta');
if (!DIFFS[DIFF]) DIFF = 'orta';
export function setDiff(d) {
  if (!DIFFS[d]) return;
  DIFF = d;
  save('yk-diff', d);
}
export const DF = () => DIFFS[DIFF];
/* ---- Tag seviyesi (kalıcı) ---- */
export let TAGXP = +load('yk-tagxp', 0) || 0;
export function addTagXP() {
  TAGXP++;
  save('yk-tagxp', TAGXP);
}
export function tagLevel(xp?: number) {
  const L = DLG.tagLevels.levels;
  let k = 0;
  for (let i = 0; i < L.length; i++) if ((xp === undefined ? TAGXP : xp) >= L[i].xp) k = i;
  return k;
}
export const TL = () => DLG.tagLevels.levels[tagLevel()];
/* ---- gün saati ve yolcu talebi ---- */
export let DAY = 480;
export const START_H = 5;
export function setDay(d) {
  DAY = d;
}
/** saat: hızlı günde 05:00’ten başlayıp 24 saat; kariyer vardiyasında G.startH’ten G.span saat */
export const hourNow = () => (G ? ((G.startH ?? START_H) + ((DAY - G.time) / DAY) * (G.span ?? 24)) % 24 : START_H);
/** vardiya çarpanları (kariyer); hızlı günde hepsi 1 */
const NO_MODS = { fareMul: 1, demandMul: 1, complaintMul: 1 };
export const mods = (): typeof NO_MODS => (G && G.mods) || NO_MODS;
export function demand() {
  const d = demand0(),
    k = mods().demandMul;
  if (k !== 1) {
    d.max = Math.round(d.max * k);
    d.every /= k;
  }
  return d;
}
function demand0() {
  const h = hourNow();
  if ((h >= 6 && h < 10) || (h >= 15 && h < 20))
    return { max: 480, every: 0.015, tag: 'yoğun', rush: h < 12 ? 'am' : 'pm' };
  if (h < 6) return { max: 160, every: 0.06, tag: 'gece', rush: null };
  return { max: 280, every: 0.03, tag: '', rush: null };
}
/* ---- garaj (kozmetik) ---- */
export let ORN = load('yk-orn', 'none');
export let WPN = load('yk-wpn', 'none');
export function setOrn(id) {
  ORN = id;
  save('yk-orn', id);
}
export function setWpn(id) {
  WPN = id;
  save('yk-wpn', id);
}
export const weapon = () => DLG.shop.weapons.find((w) => w.id === WPN) || DLG.shop.weapons[0];
/* ---- kullanıcı adı ---- */
export let UNAME = load('yk-name', '');
export function setUname(v) {
  UNAME = v;
  save('yk-name', v);
}
