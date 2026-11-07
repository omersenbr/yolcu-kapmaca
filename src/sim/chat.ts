/* ================= YOLCUYLA SERBEST SOHBET: oyuncunun cümlesine yolcunun profiline göre cevap =================
   Metinler data/dialoglar.json → sohbet, sınırlar data/ekonomi.json → sohbet. Hiçbir cümle cevapsız kalmaz:
   konu bulunamazsa “dolgu” cevabı gelir. Ekrandan bağımsız (tools/nlu-check.ts ile Node’da denenir). */
import { DLG, ECO } from './content';
import { rnd } from './util';
import { keywordHits, profanity } from './nlu';
import type { Pax } from './types';

export interface ChatReply {
  /** {ab}, {hedef}, {takim} gibi değişkenli metin */
  text: string;
  /** bu cümlenin yolcunun yıldızına etkisi (sınırlar uygulanmış) */
  puan: number;
  /** konu kimliği: selam, futbol, taraftar-ayni, dolgu... */
  konu: string;
  kufur: 'agir' | 'hafif' | null;
  vars: Record<string, string>;
}

const S = () => DLG.sohbet;
/** profile özel cevap varsa onu, yoksa genel */
const pick = (byProf: Record<string, string[]>, prof: string) => rnd(byProf[prof] || byProf.genel);
const FANS = ['gs', 'fb', 'bjk', 'bsk'];

/** cümlede geçen takım (yoksa null) */
export function teamIn(input: string): string | null {
  let best: string | null = null,
    n = 0;
  for (const [id, kws] of Object.entries(S().takimlar as Record<string, string[]>)) {
    const h = keywordHits(input, kws);
    if (h > n) ((n = h), (best = id));
  }
  return best;
}

/** yolcu cümleye cevap verir; p.sohbet içinde konular ve toplam puan tutulur */
export function chatReply(input: string, p: Pax): ChatReply {
  const prof = p.look.prof || 'genel',
    E = ECO.sohbet,
    st = (p.sohbet = p.sohbet || { konular: [], puan: 0 });
  const out = (text: string, konu: string, puan: number, kufur: ChatReply['kufur'] = null, vars = {}): ChatReply => {
    // aynı konudan ikinci kez olumlu puan yok; toplam etki [puanAlt, puanUst] arasında
    if (puan > 0 && st.konular.includes(konu)) puan = 0;
    const yeni = Math.max(E.puanAlt, Math.min(E.puanUst, st.puan + puan));
    puan = yeni - st.puan;
    st.puan = yeni;
    if (!st.konular.includes(konu)) st.konular.push(konu);
    return { text, konu, puan, kufur, vars };
  };
  const k = profanity(input);
  if (k) return out(pick(S().kufur[k], prof), 'kufur-' + k, k === 'agir' ? E.puanAlt : -0.5, k);
  // taraftar yolcu: takım adı geçerse atışma
  const team = teamIn(input);
  if (team && (FANS.includes(prof) || prof === 'milli')) {
    const F = S().taraftar,
      takim = S().takimAdlari[team];
    if (prof === 'milli') return out(rnd(F.milli), 'taraftar', 0.2, null, { takim });
    return team === prof
      ? out(rnd(F.ayni), 'taraftar', F.puanAyni, null, { takim })
      : out(rnd(F.rakip), 'taraftar-rakip', F.puanRakip, null, { takim });
  }
  // konu: en çok anahtar kelimesi geçen
  let best = null,
    n = 0;
  for (const c of S().konular) {
    const h = keywordHits(input, c.anahtar);
    if (h > n) ((n = h), (best = c));
  }
  if (best) return out(pick(best.cevap, prof), best.id, best.puan, null, { takim: S().takimAdlari[prof] || '' });
  return out(pick(S().dolgu, prof), 'dolgu', 0);
}

/** sohbet açılışı */
export const chatOpening = (p: Pax) => pick(S().acilis, p.look.prof || 'genel');
