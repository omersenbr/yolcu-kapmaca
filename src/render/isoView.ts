/* ================= 2.5D GÖRÜNÜM AYARLARI =================
   Oyuncu Profil sayfasından seçer; cihazda saklanır (yk-gorunum, yk-iso-*).
   (2.5D araç çizimleri 45° açı ve ~0,5–0,6 eğim için çizildi; varsayılanlar buna göre.) egim: zeminin dikey ezilmesi (0,4 yatık – 0,95 tepeden); aci: kameranın aracın yönüne göre yana kaçıklığı (derece);
   yakin: yakınlık çarpanı; takip: kamera aracın yönünü izler (yön verme de araca göre olur). */
import { load, save } from '../sim/storage';
import { G } from '../sim/state';

const num = (key: string, def: number, lo: number, hi: number) => {
  const v = parseFloat(load(key, String(def)));
  return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def;
};
export const isoCfg = {
  on: load('yk-gorunum', '2.5d') !== 'ustten',
  egim: num('yk-iso-egim2', 0.58, 0.4, 0.95),
  aci: num('yk-iso-aci2', 45, 0, 45),
  yakin: num('yk-iso-yakin', 1.15, 0.7, 2),
  // varsayılan kapalı: sürekli dönen ekran dikkat dağıtıyor ve baş döndürüyor
  takip: load('yk-iso-donus', '0') === '1',
};
export function setIso(patch: Partial<typeof isoCfg>) {
  Object.assign(isoCfg, patch);
  save('yk-gorunum', isoCfg.on ? '2.5d' : 'ustten');
  save('yk-iso-egim2', isoCfg.egim);
  save('yk-iso-aci2', isoCfg.aci);
  save('yk-iso-yakin', isoCfg.yakin);
  save('yk-iso-donus', isoCfg.takip ? '1' : '0');
}

/** aracın baktığı yön (radyan; 0 = kuzey, saat yönünde); araç dururken son yön korunur */
let lastHead = 0;
export function heading(): number {
  const d = G && G.player && G.player.dir;
  if (d) lastHead = Math.atan2(d[0], -d[1]);
  return lastHead;
}
/** ekrana göre verilen yönü haritaya çevir: kamera aracı izlerken yukarı = düz, sol/sağ = dön, aşağı = geri */
/** yön verme araca göre mi (kamera aracı izlerken) */
export const relativeSteer = () => isoCfg.on && isoCfg.takip && !!G;
export function steerDir(d: number[]): number[] {
  if (!relativeSteer()) return d;
  const q = Math.round(heading() / (Math.PI / 2)),
    c = Math.round(Math.cos((q * Math.PI) / 2)),
    s = Math.round(Math.sin((q * Math.PI) / 2));
  return [d[0] * c - d[1] * s || 0, d[0] * s + d[1] * c || 0];
}

/** parmak kaydırması → harita yönü. Sabit 2.5D kamerada kaydırma ekranda görünen yol yönüne göre yorumlanır
    (harita ekranda “aci” kadar dönük durur); kamera aracı izlerken araca göre; üstten görünümde olduğu gibi. */
export function swipeDir(dx: number, dy: number): number[] {
  if (isoCfg.on && !isoCfg.takip) {
    const a = (isoCfg.aci * Math.PI) / 180,
      wx = dx * Math.cos(a) - dy * Math.sin(a),
      wy = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(wx) > Math.abs(wy) ? [Math.sign(wx), 0] : [0, Math.sign(wy)];
  }
  return steerDir(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
}
