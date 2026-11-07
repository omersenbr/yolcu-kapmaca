/* ================= KARİYER YOLCULUK HAYATI: sayaçlar, yıldız puanı, kombo, müdavimler, yolculuk içi olay =================
   Yalnızca kariyer vardiyasında çalışır (G.career). Hızlı günde hiçbir işlev rastgele sayı çekmez,
   böylece prototiple eşitlik bozulmaz. Sayılar ECO (data/ekonomi.json), metinler DLG (data/dialoglar.json). */
import { DLG, ECO } from './content';
import { bus } from './bus';
import { DAY, DF, G, TL } from './state';
import { T, rnd } from './util';
import { STREETS, district, zoneAt } from './grid';
import type { Pax } from './types';

/** vardiya boyunca toplanan sayaçlar (günlük görevler ve gün sonu dökümü için) */
export interface ShiftStats {
  teslim: number;
  temiz: number;
  turist: number;
  kopru: number;
  havalimani: number;
  kombo: number;
  besYildiz: number;
  puanlar: number[];
  mudavim: Record<string, number>;
}
export const newStats = (): ShiftStats => ({
  teslim: 0,
  temiz: 0,
  turist: 0,
  kopru: 0,
  havalimani: 0,
  kombo: 0,
  besYildiz: 0,
  puanlar: [],
  mudavim: {},
});

/** yolcu bindi (kariyer): nereden bindiğini işaretle, müdavimse selam ver */
export function rideStart(p: Pax) {
  if (!G.career) return;
  const z = zoneAt(p.x, p.y);
  p.fromHub = !!(z && z.w >= 2);
  if (p.mudavim) {
    const rel = relation(p.mudavim),
      m = mudavimDef(p.mudavim);
    const soz = rel >= 3 ? m.soz.iyi : rel <= -2 ? m.soz.kotu : m.soz.orta;
    bus.toast(T(DLG.kariyer.mudavimDondu, { ad: m.ad, soz }));
  }
}

/** teslim (kariyer): sayaç, yıldız, kombo, müdavim bahşişi. earned: bu yolculuktan kasaya giren TL */
export function rideDone(p: Pax, earned: number, sikayet: boolean) {
  if (!G.career || !G.stats) return;
  const S = G.stats as ShiftStats,
    D = DLG.kariyer;
  S.teslim++;
  if (!sikayet) S.temiz++;
  if (p.look.tourist) S.turist++;
  if (p.cross) S.kopru++;
  if (p.fromHub) S.havalimani++;
  // yıldız
  const y = rating(p, sikayet);
  S.puanlar.push(y);
  if (y >= 5) S.besYildiz++;
  setTimeout(() => bus.toast(T(D.puanToast, { yolcu: p.look.name, yildiz: '★'.repeat(y) + '☆'.repeat(5 - y) })), 1400);
  // kombo: şikayetsiz ve kısa aralıklı teslimatlar
  const K = ECO.kombo,
    win = (DAY / (G.span || 24)) * K.pencereSaat;
  if (sikayet) {
    if (G.combo > 1) bus.toast(D.komboBitti, true);
    G.combo = 0;
  } else {
    G.combo = G.lastDel !== undefined && G.clock - G.lastDel <= win ? (G.combo || 0) + 1 : 1;
    if (G.combo > S.kombo) S.kombo = G.combo;
    if (G.combo >= 2 && earned > 0) {
      const kat = Math.min(K.azami, K.adim * (G.combo - 1)),
        ek = Math.round(earned * kat);
      G.money += ek;
      setTimeout(() => bus.toast(T(D.komboToast, { kat: (1 + kat).toFixed(1).replace('.', ','), ek })), 900);
    }
  }
  G.lastDel = G.clock;
  // müdavim
  if (p.mudavim) {
    const M = ECO.mudavim,
      m = mudavimDef(p.mudavim);
    S.mudavim[p.mudavim] = (S.mudavim[p.mudavim] || 0) + (sikayet ? -M.sikayetCeza : M.artis);
    const rel = relation(p.mudavim);
    if (!sikayet && rel > 0) {
      const bahsis = rel * M.bahsisBasina;
      G.money += bahsis;
      setTimeout(() => bus.toast(T(D.mudavimBahsis, { ad: m.ad, bahsis })), 2000);
    }
  }
}

/** 1–5 yıldız: Tag’de süre/sabır, takside yol uzatma; şikayet 1; olay kartı etkisi; eski araç cezası */
function rating(p: Pax, sikayet: boolean) {
  if (sikayet) return 1;
  let y: number;
  if (G.role === 'tag') {
    const exp = (((p.m / 4.5) * 1.5 + 6) * DF().patience * TL().pat) / DF().world,
      t = p.rideT || 0;
    y = t < exp * 0.6 ? 5 : t < exp ? 4 : t < exp * 1.5 ? 3 : 2;
  } else if (p.fixed || p.scam) y = 4;
  else {
    const r = (p.driven || 0) / Math.max(1, p.m);
    y = r <= 1.15 ? 5 : r <= 1.35 ? 4 : r <= 1.7 ? 3 : 2;
  }
  y += p.puanEk || 0;
  if (G.mods && G.mods.oldCar) y -= ECO.puan.eskiAracCeza;
  return Math.max(1, Math.min(5, Math.round(y)));
}

/* ---- müdavimler ---- */
export const mudavimDef = (id: string) => DLG.mudavimler.find((m) => m.id === id);
/** vardiya başındaki ilişki + bu vardiyadaki değişim */
export const relation = (id: string) =>
  ((G.mudavimRel && G.mudavimRel[id]) || 0) + ((G.stats && (G.stats as ShiftStats).mudavim[id]) || 0);
const semtPool: Record<string, number[][]> = {};
/** yolcu doğarken (kariyer): ara sıra aktif olmayan bir müdavimi kendi semtinde çıkar */
export function maybeSpawnMudavim(): Pax | null {
  if (!G.career || Math.random() >= ECO.mudavim.ihtimal) return null;
  const free = DLG.mudavimler.filter(
    (m) => !G.pax.some((p) => p.mudavim === m.id) && relation(m.id) > ECO.mudavim.alt + 1,
  );
  if (!free.length) return null;
  const m = rnd(free);
  const pool = (semtPool[m.semt] ||= STREETS.filter((s) => district(s[0], s[1]) === m.semt && !zoneAt(s[0], s[1])));
  if (!pool.length) return null;
  const t = rnd(pool);
  if (G.pax.some((p) => p.x === t[0] && p.y === t[1])) return null;
  const tourist = m.prof === 'turist';
  return {
    x: t[0],
    y: t[1],
    state: 'wait',
    claim: null,
    ph: Math.random() * 6,
    mudavim: m.id,
    look: {
      name: m.ad,
      fem: m.fem,
      prof: m.prof,
      pidx: m.pidx,
      tourist,
      rec: false,
      skin: '#e0ac7e',
      hair: 'short',
      hc: '#3b2a1e',
      shirt: '#4f5bd5',
    },
  };
}

/** yolculuk sırasında bir kez olay kartı açılsın mı (kariyer) */
export function maybeRideEvent(p: Pax): boolean {
  if (!G.career || p.olayBakildi || (p.driven || 0) < ECO.olay.mesafe) return false;
  p.olayBakildi = true;
  return Math.random() < ECO.olay.ihtimal;
}
