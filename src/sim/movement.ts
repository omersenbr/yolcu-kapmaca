// <auto-imports>
import { DF, G } from './state';
import { rnd } from './util';
import { DIRS, isRoad, tch } from './grid';
import { fleeDir, npcGoal } from './ai';
import { arrive, fx } from './game';
import { bfs } from './pathfinding';
// </auto-imports>
/* ================= HAREKET: kareden kareye akıcı gidiş (serbest fizik yok) =================
   Oyuncunun verdiği yön ~0,9 sn saklanır ve ilk uygun kavşakta uygulanır. */
export let want = null,
  wantT = -9;
export function clearWant() {
  want = null;
}
export function decide(e) {
  const cx = Math.round(e.x),
    cy = Math.round(e.y);
  let d = null;
  if (e.isPlayer) {
    const fresh = want && G.clock - wantT < 0.9;
    if (fresh && isRoad(cx + want[0], cy + want[1])) {
      d = want;
      want = null;
    } else if (e.dir && isRoad(cx + e.dir[0], cy + e.dir[1])) d = e.dir;
    if (want && !fresh) want = null;
  } else if (e.flee) d = fleeDir(e, cx, cy);
  else if (!e.chase && !e.home && Math.abs(e.x - G.player.x) + Math.abs(e.y - G.player.y) > 46) {
    const opts = DIRS.filter((v) => isRoad(cx + v[0], cy + v[1]));
    const fw = e.dir && opts.find((v) => v[0] === e.dir[0] && v[1] === e.dir[1]);
    const nb = opts.filter((v) => !e.dir || !(v[0] === -e.dir[0] && v[1] === -e.dir[1]));
    d = fw && Math.random() < 0.7 ? fw : rnd(nb.length ? nb : opts);
    e.goal = null;
  } else if (e.home && !e.chase) {
    if (cx === e.home[0] && cy === e.home[1]) {
      e.moving = false;
      e.dir = [1, 0];
      return;
    }
    d = bfs(cx, cy, e.home[0], e.home[1]);
  } else {
    const g = npcGoal(e, cx, cy);
    if (g) d = bfs(cx, cy, g[0], g[1]);
    if (!d) {
      e.goal = null;
      d = rnd(DIRS.filter((v) => isRoad(cx + v[0], cy + v[1])));
    }
  }
  if (!d) {
    e.moving = false;
    return;
  }
  e.dir = d;
  e.tx = cx + d[0];
  e.ty = cy + d[1];
  e.moving = true;
}
/* hız çarpanları: otoyol/köprü/tünel 1,35, cadde 1,12, sokak 1; nitro ×1,65 */
export function speedOf(e) {
  const w = DF().world;
  const tt = tch(Math.round(e.x), Math.round(e.y)),
    rf = tt === 'A' || tt === 'K' || tt === 'T' ? 1.35 : tt === 'c' ? 1.12 : 1;
  if (e.isPlayer) return 4.5 * w * rf * (G.nitro > 0 ? 1.65 : 1);
  if (e.chase) return (e.kind === 'police' ? 4.2 : 4.0) * w * rf * DF().chase;
  if (e.kind === 'tag' && (e.revealed > 0 || e.flee)) return 3.7 * w * rf;
  return (e.kind === 'police' ? 2.7 : 3.1) * w * rf;
}
export function move(e, dt) {
  if (e.stun > 0) return;
  let left = speedOf(e) * dt,
    guard = 0;
  while (left > 1e-6 && guard++ < 6) {
    if (!e.moving) {
      decide(e);
      if (!e.moving) break;
    }
    const dx = e.tx - e.x,
      dy = e.ty - e.y,
      d = Math.abs(dx) + Math.abs(dy);
    const step = Math.min(d, left);
    if (e.isPlayer) {
      if (e.carry) e.carry.driven = (e.carry.driven || 0) + step;
      if (G.freeFuel <= 0) G.fuel += step * 0.8;
      if (G.fuel >= 10) {
        G.fuel -= 10;
        G.money -= 10;
        fx(e.x, e.y, 'Benzin −₺10', '#868e96');
      }
    }
    if (d <= left) {
      e.x = e.tx;
      e.y = e.ty;
      left -= d;
      e.moving = false;
      arrive(e);
    } else {
      e.x += Math.sign(dx) * left;
      e.y += Math.sign(dy) * left;
      left = 0;
    }
  }
}

export function setWant(d) {
  want = d;
  wantT = G ? G.clock : 0;
  if (!G || G.over || G.paused) return;
  const P = G.player;
  if (P.moving && P.dir && d[0] === -P.dir[0] && d[1] === -P.dir[1]) {
    P.tx -= P.dir[0];
    P.ty -= P.dir[1];
    P.dir = d;
    want = null;
  }
}
