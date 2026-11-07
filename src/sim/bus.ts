/* ================= SİMÜLASYON → DIŞ DÜNYA olay kanalı =================
   sim/ klasörü ekrana (DOM) hiç dokunmaz. Kullanıcıya bir şey gösterilmesi gerektiğinde buradaki
   işlevleri çağırır. Tarayıcıda arayüz bunları gerçek işlevlerle doldurur (ui/bindings.ts),
   sunucuda ağ katmanı dolduracak. Varsayılanlar boş: simülasyon tek başına (Node’da) da koşar. */
import type { Ent, Pax, Zone } from './types';

/** sinematik bittiğinde açılacak sahneler (karikatür paneli) */
export type SceneName =
  | 'pickupDialog'
  | 'routeDialog'
  | 'viralDialog'
  | 'taxiVsPolice'
  | 'tagVsPolice'
  | 'tagVsTaxi'
  | 'stingDialog'
  | 'turfDialog'
  | 'taxiCatchTag'
  | 'rideEvent';

export interface Bus {
  /** kısa bildirim; bad: kırmızı */
  toast(msg: string, bad?: boolean): void;
  /** bilgi şeridini (kasa, saat, yolcu) yenile */
  hud(): void;
  /** her kare: nitro / reklam düğmelerinin durumu */
  frame(): void;
  /** radar flaşı */
  flash(): void;
  /** telsiz: meslektaşlar bir Tag kovalıyor */
  radio(t: Ent, z: Zone | undefined): void;
  /** sahne aç (sinematik bitti); dünya bu sırada duraklatılmış durumda */
  scene(name: SceneName, arg?: Ent | Pax | Zone | boolean | number, arg2?: number, arg3?: number): void;
  /** gün bitti */
  end(why: 'time' | 'baglandi' | 'hapis' | 'ruhsat'): void;
}

const noop = () => {};
export const bus: Bus = { toast: noop, hud: noop, frame: noop, flash: noop, radio: noop, scene: noop, end: noop };
export function bindBus(impl: Partial<Bus>) {
  Object.assign(bus, impl);
}
