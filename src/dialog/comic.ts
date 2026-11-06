// <auto-imports>
import { $ } from '../core/dom';
import { G } from '../core/state';
import { esc, reduce } from '../core/util';
import { cv } from '../render/view';
import { updHud } from '../ui/hud';
import { pageTurn } from '../ui/pageflip';
import type { Choice } from '../core/types';
// </auto-imports>
export interface CastMember {
  svg: string;
  name: string;
}
/* ================= KARİKATÜR PANELİ: donmuş kare, balon, süreli cevaplar, şüphe göstergesi ================= */
export const ui = {
  comic: $('comic'),
  panel: $('panel'),
  cap: $('cap'),
  cast: $('cast'),
  bubble: $('bubble'),
  meter: $('meter'),
  bar: $('meterBar'),
  answers: $('answers'),
  timer: $('timer'),
  tbar: $('timerBar'),
};
export function panelScene() {
  // olay anının haritadan donmuş karesi: bizim araçlarımız, gerçek sokak
  try {
    const W = cv.width,
      H = cv.height,
      ch = Math.min(H, W * 1.25),
      cw = ch * 0.8,
      sx = (W - cw) / 2,
      sy = (H - ch) / 2;
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 600;
    const g = c.getContext('2d');
    g.drawImage(cv, sx, sy, cw, ch, 0, 0, 480, 600);
    return c.toDataURL('image/jpeg', 0.72);
  } catch (e) {
    return null;
  }
}
export function openPanel(theme: string, caption: string, cast: CastMember[], hide?: boolean) {
  if (ui.comic.hidden) {
    const sc = G && !G.over ? panelScene() : null;
    if (sc) {
      ui.panel.style.backgroundImage = `radial-gradient(rgba(0,0,0,.16) 1.3px,transparent 1.7px),linear-gradient(var(--pbg),var(--pbg)),linear-gradient(rgba(255,255,255,.45),rgba(255,255,255,.45)),url(${sc})`;
      ui.panel.style.backgroundSize = '9px 9px,cover,cover,cover';
      ui.panel.style.backgroundPosition = '0 0,center,center,center';
      ui.panel.style.backgroundBlendMode = 'normal,multiply,normal,normal';
    } else {
      ui.panel.style.backgroundImage = '';
      ui.panel.style.backgroundSize = '';
      ui.panel.style.backgroundBlendMode = '';
    }
    pageTurn();
  }
  if (G) {
    G.hideName = !!hide;
    updHud();
  }
  ui.panel.className = 'panel ' + theme;
  void ui.panel.offsetWidth;
  if (!reduce) ui.panel.classList.add('pop');
  ui.cap.textContent = caption;
  setCast(cast);
  ui.meter.hidden = true;
  ui.bubble.hidden = false;
  ui.answers.innerHTML = '';
  ui.comic.hidden = false;
}
export function setCast(cast) {
  ui.cast.innerHTML = cast.map((c) => `<figure>${c.svg}<figcaption>${esc(c.name)}</figcaption></figure>`).join('');
}
export function setBubble(who: string, text: string, info?: string) {
  ui.bubble.innerHTML = `<b>${esc(who)}</b>${esc(text)}${info ? `<small>${esc(info)}</small>` : ''}`;
}
export let timerIv = 0;
export function stopTimer() {
  clearInterval(timerIv);
}
export function buttons(list: Choice[], timed?: number): Promise<Choice> {
  ui.answers.innerHTML = '';
  clearInterval(timerIv);
  ui.timer.hidden = !timed;
  return new Promise<Choice>((res) => {
    const t0 = performance.now();
    let done = false;
    const finish = (o) => {
      if (done) return;
      done = true;
      clearInterval(timerIv);
      ui.timer.hidden = true;
      ui.answers.innerHTML = '';
      res(Object.assign({}, o, { el: (performance.now() - t0) / 1000 }));
    };
    list.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'ans' + (o.go ? ' go' : '');
      b.innerHTML = (list.length > 1 ? `<i>${i + 1}</i>` : '') + `<span>${esc(o.t)}</span>`;
      b.addEventListener('click', () => finish(o));
      ui.answers.appendChild(b);
    });
    if (timed) {
      ui.tbar.style.width = '100%';
      ui.tbar.style.background = '#111';
      timerIv = setInterval(() => {
        const k = (performance.now() - t0) / 1000 / timed;
        ui.tbar.style.width = Math.max(0, 100 * (1 - k)) + '%';
        ui.tbar.style.background = k > 0.6 ? '#d62828' : '#111';
        if (k >= 1) finish({ timeout: true });
      }, 100);
    }
  });
}
export function ask(who: string, text: string, opts: Choice[], info?: string | null, timed?: number) {
  setBubble(who, text, info);
  return buttons(opts, timed);
}
export function say(who: string, text: string, btn?: string) {
  setBubble(who, text);
  return buttons([{ t: btn || 'Devam', go: true }]);
}
export function meter(v) {
  ui.meter.hidden = false;
  ui.bar.style.width = Math.round(v * 100) + '%';
}
export function closePanel() {
  if (!ui.comic.hidden) pageTurn();
  ui.comic.hidden = true;
  ui.answers.innerHTML = '';
  clearInterval(timerIv);
  ui.timer.hidden = true;
  if (!G) return;
  G.hideName = false;
  G.paused = false;
  G.zoomT = 1;
  G.focus = null;
  G.busy = false;
  updHud();
}
