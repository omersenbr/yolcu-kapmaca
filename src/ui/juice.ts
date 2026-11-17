/* ================= ÖDÜL HİSSİ: uçan paralar, yuvarlanan kasa, mizah dergisi damgaları, sarsıntı, titreşim =================
   Simülasyon bus.juice(tür) ile haber verir; metinler data/dialoglar.json → juice. Parasal değişimler kasa
   izlenerek yakalanır. Burada Math.random kullanılmaz (oyunun rastgeleliğini ve eşitlik testini bozmasın). */
import { $, reduce } from '../core/dom';
import { assetUrl } from '../core/assets';
import { DLG, MANIFEST } from '../sim/content';
import { G, TL, tagLevel } from '../sim/state';
import { levelUp } from './ceremony';
import { T } from '../sim/util';
import { muted, sfx } from '../audio/sound';
import { playerScr } from '../render/view';

let seed = 7;
const pick = <X>(a: X[]): X => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return a[seed % a.length];
};
const vibrate = (ms: number | number[]) => {
  if (muted) return;
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
    /* desteklenmiyor */
  }
};

/* ---- kasa: gösterilen değer gerçeğe doğru yuvarlanır ---- */
let shown: number | null = null,
  lastMoney: number | null = null,
  lastUsd = 0;
const fmt = (v: number) => (v < 0 ? '−₺' : '₺') + Math.abs(Math.round(v)).toLocaleString('tr-TR');
function showMoney() {
  const el = $('moneyShow');
  if (!el || !G) return;
  el.textContent = fmt(shown ?? G.money) + (G.usd ? ' +$' + G.usd : '');
}
/** her kare: kasayı izle, değiştiyse para uçur ve sayacı yuvarla */
export function juiceFrame(dt: number) {
  if (!G) return;
  if (lastMoney === null || G.money === undefined) {
    lastMoney = G.money;
    shown = G.money;
    lastUsd = G.usd || 0;
    showMoney();
    return;
  }
  const d = G.money - lastMoney;
  if (d) {
    lastMoney = G.money;
    if (Math.abs(d) >= 5) fly(d);
    if (d < 0) bump('neg');
  }
  if ((G.usd || 0) > lastUsd) {
    lastUsd = G.usd;
    fly(1, true);
  }
  if (shown !== G.money) {
    const k = Math.min(1, dt * 7),
      nx = shown + (G.money - shown) * k;
    shown = Math.abs(G.money - nx) < 1 ? G.money : nx;
  }
  showMoney();
}
/** yeni gün/vardiya: sayaç sıfırdan başlamasın */
export function juiceReset() {
  lastMoney = null;
  shown = null;
}
function bump(kind: 'pos' | 'neg') {
  const box = $('moneyBox');
  if (!box) return;
  box.classList.remove('bump-pos', 'bump-neg');
  void box.offsetWidth;
  box.classList.add('bump-' + kind);
}
/** para jetonları aracın üstünden kasaya uçar (eksi ise kasadan araca) */
function fly(d: number, usd = false) {
  const layer = $('juiceLayer'),
    box = $('moneyBox');
  if (!layer || !box || reduce) {
    if (d > 0) sfx('para');
    return;
  }
  const r = box.getBoundingClientRect(),
    L = layer.getBoundingClientRect(),
    tx = r.left + r.width / 2 - L.left,
    ty = r.top + r.height / 2 - L.top,
    sx = playerScr.x,
    sy = playerScr.y - 20;
  const n = d > 0 ? Math.min(9, 3 + Math.floor(Math.log10(Math.abs(d) + 1) * 2)) : 3,
    src = assetUrl(MANIFEST.ui.i_coins);
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.className = 'coin' + (d < 0 ? ' neg' : '') + (usd ? ' usd' : '');
    c.style.backgroundImage = `url(${src})`;
    const [ax, ay, bx, by] = d > 0 ? [sx, sy, tx, ty] : [tx, ty, sx, sy];
    const jx = ((i * 37) % 60) - 30,
      jy = ((i * 53) % 40) - 30;
    c.style.left = ax + 'px';
    c.style.top = ay + 'px';
    c.style.setProperty('--jx', jx + 'px');
    c.style.setProperty('--jy', jy + 'px');
    c.style.setProperty('--dx', bx - ax + 'px');
    c.style.setProperty('--dy', by - ay + 'px');
    c.style.animationDelay = i * 45 + 'ms';
    layer.appendChild(c);
    setTimeout(
      () => {
        c.remove();
        if (i === n - 1 && d > 0) bump('pos');
      },
      800 + i * 45,
    );
  }
  if (d > 0) {
    sfx('para');
    // her jeton kasaya varınca küçük bir “çın”
    for (let i = 1; i < Math.min(n, 4); i++) setTimeout(() => sfx('para'), 520 + i * 90);
  }
}

/* ---- damga: dergi sayfasına basılmış gibi; iyi olay sarı patlama, kötü olay kırmızı mühür ---- */
let lastStamp = 0;
export function juice(kind: string, n?: number) {
  if (kind === 'seviye' && G) setTimeout(() => levelUp(TL().ad, 'tag' + (tagLevel() + 1)), 1800);
  const J = DLG.juice && DLG.juice[kind];
  if (!J) return;
  const layer = $('juiceLayer');
  vibrate(J.iyi ? 25 : [60, 40, 60]);
  sfx(J.iyi ? 'iyi' : 'kotu');
  if (!J.iyi) shake();
  if (!layer || !J.metin.length) return;
  // üst üste binmesin: art arda gelen damgalar biraz aşağı kayar
  const now = performance.now(),
    stack = now - lastStamp < 900;
  lastStamp = now;
  const el = document.createElement('div');
  el.className = 'stampfx ' + (J.iyi ? 'good' : 'bad');
  el.style.backgroundImage = `url(${assetUrl(J.iyi ? MANIFEST.ui.fx_burst : MANIFEST.ui.stamp_red)})`;
  el.style.setProperty('--rot', (((seed >> 3) % 12) - 6) * (J.iyi ? 1 : 1.5) + 'deg');
  if (stack) el.style.top = '38%';
  el.innerHTML = `<b>${T(pick(J.metin), { n: String(n ?? '') })}</b>`;
  layer.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}
/** ekran sarsıntısı */
export function shake(strong = false) {
  if (reduce) return;
  const st = $('stage');
  st.classList.remove('shake', 'shake2');
  void st.offsetWidth;
  st.classList.add(strong ? 'shake2' : 'shake');
}
