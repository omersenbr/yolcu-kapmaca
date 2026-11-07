// <auto-imports>
import { DLG } from '../sim/content';
import { G, hourNow, mods } from '../sim/state';
import { T, clamp, dist, esc, rnd, shuffle } from '../sim/util';
import { rescue } from './ads';
import { ask, closePanel, openPanel, say, setCast, ui } from './comic';
import { baseVars, interrogate, rollEnemyWeapon, sayL } from './engine';
import { burstSVG, face } from './portraits';
import { fight } from '../fight/fight';
import { ASIA, DAT, DISTS, ZONES, district, zoneAt } from '../sim/grid';
import { endGame } from '../ui/endscreen';
import { toast } from '../ui/hud';
import { clearChases, startChase } from '../sim/ai';
import { board, fx } from '../sim/game';
import { FN, LOOK, MN } from '../sim/passengers';
import type { Vars } from '../sim/types';
import { rideDone } from '../sim/ridelife';
// </auto-imports>
/* ================= TAKSİCİ SAHNELERİ ================= */
/* ---- Taksici: turist ---- */
export async function touristDialog(p) {
  const S = DLG.tourist,
    P = G.player,
    L = p.look,
    v: Vars = { ...baseVars(p), semt: district(p.x, p.y), ücret: p.fare, turist: L.name };
  openPanel('pax', T(S.caption, v), [
    { svg: face(LOOK.taxi1, 'neutral'), name: 'Sen' },
    { svg: face(L, 'smile'), name: L.name },
  ]);
  const real = p.fare,
    info = T(S.info, v) + (L.vlog ? S.infoVlog : S.infoNormal) + (p.event ? T(S.infoEvent, { etkinlik: p.event }) : '');
  const h = hourNow(),
    night = h < 6 || h >= 20;
  const scams = shuffle(S.scams.filter((s) => !s.when || (s.when === 'night') === night)).slice(0, 2);
  const opts = [
    { t: S.honest, kind: 'honest' },
    ...scams.map((s) => ({ ...s, kind: 'scam' })),
    { t: S.long, kind: 'long' },
  ];
  const o = await ask(L.name, T(rnd(S.greet), v), opts, info);
  const go = (fare, flag) => {
    p.state = 'wait';
    if (flag) p[flag] = true;
    if (fare) {
      p.fare = fare;
      p.fixed = true;
    }
    board(P, p);
  };
  if (o.kind === 'honest' || o.kind === 'long') {
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
      { svg: face(L, 'smile'), name: L.name },
    ]);
    await say(L.name, o.kind === 'honest' ? S.honestYes : S.longYes);
    go(0, o.kind === 'honest' ? 'honest' : 'tourLong');
    closePanel();
    toast(
      o.kind === 'honest'
        ? `${L.name} bindi. ${v.hedefDat} götür.`
        : 'Taksimetre açık. Turistler yolu pek bilmez ama yine de dikkat...',
    );
    turfCheck(p);
    return;
  }
  if (Math.random() < Math.min(0.95, o.acc * (L.vlog ? 0.7 : 1) * (p.event ? 1.5 : 1))) {
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
      { svg: face(L, 'nervous'), name: L.name },
    ]);
    await say(L.name, rnd(S.scamYes));
    go(Math.round((real * o.mult) / 10) * 10, 'scam');
    closePanel();
    toast(`Turist kabul etti: ₺${p.fare}. Umarım kimse duymaz...`);
    turfCheck(p);
    return;
  }
  p.state = 'wait';
  p.claim = null;
  p.cool = G.clock + 6;
  setCast([
    { svg: face(LOOK.taxi1, 'nervous'), name: 'Sen' },
    { svg: face(L, 'angry'), name: L.name },
  ]);
  await say(L.name, o.no);
  if (Math.random() < (L.vlog ? 0.6 : 0.25)) {
    await say(L.name, L.vlog ? S.complainVlog : S.complainNormal);
    const fine = 600;
    G.money -= fine;
    ui.cast.innerHTML = `<div class="stamp">ŞİKAYET: −₺${fine}</div>`;
    await sayL(S.police, v);
    closePanel();
    toast(`Turist şikayeti: −₺${fine}`, true);
    return;
  }
  closePanel();
  toast('Turist başka taksi aramaya gitti.');
}
export async function viralDialog(p) {
  const S = DLG.tourist,
    L = p.look,
    v: Vars = { ...baseVars(p), ücret: p.fare, turist: L.name };
  openPanel('fight', T(S.viralCaption, v), [
    { svg: face(LOOK.taxi1, 'shock'), name: 'Sen' },
    { svg: face(L, 'angry'), name: L.name },
  ]);
  for (const l of S.viral) await sayL(l, v);
  ui.meter.hidden = true;
  ui.cast.innerHTML = `<div class="stamp">${esc(S.viralStamp)}</div>`;
  await sayL(S.viralFinal, v, 'Sonucu gör');
  ui.comic.hidden = true;
  endGame('ruhsat');
}
/* ---- Taksici: yolcu alma ---- */
export async function pickupDialog(p) {
  if (p.look.tourist) return touristDialog(p);
  const S = DLG.pickup,
    P = G.player,
    L = p.look,
    h = hourNow();
  const v: Vars = {
    ...baseVars(p),
    semt: district(p.x, p.y),
    km: (p.m * 0.35).toFixed(1).replace('.', ','),
    ücret: p.fare,
    öğün: h >= 5 && h < 11 ? 'Kahvaltı' : h >= 11 && h < 16 ? 'Öğle yemeği' : 'Akşam yemeği',
  };
  openPanel('pax', T(S.caption, v), [
    { svg: face(LOOK.taxi1, 'neutral'), name: 'Sen' },
    { svg: face(L, 'smile'), name: L.name },
  ]);
  const zHere = zoneAt(p.x, p.y),
    own = zHere && zHere === G.stand,
    foreign = zHere && !own;
  v.durak = zHere ? zHere.name : '';
  const otherSide = G.stand.x0 >= ASIA !== p.x >= ASIA;
  v.etkinlik = p.event || '';
  const info =
    T(S.info, v) +
    (p.cross ? S.infoBridge : '') +
    (own ? S.infoOwn : foreign ? T(S.infoForeign, v) : '') +
    (p.event ? T(S.infoEvent, v) : '') +
    (L.rec ? S.infoRec : '');
  const take = { t: T(S.take, v), kind: 'take' };
  const fun = () => {
    const f = rnd(S.fun);
    return { ...f, t: T(f.t, v), kind: 'excuse' };
  };
  let opts;
  if (p.short) {
    const ex = shuffle(S.excuses.map((e) => ({ ...e, kind: 'excuse' }))).slice(0, otherSide ? 2 : 3);
    if (otherSide) ex.push(fun());
    opts = [take, ...ex];
  } else {
    const fixed = Math.round((p.fare * 1.7) / 10) * 10;
    v.sabit = fixed;
    opts = [
      take,
      { t: T(S.fixed, v), kind: 'fixed', fixed },
      otherSide ? fun() : { ...(p.cross ? S.longCross : S.longSame), kind: 'excuse' },
    ];
  }
  if (foreign) opts.splice(1, 0, { t: T(S.notMine, v), kind: 'notmine' });
  const o = await ask(L.name, T(p.refused ? S.greetAgain : S.greet, v), opts, info);
  if (o.kind === 'take') {
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
      { svg: face(L, 'smile'), name: L.name },
    ]);
    await say(L.name, p.short ? S.takeShort : S.takeLong);
    p.state = 'wait';
    board(P, p);
    closePanel();
    toast(`${L.name} bindi. ${v.hedefDat} götür.`);
    turfCheck(p);
    return;
  }
  if (o.kind === 'fixed') {
    if (Math.random() < (p.event ? (L.rec ? 0.4 : 0.85) : L.rec ? 0.15 : 0.55)) {
      setCast([
        { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
        { svg: face(L, 'nervous'), name: L.name },
      ]);
      await say(L.name, p.event ? S.fixedYesEvent : S.fixedYes);
      if (p.event && Math.random() < 0.2) p.lateComplain = true;
      p.fare = o.fixed;
      p.fixed = true;
      p.state = 'wait';
      board(P, p);
      closePanel();
      toast(`Pazarlık tuttu! ₺${o.fixed}`);
      turfCheck(p);
      return;
    }
    return refuse(p, L.rec ? 0.9 : 0.5, S.fixedNo);
  }
  if (o.kind === 'notmine') {
    p.state = 'wait';
    p.claim = null;
    p.cool = G.clock + 8;
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
      { svg: face(L, 'neutral'), name: L.name },
      { svg: face(LOOK.taxi2, 'smile'), name: 'Durakçı' },
    ]);
    await say(L.name, S.notMineReply);
    await say('Durakçı', S.notMineDurak);
    closePanel();
    toast('Durağa saygı gösterdin. Ne şikayet ne kavga.');
    return;
  }
  return refuse(p, o.c + (L.rec ? 0.4 : 0), o.line || null);
}
export async function refuse(p, chance, line) {
  const S = DLG.pickup,
    L = p.look;
  p.state = 'wait';
  p.claim = null;
  p.cool = G.clock + 5;
  p.refused = (p.refused || 0) + 1;
  // eski araçta yolcular homurdanır: şikayet ihtimali artar (kariyer)
  if (Math.random() < Math.min(0.95, chance * mods().complaintMul)) {
    setCast([
      { svg: face(LOOK.taxi1, 'nervous'), name: 'Sen' },
      { svg: face({ ...L, rec: true }, 'angry'), name: L.name },
    ]);
    await say(L.name, (line ? line + ' ' : '') + rnd(S.complaint));
    const fine = 400;
    if (G.career) G.combo = 0; // şikayet komboyu bozar
    G.money -= fine;
    ui.cast.innerHTML = `<div class="stamp">ŞİKAYET: −₺${fine}</div>`;
    await sayL(S.zabita, {});
    closePanel();
    toast(`Şikayet yedin. −₺${fine}`, true);
    return;
  }
  setCast([
    { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
    { svg: face(L, 'angry'), name: L.name },
  ]);
  await say(L.name, line || rnd(S.noComplaint));
  closePanel();
}
export function turfCheck(p) {
  const P = G.player,
    z = ZONES.find((z) => p.x >= z.x0 - 2 && p.x <= z.x1 + 2 && p.y >= z.y0 - 2 && p.y <= z.y1 + 2);
  if (!z || z === G.stand) return;
  const ds = G.ents.filter((e) => e.zone === z && !e.chase);
  if (!ds.length) return;
  for (const e of ds) {
    startChase(e, P);
    e.turf = true;
  }
  setTimeout(
    () =>
      toast(
        `${z.name} durakçıları yolunu kesmeye geliyor! ${p.look.tourist ? 'Turisti kaptın, çok kızgınlar!' : ''}`,
        true,
      ),
    300,
  );
}

/* ---- Taksici: durak sorgusu ---- */
export async function turfDialog(z) {
  clearChases();
  const S = DLG.turf,
    O = S.outcomes,
    P = G.player,
    p = P.carry,
    v: Vars = { ...baseVars(p), durak: z.name },
    EW = rollEnemyWeapon();
  const cast = [
    { svg: face({ ...LOOK.taxi2, weapon: EW ? EW.id : null }, 'angry'), name: 'Durakçı' },
    { svg: face(LOOK.taxi1, 'nervous'), name: 'Sen' },
  ];
  if (p) cast.push({ svg: face(p.look, 'shock'), name: 'Yolcu' });
  openPanel('taxi', T(S.caption, v), cast, true);
  const res = await interrogate({ speaker: S.speaker, react: S.react, start: S.start, nodes: S.nodes, v, ctx: {} });
  const drop = () => {
    if (p) {
      G.pax = G.pax.filter((q) => q !== p);
      P.carry = null;
    }
  };
  if (res === 'yield') {
    drop();
    setCast([
      { svg: face(LOOK.taxi2, 'smile'), name: 'Durakçı' },
      { svg: face(LOOK.taxi1, 'neutral'), name: 'Sen' },
    ]);
    await sayL(O.yield, v);
    closePanel();
    toast('Yolcuyu durağa bıraktın.');
    return;
  }
  if (res === 'pass') {
    setCast([
      { svg: face(LOOK.taxi2, 'neutral'), name: 'Durakçı' },
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
    ]);
    await sayL(O.pass, v);
    G.invuln = 2;
    closePanel();
    toast('Durakçılar geçit verdi.');
    return;
  }
  if (res !== 'fight' && Math.random() < 0.5) {
    setCast([
      { svg: face(LOOK.taxi2, 'smile'), name: 'Durakçı' },
      { svg: face(LOOK.taxi1, 'angry'), name: 'Sen' },
    ]);
    await sayL(p ? O.takePax : O.takeNoPax, v);
    drop();
    G.invuln = 2;
    closePanel();
    toast('Durakçılar yolcunu aldı.', true);
    return;
  }
  const n = Math.max(1, G.ents.filter((e) => e.zone === z).length);
  const r = await fight(n, [LOOK.taxi2, LOOK.taxi3, LOOK.taxi1], LOOK.taxi1, 'Durakçı', { enemyWeapon: EW });
  const fv: Vars = { ...v, hız: r.rate.toFixed(1).replace('.', ','), şans: Math.round(r.ch * 100) };
  if (r.win) {
    ui.panel.className = 'panel taxi';
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
      { svg: face(LOOK.taxi2, 'hurt'), name: 'Durakçı' },
    ]);
    await sayL(O.win, fv);
    G.invuln = 3;
    closePanel();
    toast('Duraktan sıyrıldın!');
    return;
  }
  ui.cast.innerHTML = burstSVG();
  await sayL(O.lose, fv);
  if (EW && EW.id === 'haydar') {
    setCast([
      { svg: face({ ...LOOK.taxi2, weapon: 'haydar' }, 'smile'), name: 'Durakçı' },
      { svg: face(LOOK.taxi1, 'hurt'), name: 'Sen' },
    ]);
    await sayL(O.haydar, fv);
  }
  drop();
  G.money -= 150;
  setCast([{ svg: face(LOOK.taxi1, 'hurt'), name: 'Sen' }]);
  await sayL(O.loseSummary, fv);
  G.invuln = 2.5;
  closePanel();
}
/* ---- Taksici: uzatılmış yol sorgusu ---- */
export async function routeDialog(p, meter, normal) {
  const S = DLG.route,
    O = S.outcomes,
    L = p.look,
    v: Vars = { ...baseVars(p), taksimetre: meter, normal };
  openPanel('pax', T(S.caption, v), [
    { svg: face(LOOK.taxi1, 'nervous'), name: 'Sen' },
    { svg: face(L, 'angry'), name: L.name },
  ]);
  const start = clamp((p.driven / Math.max(1, p.m) - 1) * 0.5, 0.2, 0.7) + (L.rec ? 0.1 : 0);
  const res = await interrogate({ speaker: '{yolcu}', react: S.react, start, nodes: S.nodes, v, ctx: {} });
  if (res === 'discount') {
    G.money += normal;
    rideDone(p, normal, false);
    setCast([
      { svg: face(LOOK.taxi1, 'neutral'), name: 'Sen' },
      { svg: face(L, 'smile'), name: L.name },
    ]);
    await sayL(O.discount, v);
    closePanel();
    toast(`Normal ücret aldın. +₺${normal}`);
    return;
  }
  if (res === 'pass') {
    G.money += meter;
    rideDone(p, meter, false);
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
      { svg: face(L, 'neutral'), name: L.name },
    ]);
    await sayL(O.pass, v);
    closePanel();
    toast(`Taksimetre tuttu! +₺${meter}`);
    return;
  }
  const fine = 600;
  G.money += normal - fine;
  rideDone(p, normal - fine, true);
  setCast([
    { svg: face(LOOK.taxi1, 'nervous'), name: 'Sen' },
    { svg: face({ ...L, rec: true }, 'angry'), name: L.name },
  ]);
  await sayL(O.fail, v);
  ui.cast.innerHTML = `<div class="stamp">${esc(O.stamp)}</div>`;
  ui.meter.hidden = true;
  await sayL(O.police, v);
  closePanel();
  toast(`Yolu uzattığın için şikayet: −₺${fine}`, true);
}
/* ---- Taksici: Tag yakaladı, sorguyu sen yapıyorsun ---- */
export async function taxiCatchTag(t) {
  const S = DLG.catchTag,
    P = G.player,
    p = t.carry,
    real = !t.innocent,
    v = baseVars(p);
  const helpers = G.ents.filter((x) => x.chase && x.target === t);
  const H = helpers.length > 0;
  for (const h of helpers) {
    h.chase = false;
    h.target = null;
  }
  if (G.assist === t) G.assist = null;
  if (p) {
    v.yanlış = rnd((p.look.fem ? FN : MN).filter((x) => x !== p.look.name));
    const w = rnd(DISTS.filter((d) => d !== p.dest));
    v.yerDat = DAT[w] || w;
  }
  const castFor = (mood) => {
    const c = [{ svg: face(LOOK.taxi1, 'angry'), name: 'Sen' }];
    if (H) c.push({ svg: face(LOOK.taxi2, 'angry'), name: 'Meslektaş' });
    c.push({ svg: face(LOOK.tagNpc, mood), name: 'Şüpheli' });
    if (p && !H) c.push({ svg: face(p.look, 'nervous'), name: p.look.name });
    return c;
  };
  openPanel('taxi', T(H ? S.captionHelp : S.caption, v), castFor('nervous'));
  if (H) await sayL(S.helpLine, v);
  let sure = H ? 0.7 : 0.55;
  const setSure = (x) => {
    sure = clamp(x, 0, 1);
    ui.meter.hidden = false;
    ui.meter.querySelector('span').textContent = 'Tag olduğuna eminlik';
    ui.bar.style.width = Math.round(sure * 100) + '%';
  };
  setSure(sure);
  const pool = S.pool.filter((q) => q.need === 'any' || (q.need === 'pax') === !!p);
  const asked = new Set();
  for (let round = 0; round < 3; round++) {
    const left = pool.filter((q) => !asked.has(q.t));
    if (!left.length) break;
    const opts = shuffle(left)
      .slice(0, 3)
      .map((q) => ({ t: T(q.t, v), q }));
    opts.push({ t: S.done, go: true, decide: true });
    const o = await ask(S.speaker, round === 0 ? S.open : S.again, opts);
    if (o.decide) break;
    asked.add(o.q.t);
    let branch;
    if (real) {
      branch = o.q.real[0];
      if (o.q.real.length > 1 && Math.random() >= (o.q.real[0].p || 1)) branch = o.q.real[1];
    } else branch = o.q.innocent;
    for (const l of branch.lines) await sayL(l, v);
    setSure(sure + (branch.d || 0));
  }
  const dec = [{ t: S.decisions.beat, k: 'beat' }];
  if (p && !P.carry) dec.push({ t: T(S.decisions.talk, v), k: 'talk' });
  dec.push({ t: S.decisions.let, k: 'let' });
  ui.meter.hidden = false;
  const d = await ask('Sen', T(S.decide, { eminlik: Math.round(sure * 100) }), dec);
  ui.meter.querySelector('span').textContent = 'Şüphe';
  if (d.k === 'let') {
    t.revealed = 0;
    setCast(castFor('smile'));
    await sayL(real ? S.letReal : S.letInnocent, v);
    closePanel();
    return;
  }
  if (d.k === 'talk') {
    if (Math.random() < (real ? 0.55 : 0.15)) {
      t.revealed = 0;
      t.carry = null;
      setCast([
        { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
        { svg: face(p.look, 'smile'), name: p.look.name },
      ]);
      await sayL(S.talkYes, v);
      p.state = 'wait';
      board(P, p);
      closePanel();
      toast(`${p.look.name} sana geçti!`);
      return;
    }
    t.revealed = 0;
    await sayL(real ? S.talkNoReal : S.talkNoInnocent, v);
    closePanel();
    return;
  }
  const r = await fight(
    1,
    [LOOK.tagNpc],
    LOOK.taxi1,
    'Şüpheli',
    H
      ? { base: 0.75, who: S.speaker, ally: LOOK.taxi2, note: S.fightNoteHelp }
      : { base: 0.6, who: S.speaker, note: S.fightNote },
  );
  const cops = G.ents.filter((e) => e.kind === 'police' && dist(e, P) <= 7);
  G.fightT = 30;
  G.fightLoc = district(Math.round(P.x), Math.round(P.y));
  if (!r.win) {
    ui.panel.className = 'panel taxi';
    setCast([{ svg: face(LOOK.taxi1, 'hurt'), name: 'Sen' }]);
    await sayL(S.lost, { ...v, şans: Math.round(r.ch * 100) });
    t.revealed = 0;
    t.stun = 0;
    t.flee = true;
    t.threat = P;
    if (cops.length) {
      for (const c of cops) startChase(c, P);
      G.invuln = 1.2;
      closePanel();
      toast('Polis kavgayı gördü! Kaç!', true);
    } else closePanel();
    return;
  }
  ui.cast.innerHTML = burstSVG();
  await sayL(S.won, v);
  G.ents = G.ents.filter((e) => e !== t);
  G.respawns.push({ kind: 'tag', t: 6 });
  if (!real) {
    setCast([
      { svg: face(LOOK.tagNpc, 'hurt'), name: 'Şüpheli' },
      ...(p ? [{ svg: face(p.look, 'angry'), name: p.look.name }] : []),
    ]);
    if (p) G.pax = G.pax.filter((q) => q !== p);
    await sayL(S.innocentHit, { ...v, kurban: p ? p.look.name : 'Şüpheli' });
    for (const c of G.ents.filter((e) => e.kind === 'police' && dist(e, P) <= 12)) startChase(c, P);
    G.money -= 300;
    G.invuln = 1.2;
    closePanel();
    toast('Yanlış adamı dövdün! Darp şikayeti −₺300, polis geliyor!', true);
    return;
  }
  const bonus = H ? 80 : 50;
  G.money += bonus;
  fx(P.x, P.y, '+₺' + bonus, '#2f9e44');
  if (p) {
    if (!P.carry) {
      setCast([
        { svg: face(LOOK.taxi1, 'smile'), name: 'Sen' },
        { svg: face(p.look, 'nervous'), name: p.look.name },
      ]);
      await sayL(S.paxJoins, v);
      p.state = 'wait';
      board(P, p);
    } else G.pax = G.pax.filter((q) => q !== p);
  }
  if (cops.length) {
    for (const c of cops) startChase(c, P);
    G.invuln = 1.2;
    closePanel();
    toast('Polis kavgayı gördü! Kaç!', true);
  } else {
    closePanel();
    toast(H ? `Meslektaş dayanışması! +₺${bonus}` : 'Gerçekten Tag’ciymiş. Kimse görmedi. +₺50');
  }
}
/* ---- Taksici polise yakalandı + torpil ---- */
export async function taxiVsPolice(sivil) {
  const S = DLG.taxiPolice,
    O = S.outcomes,
    v = baseVars(null);
  v.polis = sivil ? S.speakerSivil : S.speaker;
  v.torpil = rnd(S.torpil.patrons);
  v.kavgaYeri = G.fightLoc || v.semt;
  const castBase = (m) => [
    { svg: face(LOOK.police, 'neutral'), name: v.polis },
    { svg: face(LOOK.taxi1, m), name: 'Sen' },
  ];
  openPanel('police', T(sivil ? S.captionSivil : S.caption, v), castBase('nervous'));
  const res = await interrogate({ speaker: '{polis}', react: S.react, start: S.start, nodes: S.nodes, v, ctx: {} });
  if (res === 'pass') {
    setCast(castBase('smile'));
    await sayL(O.pass, v);
    clearChases();
    G.fightT = 0;
    G.invuln = 3;
    closePanel();
    toast('Serbest bırakıldın!');
    return;
  }
  ui.meter.hidden = true;
  if (res === 'pretext') await sayL(O.pretext, v);
  if (await rescue('torpil', S.torpil, v, () => castBase('smile'))) {
    G.debt = 2;
    G.debtName = v.torpil;
    clearChases();
    G.fightT = 0;
    G.invuln = 3;
    closePanel();
    toast(T(S.torpil.debt, v));
    return;
  }
  ui.cast.innerHTML = `<div class="stamp">${esc(O.stamp)}</div>`;
  await sayL(O.final, v, 'Sonucu gör');
  ui.comic.hidden = true;
  endGame('hapis');
}
