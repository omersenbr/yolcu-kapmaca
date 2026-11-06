// <auto-imports>
import { img, ready } from '../core/assets';
import { MANIFEST } from '../sim/content';
import { G } from '../sim/state';
import { TS, ctx, px, rr, star } from './view';
// </auto-imports>
/* ================= YOLCULAR HARİTADA: figür atlası (128 px hücre), el sallama, hedef bayrağı ================= */
export function drawPerson(L, x, y, s, t, ph, waving) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.42, s * 0.2, s * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#26282e';
  ctx.lineWidth = s * 0.085;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.06, y + s * 0.2);
  ctx.lineTo(x - s * 0.07, y + s * 0.4);
  ctx.moveTo(x + s * 0.06, y + s * 0.2);
  ctx.lineTo(x + s * 0.07, y + s * 0.4);
  ctx.stroke();
  if (L.hair === 'long') {
    ctx.fillStyle = L.hc;
    rr(ctx, x - s * 0.15, y - s * 0.36, s * 0.3, s * 0.36, s * 0.1);
    ctx.fill();
  }
  if (L.hair === 'scarf') {
    ctx.fillStyle = L.hc;
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.24, s * 0.17, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = L.shirt;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1, s * 0.04);
  rr(ctx, x - s * 0.15, y - s * 0.1, s * 0.3, s * 0.32, s * 0.09);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = L.shirt;
  ctx.lineWidth = s * 0.09;
  const a = waving ? -1.15 + Math.sin(t * 8 + ph) * 0.4 : 1.3;
  const hx = x + s * 0.14 + Math.cos(a) * s * 0.26,
    hy = y - s * 0.05 + Math.sin(a) * s * 0.26;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.13, y - s * 0.05);
  ctx.lineTo(hx, hy);
  ctx.moveTo(x - s * 0.13, y - s * 0.05);
  ctx.lineTo(x - s * 0.18, y + s * 0.16);
  ctx.stroke();
  ctx.fillStyle = L.skin;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1, s * 0.03);
  ctx.beginPath();
  ctx.arc(hx, hy, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - s * 0.25, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = L.hc;
  if (L.hair === 'short' || L.hair === 'long' || L.hair === 'bun') {
    ctx.beginPath();
    ctx.arc(x, y - s * 0.28, s * 0.13, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
  }
  if (L.hair === 'bun') {
    ctx.beginPath();
    ctx.arc(x, y - s * 0.42, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  if (L.hair === 'scarf') {
    ctx.beginPath();
    ctx.arc(x, y - s * 0.27, s * 0.14, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
  }
  if (L.hair === 'cap') {
    ctx.beginPath();
    ctx.arc(x, y - s * 0.29, s * 0.13, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x, y - s * 0.31, s * 0.2, s * 0.04);
  }
  if (L.hat === 'sunhat') {
    ctx.fillStyle = '#e9c46a';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.beginPath();
    ctx.ellipse(x, y - s * 0.33, s * 0.22, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - s * 0.35, s * 0.11, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c1121f';
    ctx.fillRect(x - s * 0.11, y - s * 0.37, s * 0.22, s * 0.03);
  }
  if (L.tourist) {
    ctx.fillStyle = '#3d5a80';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(1, s * 0.025);
    rr(ctx, x - s * 0.36, y + s * 0.1, s * 0.15, s * 0.24, s * 0.03);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.32, y + s * 0.1);
    ctx.lineTo(x - s * 0.32, y + s * 0.04);
    ctx.lineTo(x - s * 0.25, y + s * 0.04);
    ctx.lineTo(x - s * 0.25, y + s * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(x - s * 0.045, y - s * 0.24, s * 0.018, 0, Math.PI * 2);
  ctx.arc(x + s * 0.045, y - s * 0.24, s * 0.018, 0, Math.PI * 2);
  ctx.fill();
}
export function drawPax(p, t) {
  const boss = p.look.tourist;
  const x = px(p.x) - TS * 0.18,
    y = px(p.y) - TS * (boss ? 0.3 : 0.12),
    s = TS * (boss ? 1.45 : 1.05);
  const pulse = 0.5 + 0.5 * Math.sin(t * 4 + p.ph);
  if (boss) {
    const cx0 = x + TS * 0.12,
      cy0 = y + s * 0.4;
    ctx.save();
    ctx.translate(cx0, cy0);
    ctx.scale(1, 0.45);
    ctx.fillStyle = `rgba(255,200,0,${0.35 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(0, 0, TS * (0.95 + pulse * 0.15), 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(t * 1.5);
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = Math.max(2, TS * 0.09);
    ctx.setLineDash([TS * 0.22, TS * 0.14]);
    ctx.beginPath();
    ctx.arc(0, 0, TS * 1.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      star(cx0 + Math.cos(a) * TS * 0.9, y - s * 0.15 + Math.sin(a) * TS * 0.25, TS * 0.1, '#ffd43b');
    }
  } else {
    ctx.fillStyle = `rgba(255,194,14,${0.25 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(x + TS * 0.18, y + s * 0.4, TS * 0.5, TS * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  {
    const k = p.look.prof,
      pf = k && MANIFEST.passengers.map[k],
      im = pf ? img(pf) : null;
    if (ready(im)) {
      const i = p.look.pidx || 0,
        S = 128,
        sz = TS * (boss ? 1.6 : 1.3),
        bob = Math.sin(t * 3 + p.ph) * TS * 0.03,
        cx = px(p.x),
        cy = px(p.y) + TS * 0.35;
      ctx.drawImage(im, (i % 4) * S, Math.floor(i / 4) * S, S, S, cx - sz / 2, cy - sz + bob, sz, sz);
    } else drawPerson(p.look, x, y, s, t, p.ph, true);
  }
  if (boss) {
    const bx = x,
      by = y - s * 0.72 - Math.sin(t * 3 + p.ph) * TS * 0.05;
    ctx.font = `900 ${Math.round(TS * 0.28)}px "Archivo Black",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = '★ TURİST ★',
      w = ctx.measureText(lab).width + TS * 0.3;
    ctx.fillStyle = '#ffd43b';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    rr(ctx, bx - w / 2, by - TS * 0.2, w, TS * 0.4, TS * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111';
    ctx.fillText(lab, bx, by + 1);
    return;
  }
  if (G.role === 'taxi') {
    if ((t + p.ph) % 3 < 1.6) {
      const bx = x + s * 0.2,
        by = y - s * 0.62;
      ctx.font = `900 ${Math.round(s * 0.22)}px "Archivo Black",system-ui,sans-serif`;
      const tw = p.look.tourist ? 'Taxi!' : 'Taksi!',
        w = ctx.measureText(tw).width + s * 0.16;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      rr(ctx, bx - w / 2, by - s * 0.15, w, s * 0.28, s * 0.1);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tw, bx, by - s * 0.005);
    }
  } else {
    const bx = x - s * 0.2,
      by = y - s * 0.05;
    ctx.fillStyle = '#222';
    rr(ctx, bx - s * 0.05, by - s * 0.08, s * 0.1, s * 0.16, s * 0.02);
    ctx.fill();
    ctx.fillStyle = `rgba(142,152,255,${0.4 + pulse * 0.6})`;
    ctx.fillRect(bx - s * 0.035, by - s * 0.06, s * 0.07, s * 0.11);
  }
  if (p.look.rec && G.role === 'taxi') {
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(x - s * 0.2, y - s * 0.1, s * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}
export function drawDest(p, t) {
  const x = px(p.dx),
    y = px(p.dy);
  ctx.strokeStyle = '#2f9e44';
  ctx.lineWidth = Math.max(2, TS * 0.08);
  const k = (t * 1.2) % 1;
  ctx.globalAlpha = 1 - k;
  ctx.beginPath();
  ctx.arc(x, y, TS * (0.35 + k * 0.5), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(1.5, TS * 0.06);
  ctx.beginPath();
  ctx.moveTo(x - TS * 0.12, y + TS * 0.3);
  ctx.lineTo(x - TS * 0.12, y - TS * 0.4);
  ctx.stroke();
  ctx.fillStyle = '#2f9e44';
  ctx.beginPath();
  ctx.moveTo(x - TS * 0.12, y - TS * 0.4);
  ctx.lineTo(x + TS * 0.34, y - TS * 0.25);
  ctx.lineTo(x - TS * 0.12, y - TS * 0.1);
  ctx.closePath();
  ctx.fill();
  const P = G.player,
    ax = px(P.x),
    ay = px(P.y),
    a = Math.atan2(y - ay, x - ax);
  if (Math.hypot(x - ax, y - ay) > TS * 1.3) {
    ctx.save();
    ctx.translate(ax + Math.cos(a) * TS * 0.88, ay + Math.sin(a) * TS * 0.88);
    ctx.rotate(a);
    ctx.fillStyle = '#2f9e44';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(TS * 0.2, 0);
    ctx.lineTo(-TS * 0.1, -TS * 0.14);
    ctx.lineTo(-TS * 0.1, TS * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
