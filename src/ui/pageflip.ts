// <auto-imports>
import { $ } from '../core/dom';
import { reduce } from '../core/util';
import { ui } from '../dialog/comic';
import { cv } from '../render/view';
// </auto-imports>
/* ================= SAYFA ÇEVİRME: ekran sağ alt köşesinden kıvrılarak çevrilir (~0,68 sn) ================= */
export function pageTurn() {
  if (typeof document === 'undefined' || !document.body || reduce) return;
  const old = document.querySelector('.pageflip');
  if (old) old.remove();
  const vis = (el) => el && !el.hidden && el.offsetWidth > 0;
  const startEl = $('start'),
    endEl = $('end');
  let src = null;
  if (vis(ui.comic)) src = ui.comic;
  else if (vis(endEl)) src = endEl;
  else if (vis(startEl)) src = startEl;
  const host = src || cv,
    rect = host.getBoundingClientRect(),
    W = rect.width,
    H = rect.height;
  if (W < 20 || H < 20) return;
  const wrap = document.createElement('div');
  wrap.className = 'pageflip';
  wrap.setAttribute('aria-hidden', 'true');
  Object.assign(wrap.style, { left: rect.left + 'px', top: rect.top + 'px', width: W + 'px', height: H + 'px' });
  // çevrilen sayfa: ekranın o anki hâli
  const pg = document.createElement('div');
  pg.className = 'pg';
  if (!src) {
    const c = document.createElement('canvas');
    c.width = cv.width;
    c.height = cv.height;
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    try {
      c.getContext('2d').drawImage(cv, 0, 0);
    } catch (e) {}
    pg.appendChild(c);
  } else {
    const cl = src.cloneNode(true);
    cl.removeAttribute('id');
    cl.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    cl.hidden = false;
    cl.style.cssText +=
      ';position:absolute;left:0;top:0;right:auto;bottom:auto;width:' +
      W +
      'px;height:' +
      H +
      'px;margin:0;transform:none;animation:none';
    pg.appendChild(cl);
  }
  const und = document.createElement('div'); // açılan alanda kıvrımın gölgesi
  const fw = document.createElement('div');
  fw.className = 'flapwrap';
  const flap = document.createElement('div');
  flap.className = 'flap';
  const fl = document.createElement('i');
  flap.appendChild(fl);
  fw.appendChild(flap);
  wrap.appendChild(und);
  wrap.appendChild(pg);
  wrap.appendChild(fw);
  document.body.appendChild(wrap);
  const box = [
    [0, 0],
    [W, 0],
    [W, H],
    [0, H],
  ];
  const clip = (poly, M, n, keepNeg) => {
    const out = [],
      f = (p) => ((p[0] - M[0]) * n[0] + (p[1] - M[1]) * n[1]) * (keepNeg ? -1 : 1);
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i],
        B = poly[(i + 1) % poly.length],
        fa = f(A),
        fb = f(B);
      if (fa >= 0) out.push(A);
      if (fa >= 0 !== fb >= 0) {
        const t = fa / (fa - fb);
        out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
      }
    }
    return out;
  };
  const cp = (pts) =>
    pts.length < 3
      ? 'polygon(0 0,0 0,0 0)'
      : 'polygon(' + pts.map((p) => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')';
  const grad = (dx, dy, M, stops) => {
    const ang = Math.atan2(dx, -dy),
      sa = Math.sin(ang),
      ca = -Math.cos(ang),
      len = Math.abs(W * Math.sin(ang)) + Math.abs(H * Math.cos(ang));
    const s0 = 50 + (((M[0] - W / 2) * sa + (M[1] - H / 2) * ca) / len) * 100;
    return `linear-gradient(${((ang * 180) / Math.PI).toFixed(1)}deg,${stops.map(([c, o]) => c + ' ' + (s0 + (((o * 100) / len) * W) / W).toFixed(2) + '%').join(',')})`;
  };
  const T = 680,
    ease = (x) => -(Math.cos(Math.PI * x) - 1) / 2;
  let t0 = null;
  function frame(now) {
    if (t0 === null) t0 = now;
    const p = Math.min(1, (now - t0) / T),
      e = ease(p);
    // sağ alt köşe yukarı doğru kavis çizerek sola, ekranın dışına taşınır
    const C = [W, H],
      P = [W - (2 * W + 60) * e, H - Math.sin(Math.PI * Math.min(1, e * 1.1)) * H * 0.32 - e * H * 0.08];
    const dx = C[0] - P[0],
      dy = C[1] - P[1],
      L = Math.hypot(dx, dy) || 1,
      n = [dx / L, dy / L],
      M = [(C[0] + P[0]) / 2, (C[1] + P[1]) / 2];
    const keep = clip(box, M, n, true),
      gone = clip(box, M, n, false);
    const refl = gone.map((X) => {
      const d = (X[0] - M[0]) * n[0] + (X[1] - M[1]) * n[1];
      return [X[0] - 2 * d * n[0], X[1] - 2 * d * n[1]];
    });
    pg.style.clipPath = cp(keep);
    fw.style.clipPath = 'none';
    flap.style.clipPath = cp(refl);
    // kıvrım: katlanma çizgisinde parlak, uzaklaştıkça hafif gölge
    fl.style.background = grad(-n[0], -n[1], M, [
      ['rgba(255,255,255,.55)', 0],
      ['rgba(255,255,255,0)', 24],
      ['rgba(0,0,0,0)', 40],
      ['rgba(0,0,0,.16)', 150],
    ]);
    und.style.clipPath = cp(gone);
    und.style.background = grad(n[0], n[1], M, [
      ['rgba(0,0,0,.42)', 0],
      ['rgba(0,0,0,.12)', 22],
      ['rgba(0,0,0,0)', 60],
    ]);
    if (p < 1) requestAnimationFrame(frame);
    else wrap.remove();
  }
  requestAnimationFrame(frame);
}
