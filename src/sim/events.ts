// <auto-imports>
import { DLG } from './content';
import { G } from './state';
import { T, rnd } from './util';
import { STREETS, VENUES, district, zoneAt } from './grid';
import { bus } from './bus';
import { assignProf, mkLook, mkTourist } from './passengers';
import { randFar } from './pathfinding';
import type { Pax } from './types';
// </auto-imports>
export function newCheck() {
  const t = randFar(
    7,
    STREETS.filter((s) => !zoneAt(s[0], s[1])),
  );
  return { x: t[0], y: t[1], shown: 0, life: 25 + Math.random() * 20 };
}
/* ---- yolcu dalgaları ve telsiz istihbaratı ---- */
export function pickWave() {
  for (let i = 0; i < 20; i++) {
    const ev = rnd(DLG.intel.events);
    if (ev.mekan) {
      const V = VENUES.find((v) => v.name === rnd(ev.mekan));
      if (!V) continue;
      const cx = V.c + 1,
        cy = V.r + 1;
      const tiles = STREETS.filter((s) => Math.hypot(s[0] - cx, s[1] - cy) <= 8.5);
      if (tiles.length) return { t: ev.t, semt: V.name, tiles, x: cx, y: cy, left: ev.adet || 18, dur: 35 };
      continue;
    }
    const sm = rnd(ev.semt),
      tiles = STREETS.filter((s) => district(s[0], s[1]) === sm || (zoneAt(s[0], s[1]) || {}).name === sm);
    if (tiles.length) {
      const c = tiles[Math.floor(tiles.length / 2)];
      return { t: ev.t, semt: sm, tiles, x: c[0], y: c[1], left: ev.adet || 18, dur: 35 };
    }
  }
  return null;
}
export function waveTick(w) {
  if (G.wave) {
    G.wave.dur -= w;
    G.wave.spawnT = (G.wave.spawnT || 0) - w;
    if (G.wave.left > 0 && G.wave.spawnT <= 0) {
      G.wave.spawnT = 0.25;
      G.wave.left--;
      spawnPaxAt(G.wave.tiles, G.wave.t, G.wave.semt);
    }
    if (G.wave.dur <= 0) G.wave = null;
  }
  G.waveT -= w;
  if (G.waveT <= 0) {
    G.wave = G.nextWave;
    G.nextWave = pickWave();
    G.waveT = 40 + Math.random() * 20;
    if (G.wave && G.intelT > 0) bus.toast(T(DLG.intel.wave, { etkinlik: G.wave.t, semt: G.wave.semt }));
  }
}
export function spawnPaxAt(tiles, ev, venue) {
  for (let i = 0; i < 20; i++) {
    const t = rnd(tiles);
    if (G.pax.some((p) => p.x === t[0] && p.y === t[1])) continue;
    const np: Pax = {
      x: t[0],
      y: t[1],
      state: 'wait',
      claim: null,
      look: G.role === 'taxi' && Math.random() < 0.1 ? mkTourist() : mkLook(),
      ph: Math.random() * 6,
      event: ev || null,
    };
    assignProf(np, ev, venue);
    G.pax.push(np);
    return;
  }
}
