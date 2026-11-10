// <auto-imports>
import { assetUrl } from '../core/assets';
import { DLG, MANIFEST } from '../sim/content';
import { $ } from '../core/dom';
import { DIFF, G, ORN, TL, UNAME, WPN, setDiff, setG, setOrn, setUname, setWpn, tagLevel } from '../sim/state';
import { T, esc } from '../sim/util';
import { cam, px } from '../render/view';
import { hudAd } from '../dialog/ads';
import { stopTimer } from '../dialog/comic';
import { wIcon } from '../dialog/portraits';
import { toast } from './hud';
import { renderLB } from './leaderboard';
import { pageTurn } from './pageflip';
import { newGame, nitro } from '../sim/game';
import type { ShiftOpts } from '../sim/game';
import { careerMode, nextShift, openCareer } from './career';
import { mpEnabled, mpStart, mpStop, mpUrl, setMp } from '../net/mp';
import { freeformOn, setFreeform, setVoice, voiceOn } from '../dialog/voice';
import { clearLearned, myLearned } from '../sim/learn';
import { isoCfg, setIso } from '../render/isoView';
// </auto-imports>
/* ================= ANA EKRAN: kapak, profil, rol düğmeleri, alttan açılan sayfalar ================= */
export function toMenu() {
  mpStop();
  pageTurn();
  $('nitroBtn').hidden = true;
  $('talkBtn').hidden = true;
  $('adbtns').hidden = true;
  $('adOv').hidden = true;
  if (G) G.over = true;
  stopTimer();
  $('comic').hidden = true;
  $('radio').hidden = true;
  $('end').hidden = true;
  setG(null);
  renderLB($('lb'));
  closeSheets();
  paintProfile();
  document.body.classList.add('inmenu');
  window.dispatchEvent(new Event('resize'));
  $('start').hidden = false;
}
export let menuArm = 0,
  pendingRole = null;
export function openSheet(k) {
  document.querySelectorAll<HTMLElement>('#start .sheet').forEach((x) => (x.hidden = x.id !== 'sh-' + k));
  if (k === 'lbs') renderLB($('lb'));
}
export function closeSheets() {
  document.querySelectorAll<HTMLElement>('#start .sheet').forEach((x) => (x.hidden = true));
}
/* mağaza: araç süsleri ve kavga eşyaları (şimdilik bedava) */
export function paintGarage() {
  const O = MANIFEST.items.ornaments;
  $('garage').innerHTML = DLG.shop.ornaments
    .map(
      (i) =>
        `<button data-o="${i.id}" aria-pressed="${i.id === ORN}">${O[i.id] ? `<img alt="" src="${assetUrl(O[i.id])}" style="width:22px;height:22px;object-fit:contain;vertical-align:-6px"> ` : ''}${esc(i.t)}</button>`,
    )
    .join('');
  $('weapons').innerHTML = DLG.shop.weapons
    .map(
      (i) =>
        `<button data-w="${i.id}" aria-pressed="${i.id === WPN}">${wIcon(i.id)} ${esc(i.t)}${i.bonus ? ` +%${Math.round(i.bonus * 100)}` : ''}</button>`,
    )
    .join('');
  $('weapons')
    .querySelectorAll('button')
    .forEach((b) =>
      b.addEventListener('click', () => {
        setWpn(b.dataset.w);
        paintGarage();
      }),
    );
  $('garage')
    .querySelectorAll('button')
    .forEach((b) =>
      b.addEventListener('click', () => {
        setOrn(b.dataset.o);
        paintGarage();
      }),
    );
}
export function paintProfile() {
  $('pName').textContent = UNAME || 'Misafir';
  $('pLvl').textContent = `Tag seviye ${tagLevel() + 1} · ${TL().ad}`;
  const a = MANIFEST.characters.taksici && MANIFEST.characters.taksici.smile;
  if (a) $('pAv').style.backgroundImage = `url(${assetUrl(a)})`;
  const C = MANIFEST.cars;
  if (C.taxi1) $('rcTaxi').src = assetUrl(C.taxi1.file);
  const tk = 'tag' + (tagLevel() + 1);
  if (C[tk]) $('rcTag').src = assetUrl(C[tk].file);
}
export function paintDiff() {
  document
    .querySelectorAll<HTMLElement>('#diff button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.d === DIFF)));
}
export function startRole(r, shift?: ShiftOpts) {
  document.body.classList.remove('inmenu');
  window.dispatchEvent(new Event('resize'));
  pageTurn();
  newGame(r, shift);
  // yeni günün ekran tarafı: kamera, katmanlar, açılış bildirimleri
  const P = G.player;
  cam.x = px(P.x);
  cam.y = px(P.y);
  cam.z = 1;
  $('start').hidden = true;
  $('end').hidden = true;
  $('comic').hidden = true;
  $('radio').hidden = true;
  $('adbtns').hidden = false;
  $('nitroBtn').hidden = false;
  if (r === 'tag') setTimeout(() => toast(T(DLG.tagLevels.intro, { arac: TL().ad, seviye: tagLevel() + 1 })), 900);
  toast(
    r === 'taxi'
      ? `Durağın: ${G.stand.name}. Burada yolcu alabilirsin, başka duraklarda dikkat!`
      : `Mahallen: ${G.home.name}. Taksiciler peşine düşerse buraya getir!`,
  );
  mpStart(UNAME);
}
export function initMenu() {
  $('uname').value = UNAME;
  // konuşma ayarları: serbest konuşma, sesli karakterler
  const TU = DLG.serbestSohbet.ui;
  $('talkTitle').textContent = TU.ayarBaslik;
  $('talkFreeLbl').textContent = TU.ayarSerbest;
  $('talkVoiceLbl').textContent = TU.ayarSes;
  $('talkFree').checked = freeformOn();
  $('talkVoice').checked = voiceOn();
  $('talkFree').addEventListener('change', () => setFreeform($('talkFree').checked));
  $('talkVoice').addEventListener('change', () => setVoice($('talkVoice').checked));
  // görünüm: 2.5D / üstten, eğim, açı, yakınlık, kamera takibi (değişiklik anında arkadaki haritada görünür)
  const GV = DLG.gorunum;
  $('viewTitle').textContent = GV.baslik;
  $('viewM25').textContent = GV.mod25;
  $('viewMUst').textContent = GV.modUst;
  $('viewTiltLbl').textContent = GV.egim;
  $('viewYawLbl').textContent = GV.aci;
  $('viewZoomLbl').textContent = GV.yakin;
  $('viewFollowLbl').textContent = GV.takip;
  $('viewMode').value = isoCfg.on ? '2.5d' : 'ustten';
  $('viewTilt').value = Math.round(isoCfg.egim * 100);
  $('viewYaw').value = isoCfg.aci;
  $('viewZoom').value = Math.round(isoCfg.yakin * 100);
  $('viewFollow').checked = isoCfg.takip;
  const viewSync = () => {
    setIso({
      on: $('viewMode').value !== 'ustten',
      egim: +$('viewTilt').value / 100,
      aci: +$('viewYaw').value,
      yakin: +$('viewZoom').value / 100,
      takip: $('viewFollow').checked,
    });
    $('viewIso').hidden = !isoCfg.on;
  };
  for (const id of ['viewMode', 'viewTilt', 'viewYaw', 'viewZoom', 'viewFollow']) {
    $(id).addEventListener('input', viewSync);
    $(id).addEventListener('change', viewSync);
  }
  $('viewIso').hidden = !isoCfg.on;
  // öğretme modunda öğretilen cevaplar: dışa aktar (kopyala) ya da sil
  const OG = DLG.sohbet.ogret;
  $('learnTitle').textContent = OG.profilBaslik;
  $('learnCopy').textContent = OG.profilKopyala;
  $('learnClear').textContent = OG.profilSil;
  const drawLearned = () => {
    const L = myLearned();
    $('learnCount').textContent = T(OG.profilSayi, { n: L.length });
    ($('learnOut') as HTMLTextAreaElement).value = JSON.stringify(L, null, 1);
  };
  drawLearned();
  document.querySelector('#start [data-sheet="prof"]')?.addEventListener('click', drawLearned);
  $('learnCopy').addEventListener('click', async () => {
    const ta = $('learnOut') as HTMLTextAreaElement;
    ta.select();
    try {
      await navigator.clipboard.writeText(ta.value);
    } catch (e) {
      document.execCommand('copy');
    }
    $('learnCount').textContent = OG.profilKopyalandi;
  });
  $('learnClear').addEventListener('click', () => {
    if (!confirm(OG.profilSilOnay)) return;
    clearLearned();
    drawLearned();
  });
  // çevrimiçi (deneme) ayarı
  const MPT = DLG.cokOyunculu;
  $('mpTitle').textContent = MPT.profilBaslik;
  $('mpOnLbl').textContent = MPT.profilAcik;
  $('mpUrlLbl').textContent = MPT.profilAdres;
  $('mpNote').textContent = MPT.profilNot;
  $('mpOn').checked = mpEnabled();
  $('mpUrl').value = mpUrl();
  $('mpOn').addEventListener('change', () => setMp($('mpOn').checked, $('mpUrl').value));
  $('mpUrl').addEventListener('change', () => setMp($('mpOn').checked, $('mpUrl').value));
  $('uname').addEventListener('input', () => {
    $('nmWrap').classList.remove('err');
  });
  $('intelBtn').addEventListener('click', () => hudAd('intel'));
  $('nitroBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    nitro();
  });
  $('fuelBtn').addEventListener('click', () => hudAd('fuel'));
  $('garTitle').textContent = DLG.shop.title;
  $('garNote').textContent = DLG.shop.note;
  $('ornTitle').textContent = DLG.shop.ornTitle;
  $('wpnTitle').textContent = DLG.shop.wpnTitle;
  paintGarage();
  $('menuBtn').addEventListener('click', () => {
    if (G && !G.over && Date.now() > menuArm) {
      menuArm = Date.now() + 3000;
      $('menuBtn').dataset.ic = $('menuBtn').dataset.ic || $('menuBtn').innerHTML;
      $('menuBtn').textContent = 'Çık?';
      toast('Ana menüye dönmek için tekrar bas. Bu oyun kaydedilmez.');
      setTimeout(() => {
        $('menuBtn').innerHTML = $('menuBtn').dataset.ic || '☰';
      }, 3000);
      return;
    }
    menuArm = 0;
    $('menuBtn').innerHTML = $('menuBtn').dataset.ic || $('menuBtn').innerHTML;
    toMenu();
  });
  document
    .querySelectorAll<HTMLElement>('#start [data-sheet]')
    .forEach((b) => b.addEventListener('click', () => openSheet(b.dataset.sheet)));
  $('profBtn').addEventListener('click', () => openSheet('prof'));
  document.querySelectorAll<HTMLElement>('#start .sx').forEach((b) =>
    b.addEventListener('click', () => {
      pendingRole = null;
      closeSheets();
    }),
  );
  $('profOk').addEventListener('click', () => {
    const v = $('uname').value.trim().slice(0, 16);
    if (!v) {
      $('nmWrap').classList.add('err');
      $('uname').focus();
      return;
    }
    setUname(v);
    paintProfile();
    closeSheets();
    if (pendingRole) {
      const r = pendingRole;
      pendingRole = null;
      if (careerMode()) openCareer(r);
      else startRole(r);
    }
  });
  document.querySelectorAll<HTMLElement>('#start .role').forEach((b) =>
    b.addEventListener('click', () => {
      if (!UNAME) {
        pendingRole = b.dataset.role;
        openSheet('prof');
        $('nmWrap').classList.add('err');
        $('uname').focus();
        return;
      }
      if (careerMode()) return openCareer(b.dataset.role);
      startRole(b.dataset.role);
    }),
  );
  paintProfile();
  document.body.classList.add('inmenu');
  document.querySelectorAll<HTMLElement>('#diff button').forEach((b) =>
    b.addEventListener('click', () => {
      setDiff(b.dataset.d);
      paintDiff();
    }),
  );
  paintDiff();
  $('again').addEventListener('click', () => (G.career ? nextShift() : startRole(G.role)));
  $('swap').addEventListener('click', () => {
    const wasCareer = G && G.career;
    toMenu();
    if (wasCareer) openCareer();
  });
  renderLB($('lb'));
}
