/* ================= YOLCUYLA SOHBET (ekran): yolculuk sırasında “Konuş” =================
   Yazılan ya da söylenen her cümle gönderilir; yolcu profiline göre cevap verir (src/sim/chat.ts).
   Kariyerde sohbet yolcunun vereceği yıldızı etkiler; ağır küfürde yolcu iner. */
import { DLG, ECO } from '../sim/content';
import { G } from '../sim/state';
import { T } from '../sim/util';
import { LOOK } from '../sim/passengers';
import { chatOpening, chatReply } from '../sim/chat';
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
  const { inp } = freeRow((text) => {
    const r = chatReply(text, p);
    p.puanEk = (p.puanEk || 0) + r.puan;
    const cevap = T(r.text, { ...v, ...r.vars });
    log.textContent = '“' + text + '”';
    setBubble(L.name, cevap);
    cast(r.kufur || r.puan < 0 ? 'angry' : r.puan > 0 ? 'smile' : 'neutral');
    if (r.kufur === 'agir') {
      // yolcu iner: ücret yok, ceza ve şikayet
      ui.answers.querySelectorAll('input,button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
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
  const end = document.createElement('button');
  end.className = 'ans go';
  end.innerHTML = `<span>${S.bitir}</span>`;
  end.addEventListener('click', () => closePanel());
  ui.answers.appendChild(end);
  setTimeout(() => inp.focus(), 50);
}
