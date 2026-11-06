/* ================= KARİYER: kalıcı kasa, araçlar, plaka, kredi, döviz, giriş serisi =================
   Bütün sayılar data/ekonomi.json’dan (ECO). Ekrandan bağımsız; kayıt/yükleme ui tarafında.
   Zaman: gerçek saat (ms). Oyuncunun araçları başkasının vardiyasında çalışır, en fazla
   ECO.tempo.cevrimdisiBirikimSaat kadar birikir; “kasayı topla” ile tahsil edilir. */
import { ECO } from './content';
import { clamp } from './util';

export type CarTier = 'eski' | 'yeni';
export interface Career {
  v: 1;
  kasa: number;
  dolar: number;
  /** oynanan vardiya sayısı */
  vardiya: number;
  /** takvim günü (0 = ilk Pazartesi); iki vardiyada bir ilerler */
  gun: number;
  cirakKalan: number;
  araclar: { tip: CarTier }[];
  plakaPay: number;
  borc: number;
  /** gerçek gün başına kredi taksiti */
  taksit: number;
  sonTahsil: number;
  seri: number;
  sonGiris: string;
  kur: number;
  /** oyuncunun taksi durağı (bölge adı) */
  durak: string;
  /** son vardiyanın dökümü (gün sonu ekranı için) */
  son?: ShiftResult;
}
export interface ShiftResult {
  brut: number;
  ucret: number;
  net: number;
  ceza: number;
  neden: string;
}

const day = (ms: number) => {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

export function newCareer(now: number): Career {
  return {
    v: 1,
    kasa: 0,
    dolar: 0,
    vardiya: 0,
    gun: 0,
    cirakKalan: ECO.taksi.cirakIndirimi.gun * 2,
    araclar: [],
    plakaPay: 0,
    borc: 0,
    taksit: 0,
    sonTahsil: now,
    seri: 0,
    sonGiris: '',
    kur: ECO.doviz.kurBaslangic,
    durak: '',
  };
}

/* ---- takvim ---- */
export const weekday = (c: Career) => ECO.hafta.gunler[c.gun % 7] as string;
export const isBusyDay = (c: Career) => ECO.hafta.yogunGunler.includes(weekday(c));

/* ---- statü ---- */
export function status(c: Career): string {
  if (c.plakaPay >= 5) return 'aga';
  if (c.plakaPay >= 1) return 'plakaSahibi';
  if (c.plakaPay > 0) return 'ortak';
  if (c.araclar.length) return 'aracSahibi';
  return c.cirakKalan > 0 ? 'cirak' : 'sofor';
}
/** kiralık plaka sınırı + tam plakalar kadar araç çalıştırılabilir */
export const carSlots = (c: Career) => ECO.filo.kiralikPlakaLimiti + Math.floor(c.plakaPay);

/* ---- vardiya ---- */
/** oyuncu kendi aracını sürüyorsa en iyi aracı; yoksa patronun aracı */
export const drivesOwnCar = (c: Career) => c.araclar.length > 0;
export const playerCarOld = (c: Career) => drivesOwnCar(c) && !c.araclar.some((a) => a.tip === 'yeni');
/** vardiya başında ödenecek ücret (patron payı ya da plaka kirası + bakım) */
export function shiftFee(c: Career): number {
  const F = ECO.filo;
  if (drivesOwnCar(c)) return (c.plakaPay >= 1 ? 0 : F.plakaKiraVardiya) + F.aracBakimVardiya;
  return c.cirakKalan > 0 ? ECO.taksi.cirakIndirimi.ucret : ECO.taksi.vardiyaUcreti;
}
/** vardiya sırasındaki oyun çarpanları */
export function shiftMods(c: Career) {
  const V = ECO.vardiya,
    busy = isBusyDay(c);
  return {
    fareMul: V.ucretCarpani * (busy ? V.yogunUcretCarpani : 1),
    demandMul: busy ? V.yogunTalepCarpani : 1,
    complaintMul: playerCarOld(c) ? ECO.araclar.eskiAracSikayetCarpani : 1,
  };
}
/** vardiya sonu: kazancı kasaya işle, takvimi ve kuru ilerlet */
export function endShift(c: Career, earned: number, why: string): ShiftResult {
  const ucret = shiftFee(c),
    K = ECO.kariyer;
  let brut = earned,
    ceza = 0;
  if (why === 'hapis') {
    brut = 0;
    ceza = K.hapisCezasi;
  } else if (why === 'ruhsat') {
    brut = 0;
    ceza = K.ruhsatCezasi;
  }
  const net = brut - ucret - ceza;
  c.kasa += net;
  if (c.cirakKalan > 0 && !drivesOwnCar(c)) c.cirakKalan--;
  c.vardiya++;
  if (c.vardiya % 2 === 0) {
    c.gun++;
    const D = ECO.doviz;
    c.kur = clamp(c.kur * (1 + (Math.random() * 2 - 1) * D.gunlukOynama), D.kurAlt, D.kurUst);
  }
  c.son = { brut, ucret, net, ceza, neden: why };
  return c.son;
}

/* ---- çevrimdışı birikim ---- */
export function accrued(c: Career, now: number) {
  const T = ECO.tempo,
    F = ECO.filo,
    X = ECO.taksi;
  const ms = clamp(now - c.sonTahsil, 0, T.cevrimdisiBirikimSaat * 3600e3);
  const vardiya = ms / (T.vardiyaDakika * 60e3);
  const tam = Math.floor(c.plakaPay);
  let gelir = 0;
  c.araclar.forEach((_, i) => {
    gelir += vardiya * (X.vardiyaUcreti - (i < tam ? 0 : F.plakaKiraVardiya) - F.aracBakimVardiya);
  });
  // araçta kullanılmayan plaka payı piyasaya kiralanır
  gelir += Math.max(0, c.plakaPay - Math.min(tam, c.araclar.length)) * vardiya * F.plakaKiraVardiya;
  const taksit = Math.min(c.borc, c.taksit * (ms / 86400e3));
  return {
    gelir: Math.floor(gelir),
    taksit: Math.ceil(taksit),
    saat: ms / 3600e3,
    dolu: ms >= T.cevrimdisiBirikimSaat * 3600e3,
  };
}
export function collect(c: Career, now: number) {
  const a = accrued(c, now);
  c.kasa += a.gelir - a.taksit;
  c.borc = Math.max(0, c.borc - a.taksit);
  c.sonTahsil = now;
  return a;
}

/* ---- günlük giriş ödülü ---- */
export function dailyReward(c: Career, now: number) {
  const today = day(now);
  if (c.sonGiris === today) return null;
  const yesterday = day(now - 86400e3);
  const seri = c.sonGiris === yesterday ? c.seri + 1 : 1;
  const L = ECO.gelir.gunlukGiris;
  return { seri, odul: L[(seri - 1) % L.length] + (c.sonGiris === '' ? ECO.gelir.ilkGunBonus : 0), today };
}
export function claimDaily(c: Career, now: number) {
  const r = dailyReward(c, now);
  if (!r) return null;
  c.seri = r.seri;
  c.sonGiris = r.today;
  c.kasa += r.odul;
  return r;
}

/* ---- satın almalar ---- */
export const carPrice = (tip: CarTier) => (tip === 'yeni' ? ECO.filo.yeniTaksi : ECO.filo.eskiTaksi);
export const sharePrice = () => ECO.taksi.plakaSatis / 8;
export function canBuyCar(c: Career, tip: CarTier) {
  return c.araclar.length < carSlots(c) && c.kasa >= carPrice(tip);
}
export function buyCar(c: Career, tip: CarTier) {
  if (!canBuyCar(c, tip)) return false;
  c.kasa -= carPrice(tip);
  c.araclar.push({ tip });
  return true;
}
export const canBuyShare = (c: Career) => c.borc <= 0 && c.kasa >= sharePrice();
export function buyShare(c: Career) {
  if (!canBuyShare(c)) return false;
  c.kasa -= sharePrice();
  c.plakaPay = Math.round((c.plakaPay + 1 / 8) * 1000) / 1000;
  return true;
}
/** kredili plaka: elde peşinat (hisseler dahil) varsa eksik kısmı krediyle tamamla */
export function creditInfo(c: Career) {
  const K = ECO.kredi,
    P = ECO.taksi.plakaSatis,
    frac = c.plakaPay - Math.floor(c.plakaPay),
    eksik = (1 - frac) * P,
    pesinat = Math.max(0, K.pesinat * P - frac * P),
    ok = c.borc <= 0 && c.kasa >= pesinat;
  const pes = Math.min(c.kasa, eksik),
    borc = (eksik - pes) * (1 + K.toplamFaiz);
  return { ok, pesinat, eksik, pes, borc, taksit: borc / K.vadeGun, vade: K.vadeGun };
}
export function buyPlateWithCredit(c: Career) {
  const k = creditInfo(c);
  if (!k.ok) return false;
  c.kasa -= k.pes;
  c.borc = k.borc;
  c.taksit = k.taksit;
  c.plakaPay = Math.floor(c.plakaPay) + 1;
  return true;
}

/* ---- döviz bürosu ---- */
export function fx(c: Career) {
  const m = ECO.doviz.makas / 2;
  return { alis: c.kur * (1 + m), satis: c.kur * (1 - m) }; // dolar alırken / satarken TL kuru
}
export function buyDollars(c: Career, usd: number) {
  const tl = Math.ceil(usd * fx(c).alis);
  if (c.kasa < tl) return false;
  c.kasa -= tl;
  c.dolar += usd;
  return true;
}
export function sellDollars(c: Career, usd: number) {
  if (c.dolar < usd) return false;
  c.dolar -= usd;
  c.kasa += Math.floor(usd * fx(c).satis);
  return true;
}
