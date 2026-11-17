/* ================= TÖRENLER: vardiya başı geri sayım, gün sonu gazete manşeti, seviye atlama =================
   Metinler data/dialoglar.json → toren. Rastgele seçim oyunun üretecinden yapılmaz. */
import { $, reduce } from '../core/dom';
import { assetUrl } from '../core/assets';
import { DLG, MANIFEST } from '../sim/content';
import { G } from '../sim/state';
import { load } from '../sim/storage';
import { T } from '../sim/util';
import { sfx } from '../audio/sound';

let seed = 11;
const pick = <X>(a: X[]): X => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return a[seed % a.length];
};
/** test ve eşitlik için kapatılabilir (yk-geri-sayim=0) */
const countdownOn = () => load('yk-geri-sayim', '1') === '1';

/** vardiya başı: 3, 2, 1, “TAKSİMETRE AÇIK!”; bu sırada dünya durur */
export function countdown() {
  if (!G || !countdownOn()) return;
  const box = $('countdown'),
    num = $('cdNum'),
    go = DLG.toren.geriSayim[G.role];
  G.paused = true;
  box.hidden = false;
  const steps = ['3', '2', '1', go];
  let i = 0;
  const next = () => {
    if (!G || G.over) {
      box.hidden = true;
      return;
    }
    if (i >= steps.length) {
      box.hidden = true;
      // bu arada bir sahne açıldıysa dünyayı o kapatırken açar
      if (!G.busy && $('comic').hidden) G.paused = false;
      return;
    }
    const t = steps[i++];
    num.textContent = t;
    num.className = i === steps.length ? 'go' : '';
    void num.offsetWidth;
    num.classList.add('pop');
    sfx(i === steps.length ? 'basla' : 'geri');
    setTimeout(next, i === steps.length ? 700 : 600);
  };
  next();
}

/** gün sonu: manşet, sayarak artan kazanç, satırlar sırayla, damga */
export function endReveal(why: string, final: number, rekor: boolean) {
  const R = DLG.toren,
    role = G ? G.role : 'taxi';
  const key = why === 'time' ? (final < 0 ? 'zarar' : 'time') : why;
  const M = R.manset[key];
  $('endHead').textContent = pick(Array.isArray(M) ? M : M[role]);
  // damga
  const st = $('endStamp'),
    dk = rekor && why === 'time' ? 'rekor' : why === 'time' ? (final < 0 ? 'zarar' : 'iyi') : why;
  const good = dk === 'rekor' || dk === 'iyi';
  st.className = 'endstamp ' + (good ? 'good' : 'bad');
  st.style.backgroundImage = `url(${assetUrl(good ? MANIFEST.ui.fx_burst : MANIFEST.ui.stamp_red)})`;
  st.innerHTML = `<b>${R.damga[dk] || ''}</b>`;
  st.hidden = true;
  // satırlar sırayla
  const lines = document.querySelectorAll<HTMLElement>('#end .card > *');
  lines.forEach((el, k) => {
    el.style.animationDelay = reduce ? '0s' : k * 0.08 + 's';
    el.classList.remove('rise');
    void el.offsetWidth;
    el.classList.add('rise');
  });
  // kazanç sayarak artar
  const el = $('endMoney'),
    txt = el.textContent,
    t0 = performance.now(),
    dur = reduce ? 0 : 1100;
  const fmt = (v: number) => (v < 0 ? '−₺' : '₺') + Math.abs(Math.round(v)).toLocaleString('tr-TR');
  const tick = () => {
    const k = dur ? Math.min(1, (performance.now() - t0) / dur) : 1;
    if (k < 1) {
      el.textContent = fmt(final * (1 - (1 - k) ** 3));
      if (Math.floor(k * 12) !== Math.floor(((performance.now() - t0 - 16) / dur) * 12)) sfx('para');
      requestAnimationFrame(tick);
    } else {
      el.textContent = txt; // son değer hesaplanan metinle birebir
      st.hidden = false;
      sfx(good ? 'iyi' : 'kotu');
    }
  };
  requestAnimationFrame(tick);
}

/** Tag seviyesi atladı: yeni araba kartı */
export function levelUp(arac: string, spr: string) {
  const R = DLG.toren,
    box = $('levelup'),
    ci = MANIFEST.cars_iso && MANIFEST.cars_iso.araclar[spr],
    file = ci && ci.on ? ci.on.file : MANIFEST.cars[spr] && MANIFEST.cars[spr].file;
  $('lvTitle').textContent = R.seviyeBaslik;
  $('lvText').textContent = T(R.seviyeAlt, { arac });
  ($('lvCar') as HTMLImageElement).src = file ? assetUrl(file) : '';
  box.hidden = false;
  sfx('iyi');
  setTimeout(() => (box.hidden = true), 2600);
}
