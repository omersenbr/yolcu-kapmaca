/* ================= KARİYER: kalıcı kasa, araçlar, plaka, kredi, döviz, giriş serisi =================
   Bütün sayılar data/ekonomi.json’dan (ECO). Ekrandan bağımsız; kayıt/yükleme ui tarafında.
   Zaman: gerçek saat (ms). Oyuncunun araçları başkasının vardiyasında çalışır, en fazla
   ECO.tempo.cevrimdisiBirikimSaat kadar birikir; “kasayı topla” ile tahsil edilir. */
import { ECO } from './content';
import { clamp } from './util';
import type { ShiftStats } from './ridelife';

export type CarTier = 'eski' | 'yeni';
export type Role = 'taxi' | 'tag';
/** Tag aracı: seviye 0–4 (tag1–tag5); blokaj: bağlanırsa otoparktan çıkacağı zaman (ms) */
export interface TagCar {
  seviye: number;
  blokaj: number;
}
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
  /** plaka piyasa (satış) fiyatı ve son gazete manşeti (olay kimliği) */
  plakaFiyat: number;
  manset: string;
  /** günün havası (ECO.hava.durumlar id) */
  hava: string;
  /** son teslimlerin yıldızları */
  puanlar: number[];
  /** müdavimlerle ilişki */
  mudavim: Record<string, number>;
  /** günlük görevler (gerçek gün) */
  gorevler: { gun: string; liste: { id: string; ilerleme: number; tamam: boolean }[] };
  /** kilometre taşları: kimlik → takvim günü */
  taslar: Record<string, number>;
  /** en iyi vardiya (net) */
  enIyi?: { net: number; rol: Role; gun: number };
  /** Tag garajı; mahalle: ilk Tag vardiyasında seçilen ev karesi */
  tag: { araclar: TagCar[]; mahalle?: [number, number] };
  /** son vardiyanın dökümü (gün sonu ekranı için) */
  son?: ShiftResult;
}
export interface ShiftResult {
  rol: Role;
  brut: number;
  /** taksi: vardiya ücreti / kira; Tag: arkadaş payı + Tag komisyonu */
  ucret: number;
  arkadas: number;
  komisyon: number;
  /** turistlerden alınan dolar */
  dolar: number;
  /** bu vardiyada tamamlanan günlük görevler ve ödülleri */
  gorevOdul?: number;
  gorevler?: string[];
  /** bu vardiyanın yıldız ortalaması */
  puan?: number | null;
  net: number;
  ceza: number;
  neden: string;
}
/** eski kayıtları yeni alanlarla tamamla */
export function migrate(c: Career) {
  if (!c.tag) c.tag = { araclar: [] };
  if (!c.plakaFiyat) c.plakaFiyat = ECO.taksi.plakaSatis;
  if (c.manset === undefined) c.manset = '';
  if (!c.taslar) c.taslar = {};
  if (!c.hava) c.hava = 'acik';
  if (!c.puanlar) c.puanlar = [];
  if (!c.mudavim) c.mudavim = {};
  if (!c.gorevler) c.gorevler = { gun: '', liste: [] };
  return c;
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
    tag: { araclar: [] },
    plakaFiyat: ECO.taksi.plakaSatis,
    manset: '',
    taslar: {},
    hava: 'acik',
    puanlar: [],
    mudavim: {},
    gorevler: { gun: '', liste: [] },
  };
}

/* ---- takvim ---- */
export const weekday = (c: Career) => ECO.hafta.gunler[c.gun % 7] as string;
export const isBusyDay = (c: Career) => ECO.hafta.yogunGunler.includes(weekday(c));

/* ---- statü ---- */
export function tagStatus(c: Career): string {
  const n = c.tag.araclar.length;
  if (n >= ECO.tag.filoLimiti) return 'tagPatron';
  if (n >= 2) return 'tagFilo';
  return n ? 'tagKendi' : 'tagArkadas';
}
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
/** vardiya başında ödenecek ücret (patron payı ya da plaka kirası + bakım); yalnızca taksi */
export function shiftFee(c: Career): number {
  const F = ECO.filo;
  if (drivesOwnCar(c)) return (c.plakaPay >= 1 ? 0 : F.plakaKiraVardiya) + F.aracBakimVardiya;
  return c.cirakKalan > 0 ? ECO.taksi.cirakIndirimi.ucret : ECO.taksi.vardiyaUcreti;
}

/* ---- Tag aracı ---- */
/** oyuncunun süreceği Tag aracı: otoparkta olmayan en yüksek seviyeli kendi aracı; yoksa arkadaşının aracı (-1) */
export function tagCarIndex(c: Career, now: number) {
  let best = -1;
  c.tag.araclar.forEach((a, i) => {
    if (a.blokaj <= now && (best < 0 || a.seviye > c.tag.araclar[best].seviye)) best = i;
  });
  return best;
}
/** sürülen aracın Tag seviyesi (0–4) */
export function tagLevelFor(c: Career, now: number) {
  const i = tagCarIndex(c, now);
  return i < 0 ? ECO.tag.arkadasAracSeviye : c.tag.araclar[i].seviye;
}
const tagSpec = (seviye: number) => ECO.tag.araclar[seviye];

/** günün havası */
export const weather = (c: Career) => ECO.hava.durumlar.find((h) => h.id === c.hava) || ECO.hava.durumlar[0];
/** yolcu puanı ortalaması (yoksa null) */
export const ratingAvg = (c: Career) =>
  c.puanlar.length ? c.puanlar.reduce((a, b) => a + b, 0) / c.puanlar.length : null;
/** puanın ücrete etkisi: ortalama 4’ün üstü/altı */
export function ratingMul(c: Career) {
  const P = ECO.puan,
    a = ratingAvg(c);
  return a === null ? 1 : clamp(1 + (a - 4) * P.ucretEtkisi, P.alt, P.ust);
}
/** vardiya sırasındaki oyun çarpanları */
export function shiftMods(c: Career, role: Role, now: number) {
  const V = ECO.vardiya,
    busy = isBusyDay(c),
    h = weather(c);
  const yogun = busy ? V.yogunUcretCarpani : 1,
    talep = (busy ? V.yogunTalepCarpani : 1) * h.talep,
    puan = ratingMul(c);
  if (role === 'tag') {
    const i = tagCarIndex(c, now);
    return {
      fareMul: ECO.tag.ucretCarpani * yogun * h.ucret * puan,
      demandMul: talep,
      complaintMul: 1,
      fuelMul: i < 0 ? 1 : tagSpec(c.tag.araclar[i].seviye).benzin,
      speedMul: h.hiz,
      oldCar: i >= 0 && c.tag.araclar[i].seviye === 0,
    };
  }
  return {
    fareMul: V.ucretCarpani * yogun * h.ucret * puan,
    demandMul: talep,
    complaintMul: playerCarOld(c) ? ECO.araclar.eskiAracSikayetCarpani : 1,
    fuelMul: 1,
    speedMul: h.hiz,
    oldCar: playerCarOld(c),
  };
}
/** vardiya sonu: kazancı kasaya işle, takvimi ve kuru ilerlet */
export function endShift(
  c: Career,
  earned: number,
  why: string,
  role: Role = 'taxi',
  now = Date.now(),
  usd = 0,
  stats?: ShiftStats,
): ShiftResult {
  const K = ECO.kariyer,
    TG = ECO.tag;
  let brut = earned,
    ceza = 0,
    ucret = 0,
    arkadas = 0,
    komisyon = 0;
  if (why === 'hapis') {
    brut = 0;
    ceza = K.hapisCezasi;
  } else if (why === 'ruhsat') {
    brut = 0;
    ceza = K.ruhsatCezasi;
  } else if (why === 'baglandi') {
    // Tag aracı bağlandı: kazanç gider, ceza; kendi aracıysa otoparka çekilir
    brut = 0;
    ceza = TG.baglanmaCezasi;
    const i = tagCarIndex(c, now);
    if (i >= 0) c.tag.araclar[i].blokaj = now + TG.blokajSaat * 3600e3;
  }
  if (role === 'tag') {
    const pos = Math.max(0, brut);
    // arkadaşının aracıyla çalıştıysan payını al (bağlandıysa kazanç zaten yok)
    if (why !== 'baglandi' && tagCarIndex(c, now) < 0) arkadas = Math.round(pos * TG.arkadasPayi);
    komisyon = Math.round(pos * TG.tagKomisyonu);
    ucret = arkadas + komisyon;
  } else {
    ucret = shiftFee(c);
    if (c.cirakKalan > 0 && !drivesOwnCar(c)) c.cirakKalan--;
  }
  const net = brut - ucret - ceza;
  c.kasa += net;
  // hapis, ruhsat iptali ya da bağlanmada turist doları da gider
  const dolar = why === 'time' ? usd : 0;
  c.dolar += dolar;
  c.vardiya++;
  if (c.vardiya % 2 === 0) newDay(c);
  // yolcu puanı, müdavim ilişkileri, günlük görevler
  let gorevOdul = 0,
    gorevler: string[] = [],
    puan: number | null = null;
  if (stats) {
    const P = ECO.puan,
      M = ECO.mudavim;
    if (stats.puanlar.length) {
      puan = stats.puanlar.reduce((a, b) => a + b, 0) / stats.puanlar.length;
      c.puanlar = c.puanlar.concat(stats.puanlar).slice(-P.son);
    }
    for (const id in stats.mudavim) c.mudavim[id] = clamp((c.mudavim[id] || 0) + stats.mudavim[id], M.alt, M.ust);
    const g = applyTasks(c, stats, brut, role);
    gorevOdul = g.odul;
    gorevler = g.tamam;
  }
  if (!c.enIyi || net > c.enIyi.net) c.enIyi = { net, rol: role, gun: c.gun + 1 };
  c.son = { rol: role, brut, ucret, arkadas, komisyon, dolar, net, ceza, neden: why, gorevOdul, gorevler, puan };
  return c.son;
}

/* ---- takvim günü: kur, plaka piyasası, manşet ---- */
export function newDay(c: Career) {
  c.gun++;
  const D = ECO.doviz,
    M = ECO.piyasa,
    base = ECO.taksi.plakaSatis;
  let kur = c.kur * (1 + (Math.random() * 2 - 1) * D.gunlukOynama),
    plaka = c.plakaFiyat * (1 + (Math.random() * 2 - 1) * M.plakaGunlukOynama);
  c.manset = '';
  if (Math.random() < M.olayIhtimali) {
    const o = M.olaylar[Math.floor(Math.random() * M.olaylar.length)];
    kur *= 1 + o.kur;
    plaka *= 1 + o.plaka;
    c.manset = o.id;
  }
  c.kur = clamp(kur, D.kurAlt, D.kurUst);
  // hava: ağırlıklı rastgele
  const H = ECO.hava.durumlar;
  let x = Math.random() * H.reduce((t, h) => t + h.agirlik, 0);
  c.hava = H[H.length - 1].id;
  for (const h of H) {
    if ((x -= h.agirlik) < 0) {
      c.hava = h.id;
      break;
    }
  }
  c.plakaFiyat = Math.round(clamp(plaka, base * M.plakaAlt, base * M.plakaUst) / 1000) * 1000;
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
  // Tag filosu: oyuncunun kendi sürdüğü (en iyi) araç dışındakileri mahalleden arkadaşlar sürer
  const TG = ECO.tag,
    mine = tagCarIndex(c, now);
  let tagAraci = 0;
  c.tag.araclar.forEach((a, i) => {
    if (i === mine || a.blokaj > now) return;
    tagAraci++;
    gelir += vardiya * (TG.ortalamaVardiyaBrut * TG.arkadasSoforPayi - TG.aracBakimVardiya);
  });
  const taksit = Math.min(c.borc, c.taksit * (ms / 86400e3));
  return {
    gelir: Math.floor(gelir),
    taksit: Math.ceil(taksit),
    saat: ms / 3600e3,
    dolu: ms >= T.cevrimdisiBirikimSaat * 3600e3,
    vardiya,
    tagAraci,
  };
}
export function collect(c: Career, now: number) {
  const a = accrued(c, now),
    TG = ECO.tag,
    mine = tagCarIndex(c, now);
  c.kasa += a.gelir - a.taksit;
  c.borc = Math.max(0, c.borc - a.taksit);
  c.sonTahsil = now;
  // arkadaşların sürdüğü Tag araçları bağlanabilir: ceza ve otopark
  let baglanan = 0;
  c.tag.araclar.forEach((t, i) => {
    if (i === mine || t.blokaj > now) return;
    if (Math.random() < 1 - Math.pow(1 - TG.baglanmaRiski, a.vardiya)) {
      t.blokaj = now + TG.blokajSaat * 3600e3;
      c.kasa -= TG.baglanmaCezasi;
      baglanan++;
    }
  });
  return { ...a, baglanan };
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
export const sharePrice = (c: Career) => c.plakaFiyat / 8;
/** satarken alınan fiyat (bayi alış fiyatı) */
export const shareSellPrice = (c: Career) => Math.round(sharePrice(c) * (1 - ECO.piyasa.satisMakasi));
export function canBuyCar(c: Career, tip: CarTier) {
  return c.araclar.length < carSlots(c) && c.kasa >= carPrice(tip);
}
export function buyCar(c: Career, tip: CarTier) {
  if (!canBuyCar(c, tip)) return false;
  c.kasa -= carPrice(tip);
  c.araclar.push({ tip });
  return true;
}
export const canBuyShare = (c: Career) => c.borc <= 0 && c.kasa >= sharePrice(c);
export function buyShare(c: Career) {
  if (!canBuyShare(c)) return false;
  c.kasa -= sharePrice(c);
  c.plakaPay = Math.round((c.plakaPay + 1 / 8) * 1000) / 1000;
  return true;
}
/** hisse satışı: borç yoksa ve kalan tam plakalar araçlara yetiyorsa */
export function canSellShare(c: Career) {
  if (c.borc > 0 || c.plakaPay < 0.125) return false;
  const kalan = Math.round((c.plakaPay - 0.125) * 1000) / 1000;
  return c.araclar.length <= ECO.filo.kiralikPlakaLimiti + Math.floor(kalan);
}
export function sellShare(c: Career) {
  if (!canSellShare(c)) return false;
  c.kasa += shareSellPrice(c);
  c.plakaPay = Math.round((c.plakaPay - 0.125) * 1000) / 1000;
  return true;
}
/** kredili plaka: elde peşinat (hisseler dahil) varsa eksik kısmı krediyle tamamla */
export function creditInfo(c: Career) {
  const K = ECO.kredi,
    P = c.plakaFiyat,
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

/* ---- Tag garajı ---- */
export const tagCarPrice = (seviye: number) => tagSpec(seviye).fiyat;
export const canBuyTagCar = (c: Career, seviye: number) =>
  c.tag.araclar.length < ECO.tag.filoLimiti && c.kasa >= tagCarPrice(seviye);
export function buyTagCar(c: Career, seviye: number) {
  if (!canBuyTagCar(c, seviye)) return false;
  c.kasa -= tagCarPrice(seviye);
  c.tag.araclar.push({ seviye, blokaj: 0 });
  return true;
}
/** ikinci el satış: alış fiyatının bir kısmı (ECO.kariyer.ikinciElOrani) */
export function sellTagCar(c: Career, i: number, now: number) {
  const a = c.tag.araclar[i];
  if (!a || a.blokaj > now) return false;
  c.kasa += Math.round(tagCarPrice(a.seviye) * ECO.kariyer.ikinciElOrani);
  c.tag.araclar.splice(i, 1);
  return true;
}
export function sellCar(c: Career, i: number) {
  const a = c.araclar[i];
  if (!a) return false;
  c.kasa += Math.round(carPrice(a.tip) * ECO.kariyer.ikinciElOrani);
  c.araclar.splice(i, 1);
  return true;
}

/* ---- servet ve kilometre taşları ---- */
export function wealth(c: Career) {
  const R = ECO.kariyer.ikinciElOrani;
  return Math.round(
    c.kasa +
      c.dolar * fx(c).satis +
      c.araclar.reduce((t, a) => t + carPrice(a.tip) * R, 0) +
      c.tag.araclar.reduce((t, a) => t + tagCarPrice(a.seviye) * R, 0) +
      c.plakaPay * c.plakaFiyat * (1 - ECO.piyasa.satisMakasi) -
      c.borc,
  );
}
/** yeni ulaşılan taşları kaydeder ve döndürür */
export function checkMilestones(c: Career): string[] {
  const w = wealth(c),
    has: Record<string, boolean> = {
      ilkVardiya: c.vardiya > 0,
      ilkTaksi: c.araclar.length > 0,
      ilkHisse: c.plakaPay > 0,
      ilkPlaka: c.plakaPay >= 1,
      plakaAgasi: c.plakaPay >= 5,
      ilkTag: c.tag.araclar.length > 0,
      lukSedan: c.tag.araclar.some((a) => a.seviye === 4),
      tagFilo: c.tag.araclar.length >= ECO.tag.filoLimiti,
      servet1: w >= 1e6,
      servet10: w >= 1e7,
      servet50: w >= 5e7,
      ilkDolar: c.dolar > 0,
    };
  const yeni: string[] = [];
  for (const k in has)
    if (has[k] && c.taslar[k] === undefined) {
      c.taslar[k] = c.gun + 1;
      yeni.push(k);
    }
  return yeni;
}

/* ---- günlük görevler (gerçek gün başına) ---- */
export function refreshTasks(c: Career, now: number) {
  const today = day(now);
  if (c.gorevler.gun === today) return false;
  const G = ECO.gorevler,
    havuz = G.havuz.slice();
  const liste = [];
  for (let i = 0; i < G.gunluk && havuz.length; i++) {
    const k = Math.floor(Math.random() * havuz.length);
    liste.push({ id: havuz[k].id, ilerleme: 0, tamam: false });
    havuz.splice(k, 1);
  }
  c.gorevler = { gun: today, liste };
  return true;
}
export const taskDef = (id: string) => ECO.gorevler.havuz.find((g) => g.id === id);
function applyTasks(c: Career, stats: ShiftStats, brut: number, role: Role) {
  let odul = 0;
  const tamam: string[] = [];
  for (const t of c.gorevler.liste) {
    const d = taskDef(t.id);
    if (!d || t.tamam || (d.rol && d.rol !== role)) continue;
    if (d.sayac === 'brut') t.ilerleme = Math.max(t.ilerleme, Math.max(0, brut));
    else if (d.sayac === 'kombo') t.ilerleme = Math.max(t.ilerleme, stats.kombo);
    else t.ilerleme += stats[d.sayac] || 0;
    if (t.ilerleme >= d.hedef) {
      t.tamam = true;
      odul += d.odul;
      tamam.push(t.id);
    }
  }
  c.kasa += odul;
  return { odul, tamam };
}
