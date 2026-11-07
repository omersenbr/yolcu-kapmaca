/* Simülasyon olaylarını tarayıcı arayüzüne bağlar (sim/bus.ts). */
import { $ } from '../core/dom';
import { bindBus } from '../sim/bus';
import { G } from '../sim/state';
import * as tagScenes from '../dialog/tagScenes';
import * as taxiScenes from '../dialog/taxiScenes';
import { endGame } from './endscreen';
import { rideEvent } from '../dialog/rideEvents';
import { paxChat } from '../dialog/paxChat';
import { freeformOn } from '../dialog/voice';
import { cinematic } from '../sim/game';
import { radio, toast, updHud } from './hud';

const SCENES = {
  pickupDialog: taxiScenes.pickupDialog,
  routeDialog: taxiScenes.routeDialog,
  viralDialog: taxiScenes.viralDialog,
  taxiVsPolice: taxiScenes.taxiVsPolice,
  turfDialog: taxiScenes.turfDialog,
  taxiCatchTag: taxiScenes.taxiCatchTag,
  tagVsPolice: tagScenes.tagVsPolice,
  tagVsTaxi: tagScenes.tagVsTaxi,
  stingDialog: tagScenes.stingDialog,
  rideEvent,
  paxChat,
};

export function initBindings() {
  $('talkBtn').addEventListener('click', () => {
    const c = G && G.player.carry;
    if (c && !G.busy && !G.over) cinematic(G.player.x, G.player.y, 0.35, 'paxChat', c);
  });
  bindBus({
    toast,
    hud: updHud,
    radio,
    end: endGame,
    flash() {
      const fl = $('flash');
      fl.classList.add('on');
      setTimeout(() => fl.classList.remove('on'), 60);
    },
    frame() {
      if (!G) return;
      const b = $('nitroBtn');
      b.disabled = G.nitroCD > 0;
      $('nitroLbl').textContent = G.nitroCD > 0 ? Math.ceil(G.nitroCD) + ' sn' : 'NİTRO';
      $('intelBtn').classList.toggle('on', G.intelT > 0);
      $('fuelBtn').classList.toggle('on', G.freeFuel > 0);
      const c = G.player.carry;
      $('talkBtn').hidden = !(c && !G.busy && !G.over && freeformOn());
    },
    scene(name, ...args) {
      (SCENES[name] as (...a: any[]) => unknown)(...args);
    },
  });
}
