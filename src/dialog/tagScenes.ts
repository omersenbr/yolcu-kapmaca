// <auto-imports>
import { DLG } from '../core/content';
import { G } from '../core/state';
import { T, dist, esc, rnd } from '../core/util';
import { rescue } from './ads';
import { ask, closePanel, openPanel, setCast, ui } from './comic';
import { baseVars, interrogate, rollEnemyWeapon, sayL } from './engine';
import { burstSVG, face } from './portraits';
import { fight } from '../fight/fight';
import { endGame } from '../ui/endscreen';
import { toast, updHud } from '../ui/hud';
import { clearChases, onPlayer, startChase } from '../world/ai';
import { inHome } from '../world/game';
import { LOOK } from '../world/passengers';
import type { Vars } from '../core/types';
// </auto-imports>
/* ================= TAG’Cİ SAHNELERİ ================= */
/* ---- Tag sürücüsü taksicilere yakalandı ---- */
export async function tagVsTaxi(n) {
  const S = DLG.tagTaxi,
    O = S.outcomes,
    P = G.player,
    p = P.carry,
    v = baseVars(p),
    EW = rollEnemyWeapon();
  v.kesen = n > 1 ? `${n} taksi önünü kesti.` : 'Bir taksi önünü kesti.';
  const cast = [
    { svg: face({ ...LOOK.taxi1, weapon: EW ? EW.id : null }, 'angry'), name: n > 1 ? 'Taksiciler' : 'Taksici' },
    { svg: face(LOOK.tag, 'nervous'), name: 'Sen' },
  ];
  if (p) cast.push({ svg: face(p.look, 'shock'), name: 'Yolcu' });
  openPanel('taxi', T(S.caption, v), cast, true);
  const B = p ? S.withPax : S.noPax;
  const res = await interrogate({
    speaker: S.speaker,
    react: S.react,
    start: S.start + S.perExtra * (n - 1),
    nodes: B.nodes,
    relLines: B.relLines,
    v,
    ctx: p ? { name: p.look.name, fem: p.look.fem } : {},
  });
  const chasers = G.ents.filter((e) => onPlayer(e) && e.kind === 'taxi');
  if (res === 'escape') {
    for (const e of chasers) e.stun = 1.8;
    G.invuln = 2.6;
    await sayL(O.escape, v);
    closePanel();
    toast('Kaçtın! Ama hâlâ peşindeler.', true);
    return;
  }
  if (res === 'pass') {
    ui.panel.className = 'panel taxi';
    setCast([
      { svg: face(LOOK.taxi1, 'smile'), name: 'Taksici' },
      { svg: face(LOOK.tag, 'smile'), name: 'Sen' },
    ]);
    await sayL(O.pass, v);
    clearChases();
    G.invuln = 2.5;
    closePanel();
    toast('Taksiciler inandı!');
    return;
  }
  if (res === 'pretext') await sayL(O.pretext, v);
  const home = inHome();
  const r = await fight(
    n,
    [LOOK.taxi1, LOOK.taxi2, LOOK.taxi3],
    LOOK.tag,
    'Taksici',
    home ? { bonus: 0.25, ally: LOOK.komsu, note: O.homeNote, enemyWeapon: EW } : { enemyWeapon: EW },
  );
  const fv: Vars = { ...v, hız: r.rate.toFixed(1).replace('.', ','), şans: Math.round(r.ch * 100) };
  if (r.win) {
    ui.panel.className = 'panel taxi';
    setCast([
      { svg: face(LOOK.tag, 'smile'), name: 'Sen' },
      { svg: face(LOOK.taxi1, 'hurt'), name: n > 1 ? 'Taksiciler' : 'Taksici' },
    ]);
    await sayL(O.win, fv);
    for (const e of chasers) e.stun = 3;
    clearChases();
    G.invuln = 3;
    closePanel();
    toast('Taksicilerin elinden kurtuldun!');
    return;
  }
  ui.cast.innerHTML = burstSVG();
  const loss = p ? p.fare : 100;
  fv.kayıp = loss;
  await sayL(p ? O.loseWithPax : O.loseNoPax, fv);
  if (EW && EW.id === 'haydar') {
    setCast([
      { svg: face({ ...LOOK.taxi1, weapon: 'haydar' }, 'smile'), name: 'Taksici' },
      { svg: face(LOOK.tag, 'hurt'), name: 'Sen' },
    ]);
    await sayL(O.haydar, fv);
  }
  setCast([{ svg: face(LOOK.tag, 'hurt'), name: 'Sen' }]);
  if (p) {
    G.pax = G.pax.filter((q) => q !== p);
    P.carry = null;
  }
  G.money -= loss;
  await sayL(p ? O.summaryWithPax : O.summaryNoPax, fv);
  clearChases();
  G.invuln = 3;
  closePanel();
}
/* ---- Tag sürücüsü polise yakalandı: çapraz sorgu + avukat ---- */
export async function tagVsPolice(sivil) {
  const S = DLG.tagPolice,
    O = S.outcomes,
    P = G.player,
    p = P.carry,
    v = baseVars(p);
  v.polis = sivil ? S.speakerSivil : S.speaker;
  const castBase = (m) => {
    const c = [
      { svg: face(LOOK.police, 'neutral'), name: v.polis },
      { svg: face(LOOK.tag, m), name: 'Sen' },
    ];
    if (p) c.push({ svg: face(p.look, 'nervous'), name: 'Yolcu' });
    return c;
  };
  openPanel('police', T(sivil ? S.captionSivil : S.caption, v), castBase('nervous'), true);
  const B = p ? S.withPax : S.noPax;
  const res = await interrogate({
    speaker: '{polis}',
    react: S.react,
    start: S.start,
    nodes: B.nodes,
    relLines: B.relLines,
    v,
    ctx: p ? { name: p.look.name, fem: p.look.fem } : {},
  });
  if (res === 'pass') {
    setCast([
      { svg: face(LOOK.police, 'neutral'), name: v.polis },
      { svg: face(LOOK.tag, 'smile'), name: 'Sen' },
    ]);
    await sayL(O.pass, v);
    clearChases();
    G.invuln = 3;
    closePanel();
    toast('Serbest bırakıldın!');
    return;
  }
  ui.meter.hidden = true;
  if (res === 'pretext') {
    setCast(castBase('shock'));
    await sayL(O.pretext, { ...v, bahane: rnd(DLG.pretexts) });
    await sayL(O.pretextReply, v);
  }
  const L = S.lawyer;
  if (await rescue('lawyer', L, v, () => castBase('nervous'))) {
    G.money -= L.fee;
    clearChases();
    G.invuln = 3;
    closePanel();
    toast(T(L.feeToast, { ücret: L.fee }));
    updHud();
    return;
  }
  ui.cast.innerHTML = `<div class="stamp">${esc(O.stamp)}</div>`;
  await sayL(O.final, v, 'Sonucu gör');
  ui.comic.hidden = true;
  endGame('baglandi');
}
/* ---- Tag: gizli taksici yolcu ---- */
export async function stingDialog(p) {
  const S = DLG.sting,
    P = G.player,
    v = baseVars(p);
  openPanel('fight', S.caption, [
    { svg: face(LOOK.tag, 'shock'), name: 'Sen' },
    { svg: face(p.look, 'angry'), name: 'Yolcu' },
  ]);
  const o = await ask(S.line[0], S.line[1], [
    { t: S.run, k: 'run' },
    { t: S.beg, k: 'beg' },
  ]);
  G.pax = G.pax.filter((q) => q !== p);
  P.carry = null;
  const near = G.ents
    .filter((e) => e.kind === 'taxi' && !e.isPlayer && !e.carry)
    .sort((a, b) => dist(a, P) - dist(b, P))
    .slice(0, 3);
  if (o.k === 'beg' && Math.random() < S.begChance) {
    await sayL(S.begOk, v);
    closePanel();
    toast('Gizli taksici seni bıraktı. Yolcu ve ücret gitti.', true);
    return;
  }
  await sayL(o.k === 'beg' ? S.begNo : S.runLine, v);
  for (const e of near) startChase(e, P);
  G.invuln = 1.2;
  closePanel();
  toast('Gizli taksici arkadaşlarını çağırdı! Kaç!', true);
}
