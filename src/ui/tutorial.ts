/* ================= ÖĞRETİCİ: ilk oyunda rol başına bir kez, karikatür balonuyla =================
   Taksicide Durak Reisi, Tag’cide Kuzen anlatır. Her adım bir eylemi bekler (kaydır, yolcu al, teslim et)
   ya da “Tamam”la geçilir. Oyun durmaz. Metinler data/dialoglar.json → ogretici. Kapatma: yk-ogretici=0. */
import { $ } from '../core/dom';
import { DLG } from '../sim/content';
import { G } from '../sim/state';
import { load, save } from '../sim/storage';
import { esc } from '../sim/util';
import { face } from '../dialog/portraits';
import { LOOK } from '../sim/passengers';
import { sfx } from '../audio/sound';

let iv = 0,
  step = 0,
  role = 'taxi',
  base: any = {};
const doneKey = (r: string) => 'yk-ogretici-' + r;
export function tutorialReset() {
  save(doneKey('taxi'), '0');
  save(doneKey('tag'), '0');
}
export function stopTutorial() {
  clearInterval(iv);
  iv = 0;
  $('tutor').hidden = true;
}
/** vardiya başında çağrılır (geri sayımdan sonra görünür) */
export function startTutorial() {
  stopTutorial();
  if (!G || load('yk-ogretici', '1') === '0' || load(doneKey(G.role), '0') === '1') return;
  role = G.role;
  step = 0;
  show();
  iv = setInterval(tick, 250) as unknown as number;
}
function finish() {
  save(doneKey(role), '1');
  stopTutorial();
}
function show() {
  const O = DLG.ogretici,
    R = O[role],
    a = R.adim[step];
  if (!a) return finish();
  base = { dir: G.player.dir ? G.player.dir.join() : '', carry: G.player.carry, money: G.money };
  const who = role === 'taxi' ? LOOK.taxi2 : LOOK.tagNpc;
  $('tutor').innerHTML =
    `<div class="tface">${face(who, 'smile')}</div><div class="tbubble"><b>${esc(R.ad)}</b><p>${esc(a.metin)}</p>
    <div class="trow"><span class="tdots">${R.adim.map((_, k) => `<i class="${k === step ? 'on' : ''}"></i>`).join('')}</span>
    ${a.bekle === 'dokun' ? `<button class="btn" data-t="ok">${esc(O.tamam)}</button>` : ''}<button class="btn alt" data-t="skip">${esc(O.gec)}</button></div></div>
    ${a.bekle === 'kaydir' ? '<div class="tswipe"><i></i></div>' : ''}`;
  $('tutor').hidden = false;
  sfx('korna');
}
function next() {
  step++;
  show();
}
function tick() {
  if (!G || G.over) return stopTutorial();
  // karikatür paneli ya da mola açıkken balon çekilir
  const busy = !$('comic').hidden || !$('pauseOv').hidden || !$('countdown').hidden;
  $('tutor').hidden = busy;
  if (busy) return;
  const a = DLG.ogretici[role].adim[step];
  if (!a) return finish();
  const P = G.player;
  if (a.bekle === 'kaydir' && P.dir && P.dir.join() !== base.dir) next();
  else if (a.bekle === 'bin' && P.carry && P.carry !== base.carry) next();
  else if (a.bekle === 'teslim' && base.carry !== undefined && !P.carry && G.money > base.money) next();
  else if (a.bekle === 'teslim' && !P.carry && !base.carry) {
    // yolcu olmadan bu adıma geldiyse (ör. sahnede indi) bir sonrakine geç
    base.carry = null;
  }
}
export function initTutorial() {
  $('tutor').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button[data-t]') as HTMLButtonElement;
    if (!b) return;
    if (b.dataset.t === 'skip') finish();
    else next();
  });
}
