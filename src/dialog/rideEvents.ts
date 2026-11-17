/* ================= YOLCULUK İÇİ OLAYLAR (kariyer): yolcuyla küçük bir seçim kartı =================
   Olaylar data/dialoglar.json → yolculukOlaylari. Seçim bahşişi ve yolcunun vereceği yıldızı etkiler. */
import { DLG } from '../sim/content';
import { G } from '../sim/state';
import { T, rnd } from '../sim/util';
import { LOOK } from '../sim/passengers';
import type { Pax } from '../sim/types';
import { ask, closePanel, openPanel, say, setCast } from './comic';
import { baseVars } from './engine';
import { face } from './portraits';

export async function rideEvent(p: Pax) {
  const list = DLG.yolculukOlaylari.filter((o) => o.rol === 'any' || o.rol === G.role);
  const o = rnd(list),
    v = baseVars(p),
    me = G.role === 'tag' ? LOOK.tag : LOOK.taxi1,
    L = p.look;
  openPanel('pax', DLG.kariyer.olayBaslik, [
    { svg: face(me, 'neutral'), name: 'Sen' },
    { svg: face(L, 'neutral'), name: L.name },
  ]);
  // turist kırık Türkçe-İngilizce konuşur (olayın turist sürümü)
  const tr = L.tourist && (o as any).turist ? (o as any).turist : null;
  const ch = await ask(
    L.name,
    T(tr ? tr.soru : o.soru, v),
    o.secenekler.map((x) => ({ t: T(x.t, v), x })),
  );
  const xi = ch.x ? o.secenekler.indexOf(ch.x) : o.secenekler.length - 1,
    x = o.secenekler[xi];
  p.puanEk = (p.puanEk || 0) + x.puan;
  if (x.bahsis) G.money += x.bahsis;
  setCast([
    { svg: face(me, x.puan >= 0 ? 'smile' : 'nervous'), name: 'Sen' },
    { svg: face(L, x.puan >= 0 ? 'smile' : 'angry'), name: L.name },
  ]);
  await say(L.name, T(tr ? tr.cevap[xi] : x.cevap, v) + (x.bahsis ? ' ' + T(DLG.kariyer.olayBahsis, { bahsis: x.bahsis }) : ''));
  closePanel();
}
