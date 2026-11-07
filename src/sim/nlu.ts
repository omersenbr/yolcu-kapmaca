/* ================= SERBEST KONUŞMA: oyuncunun cümlesini en yakın cevap seçeneğine eşle =================
   Ücretli yapay zekâ yok: Türkçe sadeleştirme (küçük harf, ek budama), seçenek metninden çıkan anahtar
   kelimeler + data/dialoglar.json → serbestSohbet (eş anlamlı gruplar, dolgu kelimeleri, küfür listesi).
   Ekrandan bağımsız; tools/nlu-check.ts ile Node’da test edilir. */
import { DLG } from './content';

/** Türkçe küçük harf + noktalama temizliği */
export function normalize(s: string) {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[’'`´]/g, '')
    .replace(/[^a-zçğıöşü0-9\s]/g, ' ')
    .replace(/(.)\1{2,}/g, '$1') // “abiiii” → “abi”
    .replace(/\s+/g, ' ')
    .trim();
}

// en uzundan kısaya: önce uzun ekler denenir
const SUFFIXES = [
  'larımız',
  'lerimiz',
  'larınız',
  'leriniz',
  'ımızdan',
  'imizden',
  'umuzdan',
  'ümüzden',
  'lardan',
  'lerden',
  'ların',
  'lerin',
  'ları',
  'leri',
  'lar',
  'ler',
  'ımız',
  'imiz',
  'umuz',
  'ümüz',
  'ınız',
  'iniz',
  'unuz',
  'ünüz',
  'yorum',
  'iyorum',
  'ıyorum',
  'uyorum',
  'üyorum',
  'yoruz',
  'yor',
  'mıştım',
  'miştim',
  'mıştı',
  'mişti',
  'mış',
  'miş',
  'muş',
  'müş',
  'dım',
  'dim',
  'dum',
  'düm',
  'tım',
  'tim',
  'tum',
  'tüm',
  'dı',
  'di',
  'du',
  'dü',
  'tı',
  'ti',
  'tu',
  'tü',
  'dır',
  'dir',
  'dur',
  'dür',
  'tır',
  'tir',
  'tur',
  'tür',
  'dan',
  'den',
  'tan',
  'ten',
  'nın',
  'nin',
  'nun',
  'nün',
  'ın',
  'in',
  'un',
  'ün',
  'da',
  'de',
  'ta',
  'te',
  'ya',
  'ye',
  'yı',
  'yi',
  'yu',
  'yü',
  'ım',
  'im',
  'um',
  'üm',
  'sı',
  'si',
  'su',
  'sü',
  'ı',
  'i',
  'u',
  'ü',
  'm',
  'a',
  'e',
];
/** kaba kök: ekleri budar, en az 3 harf bırakır */
export function stem(w: string) {
  let s = w;
  for (let pass = 0; pass < 3; pass++) {
    const suf = SUFFIXES.find((x) => s.length - x.length >= 3 && s.endsWith(x));
    if (!suf) break;
    s = s.slice(0, -suf.length);
  }
  return s;
}

const S = () => DLG.serbestSohbet;
const stopSet = () => new Set<string>(S().dolgu.map((w: string) => normalize(w)));
/** cümle → kökler (dolgu kelimeleri atılır) */
export function stems(s: string): string[] {
  const stop = stopSet();
  return normalize(s)
    .split(' ')
    .filter((w) => w.length > 1 && !stop.has(w))
    .map(stem);
}
const similar = (a: string, b: string) =>
  a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));

/** eş anlamlı gruplar: bir kök hangi grup köklerine de denk gelir */
function synonymsOf(st: string): string[] {
  const out = [st];
  for (const g of S().esAnlamli as string[][]) {
    const gs = g.map((w) => stem(normalize(w)));
    if (gs.some((x) => similar(x, st))) out.push(...gs);
  }
  return out;
}

export interface Match<T> {
  option: T | null;
  score: number;
}
/** en yakın seçenek; eşik altında kalırsa option = null (anlaşılmadı) */
export function bestOption<T extends { t?: string; anahtar?: string[] }>(input: string, options: T[]): Match<T> {
  const said = stems(input);
  if (!said.length) return { option: null, score: 0 };
  let best: T | null = null,
    bestScore = 0;
  for (const o of options) {
    const kws = [...new Set([...stems(o.t || ''), ...(o.anahtar || []).flatMap((a) => stems(a))])];
    if (!kws.length) continue;
    let hit = 0;
    for (const k of kws) if (synonymsOf(k).some((syn) => said.some((w) => similar(w, syn)))) hit++;
    if (!hit) continue;
    // isabet oranı, kısa ve tam eşleşmeyi öne çıkarır; söylenenin seçeneği ne kadar kapsadığı da sayılır
    const score = hit / Math.sqrt(kws.length) + (hit / said.length) * 0.25;
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return bestScore >= S().esik ? { option: best, score: bestScore } : { option: null, score: bestScore };
}

/** küfür denetimi: 'agir' | 'hafif' | null */
export function profanity(input: string): 'agir' | 'hafif' | null {
  const words = normalize(input).split(' ');
  const joined = ' ' + words.join(' ') + ' ';
  const hit = (list: string[]) =>
    list.some((k) => {
      const n = normalize(k);
      // kelime başında eşleşme: “salakça”, “ulan” ama “salam” değil
      return n.includes(' ')
        ? joined.includes(' ' + n)
        : words.some((w) => w === n || (n.length >= 4 && w.startsWith(n)));
    });
  if (hit(S().kufur.agir)) return 'agir';
  if (hit(S().kufur.hafif)) return 'hafif';
  return null;
}

/** kaç anahtar kelime geçiyor (eş anlamlılar toplamda en fazla yarım puan): çok kelimeli anahtarın bütün kelimeleri geçmeli (ör. “kaç para”) */
export function keywordHits(input: string, keywords: string[]): number {
  const said = stems(input);
  if (!said.length) return 0;
  let n = 0,
    syn = 0;
  for (const k of keywords) {
    const ks = normalize(k)
      .split(' ')
      .filter((w) => w.length > 1)
      .map(stem);
    if (!ks.length) continue;
    if (ks.every((kw) => said.some((w) => similar(w, kw)))) n++;
    else if (ks.every((kw) => synonymsOf(kw).some((sy) => said.some((w) => similar(w, sy))))) syn++;
  }
  // doğrudan geçen her kelime 1; eş anlamlılar hepsi birden en fazla 0,5
  return n + (syn ? 0.5 : 0);
}
