/* ================= YOLCUYLA SOHBET (ekran): yolculuk sırasında “Konuş” =================
   Yazılan ya da söylenen her cümle gönderilir; yolcu profiline göre cevap verir (src/sim/chat.ts).
   Kariyerde sohbet yolcunun vereceği yıldızı etkiler; ağır küfürde yolcu iner. */
import { DLG, ECO } from '../sim/content';
import { G } from '../sim/state';
import { T, esc } from '../sim/util';
import { LOOK } from '../sim/passengers';
import { chatOpening, chatReply } from '../sim/chat';
import { forget, teach } from '../sim/learn';
import { profanity } from '../sim/nlu';
import { handsFreeOn, setHandsFree, setTeach, teachOn } from './voice';
import { rideDone } from '../sim/ridelife';
import type { Pax } from '../sim/types';
import { closePanel, freeRow, openPanel, setBubble, setCast, ui } from './comic';
import { baseVars } from './engine';
import { face } from './portraits';
import { toast, updHud } from '../ui/hud';

export function paxChat(p: Pax) {
  const P = G.player;
  if (!p || P.carry !== p) return closePanel();
  const S = DLG.sohbet,
    me = G.role === 'tag' ? LOOK.tag : LOOK.taxi1,
    L = p.look,
    v = baseVars(p);
  const cast = (mood: string) =>
    setCast([
      { svg: face(me, 'neutral'), name: 'Sen' },
      { svg: face(L, mood), name: L.name },
    ]);
  openPanel('pax', S.baslik, []);
  cast('neutral');
  G.paused = true;
  setBubble(L.name, T(chatOpening(p), v));
  const log = document.createElement('div');
  log.className = 'chatlog';
  ui.answers.appendChild(log);
  const O = S.ogret,
    prof = L.prof || 'genel';
  /** öğretme: cevabı beklenen cümle (yoksa normal sohbet) */
  let teaching: string | null = null,
    last = '';
  const tools = document.createElement('div');
  tools.className = 'chattools';
  const drawTools = () => {
    tools.innerHTML = '';
    const btn = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', fn);
      tools.appendChild(b);
    };
    if (teaching !== null) {
      const sel = document.createElement('select');
      sel.innerHTML = `<option value="">${esc(O.kapsamHerkes)}</option><option value="${esc(prof)}">${esc(O.kapsamTip)}</option>`;
      tools.appendChild(sel);
      btn(O.vazgec, () => {
        teaching = null;
        inp.placeholder = S.yer;
        npc(O.vazgecildi, 'neutral');
      });
    } else if (teachOn() && last)
      btn(O.duzelt, () => {
        teaching = last;
        inp.placeholder = O.yerCevap;
        npc(T(O.duzeltSor, { soru: last }), 'neutral');
      });
  };
  /** yolcu konuşur; eller serbestse sözü bitince mikrofon açılır */
  const npc = (text: string, mood: string) => {
    setBubble(L.name, text);
    cast(mood);
    drawTools();
    row.autoListen();
  };
  const row = freeRow((text) => {
    log.textContent = '“' + text + '”';
    if (teaching !== null) {
      // oyuncu yolcunun vereceği cevabı söyledi
      if (profanity(text) === 'agir') return npc(O.kufurOlmaz, 'shock');
      const kapsam = (tools.querySelector('select') as HTMLSelectElement | null)?.value || undefined;
      forget(teaching, kapsam);
      teach(teaching, text, kapsam);
      teaching = null;
      inp.placeholder = S.yer;
      return npc(T(O.tamam, { cevap: T(text, v) }), 'smile');
    }
    const r = chatReply(text, p);
    // “bu cevabı değiştir”: cevap öğretilmiş bir kayıttan geldiyse o kayıt değişir, yoksa bu cümle için yenisi eklenir
    last = r.konu.startsWith('ogr:') ? r.konu.slice(4) : text;
    p.puanEk = (p.puanEk || 0) + r.puan;
    if (r.konu === 'dolgu' && teachOn()) {
      teaching = text;
      inp.placeholder = O.yerCevap;
      return npc(O.sor, 'neutral');
    }
    npc(T(r.text, { ...v, ...r.vars }), r.kufur || r.puan < 0 ? 'angry' : r.puan > 0 ? 'smile' : 'neutral');
    if (r.kufur === 'agir') {
      // yolcu iner: ücret yok, ceza ve şikayet
      ui.answers.querySelectorAll('input,button,select').forEach((b) => ((b as HTMLButtonElement).disabled = true));
      setTimeout(() => {
        if (P.carry === p) {
          P.carry = null;
          G.pax = G.pax.filter((q) => q !== p);
          G.money -= ECO.sohbet.inisCezasi;
          rideDone(p, 0, true);
          toast(T(S.kufur.inisToast, { yolcu: L.name }), true);
        }
        closePanel();
        updHud();
      }, 1800);
    }
  }, S.yer);
  const inp = row.inp;
  ui.answers.appendChild(tools);
  // sohbet ayarları: öğretme modu ve eller serbest
  const opts = document.createElement('div');
  opts.className = 'chatopts';
  const chk = (label: string, on: boolean, set: (v: boolean) => void) => {
    const l = document.createElement('label'),
      c = document.createElement('input');
    c.type = 'checkbox';
    c.checked = on;
    c.addEventListener('change', () => {
      set(c.checked);
      drawTools();
    });
    l.append(c, ' ' + label);
    opts.appendChild(l);
  };
  chk(O.mod, teachOn(), setTeach);
  chk(O.elSerbest, handsFreeOn(), setHandsFree);
  ui.answers.appendChild(opts);
  const end = document.createElement('button');
  end.className = 'ans go';
  end.innerHTML = `<span>${S.bitir}</span>`;
  end.addEventListener('click', () => closePanel());
  ui.answers.appendChild(end);
}
