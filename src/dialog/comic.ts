// <auto-imports>
import { $ } from '../core/dom';
import { G } from '../sim/state';
import { reduce } from '../core/dom';
import { esc } from '../sim/util';
import { cv } from '../render/view';
import { updHud } from '../ui/hud';
import { pageTurn } from '../ui/pageflip';
import type { Choice } from '../sim/types';
import { DLG, MANIFEST } from '../sim/content';
import { assetUrl } from '../core/assets';
import { bestOption, profanity } from '../sim/nlu';
import { canListen, freeformOn, listen, speak, stopListening, stopSpeaking } from './voice';
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
/* olay anının haritadan donmuş karesi: kare anında küçük bir tuvale kopyalanır,
   JPEG kodlaması ana iş parçacığını kilitlememek için toBlob ile arka planda yapılır */
let sceneUrl = '',
  sceneToken = 0;
function setSceneBg(url: string | null) {
  const st = ui.panel.style;
  if (url) {
    st.backgroundImage = `radial-gradient(rgba(0,0,0,.16) 1.3px,transparent 1.7px),linear-gradient(var(--pbg),var(--pbg)),linear-gradient(rgba(255,255,255,.45),rgba(255,255,255,.45)),url(${url})`;
    st.backgroundSize = '9px 9px,cover,cover,cover';
    st.backgroundPosition = '0 0,center,center,center';
    st.backgroundBlendMode = 'normal,multiply,normal,normal';
  } else {
    st.backgroundImage = '';
    st.backgroundSize = '';
    st.backgroundBlendMode = '';
  }
}
export function panelScene(): boolean {
  const token = ++sceneToken;
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
    c.toBlob(
      (b) => {
        if (!b || token !== sceneToken) return;
        if (sceneUrl) URL.revokeObjectURL(sceneUrl);
        sceneUrl = URL.createObjectURL(b);
        setSceneBg(sceneUrl);
      },
      'image/jpeg',
      0.72,
    );
    return true;
  } catch (e) {
    return false;
  }
}
export function openPanel(theme: string, caption: string, cast: CastMember[], hide?: boolean) {
  if (ui.comic.hidden) {
    // donmuş kare hazır olana kadar düz panel; hazır olunca arka plana oturur
    setSceneBg(null);
    if (!(G && !G.over && panelScene())) sceneToken++;
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
  speak(who, text);
}
/** serbest konuşma seçenekleri (sorgular): yazı kutusu açılır, sürede ek pay */
export interface FreeOpts {
  serbest?: boolean;
}
export let timerIv = 0;
export function stopTimer() {
  clearInterval(timerIv);
}
export function buttons(list: Choice[], timed?: number, free?: FreeOpts): Promise<Choice> {
  const serbest = !!free && freeformOn() && list.length > 1;
  if (serbest && timed) timed *= 1.5; // konuşmak/yazmak için ek süre
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
      stopListening();
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
    if (serbest) addFreeform(list, finish);
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
export function ask(who: string, text: string, opts: Choice[], info?: string | null, timed?: number, free?: FreeOpts) {
  setBubble(who, text, info);
  return buttons(opts, timed, free);
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
  stopSpeaking();
  stopListening();
  if (G) G.mpAlly = null;
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

/* ---- serbest konuşma satırı: yazı kutusu + mikrofon; her cümle onText’e gider (geri çevrilmez) ---- */
export function freeRow(onText: (text: string) => void, placeholder?: string) {
  const U = DLG.serbestSohbet.ui;
  const row = document.createElement('div');
  row.className = 'freeform';
  row.innerHTML = `<input type="text" autocomplete="off" placeholder="${esc(placeholder || U.yer)}"><button class="mic" type="button" aria-label="${esc(U.mikrofon)}"></button><button class="send" type="button">${esc(U.gonder)}</button><small></small>`;
  ui.answers.appendChild(row);
  const inp = row.querySelector('input') as HTMLInputElement,
    hint = row.querySelector('small') as HTMLElement,
    mic = row.querySelector('.mic') as HTMLButtonElement;
  mic.style.backgroundImage = `url(${assetUrl(MANIFEST.ui.i_radio)})`;
  const submit = (text: string) => {
    if (!text.trim()) return;
    inp.value = '';
    hint.textContent = '';
    onText(text.trim());
  };
  row.querySelector('.send').addEventListener('click', () => submit(inp.value));
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation(); // 1–4 kısayolları yazarken çalışmasın
    if (e.key === 'Enter') submit(inp.value);
  });
  mic.addEventListener('click', () => {
    if (!canListen()) {
      hint.textContent = U.sesYok;
      return;
    }
    mic.classList.add('on');
    hint.textContent = U.dinliyor;
    listen(
      (t) => (inp.value = t),
      (t) => {
        mic.classList.remove('on');
        submit(t);
      },
      (code) => {
        mic.classList.remove('on');
        hint.textContent = code === 'izin' ? U.izinYok : code === 'yok' ? U.sesYok : '';
      },
    );
  });
  return { row, inp };
}
/** sorgu cevabı: küfür → kufur; seçeneğe uyarsa o seçenek; uymazsa kaçamak cevap (yine gönderilir) */
function addFreeform(list: Choice[], finish: (o: Choice) => void) {
  freeRow((text) => {
    const k = profanity(text);
    if (k) return finish({ kufur: k, said: text });
    const m = bestOption(
      text,
      list.filter((o) => !o.go && !o.decide),
    );
    finish(m.option ? { ...m.option, said: text } : { kacamak: true, said: text });
  });
}
