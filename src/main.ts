// <auto-imports>
import { manifestFiles, preload } from './core/assets';
import { setContent } from './sim/content';
import { $ } from './core/dom';
import { G } from './sim/state';
import { initInput } from './input/input';
import { COLS, ROWS, initGrid } from './sim/grid';
import { buildMap, initPainter } from './map/painter';
import { render } from './render/render';
import { TS, cam, resize } from './render/view';
import { initHud } from './ui/hud';
import { initMenu } from './ui/menu';
import { initPathfinding } from './sim/pathfinding';
import { update } from './sim/update';
import { initBindings } from './ui/bindings';
import { initCareer } from './ui/career';
import { initMp } from './net/mp';
// </auto-imports>
import * as tagScenes from './dialog/tagScenes';
import * as taxiScenes from './dialog/taxiScenes';
import * as rideEvents from './dialog/rideEvents';
import { board } from './sim/game';
import * as mp from './net/mp';
/* ================= GİRİŞ NOKTASI: veri ve görselleri yükle, modülleri başlat, döngüyü çalıştır ================= */
import './styles/main.css';
import mapUrl from '/data/harita.json?url';
import dlgUrl from '/data/dialoglar.json?url';
import manifestUrl from '/assets/manifest.json?url';
import ecoUrl from '/data/ekonomi.json?url';

export let lastFrame = performance.now();
export function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (G && !G.over) update(dt);
  render(now / 1000, dt);
  requestAnimationFrame(loop);
}

export async function boot() {
  const bar = $('loadBar'),
    lbl = $('loadTxt');
  const [map, dlg, manifest, eco] = await Promise.all(
    [mapUrl, dlgUrl, manifestUrl, ecoUrl].map((u) =>
      fetch(u).then((r) => {
        if (!r.ok) throw new Error(u + ' ' + r.status);
        return r.json();
      }),
    ),
  );
  setContent(map, dlg, manifest, eco);
  initGrid(map);
  initPathfinding();
  await preload(manifestFiles(manifest), (n, t) => {
    if (bar) bar.style.width = Math.round((n / t) * 100) + '%';
    if (lbl) lbl.textContent = `Yükleniyor… ${n}/${t}`;
  });
  initPainter();
  initHud();
  initBindings();
  initMenu();
  initCareer();
  initMp();
  initInput();
  resize();
  cam.x = COLS * TS * 0.55;
  cam.y = ROWS * TS * 0.7;
  $('loading').remove();
  requestAnimationFrame(loop);
  // yalnızca geliştirme sunucusunda: otomatik testler için durum ve sahnelere erişim
  if (import.meta.env.DEV)
    (window as any).__yk = {
      get G() {
        return G;
      },
      tagScenes,
      taxiScenes,
      rideEvents,
      mp,
      board,
    };
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(buildMap);
}
boot().catch((e) => {
  console.error(e);
  const l = $('loadTxt');
  if (l) l.textContent = 'Yüklenemedi: ' + e.message;
});
