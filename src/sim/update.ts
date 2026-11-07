// <auto-imports>
import { DLG } from './content';
import { DF, G, TL, demand } from './state';
import { dist } from './util';
import { onPlayer, startChase } from './ai';
import { mkEnt } from './entities';
import { newCheck, waveTick } from './events';
import { cinematic, fx } from './game';
import { move } from './movement';
import { spawnPax } from './passengers';
import { randFar } from './pathfinding';
import { bus } from './bus';
// </auto-imports>
/* ================= GÜNCELLEME: her kare dünya, kovalama, çarpışma ve olaylar ================= */
export function update(dt) {
  G.clock += dt;
  for (const f of G.fx) f.t -= dt;
  G.fx = G.fx.filter((f) => f.t > 0);
  for (const c of G.clouds) c.t -= dt;
  G.clouds = G.clouds.filter((c) => c.t > 0);
  if (G.paused || G.over) return;
  let w = dt;
  if (G.cine) {
    G.cine.t += dt;
    w = dt * 0.15;
    if (G.cine.t >= G.cine.dur) {
      const c = G.cine;
      G.cine = null;
      G.paused = true;
      bus.scene(c.scene, ...c.args);
      return;
    }
  }
  G.time -= w;
  if (G.time <= 0) {
    G.time = 0;
    // kariyer: süre dolduğunda arabada yolcu varsa vardiya o yolcu teslim edilince biter
    if (G.career && G.player.carry) {
      if (!G.lastRide) {
        G.lastRide = true;
        bus.toast(DLG.kariyer.sonYolcu);
        bus.hud();
      }
    } else {
      bus.hud();
      bus.end('time');
      return;
    }
  }
  G.invuln = Math.max(0, G.invuln - w);
  if (G.nitro > 0) G.nitro -= w;
  if (G.nitroCD > 0) {
    G.nitroCD -= w;
  }
  bus.frame();
  for (const r of G.respawns) {
    r.t -= w;
    if (r.t <= 0) {
      const t = randFar(8);
      G.ents.push(mkEnt(r.kind, t[0], t[1]));
    }
  }
  G.respawns = G.respawns.filter((r) => r.t > 0);
  const dm = demand();
  if (G.intelT > 0) {
    G.intelT -= w;
    if (G.intelT <= 0) bus.frame();
  }
  if (G.freeFuel > 0) {
    G.freeFuel -= w;
    if (G.freeFuel <= 0) bus.frame();
  }
  waveTick(w);
  G.paxT -= w;
  if (G.paxT <= 0) {
    let wc = 0;
    for (const p of G.pax) if (p.state === 'wait') wc++;
    let n = 0;
    while (G.paxT <= 0 && n++ < 8) {
      G.paxT += dm.every;
      if (wc < dm.max) {
        spawnPax();
        wc++;
      }
    }
    if (G.paxT < 0) G.paxT = 0;
  }
  if (dm.tag !== G.lastDm) {
    if (G.lastDm !== undefined) {
      if (dm.rush === 'am') bus.toast('Sabah trafiği başladı, herkes işe gidiyor!');
      else if (dm.rush === 'pm') bus.toast('Akşam trafiği! Herkes eve dönüyor.');
      else if (dm.tag === 'gece') bus.toast('Gece oldu, yolcu azaldı.');
    }
    G.lastDm = dm.tag;
  }
  const P = G.player;
  G.fightT = Math.max(0, G.fightT - w);
  for (const ck of G.checks) {
    if (ck.shown > 0) {
      ck.shown -= w;
      if (ck.shown <= 0) Object.assign(ck, newCheck());
    } else {
      ck.life -= w;
      if (ck.life <= 0) Object.assign(ck, newCheck());
    }
  }
  {
    const c = P.carry;
    if (G.role === 'tag' && c && c.look.sting && !G.busy && c.rideT > 3.5) {
      cinematic(P.x, P.y, 0.5, 'stingDialog', c);
    }
    if (G.role === 'tag' && c) {
      c.rideT += w;
      const exp = (((c.m / 4.5) * 1.5 + 6) * DF().patience * TL().pat) / DF().world;
      if (!c.warned && c.rideT > exp) {
        c.warned = true;
        bus.toast(`${c.look.name}: “Daha ne kadar var?”`, true);
      }
      if (!c.complained && c.rideT > exp * 1.5) {
        c.complained = true;
        c.fare = Math.round(c.fare * 0.5);
        bus.toast('Yolcu uygulamaya şikayet etti! Ücret yarıya indi.', true);
      }
    }
  }
  // kovalayan eşlemesi karede bir kez kurulur (her Tag için bütün listeyi taramak yerine);
  // Map’e ilk kovalayan yazılır, böylece sonuç Array.find ile aynıdır.
  const alive = new Set(G.ents),
    hunter = new Map();
  for (const x of G.ents) if (x.chase && x.target && !hunter.has(x.target)) hunter.set(x.target, x);
  for (const e of G.ents) {
    if (e.stun > 0) e.stun -= w;
    if (e.chase && e.target && e.target !== P && !alive.has(e.target)) {
      e.chase = false;
      e.target = null;
    }
    if (e.kind === 'tag' && !e.isPlayer) {
      if (e.revealed > 0) e.revealed -= w;
      const th = hunter.get(e);
      if (th && dist(th, e) < 7) {
        e.flee = true;
        e.threat = th;
      } else if (e.revealed > 0 && G.role === 'taxi' && dist(e, P) < 6) {
        e.flee = true;
        e.threat = P;
      } else {
        e.flee = false;
        e.threat = null;
      }
    }
  }
  for (const e of G.ents) move(e, w);
  // kovalama takibi
  let had = false,
    still = false;
  for (const e of G.ents) {
    if (!e.chase) continue;
    const T = e.target || P,
      mine = T === P;
    if (mine) had = true;
    e.chaseT += w;
    if (dist(e, T) > 8) e.lostT += w;
    else e.lostT = 0;
    if (e.lostT > 1.5 / DF().chase || e.chaseT > 18) {
      e.chase = false;
      e.goal = null;
      e.target = null;
      e.turf = false;
    } else if (mine) still = true;
  }
  if (had && !still && !G.busy) {
    bus.toast('Atlattın!');
    for (const e of G.ents) e.helperRolled = false;
  }
  // NPC taksici NPC Tag’i yakaladı
  for (const e of G.ents) {
    if (!e.chase || !e.target || e.target === P || e.kind !== 'taxi') continue;
    const T = e.target;
    if (dist(e, T) < 0.7) {
      G.clouds.push({ x: (e.x + T.x) / 2, y: (e.y + T.y) / 2, t: 1.8 });
      T.stun = 3;
      T.revealed = 0;
      if (T.carry) {
        G.pax = G.pax.filter((q) => q !== T.carry);
        T.carry = null;
      }
      e.chase = false;
      e.target = null;
      if (G.role === 'taxi' && G.assist === T && dist(T, P) < 4) {
        G.money += 30;
        fx(P.x, P.y, '+₺30', '#2f9e44');
        bus.toast('Meslektaşlarla birlikte yakaladınız! “Sağ ol kardeşim.” +₺30');
        G.assist = null;
      } else if (dist(T, P) < 9)
        bus.toast(e.zone ? 'Durakçılar bir Tag’i yakalayıp pataklıyor!' : 'Taksiciler bir Tag’i yakalayıp pataklıyor!');
    }
  }
  if (
    G.assist &&
    (!G.ents.includes(G.assist) || (!G.ents.some((x) => x.chase && x.target === G.assist) && G.assist.revealed <= 0))
  ) {
    G.assist = null;
    bus.toast('Kovalama bitti, Tag kaçtı.');
  }
  if (G.role === 'tag') {
    G.helperT -= w;
    if (G.helperT <= 0) {
      G.helperT = 0.5;
      if (G.ents.some((e) => onPlayer(e) && e.kind === 'taxi'))
        for (const e of G.ents) {
          if (e.kind !== 'taxi' || e.isPlayer || e.chase || e.carry || e.helperRolled) continue;
          if (dist(e, P) <= 4.5) {
            e.helperRolled = true;
            if (Math.random() < 0.5) {
              startChase(e, P);
              bus.toast('Bir taksici daha yardıma geldi!', true);
            }
          }
        }
    }
  }
  if (!G.busy && G.invuln <= 0) {
    for (const e of G.ents) {
      if (e.isPlayer || dist(e, P) >= 0.7) continue;
      const fx2 = (P.x + e.x) / 2,
        fy2 = (P.y + e.y) / 2;
      if (G.role === 'tag') {
        if (onPlayer(e) && e.kind === 'police') {
          cinematic(fx2, fy2, 0.7, 'tagVsPolice', false);
          break;
        }
        if (onPlayer(e) && e.kind === 'taxi') {
          const n = G.ents.filter((x) => onPlayer(x) && x.kind === 'taxi' && dist(x, P) < 3).length;
          cinematic(fx2, fy2, 0.7, 'tagVsTaxi', Math.max(1, n));
          break;
        }
      } else {
        if (e.kind === 'police' && onPlayer(e)) {
          cinematic(fx2, fy2, 0.7, 'taxiVsPolice', false);
          break;
        }
        if (e.kind === 'taxi' && e.turf && onPlayer(e)) {
          const zz = e.zone;
          cinematic(fx2, fy2, 0.6, 'turfDialog', zz);
          break;
        }
        if (e.kind === 'tag' && (e.revealed > 0 || G.assist === e || G.ents.some((x) => x.chase && x.target === e))) {
          cinematic(fx2, fy2, 0.6, 'taxiCatchTag', e);
          break;
        }
      }
    }
  }
}
