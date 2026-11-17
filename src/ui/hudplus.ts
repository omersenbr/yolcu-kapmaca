/* ================= OYUN İÇİ ARAYÜZ: gün kadranı, görev kartı, büyüyen mini harita, çay molası =================
   Metinler data/dialoglar.json → arayuz. Görev ilerlemesi kariyer kaydı + bu vardiyanın sayaçlarından. */
import { $ } from '../core/dom';
import { DLG } from '../sim/content';
import { G, DAY } from '../sim/state';
import { load } from '../sim/storage';
import { T, esc } from '../sim/util';
import * as K from '../sim/career';
import { career } from './career';
import { DPR, mini } from '../render/view';
import { drawMini } from '../render/render';

const A = () => DLG.arayuz;
let n = 0,
  lastDial = -1;
/** her kare (hafif): gün kadranı; birkaç karede bir görev kartı */
export function hudFrame() {
  if (!G || G.over) return;
  const frac = Math.max(0, Math.min(1, 1 - G.time / DAY));
  if (Math.abs(frac - lastDial) > 0.004) {
    lastDial = frac;
    $('dayDial').style.setProperty('--p', (frac * 360).toFixed(1) + 'deg');
  }
  if (n++ % 20 === 0) paintTasks();
}
export function hudReset() {
  lastDial = -1;
  n = 0;
  paintTasks();
}
function paintTasks() {
  const box = $('taskCard');
  if (!G || G.over) {
    box.hidden = true;
    return;
  }
  const c = G.career ? career() : null;
  let html = '';
  if (c) {
    const s = DLG.kariyer,
      st: any = G.stats || {};
    const rows = c.gorevler.liste
      .map((t) => {
        const d = K.taskDef(t.id);
        if (!d || (d.rol && d.rol !== G.role)) return '';
        let v = t.ilerleme;
        if (!t.tamam) {
          if (d.sayac === 'brut') v = Math.max(v, Math.max(0, G.money));
          else if (d.sayac === 'kombo') v = Math.max(v, st.kombo || 0);
          else v += st[d.sayac] || 0;
        }
        const done = t.tamam || v >= d.hedef,
          pct = Math.min(100, (100 * v) / d.hedef);
        return `<li class="${done ? 'done' : ''}"><span>${esc(s.gorevler[t.id])}</span><i style="--w:${pct.toFixed(0)}%"></i></li>`;
      })
      .join('');
    if (rows) html = `<b>${esc(A().gorevBaslik)}</b><ul>${rows}</ul>`;
  } else {
    const best = parseInt(load('yk-best-' + G.role, '0'), 10) || 0,
      pct = best ? Math.max(0, Math.min(100, (100 * G.money) / best)) : 0;
    html = `<b>${esc(A().hizliBaslik)}</b><ul><li class="${best && G.money > best ? 'done' : ''}"><span>${esc(
      best ? T(A().hizliRekor, { rekor: '₺' + best.toLocaleString('tr-TR') }) : A().hizliRekorYok,
    )}</span><i style="--w:${pct.toFixed(0)}%"></i></li></ul>`;
  }
  if (box.dataset.h !== html) {
    box.dataset.h = html;
    box.innerHTML = html;
  }
  box.hidden = !html;
}

/* ---- çay molası: menü düğmesi oyunu durdurur ---- */
let pausedByMe = false;
export function openPause() {
  if (!G || G.over) return;
  const a = A();
  $('pauseTitle').textContent = a.molaBaslik;
  $('pauseTxt').textContent = a.molaMetin[G.role];
  $('pauseGo').textContent = a.devam;
  $('pauseQuit').textContent = a.cik;
  $('pauseNote').textContent = a.cikNot;
  pausedByMe = !G.paused;
  G.paused = true;
  $('pauseOv').hidden = false;
}
export function closePause() {
  $('pauseOv').hidden = true;
  if (G && pausedByMe && !G.busy && $('comic').hidden) G.paused = false;
  pausedByMe = false;
}
export function initHudPlus(toMenu: () => void) {
  $('pauseGo').addEventListener('click', closePause);
  $('pauseQuit').addEventListener('click', () => {
    $('pauseOv').hidden = true;
    pausedByMe = false;
    toMenu();
  });
  // mini harita: dokununca büyür, tekrar dokununca küçülür
  mini.title = A().haritaIpucu;
  mini.addEventListener('pointerdown', (e) => e.stopPropagation());
  mini.addEventListener('click', (e) => {
    e.stopPropagation();
    mini.classList.toggle('big');
    const r = mini.getBoundingClientRect();
    mini.width = Math.round(r.width * DPR);
    mini.height = Math.round(r.height * DPR);
    drawMini();
  });
}
