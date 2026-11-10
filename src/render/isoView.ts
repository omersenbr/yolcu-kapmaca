/* ================= 2.5D GÖRÜNÜM AYARLARI =================
   Oyuncu Profil sayfasından seçer; cihazda saklanır (yk-gorunum, yk-iso-*).
   egim: zeminin dikey ezilmesi (0,4 yatık – 0,95 tepeden); aci: kameranın aracın yönüne göre yana kaçıklığı (derece);
   yakin: yakınlık çarpanı; takip: kamera aracın yönünü izler (yön verme de araca göre olur). */
import { load, save } from '../sim/storage';
import { G } from '../sim/state';

const num = (key: string, def: number, lo: number, hi: number) => {
  const v = parseFloat(load(key, String(def)));
  return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
};
export const isoCfg = {
  on: load('yk-gorunum', '2.5d') !== 'ustten',
  egim: num('yk-iso-egim', 0.66, 0.4, 0.95),
  aci: num('yk-iso-aci', 32, 0, 45),
  yakin: num('yk-iso-yakin', 1.15, 0.7, 2),
  takip: load('yk-iso-takip', '1') === '1',
};
export function setIso(patch: Partial<typeof isoCfg>) {
  Object.assign(isoCfg, patch);
  save('yk-gorunum', isoCfg.on ? '2.5d' : 'ustten');
  save('yk-iso-egim', isoCfg.egim);
  save('yk-iso-aci', isoCfg.aci);
  save('yk-iso-yakin', isoCfg.yakin);
  save('yk-iso-takip', isoCfg.takip ? '1' : '0');
}

/** aracın baktığı yön (radyan; 0 = kuzey, saat yönünde); araç dururken son yön korunur */
let lastHead = 0;
export function heading(): number {
  const d = G && G.player && G.player.dir;
  if (d) lastHead = Math.atan2(d[0], -d[1]);
  return lastHead;
}
/** ekrana göre verilen yönü haritaya çevir: kamera aracı izlerken yukarı = düz, sol/sağ = dön, aşağı = geri */
export function steerDir(d: number[]): number[] {
  if (!isoCfg.on || !isoCfg.takip || !G) return d;
  const q = Math.round(heading() / (Math.PI / 2)),
    c = Math.round(Math.cos((q * Math.PI) / 2)),
    s = Math.round(Math.sin((q * Math.PI) / 2));
  return [d[0] * c - d[1] * s || 0, d[0] * s + d[1] * c || 0];
}
