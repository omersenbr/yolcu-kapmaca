// <auto-imports>
import { img, ready } from '../core/assets';
import { MANIFEST } from '../core/content';
import { G, ORN, TL, tagLevel } from '../core/state';
import { rnd } from '../core/util';
import { isTunnel } from '../map/grid';
import { pal } from '../map/painter';
import { TS, ctx, px, rr, star } from './view';
// </auto-imports>
export function drawOrn(x, y, r) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.2;
  if (ORN === 'nazar') {
    for (const [rad, c] of [
      [1, '#1c64d6'],
      [0.66, '#fff'],
      [0.42, '#7ec8ff'],
      [0.2, '#111'],
    ] as [number, string][]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, r * rad, 0, Math.PI * 2);
      ctx.fill();
      if (rad === 1) ctx.stroke();
    }
  } else if (ORN === 'crown') {
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.6);
    ctx.lineTo(x - r, y - r * 0.3);
    ctx.lineTo(x - r * 0.5, y + r * 0.1);
    ctx.lineTo(x, y - r * 0.7);
    ctx.lineTo(x + r * 0.5, y + r * 0.1);
    ctx.lineTo(x + r, y - r * 0.3);
    ctx.lineTo(x + r, y + r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (ORN === 'star') {
    star(x, y, r * 1.1, '#ffd43b');
  } else if (ORN === 'fes') {
    ctx.fillStyle = '#c1121f';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y + r * 0.7);
    ctx.lineTo(x - r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 0.6, y - r * 0.6);
    ctx.lineTo(x + r * 0.8, y + r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.6);
    ctx.quadraticCurveTo(x + r * 0.9, y - r * 0.7, x + r * 0.8, y + r * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}
/* ================= ARAÇLAR (assets/cars, ön yukarı bakar) ================= */
export const CARS = () => MANIFEST.cars;
export function pickCarSpr(e) {
  if (e.isPlayer) return G.role === 'taxi' ? 'taxi1' : 'tag' + (tagLevel() + 1);
  if (e.kind === 'taxi') return rnd(['taxi1', 'taxi2', 'taxi1', 'taxi2', 'taxi3']);
  if (e.kind === 'police') return Math.random() < 0.12 ? 'sivil' : rnd(['police1', 'police2']);
  return rnd(['tag1', 'tag1', 'tag2', 'tag2', 'tag2', 'tag3', 'tag3', 'tag4', 'tag4', 'tag5']);
}
export function drawCar(e, t) {
  const inT = isTunnel(Math.round(e.x), Math.round(e.y));
  if (inT) {
    ctx.save();
    ctx.globalAlpha = 0.5;
  }
  drawCar0(e, t);
  if (inT) ctx.restore();
}
export function drawCar0(e, t) {
  const x = px(e.x),
    y = px(e.y),
    d = e.dir || [0, -1],
    ang = Math.atan2(d[1], d[0]),
    L = TS * 0.84,
    W = TS * 0.52;
  const blink = e.isPlayer && G.invuln > 0 && Math.floor(t * 10) % 2 === 0;
  if (e.isPlayer) {
    ctx.save();
    ctx.globalAlpha = blink ? 0.35 : 1;
    ctx.strokeStyle = G.role === 'taxi' ? '#ffc20e' : '#8e98ff';
    ctx.lineWidth = Math.max(2, TS * 0.09);
    ctx.beginPath();
    ctx.arc(x, y, TS * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (!e.spr) e.spr = pickCarSpr(e);
  // araçlar tek atlastan çizilir (assets/atlas/cars.webp, scripts/build_atlas.py); atlas yoksa tekil dosya
  const CSP = CARS()[e.spr],
    AT = CSP && CSP.atlas,
    CIM = CSP ? img(AT ? AT.file : CSP.file) : null;
  if (CSP && ready(CIM)) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    if (blink) ctx.globalAlpha = 0.45;
    const h = TS * 1.32,
      w = (h * CSP.w) / CSP.h;
    if (AT) ctx.drawImage(CIM, AT.x, AT.y, AT.w, AT.h, -w / 2, -h / 2, w, h);
    else ctx.drawImage(CIM, -w / 2, -h / 2, w, h);
    if (e.carry) {
      const hy = h * 0.13,
        r = w * 0.15,
        lk = e.carry.look || {};
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = lk.hc || '#3a2a1e';
      ctx.beginPath();
      ctx.arc(w * 0.1, hy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lk.skin || '#e0ac7e';
      ctx.beginPath();
      ctx.ellipse(w * 0.1, hy - r * 0.45, r * 0.62, r * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.kind === 'police') {
      const on = Math.floor(t * 6) % 2 === 0;
      if (e.spr === 'sivil') {
        if (e.chase) {
          ctx.fillStyle = on ? '#1c7ed6' : 'rgba(28,126,214,.3)';
          ctx.beginPath();
          ctx.arc(0, -h * 0.04, w * 0.13, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else if (e.chase) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = on ? '#ff3b3b' : '#3b8bff';
        ctx.beginPath();
        ctx.arc(on ? -w * 0.2 : w * 0.2, -h * 0.01, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  } else {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    if (blink) ctx.globalAlpha = 0.45;
    ctx.fillStyle = pal.shadow;
    rr(ctx, -L / 2 + TS * 0.05, -W / 2 + TS * 0.06, L, W, W * 0.3);
    ctx.fill();
    ctx.fillStyle =
      e.kind === 'taxi' ? '#ffc20e' : e.kind === 'police' ? '#f4f6fa' : e.isPlayer ? TL().renk : '#4f5bd5';
    rr(ctx, -L / 2, -W / 2, L, W, W * 0.3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(20,28,40,.8)';
    rr(ctx, L * 0.08, -W * 0.36, L * 0.2, W * 0.72, W * 0.12);
    ctx.fill();
    rr(ctx, -L * 0.4, -W * 0.32, L * 0.13, W * 0.64, W * 0.1);
    ctx.fill();
    if (e.kind === 'taxi') {
      ctx.fillStyle = '#141414';
      ctx.fillRect(-L * 0.12, -W * 0.2, L * 0.14, W * 0.4);
      ctx.fillStyle = '#ffc20e';
      ctx.fillRect(-L * 0.12, -W * 0.2, L * 0.07, W * 0.2);
      ctx.fillRect(-L * 0.05, 0, L * 0.07, W * 0.2);
    } else if (e.kind === 'police') {
      const on = Math.floor(t * 6) % 2 === 0;
      ctx.fillStyle = on ? '#e03131' : '#1c7ed6';
      ctx.fillRect(-L * 0.1, -W * 0.36, L * 0.12, W * 0.36);
      ctx.fillStyle = on ? '#1c7ed6' : '#e03131';
      ctx.fillRect(-L * 0.1, 0, L * 0.12, W * 0.36);
      ctx.fillStyle = '#1f6feb';
      ctx.fillRect(-L * 0.46, -W * 0.5, L * 0.92, W * 0.1);
      ctx.fillRect(-L * 0.46, W * 0.4, L * 0.92, W * 0.1);
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-L * 0.05, 0, W * 0.17, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  if (e.carry) {
    const l = e.carry.look;
    ctx.fillStyle = l.shirt;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + TS * 0.36, y - TS * 0.36, TS * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = l.skin;
    ctx.beginPath();
    ctx.arc(x + TS * 0.36, y - TS * 0.4, TS * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (e.isPlayer && ORN !== 'none') {
    const of = MANIFEST.items.ornaments[ORN],
      oi = of ? img(of) : null;
    if (ready(oi)) {
      const z = TS * 0.5;
      ctx.drawImage(oi, x - z / 2, y - TS * 0.05 - z / 2, z, z);
    } else drawOrn(x, y - TS * 0.05, TS * 0.2);
  }
  if (G.assist === e) {
    ctx.strokeStyle = '#ff922b';
    ctx.lineWidth = Math.max(2, TS * 0.1);
    ctx.beginPath();
    ctx.arc(x, y, TS * 0.62 + Math.sin(t * 8) * TS * 0.06, 0, Math.PI * 2);
    ctx.stroke();
  }
  const alarm = (e.chase && !e.isPlayer) || (e.kind === 'tag' && !e.isPlayer && e.revealed > 0);
  if (alarm) {
    const bob = Math.sin(t * 10) * TS * 0.06,
      r = TS * 0.24,
      cx = x,
      cy = y - TS * 0.74 + bob;
    ctx.fillStyle = e.kind === 'police' ? '#1c7ed6' : '#e03131';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(r * 1.5)}px "Archivo Black",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', cx, cy + 1);
  }
}
