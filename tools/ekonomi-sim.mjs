// Kariyer temposu simülatörü: data/ekonomi.json sayılarıyla bir oyuncunun gerçek günlerdeki ilerlemesini hesaplar.
// Kullanım: node tools/ekonomi-sim.mjs [--dakika 45] [--gun 30] [--birikim 12]
import fs from 'node:fs';
const E = JSON.parse(fs.readFileSync(new URL('../data/ekonomi.json', import.meta.url), 'utf8'));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? +process.argv[i + 1] : d;
};
const DAK = arg('dakika', 45),
  GUN = arg('gun', 30),
  BIRIKIM = arg('birikim', E.tempo.cevrimdisiBirikimSaat);
const T = E.tempo,
  G = E.gelir,
  F = E.filo,
  X = E.taksi,
  K = E.kredi;
let borc = 0,
  taksit = 0;
const yogunOran = 3 / 7,
  brut = G.vardiyaBrut.haftaIci * (1 - yogunOran) + G.vardiyaBrut.yogun * yogunOran;
const aktifVardiya = Math.floor(DAK / T.vardiyaDakika);
// bir aracın NPC vardiyasından net: şoförün ödediği ₺3 000 − plaka kirası (plaka bizimse yok) − bakım
const npcNet = (plakaBizim) => X.vardiyaUcreti - (plakaBizim ? 0 : F.plakaKiraVardiya) - F.aracBakimVardiya;
// gerçek bir günde tahsil edilebilen NPC vardiyası (araç başına): birikim süresi / vardiya süresi
const npcVardiya = Math.floor((Math.min(24, BIRIKIM) * 60) / T.vardiyaDakika);
let kasa = G.ilkGunBonus,
  araclar = 0,
  plakaPay = 0,
  cirak = X.cirakIndirimi.gun * 2; // çıraklık vardiya sayısı
const olay = [],
  ilk = {};
const kaydet = (ad, gun) => {
  if (!ilk[ad]) {
    ilk[ad] = gun;
    olay.push(`${String(gun).padStart(2)}. gün: ${ad}`);
  }
};
console.log(
  `Varsayım: günde ${DAK} dk aktif oyun (${aktifVardiya} vardiya), birikim ${BIRIKIM} saat, ortalama brüt ₺${Math.round(brut)}/vardiya`,
);
console.log(' gün |       kasa | araç | plaka payı |       borç | günlük gelir (aktif + pasif + giriş)');
for (let g = 1; g <= GUN; g++) {
  let aktif = 0;
  for (let v = 0; v < aktifVardiya; v++) {
    const ucret = araclar
      ? F.plakaKiraVardiya * (plakaPay >= 1 ? 0 : 1) + F.aracBakimVardiya
      : cirak-- > 0
        ? X.cirakIndirimi.ucret
        : X.vardiyaUcreti;
    aktif += brut - G.benzinVardiya + G.gorevVardiya - ucret;
  }
  const tamPlaka = Math.floor(plakaPay); // tam sahip olunan plakalar o kadar aracın kirasını kaldırır
  let pasif = 0;
  for (let a = 0; a < araclar; a++) pasif += npcVardiya * npcNet(a < tamPlaka);
  // kullanılmayan plaka payı (hisse ya da araçsız plaka) piyasaya kiralanır: payı kadar kira geliri
  pasif += Math.max(0, plakaPay - Math.min(tamPlaka, araclar)) * npcVardiya * F.plakaKiraVardiya;
  const giris = G.gunlukGiris[(g - 1) % 7];
  kasa += aktif + pasif + giris;
  if (borc > 0) {
    const t = Math.min(borc, taksit);
    kasa -= t;
    borc -= t;
    if (borc <= 0) kaydet('plaka kredisi bitti', g);
  }
  // satın alma politikası: önce ilk araç, sonra plaka hissesi / yeni araç (hangisi daha çok getirirse)
  for (;;) {
    if (!araclar && kasa >= F.eskiTaksi) {
      kasa -= F.eskiTaksi;
      araclar++;
      kaydet('ilk kendi taksin (eski)', g);
      continue;
    }
    const hisse = X.plakaSatis / 8;
    const aracHakki = F.kiralikPlakaLimiti + Math.floor(plakaPay);
    if (araclar && araclar < aracHakki && kasa >= F.eskiTaksi) {
      kasa -= F.eskiTaksi;
      araclar++;
      if (araclar === 5) kaydet('5 araçlık filo', g);
      continue;
    }
    // kredi: elde peşinat varsa (hisseler dahil) eksik kısmı krediyle tamamla
    const kalanPay = Math.ceil(plakaPay) - plakaPay || (plakaPay < 1 ? 1 : 0);
    if (araclar && borc <= 0 && plakaPay < 1 && kasa + plakaPay * X.plakaSatis >= K.pesinat * X.plakaSatis) {
      const eksik = (1 - plakaPay) * X.plakaSatis,
        pes = Math.min(kasa, eksik);
      kasa -= pes;
      borc = (eksik - pes) * (1 + K.toplamFaiz);
      taksit = borc / K.vadeGun;
      plakaPay = 1;
      kaydet('ilk tam plaka', g);
      kaydet('  (kredili; peşinat %' + K.pesinat * 100 + ')', g);
      continue;
    }
    if (araclar && kasa >= hisse && borc <= 0) {
      kasa -= hisse;
      plakaPay += 1 / 8;
      if (plakaPay >= 1 / 8) kaydet('ilk plaka hissesi (1/8) → “plaka sahibi”', g);
      if (plakaPay >= 1) kaydet('ilk tam plaka', g);
      if (plakaPay >= 5) kaydet('5 plaka → Plaka Ağası', g);
      continue;
    }
    break;
  }
  if (g <= 10 || g % 5 === 0)
    console.log(
      `${String(g).padStart(4)} | ${('₺' + Math.round(kasa).toLocaleString('tr-TR')).padStart(10)} | ${String(araclar).padStart(4)} | ${plakaPay.toFixed(3).padStart(10)} | ${('₺' + Math.round(borc).toLocaleString('tr-TR')).padStart(10)} | ₺${Math.round(aktif).toLocaleString('tr-TR')} + ₺${Math.round(pasif).toLocaleString('tr-TR')} + ₺${giris.toLocaleString('tr-TR')}`,
    );
}
console.log('\nKilometre taşları:\n' + olay.join('\n'));
