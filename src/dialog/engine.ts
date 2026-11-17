// <auto-imports>
import { DLG, ECO } from '../sim/content';
import { DF, G } from '../sim/state';
import { T, clamp, rnd, shuffle } from '../sim/util';
import { ask, meter, say } from './comic';
import { toast, updHud } from '../ui/hud';
import { DAT, DISTS, district } from '../sim/grid';
import { FN, MN } from '../sim/passengers';
import type { Pax, Vars } from '../sim/types';
// </auto-imports>
/* ================= DİYALOG MOTORU: metinler data/dialoglar.json’dan; sorgu düğümleri, şüphe ================= */
export const sayL = (line: string[], v?: Vars, btn?: string) => say(T(line[0], v), T(line[1], v), btn);
export function rollEnemyWeapon() {
  let x = Math.random();
  for (const w of DLG.shop.enemyWeapons) {
    if (x < w.p) return w;
    x -= w.p;
  }
  return null;
}
export function baseVars(p: Pax | null): Vars {
  const P = G.player,
    loc = district(Math.round(P.x), Math.round(P.y)),
    al = G.lastAct === 'aldın';
  const v: Vars = {
    semt: loc,
    son: G.lastLoc || loc,
    eylem: G.lastAct,
    eylemSiz: al ? 'aldınız' : 'indirdiniz',
    soruNerede: al ? 'Nereden aldın' : 'Nerede bıraktın',
    soruNeredeSiz: al ? 'nereden binmişti' : 'nerede indi',
  };
  if (p) {
    v.yolcu = p.look.name;
    v.ab = p.look.fem ? 'abla' : 'abi';
    v.Ab = p.look.fem ? 'Abla' : 'Abi';
    v.hb = p.look.fem ? 'Hanımefendi' : 'Beyefendi';
    v.hedef = p.dest;
    v.hedefDat = DAT[p.dest] || p.dest;
  }
  return v;
}
export function expandOpts(list, v, ctx) {
  const out = [];
  for (const o of list) {
    if (o.gen === 'names') {
      const nm = ctx.name,
        others = shuffle((ctx.fem ? FN : MN).filter((x) => x !== nm)).slice(0, 2);
      out.push({ ...o.good, t: nm + '.' });
      for (const x of others) out.push({ ...o.bad, t: x + '.', vars: { yanlış: x } });
    } else if (o.gen === 'places') {
      const ll = v.son,
        others = shuffle(DISTS.filter((d) => d !== ll)).slice(0, 2);
      out.push({ ...o.good, t: ll + '.' });
      for (const x of others) out.push({ ...o.bad, t: x + '.', vars: { yer: x } });
    } else out.push({ ...o });
  }
  return shuffle(out);
}
/** sorgu türü (cfg.react) → konuşan karakter tipi (küfür tepkisi ve “anlamadım” repliği için) */
const KONUSAN: Record<string, string> = {
  police: 'polis',
  taxiPolice: 'polis',
  taxi: 'taksici',
  durak: 'durakci',
  route: 'yolcu',
};
export async function interrogate(cfg) {
  const v = cfg.v,
    R = DLG.reactions[cfg.react];
  let sus = cfg.start;
  meter(sus);
  const who = () => T(cfg.speaker, v);
  const line = (arr, extra) => {
    const vv = { ...v, ...(extra || {}) };
    if (cfg.relLines) vv.relLine = cfg.relLines[v.rel] || 'Tanıyorum.';
    return [T(arr[0], vv), T(arr[1], vv)];
  };
  let key = 'start',
    guard = 0,
    kacamak = 0,
    pre = '';
  while (key && guard++ < 10) {
    const Q = cfg.nodes[key];
    if (!Q) break;
    const opts = expandOpts(Q.opts, v, cfg.ctx || {}).map((o) => ({ ...o, t: T(o.t, { ...v, ...(o.vars || {}) }) }));
    // serbest konuşma: seçeneklere uymayan cevap kaçamak sayılır, şüphe biraz artar ve soru tekrar gelir
    const tur = KONUSAN[cfg.react] || 'polis',
      SS = DLG.serbestSohbet,
      E = ECO.serbestSohbet;
    const o = await ask(who(), (pre ? pre + ' ' : '') + T(Q.q, v), opts, null, DF().timer, { serbest: true });
    pre = '';
    if (o.kacamak) {
      kacamak++;
      sus = clamp(sus + E.kacamakSupheArtisi, 0, 1);
      meter(sus);
      if (kacamak > E.kacamakSiniri) {
        await say(who(), rnd(DLG.timeout));
        break;
      }
      pre = SS.kacamak[tur];
      guard--;
      continue;
    }
    if (o.kufur) {
      // küfür: hafifse şüphe artar ve sorgu sürer; ağırsa polis karakola, taksici/durakçı kavgaya, yolcu şikayete
      const tepki = SS.tepki[tur][o.kufur];
      if (o.kufur === 'hafif') {
        sus = clamp(sus + E.hafifSupheArtisi, 0, 1);
        meter(sus);
        await say(who(), tepki);
        continue;
      }
      meter(1);
      if (tur === 'polis' && G) {
        G.money -= E.hakaretCezasi;
        toast(T(SS.hakaretToast, { ceza: E.hakaretCezasi }), true);
        updHud();
      }
      await say(who(), tepki);
      return tur === 'taksici' || tur === 'durakci' ? 'fight' : 'fail';
    }
    if (o.timeout) {
      sus = clamp(sus + 0.3, 0, 1);
      meter(sus);
      await say(who(), rnd(DLG.timeout));
      break;
    }
    if (o.set) Object.assign(v, o.set);
    if (o.escape !== undefined && Math.random() < o.escape) return 'escape';
    let d = o.d || 0,
      react = o.react || null,
      end = o.end || null,
      next = o.next || null;
    if (o.escape !== undefined) react = o.escFail;
    if (o.rnd) {
      const b = Math.random() < o.rnd.p ? o.rnd.g : o.rnd.b;
      d = b.d || 0;
      react = b.r || null;
      end = b.end || null;
      next = b.next || null;
    }
    const late = Math.max(0, o.el - 2.5) * 0.045;
    sus = clamp(sus + d + late + (Math.random() - 0.5) * 0.06, 0, 1);
    meter(sus);
    let rl = null;
    if (react) rl = line(react, o.vars);
    else if (!end) rl = [who(), late > 0.08 ? rnd(DLG.late) : rnd(d <= -0.05 ? R.good : d >= 0.25 ? R.bad : R.mid)];
    if (rl) await say(rl[0], rl[1]);
    if (end) return end;
    key = next;
  }
  const verdict = sus < 0.3 ? 'pass' : sus > 0.7 ? 'fail' : Math.random() < sus ? 'fail' : 'pass';
  return verdict === 'fail' && sus < 0.5 ? 'pretext' : verdict;
}
