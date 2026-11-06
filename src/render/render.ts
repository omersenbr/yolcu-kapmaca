// <auto-imports>
import { img, ready } from '../core/assets';
import { MANIFEST } from '../core/content';
import { G, hourNow } from '../core/state';
import { clamp, mixHex } from '../core/util';
import { COLS, RADARS, ROWS } from '../map/grid';
import { CHT, CHX, CHY, mapChunk, mapChunks, miniCv, pal } from '../map/painter';
import { drawCar } from './cars';
import { drawDest, drawPax } from './people';
import { DPR, TS, VH, VW, cam, ctx, mctx, mini, px, rr, star } from './view';
import { onPlayer } from '../world/ai';
// </auto-imports>
/* ================= ÇİZİM: kamera, harita parçaları, nesneler, ışık, ekran kenarı işaretleri, mini harita ================= */
/* gün ışığı: renkleri çarpma ile koyulaştır (pus yok) */
export function light() {
  const h = hourNow(),
    NIGHT = '#9aa6d6',
    DUSK = '#ffe0c2',
    DAWN = '#ffe6cf',
    W = '#ffffff';
  if (h >= 7 && h < 17.5) return { tint: null, night: 0 };
  if (h >= 17.5 && h < 19.5) return { tint: mixHex(W, DUSK, (h - 17.5) / 2), night: 0 };
  if (h >= 19.5 && h < 21) return { tint: mixHex(DUSK, NIGHT, (h - 19.5) / 1.5), night: (h - 19.5) / 1.5 };
  if (h >= 21 || h < 4.5) return { tint: NIGHT, night: 1 };
  if (h < 6) return { tint: mixHex(NIGHT, DAWN, (h - 4.5) / 1.5), night: 1 - (h - 4.5) / 1.5 };
  return { tint: mixHex(DAWN, W, h - 6), night: 0 };
}
export function drawFerry(x, y, horiz, t) {
  ctx.save();
  ctx.translate(x, y);
  if (!horiz) ctx.rotate(Math.PI / 2);
  const L = TS * 1.1,
    W = TS * 0.42;
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(-L * 0.6, 0, L * 0.25, W * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f5ef';
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.2;
  rr(ctx, -L / 2, -W / 2, L, W, W * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1d3557';
  ctx.fillRect(-L * 0.36, -W * 0.2, L * 0.72, W * 0.4);
  ctx.fillStyle = '#e9c46a';
  ctx.fillRect(-L * 0.05, -W * 0.14, L * 0.12, W * 0.28);
  ctx.fillStyle = '#111';
  ctx.fillRect(-L * 0.05, -W * 0.14, L * 0.12, W * 0.08);
  ctx.restore();
}
export function render(t, dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = pal.water;
  ctx.fillRect(0, 0, VW, VH);
  let tg = { x: COLS * TS * 0.55, y: ROWS * TS * 0.7 };
  if (G) tg = G.focus || { x: px(G.player.x), y: px(G.player.y) };
  const zt = G ? G.zoomT : 1,
    k = Math.min(1, dt * 7);
  cam.z += (zt - cam.z) * k;
  cam.x += (tg.x - cam.x) * k;
  cam.y += (tg.y - cam.y) * k;
  const Z = cam.z,
    hw = VW / 2 / Z,
    hh = VH / 2 / Z,
    W = COLS * TS,
    H = ROWS * TS;
  const cx = W < 2 * hw ? W / 2 : clamp(cam.x, hw, W - hw),
    cy = H < 2 * hh ? H / 2 : clamp(cam.y, hh, H - hh);
  ctx.translate(VW / 2, VH / 2);
  ctx.scale(Z, Z);
  ctx.translate(-cx, -cy);
  ctx.imageSmoothingQuality = 'high';
  if (mapChunks) {
    let built = 0;
    const CW = CHT * TS,
      i0 = Math.max(0, Math.floor((cx - hw) / CW)),
      i1 = Math.min(CHX - 1, Math.floor((cx + hw) / CW)),
      j0 = Math.max(0, Math.floor((cy - hh) / CW)),
      j1 = Math.min(CHY - 1, Math.floor((cy + hh) / CW));
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        let c = mapChunks[j * CHX + i];
        if (!c && built < 3) {
          c = mapChunk(i, j);
          built++;
        } else if (c) mapChunk(i, j);
        if (c) ctx.drawImage(c, i * CW, j * CW, CW, CW);
      }
  }
  const VX0 = (cx - hw) / TS - 2,
    VX1 = (cx + hw) / TS + 2,
    VY0 = (cy - hh) / TS - 3,
    VY1 = (cy + hh) / TS + 2,
    inView = (x, y) => x > VX0 && x < VX1 && y > VY0 && y < VY1;
  const ft = G ? G.clock : t;
  const fp = (Math.sin(ft * 0.22) + 1) / 2;
  drawFerry((131.8 + fp * 8.4) * TS, 150 * TS, true, t);
  const fq = (Math.sin(ft * 0.17 + 2) + 1) / 2;
  drawFerry((131.8 + fq * 8.4) * TS, 96 * TS, true, t);
  const mp = (Math.sin(ft * 0.12 + 1) + 1) / 2;
  drawFerry((100 + mp * 40) * TS, 189 * TS, true, t);
  const ap = (Math.sin(ft * 0.09 + 2) + 1) / 2;
  drawFerry((140 + ap * 30) * TS, 194 * TS, true, t);
  if (G) {
    if (G.home) {
      const hx = px(G.home.x),
        hy = px(G.home.y);
      ctx.fillStyle = 'rgba(47,158,68,.12)';
      ctx.strokeStyle = 'rgba(47,158,68,.9)';
      ctx.lineWidth = Math.max(2, TS * 0.08);
      ctx.setLineDash([TS * 0.3, TS * 0.2]);
      ctx.beginPath();
      ctx.arc(hx, hy, TS * 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2f9e44';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx - TS * 0.3, hy - TS * 0.6);
      ctx.lineTo(hx, hy - TS * 0.9);
      ctx.lineTo(hx + TS * 0.3, hy - TS * 0.6);
      ctx.lineTo(hx + TS * 0.3, hy - TS * 0.25);
      ctx.lineTo(hx - TS * 0.3, hy - TS * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.font = `900 ${Math.round(TS * 0.34)}px "Archivo Black",system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.strokeText('Mahallen', hx, hy - TS * 1.15);
      ctx.fillStyle = '#2f9e44';
      ctx.fillText('Mahallen', hx, hy - TS * 1.15);
    }
    if (G.stand) {
      const h = G.stand.homes[0],
        sx = px(h[0]),
        sy = h[1] * TS - TS * 0.5;
      ctx.font = `900 ${Math.round(TS * 0.3)}px "Archivo Black",system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.strokeText('Senin durağın', sx, sy);
      ctx.fillStyle = '#2f9e44';
      ctx.fillText('Senin durağın', sx, sy);
    }
    for (const p of G.pax) if ((p.state === 'wait' || p.state === 'talk') && inView(p.x, p.y)) drawPax(p, t);
    if (G.player.carry) drawDest(G.player.carry, t);
    if (G.intelT > 0)
      for (const [W, next] of [
        [G.wave, false],
        [G.nextWave, true],
      ]) {
        if (!W) continue;
        const wx = px(W.x),
          wy = px(W.y);
        ctx.save();
        ctx.strokeStyle = '#e8590c';
        ctx.fillStyle = 'rgba(232,89,12,.12)';
        ctx.lineWidth = Math.max(2, TS * 0.08);
        if (next) ctx.setLineDash([TS * 0.3, TS * 0.2]);
        ctx.beginPath();
        ctx.arc(wx, wy, TS * (2.6 + (next ? 0 : 0.3 * Math.sin(t * 4))), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        const lab = next ? `${W.t} · ${Math.ceil(G.waveT)} sn sonra` : W.t;
        ctx.font = `900 ${Math.round(TS * 0.32)}px "Archivo Black",system-ui,sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#fff';
        ctx.strokeText(lab, wx, wy - TS * 2.9);
        ctx.fillStyle = '#e8590c';
        ctx.fillText(lab, wx, wy - TS * 2.9);
        {
          const ri = img(MANIFEST.ui.i_radio),
            z = TS * 0.5,
            lw = ctx.measureText(lab).width;
          if (ready(ri)) ctx.drawImage(ri, wx - lw / 2 - z - TS * 0.08, wy - TS * 2.9 - z / 2, z, z);
        }
      }
    for (const q of RADARS) {
      if (!inView(q[0], q[1])) continue;
      const x = px(q[0]) + TS * 0.5,
        y = px(q[1]) - TS * 0.5;
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = Math.max(2, TS * 0.07);
      ctx.beginPath();
      ctx.moveTo(x, y + TS * 0.6);
      ctx.lineTo(x, y - TS * 0.1);
      ctx.stroke();
      ctx.fillStyle = '#ffc20e';
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 1.5;
      rr(ctx, x - TS * 0.32, y - TS * 0.42, TS * 0.64, TS * 0.36, TS * 0.06);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#141414';
      ctx.beginPath();
      ctx.arc(x, y - TS * 0.24, TS * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `900 ${Math.round(TS * 0.2)}px "Archivo Black",system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.strokeText('RADAR', x, y + TS * 0.78);
      ctx.fillStyle = '#d6402b';
      ctx.fillText('RADAR', x, y + TS * 0.78);
    }
    for (const ck of G.checks)
      if (ck.shown > 0) {
        ctx.fillStyle = '#ff7b00';
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        for (const o of [-0.42, 0.42]) {
          const cx2 = px(ck.x) + o * TS,
            cy2 = px(ck.y) + TS * 0.38;
          ctx.beginPath();
          ctx.moveTo(cx2, cy2 - TS * 0.22);
          ctx.lineTo(cx2 + TS * 0.1, cy2);
          ctx.lineTo(cx2 - TS * 0.1, cy2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        drawCar(
          {
            kind: 'police',
            isPlayer: false,
            x: ck.x,
            y: ck.y - 0.12,
            dir: [1, 0],
            carry: null,
            chase: false,
            revealed: 0,
          },
          t,
        );
      }
    for (const e of G.ents) if (!e.isPlayer && inView(e.x, e.y)) drawCar(e, t);
    drawCar(G.player, t);
    if (G.nitro > 0) {
      const P = G.player,
        d = P.dir || [0, -1],
        x = px(P.x) - d[0] * TS * 0.45,
        y = px(P.y) - d[1] * TS * 0.45,
        a = Math.atan2(d[1], d[0]);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      const fl = TS * (0.5 + Math.random() * 0.35);
      ctx.fillStyle = '#ff6b00';
      ctx.strokeStyle = '#141414';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -TS * 0.16);
      ctx.lineTo(-fl, 0);
      ctx.lineTo(0, TS * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd43b';
      ctx.beginPath();
      ctx.moveTo(0, -TS * 0.08);
      ctx.lineTo(-fl * 0.55, 0);
      ctx.lineTo(0, TS * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(20,20,20,.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const o2 = (Math.random() - 0.5) * TS * 1.2;
        ctx.beginPath();
        ctx.moveTo(x - d[0] * TS * 0.6 + -d[1] * o2, y - d[1] * TS * 0.6 + d[0] * o2);
        ctx.lineTo(x - d[0] * TS * 1.8 + -d[1] * o2, y - d[1] * TS * 1.8 + d[0] * o2);
        ctx.stroke();
      }
    }
    for (const c of G.clouds) {
      const x = px(c.x),
        y = px(c.y) - TS * 0.2;
      ctx.fillStyle = '#f6f1e4';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 4;
        ctx.beginPath();
        ctx.arc(
          x + Math.cos(a) * TS * 0.35,
          y + Math.sin(a) * TS * 0.22,
          TS * (0.3 + 0.06 * Math.sin(t * 20 + i)),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, TS * 0.42, 0, Math.PI * 2);
      ctx.fill();
      star(x + TS * 0.6, y - TS * 0.5, TS * 0.13, '#ffc20e');
      ctx.font = `900 ${Math.round(TS * 0.4)}px "Bangers","Archivo Black",system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#111';
      const wd = ['PAT!', 'KÜT!'][Math.floor(t * 4) % 2];
      ctx.strokeText(wd, x, y - TS * 0.8);
      ctx.fillStyle = '#e63946';
      ctx.fillText(wd, x, y - TS * 0.8);
    }
    // ışık: renkleri çarpma ile koyulaştır (pus yok), farlar keskin kenarlı
    {
      const L = light();
      if (L.tint) {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = L.tint;
        ctx.fillRect(cx - hw - 2, cy - hh - 2, hw * 2 + 4, hh * 2 + 4);
        ctx.restore();
        if (L.night > 0.05) {
          ctx.save();
          ctx.fillStyle = `rgba(255,244,190,${0.32 * L.night})`;
          for (const e of G.ents) {
            const x = px(e.x),
              y = px(e.y);
            if (Math.abs(x - cx) > hw + TS * 2 || Math.abs(y - cy) > hh + TS * 2) continue;
            const d = e.dir || [0, -1];
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.atan2(d[1], d[0]));
            const Lx = TS * (e.isPlayer ? 2 : 1.6);
            ctx.beginPath();
            ctx.moveTo(TS * 0.42, -TS * 0.16);
            ctx.lineTo(Lx, -TS * 0.55);
            ctx.lineTo(Lx, TS * 0.55);
            ctx.lineTo(TS * 0.42, TS * 0.16);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        }
      }
    }
    for (const f of G.fx) {
      const kk = 1 - f.t / 1.3;
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.font = `900 ${Math.round(TS * 0.5)}px "Archivo Black",system-ui,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.strokeText(f.text, px(f.x), px(f.y) - TS * (0.8 + kk));
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, px(f.x), px(f.y) - TS * (0.8 + kk));
      ctx.globalAlpha = 1;
    }
    // ekran kenarı işaretleri
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const toS = (wx, wy) => [(wx - cx) * Z + VW / 2, (wy - cy) * Z + VH / 2];
    const mark = (wx, wy, col) => {
      const [sx, sy] = toS(wx, wy);
      if (sx > 0 && sx < VW && sy > 0 && sy < VH) return;
      const m = 18,
        ex = clamp(sx, m, VW - m - (sy < 130 ? 80 : 0)),
        ey = clamp(sy, m + 8, VH - m),
        a = Math.atan2(sy - ey, sx - ex);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a);
      ctx.fillStyle = col;
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    if (!G.cine && !G.paused) {
      for (const e of G.ents) {
        if (e.isPlayer) continue;
        if (onPlayer(e)) mark(px(e.x), px(e.y), e.kind === 'police' ? '#1c7ed6' : '#e03131');
        else if (e.kind === 'tag' && (e.revealed > 0 || G.assist === e)) mark(px(e.x), px(e.y), '#ff922b');
      }
      if (G.player.carry) mark(px(G.player.carry.dx), px(G.player.carry.dy), '#2f9e44');
    }
    if (G.cine) {
      const a = Math.min(1, G.cine.t / G.cine.dur);
      const grd = ctx.createRadialGradient(
        VW / 2,
        VH / 2,
        Math.min(VW, VH) * 0.25,
        VW / 2,
        VH / 2,
        Math.max(VW, VH) * 0.7,
      );
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(0,0,0,${0.55 * a})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, VW, VH);
    }
  }
  drawMini();
}
export function drawMini() {
  if (!miniCv) return;
  const w = mini.width,
    h = mini.height;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.imageSmoothingEnabled = false;
  mctx.drawImage(miniCv, 0, 0, w, h);
  if (!G) return;
  const sx = w / COLS,
    sy = h / ROWS,
    dot = (x, y, c, r) => {
      mctx.fillStyle = c;
      mctx.beginPath();
      mctx.arc((x + 0.5) * sx, (y + 0.5) * sy, r * DPR, 0, Math.PI * 2);
      mctx.fill();
    };
  for (const p of G.pax)
    if (p.state === 'wait') {
      if (p.look.tourist) {
        dot(p.x, p.y, '#111', 2.4);
        dot(p.x, p.y, '#ffd43b', 1.8);
      } else if (Math.abs(p.x - G.player.x) + Math.abs(p.y - G.player.y) < 40) dot(p.x, p.y, '#ffc20e', 0.9);
    }
  if (G.intelT > 0)
    for (const W of [G.wave, G.nextWave])
      if (W) {
        mctx.strokeStyle = '#e8590c';
        mctx.lineWidth = 2 * DPR;
        mctx.beginPath();
        mctx.arc((W.x + 0.5) * sx, (W.y + 0.5) * sy, 2.6 * sx, 0, Math.PI * 2);
        mctx.stroke();
      }
  if (G.home) {
    mctx.strokeStyle = '#2f9e44';
    mctx.lineWidth = 1.5 * DPR;
    mctx.beginPath();
    mctx.arc((G.home.x + 0.5) * sx, (G.home.y + 0.5) * sy, 3.6 * sx, 0, Math.PI * 2);
    mctx.stroke();
  }
  for (const e of G.ents) {
    if (e.isPlayer) continue;
    if (onPlayer(e)) dot(e.x, e.y, e.kind === 'police' ? '#1c7ed6' : '#e03131', 2);
    else if (e.kind === 'tag' && (e.revealed > 0 || G.assist === e)) dot(e.x, e.y, '#ff922b', 2.4);
  }
  if (G.player.carry) dot(G.player.carry.dx, G.player.carry.dy, '#2f9e44', 2.4);
  dot(G.player.x, G.player.y, '#fff', 2.6);
  dot(G.player.x, G.player.y, G.role === 'taxi' ? '#ffc20e' : '#4f5bd5', 1.7);
}
