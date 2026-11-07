// <auto-imports>
import { DLG, ECO } from './content';
import { DAY, DF, G, TL, addTagXP, mods, setDay, setG, tagLevel } from './state';
import { T, dist, rnd } from './util';
import { DAT, RADARS, STREETS, TAXI_START, ZONES, district, isBog, isBridge, isTunnel, zoneAt } from './grid';
import { npcWitness, witness } from './ai';
import { mkEnt } from './entities';
import { newCheck, pickWave } from './events';
import { clearWant } from './movement';
import { pickDest, spawnPax, taximeter } from './passengers';
import { randFar } from './pathfinding';
import { bus } from './bus';
import { newStats, rideDone, rideStart } from './ridelife';
import type { SceneName } from './bus';
// </auto-imports>
/* ================= OYUN: yeni gün, yolcu alma/indirme, ücretler, kontrol noktaları ================= */
/** yeni gün: dünyayı kurar. Ekran tarafı (kamera, katmanlar, açılış bildirimleri) ui/menu.ts’de. */
export interface ShiftOpts {
  /** başlangıç saati (ör. 5 ya da 17) */
  startH: number;
  /** süre (saat); gün uzunluğu buna göre kısalır */
  span: number;
  mods: {
    fareMul: number;
    demandMul: number;
    complaintMul: number;
    fuelMul: number;
    speedMul: number;
    oldCar: boolean;
  };
  /** kariyer: günün havası (çizim için) */
  hava?: string;
  /** kariyer: müdavimlerle ilişki (kimlik → puan) */
  mudavim?: Record<string, number>;
  /** kariyer: günün dolar kuru (turist doları için) */
  kur?: number;
  /** kariyer Tag’ci: sürülen aracın seviyesi (0–4) */
  tagLevel?: number;
  /** kariyerde oyuncunun sabit durağı */
  stand?: string;
  /** kariyerde Tag’cinin sabit mahallesi (kare) */
  home?: [number, number];
}
export function newGame(role, shift?: ShiftOpts) {
  setDay(((DF().day || 480) * (shift ? shift.span : 24)) / 24);
  setG({
    ...(shift
      ? {
          career: true,
          startH: shift.startH,
          span: shift.span,
          mods: shift.mods,
          tagLevel: shift.tagLevel,
          kur: shift.kur,
          hava: shift.hava,
          mudavimRel: shift.mudavim || {},
          stats: newStats(),
          combo: 0,
        }
      : {}),
    role,
    time: DAY,
    money: 0,
    nitro: 0,
    nitroCD: 0,
    radarCD: {},
    adUsed: {},
    debt: 0,
    debtName: '',
    intelT: 0,
    freeFuel: 0,
    wave: null,
    nextWave: null,
    waveT: 20,
    ents: [],
    pax: [],
    player: null,
    invuln: 0,
    helperT: 0,
    paxT: 0,
    respawns: [],
    fx: [],
    clouds: [],
    over: false,
    clock: 0,
    cine: null,
    paused: false,
    busy: false,
    focus: null,
    zoomT: 1,
    fightT: 0,
    lastAct: 'aldın',
    hideName: false,
    checks: [],
    fuel: 0,
    home: null,
  });
  clearWant();
  let st = TAXI_START;
  if (role === 'taxi') {
    G.stand = (shift && ZONES.find((z) => z.name === shift.stand)) || rnd(ZONES);
    const z = G.stand,
      pool = STREETS.filter((s) => zoneAt(s[0], s[1]) === z && !z.homes.some((h) => h[0] === s[0] && h[1] === s[1]));
    st = rnd(pool);
  }
  if (role === 'tag') {
    const pool = STREETS.filter(
      (s) =>
        !ZONES.some((z) => s[0] >= z.x0 - 3 && s[0] <= z.x1 + 3 && s[1] >= z.y0 - 3 && s[1] <= z.y1 + 3) &&
        s[0] % 4 === 0 &&
        s[1] % 4 === 0,
    );
    st = shift && shift.home ? shift.home : rnd(pool);
    G.home = { x: st[0], y: st[1], name: district(st[0], st[1]) };
  }
  const P = mkEnt(role === 'taxi' ? 'taxi' : 'tag', st[0], st[1], true);
  G.player = P;
  G.ents.push(P);
  const add = (k, n) => {
    for (let i = 0; i < n; i++) {
      const t = randFar(7);
      G.ents.push(mkEnt(k, t[0], t[1]));
    }
  };
  if (role === 'tag') {
    add('taxi', 280);
    add('tag', 120);
    add('police', 140);
  } else {
    add('tag', 240);
    add('taxi', 120);
    add('police', 140);
  }
  for (const z of ZONES)
    for (const h of z.homes) {
      const e = mkEnt('taxi', h[0], h[1]);
      e.home = h.slice();
      e.zone = z;
      G.ents.push(e);
    }
  G.checks = [];
  for (let i = 0; i < 100; i++) G.checks.push(newCheck());
  for (let i = 0; i < 200; i++) spawnPax();
  G.nextWave = pickWave();
  bus.hud();
}
export function arrive(e) {
  if (e.kind === 'police' || e.home) return;
  const cx = Math.round(e.x),
    cy = Math.round(e.y);
  if (e.isPlayer) {
    const onB = isBog(cx) && isBridge(cx, cy);
    if (onB && !e.onBridge) {
      G.money -= 15;
      fx(e.x, e.y, 'Köprü −₺15', '#868e96');
      bus.hud();
    }
    e.onBridge = onB;
    {
      const inT = isTunnel(cx, cy);
      if (inT && !e.inTunnel) {
        G.money -= 25;
        fx(e.x, e.y, 'Avrasya −₺25', '#d6402b');
        bus.toast('Avrasya Tüneli geçiş ücreti −₺25');
        bus.hud();
      }
      e.inTunnel = inT;
    }
    if (G.nitro > 0 && !G.busy) {
      const rd = RADARS.find((q) => Math.abs(q[0] - cx) + Math.abs(q[1] - cy) <= 2 && !(G.radarCD[q[2]] > G.clock));
      if (rd) {
        G.radarCD[rd[2]] = G.clock + 6;
        const fine = 300;
        G.money -= fine;
        fx(e.x, e.y, 'Radar −₺' + fine, '#d6402b');
        bus.toast(`Radar! Nitroyla hız sınırını aştın. Hız cezası −₺${fine}`, true);
        bus.flash();
        bus.hud();
      }
    }
    if (!G.busy && G.invuln <= 0) {
      const ck = G.checks.find((k) => k.x === cx && k.y === cy && k.shown <= 0);
      if (ck && checkpoint(ck)) return;
    }
  }
  if (e.carry) {
    if (cx === e.carry.dx && cy === e.carry.dy) deliver(e);
    return;
  }
  if (e.chase) return;
  if (e.isPlayer && G.lastRide) return; // son yolcu: yeni yolcu alınmaz
  const p = G.pax.find((p) => p.state === 'wait' && p.x === cx && p.y === cy && !(e.isPlayer && p.cool > G.clock));
  if (!p) return;
  if (e.isPlayer && G.role === 'taxi') {
    if (G.busy) return;
    if (p.claim) {
      p.claim.targetP = null;
      p.claim = null;
    }
    p.state = 'talk';
    const zz = zoneAt(p.x, p.y);
    if (p.dx === undefined)
      pickDest(p, p.look.tourist ? 'tour' : zz && zz.w >= 2 ? 'long' : Math.random() < 0.5 ? 'short' : 'long');
    cinematic(p.x, p.y, 0.45, 'pickupDialog', p);
    return;
  }
  board(e, p);
}
export function board(e, p) {
  if (p.claim && p.claim !== e) p.claim.targetP = null;
  p.state = 'ride';
  p.claim = null;
  e.carry = p;
  e.targetP = null;
  p.driven = 0;
  p.rideT = 0;
  if (p.dx === undefined) {
    const zz = zoneAt(p.x, p.y);
    pickDest(p, zz && zz.w >= 2 ? 'long' : 'any');
  }
  const P = G.player;
  if (e.isPlayer) rideStart(p);
  if (e.isPlayer) {
    if (G.role === 'tag') {
      G.lastAct = 'aldın';
      G.lastLoc = district(Math.round(P.x), Math.round(P.y));
      if (!witness(P, 'aldın')) bus.toast(`${p.look.name} bindi, kimse görmedi. ${DAT[p.dest]} götür.`);
    }
  } else if (e.kind === 'tag') {
    const n = npcWitness(e);
    if (G.role === 'taxi' && dist(e, P) <= 5) {
      e.revealed = 10;
      e.innocent = Math.random() < 0.2;
      bus.toast('Şu araç Tag! Yolcu aldı, peşine düş.');
    } else if (n && G.role === 'tag' && dist(e, P) < 10)
      bus.toast(
        zoneAt(Math.round(e.x), Math.round(e.y))
          ? 'Durakçılar bir Tag’in peşine düştü!'
          : 'Taksiciler bir Tag’in peşine düştü!',
      );
  }
  bus.hud();
}
export function deliver(e) {
  const p = e.carry;
  e.carry = null;
  G.pax = G.pax.filter((q) => q !== p);
  if (!e.isPlayer) return;
  if (G.role === 'tag') {
    const L = TL(),
      f = Math.round(p.fare * L.fare);
    G.money += f;
    fx(e.x, e.y, '+₺' + f, '#2f9e44');
    G.lastAct = 'indirdin';
    rideDone(p, f, !!p.complained);
    if (!p.complained && Math.random() < L.tip) {
      const tp = 20 + Math.floor(Math.random() * 4) * 10;
      G.money += tp;
      setTimeout(
        () => bus.toast(T(DLG.tagLevels.tip, { yolcu: p.look.name, soz: rnd(DLG.tagLevels.happy), bahsis: tp })),
        1300,
      );
    }
    if (!G.career) {
      // hızlı günde teslimat sayısı kalıcı Tag seviyesini yükseltir; kariyerde seviye araçtan gelir
      const before = tagLevel();
      addTagXP();
      if (tagLevel() > before) {
        G.player.spr = null;
        setTimeout(() => bus.toast(T(DLG.tagLevels.up, { arac: TL().ad })), 2600);
      }
    }
    G.lastLoc = district(Math.round(e.x), Math.round(e.y));
    if (!witness(e, 'indirdin'))
      bus.toast(p.complained ? `${p.dest} teslim ama şikayetli. +₺${f}` : `${p.dest} teslim. +₺${f}`);
  } else {
    const before = G.money;
    const normal = taximeter(p.m, p.cross);
    if (p.scam) {
      if (p.look.vlog && Math.random() < 0.75 && !G.busy) {
        cinematic(e.x, e.y, 0.6, 'viralDialog', p);
        return;
      }
      // kariyer: turistlerin bir kısmı dolarla öder (hızlı günde rastgele çekilmez, eşitlik korunur)
      let usd = 0;
      if (G.career && G.kur && Math.random() < ECO.turist.dolarOrani) {
        usd = Math.max(1, Math.round(p.fare / G.kur));
        G.usd = (G.usd || 0) + usd;
        fx(e.x, e.y, '+$' + usd, '#2f9e44');
      } else {
        G.money += p.fare;
        fx(e.x, e.y, '+₺' + p.fare, '#2f9e44');
      }
      const otelSikayet = Math.random() < 0.2;
      rideDone(p, usd ? 0 : p.fare, otelSikayet);
      if (otelSikayet) {
        G.money -= 1500;
        bus.toast(`Turist otelden şikayet etti! Taksimetresiz fahiş ücret cezası −₺1500`, true);
      } else
        bus.toast(
          usd
            ? T(DLG.kariyer.turistDolar, { hedef: p.dest, usd })
            : `${p.dest} teslim. Turistten ₺${p.fare} kazıkladın...`,
        );
    } else if (p.fixed) {
      G.money += p.fare;
      fx(e.x, e.y, '+₺' + p.fare, '#2f9e44');
      rideDone(p, p.fare, !!p.lateComplain);
      if (p.lateComplain) {
        G.money -= 400;
        bus.toast(`${p.look.name}: “${DLG.pickup.lateComplain}” −₺400`, true);
      } else bus.toast(`${p.dest} teslim. Pazarlıklı ₺${p.fare}`);
    } else {
      const dr = Math.round(p.driven || 0),
        meter = taximeter(dr, p.cross),
        ratio = dr / Math.max(1, p.m);
      if (
        !G.busy &&
        dr > p.m + 4 &&
        ratio > 1.35 &&
        Math.random() <
          Math.min(0.95, ((ratio - 1.2) * 0.9 + (p.look.rec ? 0.2 : 0)) * mods().complaintMul) *
            (p.look.tourist ? (p.look.vlog ? 0.8 : 0.35) : 1)
      ) {
        cinematic(e.x, e.y, 0.5, 'routeDialog', p, meter, normal);
        bus.hud();
        return;
      }
      if (p.honest) {
        const tip = 20 + Math.floor(Math.random() * 5) * 10;
        G.money += tip;
        bus.toast(`Turist bahşiş bıraktı: “Teşekkür, çok iyi!” +₺${tip}`);
      }
      G.money += meter;
      rideDone(p, meter, false);
      fx(e.x, e.y, '+₺' + meter, '#2f9e44');
      if (!p.honest)
        bus.toast(
          meter > normal + 20 ? `${p.dest} teslim. Taksimetre şişti: +₺${meter}` : `${p.dest} teslim. +₺${meter}`,
        );
    }
    if (G.debt > 0) {
      const g = G.money - before;
      if (g > 0) {
        const cut = Math.round(g / 2);
        G.money -= cut;
        G.debt--;
        setTimeout(() => bus.toast(`${G.debtName} payını aldı: −₺${cut}`, true), 1200);
      }
    }
  }
  bus.hud();
}
export function checkpoint(ck) {
  ck.shown = 6;
  const P = G.player;
  if (G.role === 'tag') {
    if (P.carry) {
      cinematic(P.x, P.y, 0.6, 'tagVsPolice', true);
      return true;
    }
    bus.toast('Sivil polis çevirmesi! Boştaydın, ehliyet ruhsatla geçtin.');
    return false;
  }
  if (G.fightT > 0) {
    cinematic(P.x, P.y, 0.6, 'taxiVsPolice', true);
    return true;
  }
  if (P.carry && P.carry.fixed) {
    G.money -= 500;
    bus.toast('Sivil çevirme: taksimetre kapalı! −₺500', true);
    bus.hud();
    return false;
  }
  bus.toast('Sivil polis çevirmesi. Rutin kontrol, iyi çalışmalar.');
  return false;
}
export function fx(x, y, text, color) {
  G.fx.push({ x, y, text, color, t: 1.3 });
}
export function nitro() {
  if (!G || G.over || G.paused || G.busy || G.nitroCD > 0) return;
  G.nitro = 2.2;
  G.nitroCD = 9;
  fx(G.player.x, G.player.y, 'NİTRO!', '#e8590c');
}
export const inHome = () => G.home && dist(G.player, G.home) <= 3.6;
/** olaya yakınlaş; süre dolunca bus.scene ile sahne açılır. x, y kare koordinatı. */
export function cinematic(x: number, y: number, dur: number, scene: SceneName, a?: any, b?: any, c?: any) {
  G.busy = true;
  G.cine = { t: 0, dur, scene, args: [a, b, c] };
  G.focus = { x, y };
  G.zoomT = 2.1;
}
