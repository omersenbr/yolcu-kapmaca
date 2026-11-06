// <auto-imports>
import { G } from '../core/state';
import { rnd } from '../core/util';
import { COLS, DIRS, ROADS, ROWS, isRoad } from '../map/grid';
import type { Tile } from '../core/types';
// </auto-imports>
/* ================= YOL BULMA ================= */
export const randRoad = () => rnd(ROADS).slice();
export function randFar(min: number, list?: Tile[]): Tile {
  list = list || ROADS;
  let t = rnd(list);
  for (let i = 0; i < 80; i++) {
    t = rnd(list);
    if (!G || !G.player || Math.hypot(t[0] - G.player.x, t[1] - G.player.y) >= min) return t.slice();
  }
  return t.slice();
}
/* A* çalışma dizileri (harita boyutunda, bir kez ayrılır; damga ile sıfırlanır) */
export let AG = null,
  AST = null,
  AFD = null,
  ACL = null,
  ASTAMP = 0;
export function initPathfinding() {
  const n = COLS * ROWS;
  AG = new Float32Array(n);
  AST = new Int32Array(n);
  AFD = new Int8Array(n);
  ACL = new Int32Array(n);
  ASTAMP = 0;
}
export function bfs(sx: number, sy: number, gx: number, gy: number, wantDist?: boolean): any {
  // A*: hedefe giden ilk adımın yönü
  if (sx === gx && sy === gy) return wantDist ? 0 : null;
  if (wantDist) return Math.abs(gx - sx) + Math.abs(gy - sy);
  ASTAMP++;
  const S = ASTAMP,
    s = sx + sy * COLS,
    hi = [],
    hf = [];
  const push = (k, f) => {
    hi.push(k);
    hf.push(f);
    let i = hi.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] <= hf[i]) break;
      let t = hi[p];
      hi[p] = hi[i];
      hi[i] = t;
      t = hf[p];
      hf[p] = hf[i];
      hf[i] = t;
      i = p;
    }
  };
  const pop = () => {
    const k = hi[0],
      lk = hi.pop(),
      lf = hf.pop();
    if (hi.length) {
      hi[0] = lk;
      hf[0] = lf;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < hi.length && hf[l] < hf[m]) m = l;
        if (r < hi.length && hf[r] < hf[m]) m = r;
        if (m === i) break;
        let t = hi[m];
        hi[m] = hi[i];
        hi[i] = t;
        t = hf[m];
        hf[m] = hf[i];
        hf[i] = t;
        i = m;
      }
    }
    return k;
  };
  AST[s] = S;
  AG[s] = 0;
  AFD[s] = -1;
  push(s, 0);
  let best = -1,
    bh = 1e9,
    exp = 0;
  const o = Math.floor(Math.random() * 4);
  while (hi.length && exp < 5000) {
    const k = pop();
    if (ACL[k] === S) continue;
    ACL[k] = S;
    exp++;
    const x = k % COLS,
      y = (k / COLS) | 0,
      h = Math.abs(gx - x) + Math.abs(gy - y);
    if (k !== s && h < bh) {
      bh = h;
      best = k;
    }
    if (h === 0) break;
    for (let j = 0; j < 4; j++) {
      const i = (j + o) & 3,
        nx = x + DIRS[i][0],
        ny = y + DIRS[i][1];
      if (!isRoad(nx, ny)) continue;
      const nk = nx + ny * COLS;
      if (ACL[nk] === S) continue;
      const ng = AG[k] + 1;
      if (AST[nk] === S && AG[nk] <= ng) continue;
      AST[nk] = S;
      AG[nk] = ng;
      AFD[nk] = k === s ? i : AFD[k];
      push(nk, ng + (Math.abs(gx - nx) + Math.abs(gy - ny)) * 1.05);
    }
  }
  return best >= 0 && AFD[best] >= 0 ? DIRS[AFD[best]] : null;
}
export function randNear(x, y, R) {
  for (let i = 0; i < 30; i++) {
    const c = Math.round(x + (Math.random() * 2 - 1) * R),
      r = Math.round(y + (Math.random() * 2 - 1) * R);
    if (isRoad(c, r)) return [c, r];
  }
  return randRoad();
}
