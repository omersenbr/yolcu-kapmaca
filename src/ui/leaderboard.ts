// <auto-imports>
import { DF, UNAME } from '../sim/state';
import { load, save } from '../sim/storage';
import { esc } from '../sim/util';
// </auto-imports>
/* ================= SIRALAMA: şimdilik yerel, rol başına ilk 10 ================= */
export function loadLB() {
  try {
    const v = JSON.parse(load('yk-lb', '{}'));
    return { taxi: v.taxi || [], tag: v.tag || [] };
  } catch (e) {
    return { taxi: [], tag: [] };
  }
}
export function addLB(role, money) {
  const lb = loadLB(),
    e = { n: UNAME || 'Adsız', m: money, d: DF().label, ts: Date.now() };
  lb[role].push(e);
  lb[role].sort((a, b) => b.m - a.m);
  lb[role] = lb[role].slice(0, 10);
  save('yk-lb', JSON.stringify(lb));
  const i = lb[role].indexOf(e);
  return i < 0 ? 0 : i + 1;
}
export function renderLB(el) {
  if (!el) return;
  const lb = loadLB();
  const col = (role, title, boss) => {
    const L = lb[role];
    return `<section><h3>${title}</h3>${
      L.length
        ? `<p class="boss">${boss}: ${esc(L[0].n)}</p><ol>${L.slice(0, 5)
            .map((e) => `<li>${esc(e.n)} <span>₺${e.m} · ${e.d}</span></li>`)
            .join('')}</ol>`
        : '<p class="empty">Henüz kimse yok.</p>'
    }</section>`;
  };
  el.innerHTML = col('taxi', 'Taksiciler', 'Oda Başkanı') + col('tag', 'Tag’ciler', 'Tag Başkanı');
}
