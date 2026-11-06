// <auto-imports>
import { $ } from '../core/dom';
import { buildMap } from '../map/painter';
// </auto-imports>
export const stage = $('stage'),
  cv = $('cv'),
  ctx = cv.getContext('2d'),
  mini = $('mini'),
  mctx = mini.getContext('2d');
/* TS: bir karenin piksel boyu; ekran boyuna göre 28–52 arası */
export let TS = 34,
  VW = 300,
  VH = 500,
  DPR = 1;
export function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
export function resize() {
  VW = stage.clientWidth;
  VH = stage.clientHeight;
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.max(1, Math.round(VW * DPR));
  cv.height = Math.max(1, Math.round(VH * DPR));
  TS = Math.round(Math.max(28, Math.min(52, Math.min(VW / 10, VH / 14.5))));
  buildMap();
}

/* kamera ve dünya→piksel dönüşümü */
export const cam = { x: 0, y: 0, z: 1 };
export const px = (v) => (v + 0.5) * TS;
export function star(x, y, r, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2,
      q = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
  ctx.fill();
}
