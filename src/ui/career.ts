import { endReveal } from './ceremony';
/* ================= KARİYER EKRANI: kasa, vardiya seçimi, garaj, plaka, döviz, günlük ödül =================
   Kural ve hesaplar sim/career.ts’de; burası yalnızca gösterir ve kaydeder (localStorage: yk-kariyer). */
import { $ } from '../core/dom';
import { DLG, ECO } from '../sim/content';
import * as K from '../sim/career';
import type { Career } from '../sim/career';
import { DBOX, STREETS, ZONES, district } from '../sim/grid';
import { G, UNAME } from '../sim/state';
import { load, save } from '../sim/storage';
import { T, esc, rnd } from '../sim/util';
import { toast } from './hud';
import { MANIFEST } from '../sim/content';
import { assetUrl } from '../core/assets';
import { closeSheets, openSheet, startRole } from './menu';

const KEY = 'yk-kariyer';
let C: Career | null = null;
let mode = load('yk-mod', 'hizli');
let lastShift = 'gunduz';
const S = () => DLG.kariyer;
/** işaretli tutar: −₺800 / ₺800 */
const money = (n: number) => (n < 0 ? '−₺' : '₺') + Math.round(Math.abs(n)).toLocaleString('tr-TR');
const tl = (n: number) => Math.round(n).toLocaleString('tr-TR');

export const careerMode = () => mode === 'kariyer';
export const career = () => C;

export function loadCareer() {
  try {
    const v = JSON.parse(load(KEY, 'null'));
    if (v && v.v === 1) C = K.migrate(v);
  } catch (e) {
    C = null;
  }
  if (!C) {
    C = K.newCareer(Date.now());
    C.durak = rnd(ZONES).name;
    saveCareer();
  }
}
export function saveCareer() {
  if (C) save(KEY, JSON.stringify(C));
}

/* ---- ana ekrandaki “Hızlı gün / Kariyer” seçimi ---- */
function paintMode() {
  document
    .querySelectorAll<HTMLElement>('#modeSel button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
}

/* ---- kariyer sayfası ---- */
/** rol: hangi bölüm görünsün (ana ekranda basılan rol düğmesi) */
export function openCareer(role?: string) {
  if (K.refreshTasks(C, Date.now())) saveCareer();
  const r = K.claimDaily(C, Date.now());
  if (r) {
    toast(T(S().girisOdul, { seri: r.seri, odul: tl(r.odul) }));
    saveCareer();
  }
  tab = 'vardiya';
  render();
  openSheet('career');
  if (role) $(role === 'tag' ? 'cs-tag' : 'cs-taxi').scrollIntoView({ block: 'start' });
}

function btn(act: string, text: string, ok = true, alt = false) {
  return `<button class="btn${alt ? ' alt' : ''}" data-act="${act}"${ok ? '' : ' disabled'}>${esc(text)}</button>`;
}
const fmtKur = (k: number) => k.toFixed(2).replace('.', ',');
const pctChange = (x: number) =>
  (x >= 0 ? '+' : '−') +
  '%' +
  Math.abs(x * 100)
    .toFixed(1)
    .replace('.', ',');
const carName = (seviye: number) => DLG.tagLevels.levels[seviye].ad;

function tasksSection(c: Career) {
  const s = S(),
    avg = K.ratingAvg(c),
    mul = K.ratingMul(c);
  const rows = c.gorevler.liste
    .map((t) => {
      const d = K.taskDef(t.id);
      if (!d) return '';
      const txt = T(s.gorevSatir, {
        gorev: s.gorevler[t.id],
        ilerleme: tl(Math.min(t.ilerleme, d.hedef)),
        hedef: tl(d.hedef),
        odul: tl(d.odul),
      });
      return `<li class="${t.tamam ? 'done' : ''}">${esc(txt)}</li>`;
    })
    .join('');
  const puan =
    avg === null
      ? s.puanYok
      : T(s.puanMetin, { puan: avg.toFixed(1).replace('.', ','), n: c.puanlar.length, etki: pctChange(mul - 1) });
  return `<section class="csec"><h4>${esc(s.gorevBaslik)}</h4><ul class="ctasks">${rows}</ul>
    <h4>${esc(s.puanBaslik)}</h4><p>${esc(puan)}</p></section>`;
}
function feeLineOf(c: Career) {
  const s = S(),
    fee = K.shiftFee(c);
  if (K.drivesOwnCar(c)) return T(c.plakaPay >= 1 ? s.vardiyaKendiPlaka : s.vardiyaKendi, { ucret: tl(fee) });
  if (c.cirakKalan > 0) return T(s.vardiyaCirak, { ucret: tl(fee), kalan: c.cirakKalan });
  return T(s.vardiyaPatron, { ucret: tl(fee) });
}
function taxiShift(c: Career) {
  const s = S(),
    MPT = DLG.cokOyunculu;
  const durakSel = `<label class="csel">${esc(MPT.durakSec)} <select data-sel="durak">${ZONES.map(
    (z) => `<option${z.name === c.durak ? ' selected' : ''}>${esc(z.name)}</option>`,
  ).join('')}</select></label>`;
  return `<div class="crolecard taxi"><div class="chead">${carImg(K.drivesOwnCar(c) ? 'taxi1' : 'taxi2')}<div><h3 class="crole" id="cs-taxi">${esc(s.taksiBolum)}</h3><span class="chip">${esc(s.statu[K.status(c)])}</span></div></div>
    <section class="csec"><p>${esc(feeLineOf(c))}${K.playerCarOld(c) ? '<br>' + esc(s.eskiArac) : ''}</p>${durakSel}
    <div class="row big">${btn('taxi:gunduz', s.gunduz)}${btn('taxi:gece', s.gece)}</div></section></div>`;
}
function garagePanel(c: Career, now: number) {
  const s = S(),
    TG = ECO.tag;
  const nOld = c.araclar.filter((a) => a.tip === 'eski').length,
    nNew = c.araclar.filter((a) => a.tip === 'yeni').length;
  const sell = c.araclar
    .map((a, i) =>
      btn(
        'sellCar:' + i,
        T(s.sat, { arac: a.tip, fiyat: tl(K.carPrice(a.tip) * ECO.kariyer.ikinciElOrani) }),
        true,
        true,
      ),
    )
    .join('');
  const taxiCars = `<div class="ccars">${carCard('taxi2', s.eskiTaksi, '₺' + tl(K.carPrice('eski')), 'eski', K.canBuyCar(c, 'eski'), nOld)}${carCard(
    'taxi1',
    s.yeniTaksi,
    '₺' + tl(ECO.filo.yeniTaksi),
    'yeni',
    K.canBuyCar(c, 'yeni'),
    nNew,
  )}</div>`;
  const own = c.tag.araclar
    .map((a, k) =>
      btn(
        'sellTag:' + k,
        T(s.sat, { arac: carName(a.seviye), fiyat: tl(K.tagCarPrice(a.seviye) * ECO.kariyer.ikinciElOrani) }),
        a.blokaj <= now,
        true,
      ),
    )
    .join('');
  const tagCars = `<div class="ccars">${TG.araclar
    .map((_, sv: number) =>
      carCard(
        'tag' + (sv + 1),
        carName(sv),
        '₺' + tl(K.tagCarPrice(sv)),
        'buyTag:' + sv,
        K.canBuyTagCar(c, sv),
        c.tag.araclar.filter((a) => a.seviye === sv).length,
      ),
    )
    .join('')}</div>`;
  return `<section class="csec"><h4>${esc(s.taksiBolum)} · ${esc(s.garajBaslik)}</h4><p>${esc(T(s.garajMetin, { n: c.araclar.length, slot: K.carSlots(c) }))}</p>${taxiCars}${sell ? `<div class="row">${sell}</div>` : ''}</section>
    <section class="csec"><h4>${esc(s.tagBolum)} · ${esc(s.garajBaslik)}</h4><p>${esc(T(s.tagGarajMetin, { n: c.tag.araclar.length, limit: TG.filoLimiti }))}</p>${tagCars}${own ? `<div class="row">${own}</div>` : ''}</section>`;
}
function platePanel(c: Career) {
  const s = S(),
    kr = K.creditInfo(c);
  const pay =
    c.plakaPay >= 1
      ? c.plakaPay.toFixed(3).replace(/\.?0+$/, '')
      : c.plakaPay
        ? `${Math.round(c.plakaPay * 8)}/8`
        : '0';
  const segs = Array.from(
    { length: 8 },
    (_, k) => `<i class="${k < Math.round(Math.min(1, c.plakaPay) * 8) ? 'on' : ''}"></i>`,
  ).join('');
  return `<section class="csec"><div class="plate"><span class="tr">TR</span><b>${esc(s.plakaPlaka)} ${String(1000 + ((c.gun * 37) % 9000))}</b></div>
    <div class="psegs">${segs}</div><p class="pcap">${esc(T(s.plakaIlerleme, { pay }))}</p>
    <p>${esc(T(s.plakaMetin, { pay, fiyat: tl(c.plakaFiyat) }))}<br>${esc(
      T(s.plakaPiyasa, {
        satis: tl(c.plakaFiyat),
        alis: tl(K.shareSellPrice(c) * 8),
        degisim: pctChange(c.plakaFiyat / ECO.taksi.plakaSatis - 1),
      }),
    )}${c.borc > 0 ? '<br>' + esc(T(s.borcVar, { borc: tl(c.borc) })) : ''}</p>
      <div class="row">${btn('hisse', T(s.hisseAl, { fiyat: tl(K.sharePrice(c)) }), K.canBuyShare(c))}${btn(
        'kredi',
        T(s.krediAl, { pesinat: tl(kr.pesinat) }),
        kr.ok,
        true,
      )}</div>${c.plakaPay ? `<div class="row">${btn('hisseSat', T(s.hisseSat, { fiyat: tl(K.shareSellPrice(c)) }), K.canSellShare(c), true)}</div>` : ''}${
        kr.ok ? `<p>${esc(T(s.krediMetin, { borc: tl(kr.borc), vade: kr.vade, taksit: tl(kr.taksit) }))}</p>` : ''
      }</section>`;
}
function tagShift(c: Career, now: number) {
  const s = S(),
    TG = ECO.tag,
    i = K.tagCarIndex(c, now);
  const pct = (x: number) => Math.round(x * 100);
  let line =
    i < 0
      ? T(s.tagArkadasArac, {
          arac: carName(TG.arkadasAracSeviye),
          arkadas: pct(TG.arkadasPayi),
          komisyon: pct(TG.tagKomisyonu),
        })
      : T(s.tagKendiArac, { arac: carName(c.tag.araclar[i].seviye), komisyon: pct(TG.tagKomisyonu) });
  if (i >= 0) {
    const b = TG.araclar[c.tag.araclar[i].seviye].benzin;
    if (b > 1.2) line += T(s.tagBenzin, { benzin: String(b).replace('.', ',') });
  }
  const park = c.tag.araclar.filter((a) => a.blokaj > now);
  const parkLine = park.length
    ? '<br>' +
      esc(T(s.tagOtopark, { n: park.length, saat: Math.ceil((Math.min(...park.map((a) => a.blokaj)) - now) / 3600e3) }))
    : '';
  const MPT = DLG.cokOyunculu,
    mh = c.tag.mahalle ? district(c.tag.mahalle[0], c.tag.mahalle[1]) : '';
  const mahSel = `<label class="csel">${esc(MPT.mahalleSec)} <select data-sel="mahalle"><option value="">—</option>${DBOX.map(
    (d) => `<option${d.ad === mh ? ' selected' : ''}>${esc(d.ad)}</option>`,
  ).join('')}</select></label>`;
  const spr = 'tag' + ((i < 0 ? TG.arkadasAracSeviye : c.tag.araclar[i].seviye) + 1);
  return `<div class="crolecard tag"><div class="chead">${carImg(spr)}<div><h3 class="crole" id="cs-tag">${esc(s.tagBolum)}</h3><span class="chip">${esc(s.statu[K.tagStatus(c)])}</span></div></div>
    <section class="csec"><p>${esc(line)}${parkLine}</p>${mahSel}
      <div class="row big">${btn('tag:gunduz', s.gunduz)}${btn('tag:gece', s.gece)}</div></section></div>`;
}

/* ---- görseller: araç kartı ---- */
const carImg = (spr: string) => {
  const ci = MANIFEST.cars_iso && MANIFEST.cars_iso.araclar[spr],
    f = ci && ci.on ? ci.on.file : MANIFEST.cars[spr] && MANIFEST.cars[spr].file;
  return f ? `<img alt="" src="${assetUrl(f)}">` : '';
};
/** satın alınabilir araç kartı: görsel, ad, fiyat, düğme */
function carCard(spr: string, name: string, priceTxt: string, act: string, ok: boolean, owned = 0) {
  const s = S();
  return `<div class="ccar${ok ? '' : ' locked'}">${owned ? `<i class="own">${esc(s.senin)} ×${owned}</i>` : ''}${carImg(spr)}
    <b>${esc(name)}</b>${btn(act, priceTxt, ok)}${ok ? '' : `<small>${esc(s.pahali)}</small>`}</div>`;
}
/** sekmeler */
let tab = 'vardiya';
const TABS = ['vardiya', 'garaj', 'plaka', 'kasa'];

function render() {
  const c = C,
    s = S(),
    now = Date.now();
  const acc = K.accrued(c, now),
    fx = K.fx(c),
    hasAssets = c.araclar.length || c.plakaPay || c.tag.araclar.length > 1;
  $('careerTitle').textContent = s.baslik;
  const chips = [
    esc(T(s.ozet, { gun: c.gun + 1, haftaGunu: K.weekday(c) })),
    esc(s.hava[c.hava]),
    K.isBusyDay(c) ? `<span class="busy">${esc(s.yogunGun)}</span>` : '',
  ]
    .filter(Boolean)
    .map((x) => `<span class="chip">${x}</span>`)
    .join('');
  const tabs = TABS.map(
    (k) => `<button class="ctab" data-tab="${k}" aria-pressed="${k === tab}">${esc(s.sekme[k])}</button>`,
  ).join('');
  const panel = (k: string, html: string) =>
    `<div class="cpanel" data-panel="${k}"${k === tab ? '' : ' hidden'}>${html}</div>`;
  $('careerBody').innerHTML = `
    <div class="cstats">
      <div class="kasa"><small>${esc(s.kasa)}</small><b>${money(c.kasa)}</b></div>
      <div><small>${esc(s.dolar)}</small><b>$${tl(c.dolar)}</b></div>
      <div><small>${esc(s.kur)}</small><b>₺${fmtKur(fx.satis)}</b></div>
    </div>
    <div class="cchips">${chips}</div>
    ${c.manset ? `<div class="cnews"><b>${esc(s.manset)}</b> ${esc(s.mansetler[c.manset])}</div>` : ''}
    <nav class="ctabs">${tabs}</nav>
    ${panel('vardiya', shiftPanel(c, now))}
    ${panel('garaj', garagePanel(c, now))}
    ${panel('plaka', platePanel(c))}
    ${panel(
      'kasa',
      `<section class="csec"><h4>${esc(s.toplaBaslik)}</h4><p>${
        hasAssets
          ? esc(
              T(s.toplaMetin, {
                saat: acc.saat.toFixed(1).replace('.', ','),
                gelir: tl(acc.gelir),
                taksit: acc.taksit ? T(s.toplaTaksit, { taksit: tl(acc.taksit) }) : '',
              }) + (acc.dolu ? s.toplaDolu : ''),
            )
          : esc(s.toplaBos)
      }</p>${hasAssets ? `<div class="row">${btn('topla', s.toplaDugme, acc.gelir > 0 || acc.taksit > 0)}</div>` : ''}</section>
      ${tasksSection(c)}
      <section class="csec"><h4>${esc(s.dovizBaslik)}</h4><p>${esc(T(s.dovizMetin, { alis: fmtKur(fx.alis), satis: fmtKur(fx.satis) }))}</p>
      <div class="row">${btn('usdAl', s.dolarAl, c.kasa >= 100 * fx.alis)}${btn('usdSat', s.dolarSat, c.dolar >= 100, true)}</div></section>
      <p class="cmeta">${esc(T(s.servet, { servet: money(K.wealth(c)) }))}<br>${esc(s.rolNotu)}</p>`,
    )}`;
}
/** direksiyon: iki rolün vardiya kartı */
function shiftPanel(c: Career, now: number) {
  return taxiShift(c) + tagShift(c, now);
}
function setTab(k: string) {
  tab = k;
  document
    .querySelectorAll<HTMLElement>('#careerBody .ctab')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === k)));
  document.querySelectorAll<HTMLElement>('#careerBody .cpanel').forEach((p) => (p.hidden = p.dataset.panel !== k));
}

function act(a: string) {
  const c = C,
    s = S(),
    now = Date.now();
  const [cmd, arg] = a.split(':');
  let ok = true,
    msg = '';
  switch (cmd) {
    case 'taxi':
    case 'tag':
      return startShift(cmd, arg);
    case 'topla': {
      const r = K.collect(c, now);
      msg = T(s.toplaToast, { net: tl(r.gelir - r.taksit) });
      if (r.baglanan)
        setTimeout(
          () => toast(T(s.baglananToast, { n: r.baglanan, ceza: tl(r.baglanan * ECO.tag.baglanmaCezasi) }), true),
          2200,
        );
      break;
    }
    case 'eski':
    case 'yeni':
      ok = K.buyCar(c, cmd);
      msg = s.aracAlindi;
      break;
    case 'sellCar': {
      const a = c.araclar[+arg];
      ok = K.sellCar(c, +arg);
      if (ok) msg = T(s.satildi, { fiyat: tl(K.carPrice(a.tip) * ECO.kariyer.ikinciElOrani) });
      break;
    }
    case 'buyTag':
      ok = K.buyTagCar(c, +arg);
      msg = s.aracAlindi;
      break;
    case 'sellTag': {
      const a = c.tag.araclar[+arg];
      ok = K.sellTagCar(c, +arg, now);
      if (ok) msg = T(s.satildi, { fiyat: tl(K.tagCarPrice(a.seviye) * ECO.kariyer.ikinciElOrani) });
      break;
    }
    case 'hisse':
      ok = K.buyShare(c);
      msg = s.hisseAlindi;
      break;
    case 'hisseSat': {
      const f = K.shareSellPrice(c);
      ok = K.sellShare(c);
      msg = T(s.hisseSatildi, { fiyat: tl(f) });
      if (!ok) {
        toast(s.hisseSatilamaz, true);
        return;
      }
      break;
    }
    case 'kredi':
      ok = K.buyPlateWithCredit(c);
      msg = s.krediAlindi;
      break;
    case 'usdAl':
      ok = K.buyDollars(c, 100);
      break;
    case 'usdSat':
      ok = K.sellDollars(c, 100);
      break;
  }
  if (!ok) toast(s.yetersiz, true);
  else if (msg) toast(msg);
  announceMilestones();
  saveCareer();
  render();
}

/** yeni kilometre taşlarını sırayla duyur */
function announceMilestones() {
  K.checkMilestones(C).forEach((k, i) =>
    setTimeout(() => toast(T(S().tasToast, { tas: S().taslar[k] })), 1800 * (i + 1)),
  );
}
/** Sıralama sayfasındaki kariyer bölümü */
export function careerBoardHtml() {
  if (!C) return '';
  const s = S(),
    c = C;
  const taslar = Object.entries(c.taslar)
    .sort((a, b) => a[1] - b[1])
    .map(([k, g]) => `<li>${esc(s.taslar[k] || k)} <span>${g}. gün</span></li>`)
    .join('');
  return `<section class="cboard"><h3>${esc(s.siralamaBaslik)} · ${esc(UNAME || 'Misafir')}</h3>
    <p class="boss">${esc(T(s.servet, { servet: money(K.wealth(c)) }))} <span>(${esc(s.servetNot)})</span></p>
    ${c.enIyi ? `<p class="boss">${esc(T(s.enIyiVardiya, { net: money(c.enIyi.net), rol: c.enIyi.rol === 'tag' ? s.tagBolum : s.taksiBolum, gun: c.enIyi.gun }))}</p>` : ''}
    <p class="boss">${esc(s.taslarBaslik)}</p>${taslar ? `<ol>${taslar}</ol>` : `<p class="empty">${esc(s.tasYok)}</p>`}</section>`;
}
let lastRole: K.Role = 'taxi';
function startShift(role: K.Role, id: string) {
  lastRole = role;
  lastShift = id;
  const V = ECO.vardiya.secenekler.find((x) => x.id === id),
    now = Date.now();
  closeSheets();
  startRole(role, {
    startH: V.baslangic,
    span: V.saat,
    mods: K.shiftMods(C, role, now),
    stand: C.durak,
    tagLevel: role === 'tag' ? K.tagLevelFor(C, now) : undefined,
    home: C.tag.mahalle,
    kur: C.kur,
    hava: C.hava,
    mudavim: C.mudavim,
  });
  if (C.hava !== 'acik') setTimeout(() => toast(S().hava[C.hava]), 1600);
  if (role === 'tag' && !C.tag.mahalle) {
    C.tag.mahalle = [G.home.x, G.home.y];
    saveCareer();
  }
}
/** gün sonu ekranındaki “Sonraki vardiya”: aynı rol, aynı vardiya */
export function nextShift() {
  startShift(lastRole, lastShift);
}

/** vardiya bitti: kazancı kasaya işle, gün sonu ekranını kariyer dökümüyle doldur */
export function careerEndScreen(why: string) {
  const c = C,
    s = S();
  const r = K.endShift(c, G.money, why, G.role, Date.now(), G.usd || 0, G.stats);
  announceMilestones();
  saveCareer();
  $('endTitle').textContent = s.vardiyaBitti;
  const lines = [T(s.sonucBrut, { brut: money(r.brut) })];
  if (r.rol === 'tag') {
    if (r.arkadas) lines.push(T(s.sonucArkadas, { tutar: tl(r.arkadas) }));
    if (r.komisyon) lines.push(T(s.sonucKomisyon, { tutar: tl(r.komisyon) }));
  } else lines.push(T(s.sonucUcret, { ucret: tl(r.ucret) }));
  if (r.dolar) lines.push(T(s.sonucDolar, { usd: tl(r.dolar) }));
  if (r.puan) lines.push(T(s.sonucPuan, { puan: r.puan.toFixed(1).replace('.', ',') }));
  if (r.gorevOdul)
    lines.push(
      T(s.sonucGorev, { odul: tl(r.gorevOdul) }) + ' (' + r.gorevler.map((g) => s.gorevler[g]).join(', ') + ')',
    );
  if (r.ceza) lines.push(T(s.sonucCeza, { ceza: tl(r.ceza) }));
  if (why === 'hapis' || why === 'ruhsat' || why === 'baglandi') lines.unshift(s[why]);
  $('endWhy').innerHTML = `<span class="endlines">${lines.map(esc).join('<br>')}</span>`;
  $('endMoney').textContent = money(r.net);
  $('endBest').textContent =
    T(s.sonucKasa, { kasa: tl(c.kasa) }) + ' · ' + T(s.ozet, { gun: c.gun + 1, haftaGunu: K.weekday(c) });
  $('founder').hidden = true;
  $('lbEnd').innerHTML = '';
  $('again').textContent = s.sonrakiVardiya;
  $('swap').textContent = s.kariyereDon;
  $('end').hidden = false;
  endReveal(why, r.net, false);
}

/** durak / mahalle seçimi (çok oyunculuda ekip buna göre) */
function onSelect(kind: string, value: string) {
  const M = DLG.cokOyunculu;
  if (kind === 'durak' && ZONES.some((z) => z.name === value)) {
    C.durak = value;
    toast(T(M.durakDegisti, { durak: value }));
  } else if (kind === 'mahalle' && value) {
    const ok = (s: number[]) =>
      district(s[0], s[1]) === value &&
      !ZONES.some((z) => s[0] >= z.x0 - 3 && s[0] <= z.x1 + 3 && s[1] >= z.y0 - 3 && s[1] <= z.y1 + 3);
    const pool = STREETS.filter((s) => ok(s) && s[0] % 4 === 0 && s[1] % 4 === 0);
    const t = rnd(pool.length ? pool : STREETS.filter(ok));
    if (!t) return;
    C.tag.mahalle = [t[0], t[1]];
    toast(T(M.mahalleDegisti, { mahalle: value }));
  }
  saveCareer();
  render();
}
export function initCareer() {
  loadCareer();
  $('careerBody').addEventListener('change', (e: Event) => {
    const el = e.target as HTMLSelectElement;
    if (el.dataset && el.dataset.sel) onSelect(el.dataset.sel, el.value);
  });
  $('careerBody').addEventListener('click', (e: Event) => {
    const tb = (e.target as HTMLElement).closest('button[data-tab]') as HTMLButtonElement;
    if (tb) return setTab(tb.dataset.tab);
    const b = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement;
    if (b && !b.disabled) act(b.dataset.act);
  });
  document.querySelectorAll<HTMLElement>('#modeSel button').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.m;
      save('yk-mod', mode);
      paintMode();
    }),
  );
  paintMode();
}
