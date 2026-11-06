/* Simülasyonu tarayıcısız (Node) koşturur: sim/ klasörünün ekrandan bağımsız olduğunun kanıtı ve
   ileride oyun sunucusunun çekirdeği. Sahneler (sorgu, dövüş) burada oynanmaz, atlanır.
   Kullanım: npm run sim -- [--role taxi|tag] [--minutes 2] [--seed 42] [--extra 0] [--bot]
   --bot: oyuncuyu otomatik sürer (en yakın yolcuya gider, alır, hedefe götürür); kazanç ölçümü için. */
import fs from 'node:fs';
import { setContent } from '../src/sim/content';
import { initGrid, ROADS } from '../src/sim/grid';
import { initPathfinding } from '../src/sim/pathfinding';
import { newGame } from '../src/sim/game';
import { update } from '../src/sim/update';
import { G } from '../src/sim/state';
import { bindBus } from '../src/sim/bus';
import { mkEnt } from '../src/sim/entities';
import { board } from '../src/sim/game';
import { setWant } from '../src/sim/movement';
import { bfs } from '../src/sim/pathfinding';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const role = arg('role', 'taxi') as 'taxi' | 'tag';
const BOT = process.argv.includes('--bot');
let rides = 0;
const minutes = +arg('minutes', '2'),
  extra = +arg('extra', '0');
let s = +arg('seed', '42');
Math.random = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

const json = (p: string) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const map = json('data/harita.json');
setContent(map, json('data/dialoglar.json'), json('assets/manifest.json'));
initGrid(map);
initPathfinding();

const counts: Record<string, number> = {};
let ended = '';
bindBus({
  toast: () => {},
  // sahneyi oynamadan geç: dünya devam etsin, oyuncu kısa süre dokunulmaz
  scene(name, a, b) {
    counts[name] = (counts[name] || 0) + 1;
    // bot: yolcuyu hep “Buyrun” ile alır, uzatılmış yol sorgusunda taksimetre ücretini alır
    if (BOT && name === 'pickupDialog' && a) {
      (a as any).state = 'wait';
      board(G.player, a);
      rides++;
    }
    if (BOT && name === 'routeDialog') G.money += b as number;
    G.paused = false;
    G.busy = false;
    G.focus = null;
    G.zoomT = 1;
    G.invuln = 2;
  },
  end(why) {
    ended = why;
    G.over = true;
  },
});

newGame(role);
for (let i = 0; i < extra; i++) {
  const t = ROADS[Math.floor(Math.random() * ROADS.length)];
  G.ents.push(mkEnt(i % 3 === 0 ? 'police' : i % 3 === 1 ? 'taxi' : 'tag', t[0], t[1]));
}
const dt = 1 / 30,
  frames = Math.round(minutes * 60 * 30);
const t0 = performance.now();
let f = 0;
for (; f < frames && !G.over; f++) {
  if (BOT && f % 3 === 0 && !G.busy) {
    const P = G.player,
      cx = Math.round(P.x),
      cy = Math.round(P.y);
    let tx: number, ty: number;
    if (P.carry) [tx, ty] = [P.carry.dx, P.carry.dy];
    else {
      let bd = 1e9;
      for (const p of G.pax)
        if (p.state === 'wait' && !(p.cool > G.clock)) {
          const d = Math.abs(p.x - cx) + Math.abs(p.y - cy);
          if (d < bd) [bd, tx, ty] = [d, p.x, p.y];
        }
    }
    if (tx !== undefined) {
      const d = bfs(cx, cy, tx, ty);
      if (d) setWant(d);
    }
  }
  update(dt);
}
const ms = performance.now() - t0;
console.log(
  `rol ${role} · ${G.ents.length} araç · ${f} kare (${((f * dt) / 60).toFixed(1)} dk oyun) · kare başına ${(ms / f).toFixed(3)} ms` +
    ` · kasa ₺${G.money} · bekleyen yolcu ${G.pax.filter((p) => p.state === 'wait').length}` +
    ` · yolculuk ${rides} · sahneler ${JSON.stringify(counts)}${ended ? ' · gün bitti: ' + ended : ''}`,
);
