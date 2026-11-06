/* Oyunun ana veri tipleri. Prototipten taşınan esnek nesneler oldukları için
   bilinen alanlar yazılı, geri kalanı için indeks imzası açık bırakıldı. */

export type Dir = [number, number];
export type Tile = [number, number];
/** Diyalog şablon değişkenleri: {semt}, {yolcu}, {ab}, {torpil} … */
export type Vars = Record<string, any>;
/** Panel düğmesi / sorgu cevabı */
export interface Choice {
  t?: string;
  go?: boolean;
  timeout?: boolean;
  el?: number;
  [k: string]: any;
}
export type Role = 'taxi' | 'tag';

export interface Look {
  skin?: string;
  hair?: string;
  hc?: string;
  shirt?: string;
  hat?: string;
  art?: string;
  name?: string;
  fem?: boolean;
  tourist?: boolean;
  vlog?: boolean;
  rec?: boolean;
  sting?: boolean;
  stache?: boolean;
  cam?: boolean;
  prof?: string;
  pidx?: number;
  weapon?: string | null;
  [k: string]: any;
}

export interface Pax {
  x: number;
  y: number;
  state: 'wait' | 'talk' | 'ride';
  claim: Ent | null;
  look: Look;
  ph: number;
  event?: string | null;
  dx?: number;
  dy?: number;
  m?: number;
  fare?: number;
  dest?: string;
  cross?: boolean;
  short?: boolean;
  [k: string]: any;
}

export interface Zone {
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  homes: Tile[];
  w: number;
}

export interface Ent {
  kind: 'taxi' | 'tag' | 'police';
  isPlayer: boolean;
  x: number;
  y: number;
  tx: number;
  ty: number;
  dir: Dir | null;
  moving: boolean;
  carry: Pax | null;
  chase: boolean;
  target: Ent | null;
  revealed: number;
  stun: number;
  [k: string]: any;
}

export interface Game {
  role: Role;
  time: number;
  money: number;
  ents: Ent[];
  pax: Pax[];
  player: Ent;
  [k: string]: any;
}
