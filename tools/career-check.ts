/* Kariyer hesaplarının testi (Node, tarayıcısız): npm run test:kariyer */
import fs from 'node:fs';
import { setContent } from '../src/sim/content';
import * as K from '../src/sim/career';

const json = (p: string) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const ECO = json('data/ekonomi.json');
setContent(null, null, null, ECO);
let fail = 0;
const eq = (a: number, b: number, msg: string) => {
  const ok = Math.abs(a - b) < 1e-6;
  if (!ok) fail++;
  console.log(`${ok ? '✓' : '✗'} ${msg}${ok ? '' : ` (beklenen ${b}, çıkan ${a})`}`);
};
const t0 = Date.UTC(2026, 10, 2, 9, 0, 0);
Math.random = () => 0.5;

// taksi: çırak vardiyası
let c = K.newCareer(t0);
let r = K.endShift(c, 10000, 'time', 'taxi', t0);
eq(r.ucret, 1500, 'taksi çırak vardiya ücreti ₺1 500');
eq(c.kasa, 8500, 'kasa: 10 000 − 1 500');
for (let i = 0; i < 5; i++) K.endShift(c, 0, 'time', 'taxi', t0);
eq(K.shiftFee(c), 3000, 'çıraklık 6 vardiyada biter, ücret ₺3 000');
eq(c.gun, 3, '6 vardiya = 3 takvim günü');
eq(K.isBusyDay(c) ? 1 : 0, 0, '4. gün Perşembe: yoğun değil');
c.gun = 4;
eq(K.isBusyDay(c) ? 1 : 0, 1, '5. gün Cuma: yoğun');

// turist doları kasaya, hapiste gider
c = K.newCareer(t0);
r = K.endShift(c, 5000, 'time', 'taxi', t0, 40);
eq(c.dolar, 40, 'turist doları kariyer kasasına');
r = K.endShift(c, 5000, 'hapis', 'taxi', t0, 40);
eq(r.dolar, 0, 'hapiste turist doları da gider');

// hapis: kazanç gider, kefalet
c = K.newCareer(t0);
r = K.endShift(c, 9000, 'hapis', 'taxi', t0);
eq(r.net, -1500 - ECO.kariyer.hapisCezasi, 'hapis: kazanç yok, vardiya ücreti + kefalet');

// Tag: arkadaşının aracı
c = K.newCareer(t0);
r = K.endShift(c, 10000, 'time', 'tag', t0);
eq(r.arkadas, 2500, 'Tag arkadaş payı %25');
eq(r.komisyon, 1000, 'Tag komisyonu %10');
eq(r.net, 6500, 'Tag net: 10 000 − 2 500 − 1 000');
r = K.endShift(c, -400, 'time', 'tag', t0);
eq(r.ucret, 0, 'Tag zarar ettiyse pay alınmaz');
eq(K.tagLevelFor(c, t0), ECO.tag.arkadasAracSeviye, 'arkadaşın aracı kompakt sedan');

// Tag: kendi aracı, bağlanma
c.kasa = 1e6;
K.buyTagCar(c, 0);
eq(c.kasa, 1e6 - 350000, 'emektar hatchback ₺350 bin');
eq(K.shiftMods(c, 'tag', t0).fuelMul, 1.6, 'emektar çok yakar: benzin ×1,6');
r = K.endShift(c, 10000, 'time', 'tag', t0);
eq(r.arkadas, 0, 'kendi aracında arkadaş payı yok');
eq(r.komisyon, 1000, 'kendi aracında yalnızca Tag komisyonu');
r = K.endShift(c, 8000, 'baglandi', 'tag', t0);
eq(r.net, -ECO.tag.baglanmaCezasi, 'bağlandı: kazanç yok, ₺90 bin ceza');
eq(K.tagCarIndex(c, t0 + 3600e3), -1, 'araç 24 saat otoparkta, arkadaşın aracına dönülür');
eq(K.tagCarIndex(c, t0 + 25 * 3600e3), 0, '24 saat sonra araç geri');

// Tag filosu geliri: 2 araç → biri sende, biri arkadaşta
c = K.newCareer(t0);
c.kasa = 2e6;
K.buyTagCar(c, 1);
K.buyTagCar(c, 0);
const a = K.accrued(c, t0 + 12 * 3600e3);
const per = ECO.tag.ortalamaVardiyaBrut * ECO.tag.arkadasSoforPayi - ECO.tag.aracBakimVardiya;
eq(a.tagAraci, 1, 'en iyi aracı sen sürersin, diğerini arkadaşın');
eq(a.gelir, Math.floor(((12 * 60) / ECO.tempo.vardiyaDakika) * per), '12 saatlik filo geliri');
eq(K.accrued(c, t0 + 48 * 3600e3).gelir, a.gelir, 'birikim 12 saatte durur');

// taksi filosu, plaka hissesi, kredi
c = K.newCareer(t0);
c.kasa = 5e6;
K.buyCar(c, 'eski');
eq(K.shiftFee(c), ECO.filo.plakaKiraVardiya + ECO.filo.aracBakimVardiya, 'kendi taksin: plaka kirası + bakım');
K.buyShare(c);
eq(c.plakaPay, 0.125, '1/8 hisse');
const k = K.creditInfo(c);
eq(k.pesinat, 0.2 * ECO.taksi.plakaSatis - 0.125 * ECO.taksi.plakaSatis, 'peşinata hisse sayılır');
K.buyPlateWithCredit(c);
eq(c.plakaPay, 1, 'kredili tam plaka');
eq(K.shiftFee(c), ECO.filo.aracBakimVardiya, 'kendi plakanla yalnızca bakım');
eq(K.carSlots(c), ECO.filo.kiralikPlakaLimiti + 1, 'tam plaka 1 araç hakkı ekler');

// plaka piyasası ve hisse satışı
c = K.newCareer(t0);
for (let i = 0; i < 400; i++) K.newDay(c);
eq(
  +(
    c.plakaFiyat >= ECO.taksi.plakaSatis * ECO.piyasa.plakaAlt &&
    c.plakaFiyat <= ECO.taksi.plakaSatis * ECO.piyasa.plakaUst
  ),
  1,
  'plaka fiyatı sınırlar içinde kalır',
);
c.kasa = 2e6;
K.buyShare(c);
eq(K.sharePrice(c), c.plakaFiyat / 8, 'hisse fiyatı piyasadan');
const kasaOnce = c.kasa;
K.sellShare(c);
eq(
  c.kasa - kasaOnce,
  Math.round((c.plakaFiyat / 8) * (1 - ECO.piyasa.satisMakasi)),
  'hisse alış fiyatından satılır (makas)',
);
c.kasa = 2e6;
K.buyShare(c);
K.buyCar(c, 'eski');
K.buyCar(c, 'eski');
eq(+K.canSellShare(c), 1, '2 araç kiralık plakayla çalışabilir: hisse satılabilir');

// günlük giriş serisi
c = K.newCareer(t0);
eq(K.claimDaily(c, t0).odul, ECO.gelir.gunlukGiris[0] + ECO.gelir.ilkGunBonus, 'ilk giriş: seri + ilk gün bonusu');
eq(K.claimDaily(c, t0) ? 1 : 0, 0, 'aynı gün ikinci ödül yok');
eq(K.claimDaily(c, t0 + 86400e3).seri, 2, 'ertesi gün seri 2');
eq(K.claimDaily(c, t0 + 4 * 86400e3).seri, 1, 'gün atlanırsa seri başa döner');

// servet ve kilometre taşları
c = K.newCareer(t0);
c.kasa = 1e6;
eq(K.wealth(c), 1e6, 'servet = kasa');
K.buyCar(c, 'eski');
eq(K.wealth(c), 1e6 - ECO.filo.eskiTaksi * (1 - ECO.kariyer.ikinciElOrani), 'araç ikinci el değeriyle sayılır');
const taslar = K.checkMilestones(c);
eq(+(taslar.includes('ilkTaksi') && !taslar.includes('ilkVardiya')), 1, 'ilk taksi taşı, vardiya taşı yok');
eq(K.checkMilestones(c).length, 0, 'aynı taş iki kez verilmez');

// günlük görevler, yolcu puanı, hava
c = K.newCareer(t0);
eq(+K.refreshTasks(c, t0), 1, 'günlük görevler çekildi');
eq(c.gorevler.liste.length, ECO.gorevler.gunluk, '3 günlük görev');
eq(+K.refreshTasks(c, t0 + 3600e3), 0, 'aynı gün görev yenilenmez');
c.gorevler.liste = [
  { id: 'teslim5', ilerleme: 3, tamam: false },
  { id: 'brut15', ilerleme: 0, tamam: false },
];
const st = {
  teslim: 2,
  temiz: 2,
  turist: 0,
  kopru: 0,
  havalimani: 0,
  kombo: 2,
  besYildiz: 1,
  puanlar: [5, 3],
  mudavim: { nuri: 1 },
};
const kasa0 = c.kasa;
r = K.endShift(c, 9000, 'time', 'taxi', t0, 0, st);
eq(r.gorevOdul, 15000, 'teslim5 tamam (3+2), brut15 değil (₺9 000)');
eq(c.kasa - kasa0, 9000 - 1500 + 15000, 'görev ödülü kasaya');
eq(K.ratingAvg(c), 4, 'puan ortalaması 4');
eq(K.ratingMul(c), 1, 'ortalama 4: ücret etkisi yok');
c.puanlar = [5, 5, 5];
eq(K.ratingMul(c), 1 + ECO.puan.ucretEtkisi, '5 yıldız ortalaması: ücret +%4');
eq(c.mudavim.nuri, 1, 'müdavim ilişkisi kaydedildi');
c.hava = 'kar';
eq(K.shiftMods(c, 'taxi', t0).speedMul, 0.75, 'karda araçlar yavaşlar');
eq(
  Math.round(K.shiftMods(c, 'taxi', t0).fareMul * 1000),
  Math.round(ECO.vardiya.ucretCarpani * 1.2 * (1 + ECO.puan.ucretEtkisi) * 1000),
  'kar ücreti ve puan çarpanı',
);

console.log(fail ? `\n${fail} test başarısız` : '\nKariyer hesapları doğru');
process.exit(fail ? 1 : 0);
