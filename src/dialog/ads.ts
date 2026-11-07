// <auto-imports>
import { DLG } from '../sim/content';
import { $ } from '../core/dom';
import { G } from '../sim/state';
import { esc } from '../sim/util';
import { buttons, setBubble, setCast, ui } from './comic';
import { sayL } from './engine';
import { charImg } from './portraits';
import { toast } from '../ui/hud';
// </auto-imports>
/* ================= ÖDÜLLÜ REKLAM (simüle): telsiz istihbaratı, benzin kartı, avukat/torpil son şans ================= */
export async function hudAd(kind) {
  if (!G || G.over || G.busy || G.paused) return;
  if (kind === 'intel' && G.intelT > 0) return;
  if (kind === 'fuel' && G.freeFuel > 0) return;
  const was = G.paused;
  G.paused = true;
  $('adOv').hidden = false;
  await playAd($('adCard'));
  $('adOv').hidden = true;
  G.paused = was;
  if (kind === 'intel') {
    G.intelT = 60;
    $('intelBtn').classList.add('on');
    toast(DLG.intel.active);
  } else {
    G.freeFuel = 60;
    $('fuelBtn').classList.add('on');
    toast(DLG.fuel.active);
  }
}

export function adBox() {
  return `<div class="adbox"><b>${esc(DLG.ads.title)}</b><span>${esc(DLG.ads.body)}</span><i id="adN">5</i></div>`;
}
export function playAd(target) {
  return new Promise<void>((res) => {
    const t0 = performance.now();
    target.innerHTML = adBox();
    const tick = () => {
      const left = 5 - Math.floor((performance.now() - t0) / 1000),
        n = $('adN');
      if (n) n.textContent = Math.max(0, left);
      if (left <= 0) {
        res();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
export async function rescue(kind, R, v, castBack) {
  if (G.adUsed[kind]) return false;
  setBubble('', R.prompt);
  const o = await buttons([
    { t: R.offer, go: true, k: 'ad' },
    { t: R.skip, k: 'no' },
  ]);
  if (o.k !== 'ad') return false;
  ui.meter.hidden = true;
  ui.answers.innerHTML = '';
  ui.bubble.hidden = true;
  await playAd(ui.cast);
  G.adUsed[kind] = true;
  ui.bubble.hidden = false;
  setCast([
    ...castBack(),
    {
      svg: charImg(kind === 'lawyer' ? 'avukat' : 'patron', 'smile'),
      name: kind === 'lawyer' ? 'Avukat' : v.torpil || 'Büyük abi',
    },
  ]);
  await sayL(R.intro, v);
  await sayL(R.call, v);
  if (Math.random() < R.chance) {
    await sayL(R.success, v);
    return true;
  }
  if (kind === 'lawyer') setCast([...castBack(), { svg: charImg('avukat', 'nervous'), name: 'Avukat' }]);
  await sayL(R.fail, v);
  return false;
}
