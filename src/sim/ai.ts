// <auto-imports>
import { DF, G } from './state';
import { dist } from './util';
import { DIRS, isRoad, zoneAt } from './grid';
import { bus } from './bus';
import { randNear } from './pathfinding';
import type { Ent } from './types';
// </auto-imports>
/* ================= YAPAY ZEKÂ: hedef seçimi, kaçış, kovalama, tanıklar ================= */
export function npcGoal(e, cx, cy) {
  if (e.chase) {
    const T = e.target || G.player;
    return [Math.round(T.tx), Math.round(T.ty)];
  }
  if (e.kind === 'police') {
    if (!e.goal || (e.goal[0] === cx && e.goal[1] === cy)) e.goal = randNear(cx, cy, 30);
    return e.goal;
  }
  if (e.carry) return [e.carry.dx, e.carry.dy];
  if (e.targetP && e.targetP.state === 'wait' && e.targetP.claim === e) return [e.targetP.x, e.targetP.y];
  e.targetP = null;
  let best = null,
    bd = 1e9;
  for (const p of G.pax)
    if (p.state === 'wait' && !p.claim) {
      const d = Math.abs(p.x - cx) + Math.abs(p.y - cy) - (e.kind === 'taxi' && p.look.tourist ? 16 : 0);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  if (best && bd < 12) {
    best.claim = e;
    e.targetP = best;
    return [best.x, best.y];
  }
  if (!e.goal || (e.goal[0] === cx && e.goal[1] === cy)) e.goal = randNear(cx, cy, 30);
  return e.goal;
}
export function fleeDir(e, cx, cy) {
  const T = e.threat || G.player;
  let opts = DIRS.filter((v) => isRoad(cx + v[0], cy + v[1]));
  if (opts.length > 1 && e.dir) opts = opts.filter((v) => !(v[0] === -e.dir[0] && v[1] === -e.dir[1]));
  let best = opts[0],
    bs = -1;
  for (const v of opts) {
    const sc = Math.hypot(cx + v[0] - T.x, cy + v[1] - T.y) + Math.random() * 0.8;
    if (sc > bs) {
      bs = sc;
      best = v;
    }
  }
  return best;
}
export function npcWitness(t) {
  const z = zoneAt(Math.round(t.x), Math.round(t.y));
  let n = 0;
  for (const x of G.ents) {
    if (x.isPlayer || x.kind !== 'taxi' || x.carry || x.chase) continue;
    if (dist(x, t) <= DF().radius || (z && x.zone === z)) {
      startChase(x, t);
      n++;
    }
  }
  if (n) {
    if (t.innocent === undefined) t.innocent = Math.random() < 0.15;
    if (G.role === 'taxi' && !G.assist && dist(t, G.player) <= 5.7 && dist(t, G.player) > 0.8) bus.radio(t, z);
  }
  return n;
}
export function witness(P, verb) {
  const z = zoneAt(Math.round(P.x), Math.round(P.y));
  let tx = 0,
    po = 0;
  const R = DF().radius;
  for (const n of G.ents) {
    if (n.isPlayer) continue;
    const d = dist(n, P);
    if (n.kind === 'taxi' && !n.carry && (d <= R || (z && n.zone === z))) {
      startChase(n, P);
      tx++;
    }
    if (n.kind === 'police' && d <= R) {
      startChase(n, P);
      po++;
    }
  }
  if (po) bus.toast(`Polis yolcu ${verb === 'aldın' ? 'aldığını' : 'indirdiğini'} gördü! Kaç!`, true);
  else if (tx)
    bus.toast(
      z && z.w >= 2
        ? 'Durak taksicileri seni gördü! Kaç!'
        : tx > 1
          ? 'Taksiciler seni gördü! Kaç!'
          : 'Bir taksici seni gördü! Kaç!',
      true,
    );
  return po + tx;
}
export function startChase(n: Ent, target?: Ent) {
  n.chase = true;
  n.target = target || G.player;
  n.chaseT = 0;
  n.lostT = 0;
  n.flee = false;
  if (n.targetP) {
    n.targetP.claim = null;
    n.targetP = null;
  }
  n.goal = null;
}
export const onPlayer = (e) => e.chase && (e.target || G.player) === G.player;
export function clearChases() {
  for (const e of G.ents) {
    if (onPlayer(e)) {
      e.chase = false;
      e.lostT = 0;
    }
    e.turf = false;
    e.helperRolled = false;
    e.pending = false;
  }
}
