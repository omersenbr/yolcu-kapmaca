// <auto-imports>
import type { Ent } from '../core/types';
// </auto-imports>
export let uid = 0;
export function mkEnt(kind: Ent['kind'], c: number, r: number, isPlayer?: boolean): Ent {
  return {
    kind,
    isPlayer: !!isPlayer,
    x: c,
    y: r,
    tx: c,
    ty: r,
    dir: isPlayer ? null : [0, 1],
    moving: false,
    carry: null,
    targetP: null,
    goal: null,
    chase: false,
    target: null,
    chaseT: 0,
    lostT: 0,
    revealed: 0,
    flee: false,
    threat: null,
    helperRolled: false,
    pending: false,
    stun: 0,
    id: ++uid,
  };
}
