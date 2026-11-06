/* ================= KARİYER EKRANI: kasa, vardiya seçimi, garaj, plaka, döviz, günlük ödül =================
   Kural ve hesaplar sim/career.ts’de; burası yalnızca gösterir ve kaydeder (localStorage: yk-kariyer). */
import { $ } from '../core/dom';
import { DLG, ECO } from '../sim/content';
import * as K from '../sim/career';
import type { Career } from '../sim/career';
import { ZONES } from '../sim/grid';
import { G } from '../sim/state';
import { load, save } from '../sim/storage';
import { T, esc, rnd } from '../sim/util';
import { toast } from './hud';
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
  const r = K.claimDaily(C, Date.now());
  if (r) {
    toast(T(S().girisOdul, { seri: r.seri, odul: tl(r.odul) }));
    saveCareer();
  }
  render();
  openSheet('career');
  if (role) $(role === 'tag' ? 'cs-tag' : 'cs-taxi').scrollIntoView({ block: 'start' });
}

function btn(act: string, text: string, ok = true, alt = false) {
  return `<button class="btn${alt ? ' alt' : ''}" data-act="${act}"${ok ? '' : ' disabled'}>${esc(text)}</button>`;
}
const fmtKur = (k: number) => k.toFixed(2).replace('.', ',');
const carName = (seviye: number) => DLG.tagLevels.levels[seviye].ad;

function taxiSection(c: Career) {
  const s = S(),
    fee = K.shiftFee(c),
    kr = K.creditInfo(c);
  const pay =
    c.plakaPay >= 1
      ? c.plakaPay.toFixed(3).replace(/\.?0+$/, '')
      : c.plakaPay
        ? `${Math.round(c.plakaPay * 8)}/8`
        : '0';
  let feeLine: string;
  if (K.drivesOwnCar(c)) feeLine = T(c.plakaPay >= 1 ? s.vardiyaKendiPlaka : s.vardiyaKendi, { ucret: tl(fee) });
  else if (c.cirakKalan > 0) feeLine = T(s.vardiyaCirak, { ucret: tl(fee), kalan: c.cirakKalan });
  else feeLine = T(s.vardiyaPatron, { ucret: tl(fee) });
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
  return `<h3 class="crole" id="cs-taxi">${esc(s.taksiBolum)} · ${esc(s.statu[K.status(c)])}</h3>
    <section class="csec"><h4>${esc(s.taksiVardiya)}</h4><p>${esc(feeLine)}${
      K.playerCarOld(c) ? '<br>' + esc(s.eskiArac) : ''
    }</p><div class="row">${btn('taxi:gunduz', s.gunduz)}${btn('taxi:gece', s.gece)}</div></section>
    <section class="csec"><h4>${esc(s.garajBaslik)}</h4><p>${esc(T(s.garajMetin, { n: c.araclar.length, slot: K.carSlots(c) }))}</p>
      <div class="row">${btn('eski', T(s.eskiAl, { fiyat: tl(K.carPrice('eski')) }), K.canBuyCar(c, 'eski'))}${btn(
        'yeni',
        T(s.yeniAl, { fiyat: tl(ECO.filo.yeniTaksi) }),
        K.canBuyCar(c, 'yeni'),
        true,
      )}</div>${sell ? `<div class="row">${sell}</div>` : ''}</section>
    <section class="csec"><h4>${esc(s.plakaBaslik)}</h4><p>${esc(T(s.plakaMetin, { pay, fiyat: tl(ECO.taksi.plakaSatis) }))}${
      c.borc > 0 ? '<br>' + esc(T(s.borcVar, { borc: tl(c.borc) })) : ''
    }</p>
      <div class="row">${btn('hisse', T(s.hisseAl, { fiyat: tl(K.sharePrice()) }), K.canBuyShare(c))}${btn(
        'kredi',
        T(s.krediAl, { pesinat: tl(kr.pesinat) }),
        kr.ok,
        true,
      )}</div>${kr.ok ? `<p>${esc(T(s.krediMetin, { borc: tl(kr.borc), vade: kr.vade, taksit: tl(kr.taksit) }))}</p>` : ''}</section>`;
}

function tagSection(c: Career, now: number) {
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
  const buy = TG.araclar
    .map((_, sv: number) =>
      btn('buyTag:' + sv, T(s.tagAl, { arac: carName(sv), fiyat: tl(K.tagCarPrice(sv)) }), K.canBuyTagCar(c, sv)),
    )
    .join('');
  return `<h3 class="crole" id="cs-tag">${esc(s.tagBolum)} · ${esc(s.statu[K.tagStatus(c)])}</h3>
    <section class="csec"><h4>${esc(s.tagVardiya)}</h4><p>${esc(line)}${parkLine}</p>
      <div class="row">${btn('tag:gunduz', s.gunduz)}${btn('tag:gece', s.gece)}</div></section>
    <section class="csec"><h4>${esc(s.garajBaslik)}</h4><p>${esc(T(s.tagGarajMetin, { n: c.tag.araclar.length, limit: TG.filoLimiti }))}</p>
      <div class="row">${buy}</div>${own ? `<div class="row">${own}</div>` : ''}</section>`;
}

function render() {
  const c = C,
    s = S(),
    now = Date.now();
  const acc = K.accrued(c, now),
    fx = K.fx(c),
    hasAssets = c.araclar.length || c.plakaPay || c.tag.araclar.length > 1;
  $('careerTitle').textContent = s.baslik;
  $('careerBody').innerHTML = `
    <div class="cstats">
      <div><small>${esc(s.kasa)}</small><b>${money(c.kasa)}</b></div>
      <div><small>${esc(s.dolar)}</small><b>$${tl(c.dolar)}</b></div>
      <div><small>${esc(s.kur)}</small><b>₺${fmtKur(fx.satis)}</b></div>
    </div>
    <p class="cmeta">${esc(T(s.ozet, { gun: c.gun + 1, haftaGunu: K.weekday(c) }))} · ${esc(T(s.durak, { durak: c.durak }))}${
      K.isBusyDay(c) ? `<br><span class="busy">${esc(s.yogunGun)}</span>` : ''
    }<br>${esc(s.rolNotu)}</p>
    <section class="csec"><h4>${esc(s.toplaBaslik)}</h4><p>${
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
    ${taxiSection(c)}
    ${tagSection(c, now)}
    <h3 class="crole">${esc(s.dovizBaslik)}</h3>
    <section class="csec"><p>${esc(T(s.dovizMetin, { alis: fmtKur(fx.alis), satis: fmtKur(fx.satis) }))}</p>
      <div class="row">${btn('usdAl', s.dolarAl, c.kasa >= 100 * fx.alis)}${btn('usdSat', s.dolarSat, c.dolar >= 100, true)}</div></section>`;
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
  saveCareer();
  render();
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
  });
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
  const r = K.endShift(c, G.money, why, G.role, Date.now());
  saveCareer();
  $('endTitle').textContent = s.vardiyaBitti;
  const lines = [T(s.sonucBrut, { brut: money(r.brut) })];
  if (r.rol === 'tag') {
    if (r.arkadas) lines.push(T(s.sonucArkadas, { tutar: tl(r.arkadas) }));
    if (r.komisyon) lines.push(T(s.sonucKomisyon, { tutar: tl(r.komisyon) }));
  } else lines.push(T(s.sonucUcret, { ucret: tl(r.ucret) }));
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
}

export function initCareer() {
  loadCareer();
  $('careerBody').addEventListener('click', (e: Event) => {
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
