// <auto-imports>
import { DLG } from '../sim/content';
import { $ } from '../core/dom';
import { DF, G, TL, demand, hourNow } from '../sim/state';
import { taximeter } from '../sim/passengers';
import { clamp } from '../sim/util';
import { district } from '../sim/grid';
// </auto-imports>
/* ---- telsiz: yakındaki meslektaşlar Tag kovalıyor (taksici rolü) ---- */
export let radioT = 0;
export function radio(t, z) {
  const P = G.player,
    km = (Math.hypot(t.x - P.x, t.y - P.y) * 0.35).toFixed(1).replace('.', ','),
    loc = district(Math.round(t.x), Math.round(t.y));
  $('radioTxt').textContent =
    `${z ? z.name + ' durağından' : loc + ' civarında'} meslektaşlar bir Tag’in peşinde! Yaklaşık ${km} km uzakta.`;
  $('radio').hidden = false;
  G.radioFor = t;
  clearTimeout(radioT);
  radioT = setTimeout(() => {
    $('radio').hidden = true;
  }, 7000);
}
export function initHud() {
  $('radioYes').addEventListener('click', () => {
    $('radio').hidden = true;
    if (!G || !G.radioFor || !G.ents.includes(G.radioFor)) return;
    G.assist = G.radioFor;
    toast('Yardıma gidiyorsun! Turuncu işaretli Tag’i yakala.');
  });
  $('radioNo').addEventListener('click', () => {
    $('radio').hidden = true;
    if (G) G.radioFor = null;
  });
}

/* ================= HUD / ARAYÜZ ================= */
export function updHud() {
  if (!G) return;
  $('money').textContent = (G.money < 0 ? '−₺' : '₺') + Math.abs(G.money);
  {
    const h = hourNow(),
      hh = Math.floor(h),
      mm = Math.floor((h - hh) * 4) * 15;
    $('time').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    const dm = demand();
    $('timeLbl').textContent = G.lastRide ? DLG.kariyer.sonYolcuEtiket : dm.tag ? 'Saat, ' + dm.tag : 'Saat';
  }
  const c = G.player.carry;
  $('pax').textContent = c
    ? `${G.hideName || (G.role === 'tag' && (c.rideT || 0) > 6) ? '???' : c.look.name} → ${c.dest}`
    : 'Boş';
  let lbl = 'Yolcu';
  if (c && G.role === 'taxi')
    lbl = c.fixed ? `Pazarlık ₺${c.fare}` : `Taksimetre ₺${taximeter(Math.round(c.driven || 0), c.cross)}`;
  if (c && G.role === 'tag') {
    const exp = (((c.m / 4.5) * 1.5 + 6) * 1.5 * DF().patience * TL().pat) / DF().world,
      k = clamp(Math.ceil(5 * (1 - (c.rideT || 0) / exp)), 0, 5);
    lbl = 'Sabır ' + '●'.repeat(k) + '○'.repeat(5 - k);
  }
  $('paxLbl').textContent = lbl;
}
export let toastTimer = 0;
export function toast(msg: string, bad?: boolean) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.toggle('bad', !!bad);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2100);
}
