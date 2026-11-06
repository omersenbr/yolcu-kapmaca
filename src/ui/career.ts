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
const tl = (n: number) => Math.round(n).toLocaleString('tr-TR');
/** işaretli tutar: −₺800 / ₺800 */
const money = (n: number) => (n < 0 ? '−₺' : '₺') + tl(Math.abs(n));

export const careerMode = () => mode === 'kariyer';
export const career = () => C;

export function loadCareer() {
  try {
    const v = JSON.parse(load(KEY, 'null'));
    if (v && v.v === 1) C = v;
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
  const tag = document.querySelector<HTMLButtonElement>('#start .role.tag');
  if (tag) {
    tag.disabled = careerMode();
    tag.querySelector('.rt span').textContent = careerMode() ? S().tagYakinda : 'Taksicilere ve polise yakalanma';
  }
}

/* ---- kariyer sayfası ---- */
export function openCareer() {
  const r = K.claimDaily(C, Date.now());
  if (r) {
    toast(T(S().girisOdul, { seri: r.seri, odul: tl(r.odul) }));
    saveCareer();
  }
  render();
  openSheet('career');
}

function btn(act: string, text: string, ok = true, alt = false) {
  return `<button class="btn${alt ? ' alt' : ''}" data-act="${act}"${ok ? '' : ' disabled'}>${esc(text)}</button>`;
}

function render() {
  const c = C,
    s = S(),
    now = Date.now();
  const st = K.status(c),
    fee = K.shiftFee(c),
    acc = K.accrued(c, now),
    fx = K.fx(c),
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
  const yeni = ECO.filo.yeniTaksi;
  $('careerTitle').textContent = s.statu[st];
  $('careerBody').innerHTML = `
    <div class="cstats">
      <div><small>${esc(s.kasa)}</small><b>${c.kasa < 0 ? '−' : ''}₺${tl(Math.abs(c.kasa))}</b></div>
      <div><small>${esc(s.dolar)}</small><b>$${tl(c.dolar)}</b></div>
      <div><small>${esc(s.kur)}</small><b>₺${fx.satis.toFixed(2).replace('.', ',')}</b></div>
    </div>
    <p class="cmeta">${esc(T(s.ozet, { gun: c.gun + 1, haftaGunu: K.weekday(c) }))} · ${esc(T(s.durak, { durak: c.durak }))}${
      K.isBusyDay(c) ? `<br><span class="busy">${esc(s.yogunGun)}</span>` : ''
    }</p>
    <section class="csec"><h4>${esc(s.vardiyaBaslik)}</h4><p>${esc(feeLine)}${
      K.playerCarOld(c) ? '<br>' + esc(s.eskiArac) : ''
    }</p><div class="row">${btn('gunduz', s.gunduz)}${btn('gece', s.gece)}</div></section>
    <section class="csec"><h4>${esc(s.toplaBaslik)}</h4><p>${
      c.araclar.length || c.plakaPay
        ? esc(
            T(s.toplaMetin, {
              saat: acc.saat.toFixed(1).replace('.', ','),
              gelir: tl(acc.gelir),
              taksit: acc.taksit ? T(s.toplaTaksit, { taksit: tl(acc.taksit) }) : '',
            }) + (acc.dolu ? s.toplaDolu : ''),
          )
        : esc(s.toplaBos)
    }</p>${c.araclar.length || c.plakaPay ? `<div class="row">${btn('topla', s.toplaDugme, acc.gelir > 0 || acc.taksit > 0)}</div>` : ''}</section>
    <section class="csec"><h4>${esc(s.garajBaslik)}</h4><p>${esc(T(s.garajMetin, { n: c.araclar.length, slot: K.carSlots(c) }))}</p>
      <div class="row">${btn('eski', T(s.eskiAl, { fiyat: tl(K.carPrice('eski')) }), K.canBuyCar(c, 'eski'))}${btn(
        'yeni',
        T(s.yeniAl, { fiyat: tl(yeni) }),
        K.canBuyCar(c, 'yeni'),
        true,
      )}</div></section>
    <section class="csec"><h4>${esc(s.plakaBaslik)}</h4><p>${esc(T(s.plakaMetin, { pay, fiyat: tl(ECO.taksi.plakaSatis) }))}${
      c.borc > 0 ? '<br>' + esc(T(s.borcVar, { borc: tl(c.borc) })) : ''
    }</p>
      <div class="row">${btn('hisse', T(s.hisseAl, { fiyat: tl(K.sharePrice()) }), K.canBuyShare(c))}${btn(
        'kredi',
        T(s.krediAl, { pesinat: tl(kr.pesinat) }),
        kr.ok,
        true,
      )}</div>${kr.ok ? `<p>${esc(T(s.krediMetin, { borc: tl(kr.borc), vade: kr.vade, taksit: tl(kr.taksit) }))}</p>` : ''}</section>
    <section class="csec"><h4>${esc(s.dovizBaslik)}</h4><p>${esc(
      T(s.dovizMetin, { alis: fx.alis.toFixed(2).replace('.', ','), satis: fx.satis.toFixed(2).replace('.', ',') }),
    )}</p>
      <div class="row">${btn('usdAl', s.dolarAl, c.kasa >= 100 * fx.alis)}${btn('usdSat', s.dolarSat, c.dolar >= 100, true)}</div></section>`;
}

function act(a: string) {
  const c = C,
    s = S();
  let ok = true,
    msg = '';
  switch (a) {
    case 'gunduz':
    case 'gece':
      return startShift(a);
    case 'topla': {
      const r = K.collect(c, Date.now());
      msg = T(s.toplaToast, { net: tl(r.gelir - r.taksit) });
      break;
    }
    case 'eski':
    case 'yeni':
      ok = K.buyCar(c, a);
      msg = s.aracAlindi;
      break;
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

function startShift(id: string) {
  lastShift = id;
  const V = ECO.vardiya.secenekler.find((x) => x.id === id);
  closeSheets();
  startRole('taxi', { startH: V.baslangic, span: V.saat, mods: K.shiftMods(C), stand: C.durak });
}
/** gün sonu ekranındaki “Sonraki vardiya” */
export function nextShift() {
  startShift(lastShift);
}

/** vardiya bitti: kazancı kasaya işle, gün sonu ekranını kariyer dökümüyle doldur */
export function careerEndScreen(why: string) {
  const c = C,
    s = S();
  const r = K.endShift(c, G.money, why);
  saveCareer();
  $('endTitle').textContent = s.vardiyaBitti;
  const lines = [T(s.sonucBrut, { brut: money(r.brut) }), T(s.sonucUcret, { ucret: tl(r.ucret) })];
  if (r.ceza) lines.push(T(s.sonucCeza, { ceza: tl(r.ceza) }));
  if (why === 'hapis' || why === 'ruhsat') lines.unshift(s[why]);
  $('endWhy').innerHTML = `<span class="endlines">${lines.map(esc).join('<br>')}</span>`;
  $('endMoney').textContent = (r.net < 0 ? '−₺' : '₺') + tl(Math.abs(r.net));
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
