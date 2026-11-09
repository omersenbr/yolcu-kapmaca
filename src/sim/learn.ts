/* ================= ÖĞRETİLEBİLİR SOHBET: oyuncunun öğrettiği soru-cevaplar =================
   Öğretme modunda yolcu bilmediği cümleyi sorar, oyuncu cevabı söyler; kayıt yerelde (yk-ogrenilen) tutulur.
   Dışa aktarılanlar data/dialoglar.json → sohbet.ogrenilen içine eklenir ve bütün oyunculara gider.
   Eşleme: cümle benzerliği (src/sim/nlu.ts → sentenceSim), eşik data/ekonomi.json → sohbet.ogrenmeEsik. */
import { DLG, ECO } from './content';
import { load, save } from './storage';
import { normalize, sentenceSim } from './nlu';
import { rnd } from './util';

export interface Learned {
  /** oyuncunun cümlesi */
  s: string;
  /** yolcunun cevabı */
  c: string;
  /** yolcu tipi; yoksa bütün yolcular */
  p?: string;
}
const KEY = 'yk-ogrenilen';
let mine: Learned[] | null = null;
export function myLearned(): Learned[] {
  if (!mine) {
    try {
      mine = JSON.parse(load(KEY, '[]'));
    } catch (e) {
      mine = [];
    }
    if (!Array.isArray(mine)) mine = [];
  }
  return mine;
}
const store = () => save(KEY, JSON.stringify(myLearned()));

/** öğret: aynı cümle + aynı kapsam + aynı cevap zaten varsa eklenmez */
export function teach(s: string, c: string, p?: string) {
  const L = myLearned(),
    ns = normalize(s),
    nc = normalize(c);
  if (!ns || !nc) return;
  if (L.some((x) => normalize(x.s) === ns && normalize(x.c) === nc && (x.p || '') === (p || ''))) return;
  L.push(p ? { s, c, p } : { s, c });
  store();
}
/** bu cümle (ve kapsam) için öğretilmiş cevapları sil: “bu cevabı değiştir” */
export function forget(s: string, p?: string) {
  const ns = normalize(s);
  mine = myLearned().filter((x) => !(normalize(x.s) === ns && (!x.p || x.p === p)));
  store();
}
export function clearLearned() {
  mine = [];
  store();
}

/** en benzer öğretilmiş cevap: kendi öğrettiklerin oyunla gelenlerin önünde, tipe özel olan genelin önünde */
export function recall(input: string, prof: string): Learned | null {
  const esik = ECO.sohbet.ogrenmeEsik;
  let best: Learned[] = [],
    top = 0;
  const scan = (list: Learned[], bonus: number) => {
    for (const x of list) {
      if (x.p && x.p !== prof) continue;
      const sim = sentenceSim(input, x.s);
      if (sim < esik) continue;
      const sc = sim + bonus + (x.p ? 0.05 : 0);
      if (sc > top + 1e-9) ((top = sc), (best = [x]));
      else if (Math.abs(sc - top) < 1e-9) best.push(x);
    }
  };
  scan(myLearned(), 0.02);
  scan((DLG.sohbet.ogrenilen || []) as Learned[], 0);
  return best.length ? rnd(best) : null;
}
