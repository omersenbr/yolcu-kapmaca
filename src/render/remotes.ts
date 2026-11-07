/* Çok oyunculu: uzak oyuncuları çiz (araç, ad etiketi, sorgu simgesi, kavga dumanı). */
import { img, ready } from '../core/assets';
import { DLG, MANIFEST } from '../sim/content';
import { G } from '../sim/state';
import { remotes } from '../net/mp';
import { TS, ctx, px, rr, star } from './view';

export function drawRemotes(t: number, inView: (x: number, y: number) => boolean) {
  if (!remotes.size || !G) return;
  const myTeam = G.role === 'taxi' ? G.stand && G.stand.name : G.home && G.home.name;
  for (const r of remotes.values()) {
    if (!inView(r.dx, r.dy)) continue;
    const x = px(r.dx),
      y = px(r.dy),
      d = r.dir || [0, -1],
      ang = Math.atan2(d[1], d[0]);
    const spr = r.spr || (r.rol === 'taxi' ? 'taxi1' : 'tag1'),
      C = MANIFEST.cars[spr],
      at = C && C.atlas,
      im = C ? img(at ? at.file : C.file) : null;
    const friend = r.rol === G.role && r.ekip === myTeam;
    // ekip halkası: arkadaş yeşil, rakip rol kırmızı, aynı rol başka ekip gri
    ctx.save();
    ctx.strokeStyle = friend ? '#2f9e44' : r.rol !== G.role ? '#e03131' : '#868e96';
    ctx.lineWidth = Math.max(2, TS * 0.08);
    ctx.setLineDash([TS * 0.18, TS * 0.12]);
    ctx.beginPath();
    ctx.arc(x, y, TS * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    if (C && ready(im)) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang + Math.PI / 2);
      const h = TS * 1.32,
        w = (h * C.w) / C.h;
      if (at) ctx.drawImage(im, at.x, at.y, at.w, at.h, -w / 2, -h / 2, w, h);
      else ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    // ad etiketi
    ctx.font = `700 ${Math.round(TS * 0.28)}px "Grandstander","Archivo",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = r.ad,
      lw = ctx.measureText(lab).width + TS * 0.3,
      ly = y + TS * 0.95;
    ctx.fillStyle = friend ? '#2f9e44' : '#fbf6ea';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.5;
    rr(ctx, x - lw / 2, ly - TS * 0.18, lw, TS * 0.36, TS * 0.12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = friend ? '#fff' : '#111';
    ctx.fillText(lab, x, ly + 1);
    if (r.durum === 'sorgu') {
      // sorgu: donmuş araç üstünde konuşma balonu
      const bx = x + TS * 0.4,
        by = y - TS * 0.85;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(bx, by, TS * 0.34, TS * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c92a2a';
      ctx.font = `${Math.round(TS * 0.36)}px "Bangers","Archivo Black",sans-serif`;
      ctx.fillText(DLG.cokOyunculu.sorguSimge, bx, by + 1);
    } else if (r.durum === 'kavga') {
      // kavga: duman bulutu ve PAT! KÜT!
      ctx.fillStyle = '#f6f1e4';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 4;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * TS * 0.35, y - TS * 0.2 + Math.sin(a) * TS * 0.22, TS * (0.3 + 0.06 * Math.sin(t * 20 + i)), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      star(x + TS * 0.6, y - TS * 0.7, TS * 0.13, '#ffc20e');
      ctx.font = `900 ${Math.round(TS * 0.4)}px "Bangers","Archivo Black",system-ui,sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#111';
      const wd = DLG.cokOyunculu.kavgaSesleri[Math.floor(t * 4) % DLG.cokOyunculu.kavgaSesleri.length];
      ctx.strokeText(wd, x, y - TS * 1.0);
      ctx.fillStyle = '#e63946';
      ctx.fillText(wd, x, y - TS * 1.0);
    }
  }
}
