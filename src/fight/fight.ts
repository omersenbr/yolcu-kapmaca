// <auto-imports>
import { DLG } from '../core/content';
import { $ } from '../core/dom';
import { DF, weapon } from '../core/state';
import { T, clamp, esc, rnd } from '../core/util';
import { setBubble, stopTimer, ui } from '../dialog/comic';
import { face } from '../dialog/portraits';
import { LOOK } from '../world/passengers';
import type { Look } from '../core/types';
// </auto-imports>
export interface FightOpts {
  bonus?: number;
  base?: number;
  ally?: Look;
  allyName?: string;
  note?: string;
  who?: string;
  enemyWeapon?: any;
}
export interface FightResult {
  win: boolean;
  hits: number;
  rate: number;
  ch: number;
}
/* ================= DÖVÜŞ: VUR’a hızlı bas, şansını yükselt, çark karar versin =================
   Kavga eşyaları şansa eklenir (tespih +%4, eldiven +%6, sopa +%10, Haydar +%16); rakip eşyası düşer. */

export function fight(
  n: number,
  enemyLooks: Look[],
  youLook: Look,
  enemyName: string,
  opt?: FightOpts,
): Promise<FightResult> {
  opt = opt || {};
  return new Promise<FightResult>((res) => {
    const N = clamp(n, 1, 3);
    ui.panel.className = 'panel fight';
    ui.meter.hidden = true;
    ui.timer.hidden = true;
    stopTimer();
    const ally = opt.ally
      ? `<figure id="fAlly">${face(opt.ally, 'angry')}<figcaption>${opt.allyName || (opt.ally === LOOK.taxi2 ? 'Meslektaş' : 'Mahalleli')}</figcaption></figure>`
      : '';
    ui.cast.innerHTML = `<div class="arena"><div class="fgt"><figure id="fYou">${face({ ...youLook, weapon: weapon().id === 'none' ? null : weapon().id }, 'angry')}<figcaption>Sen</figcaption></figure>${ally}<div class="vs">VS</div>${enemyLooks
      .slice(0, N)
      .map(
        (l, i) =>
          `<figure id="fE${i}">${face(i === 0 && opt.enemyWeapon ? { ...l, weapon: opt.enemyWeapon.id } : l, 'angry')}<figcaption>${N > 1 ? enemyName + ' ' + (i + 1) : enemyName}</figcaption></figure>`,
      )
      .join(
        '',
      )}</div><div class="score"><span>Vuruş: <b id="fHit">0</b></span><span>Hız: <b id="fRate">0</b>/sn</span><span>Şansın: <b id="fCh">%0</b></span></div>
    ${weapon().bonus || opt.enemyWeapon ? `<div class="score" style="justify-content:center;gap:10px;flex-wrap:wrap">${weapon().bonus ? `<span>${esc(T(DLG.shop.fightLine, { eşya: weapon().t, bonus: Math.round(weapon().bonus * 100) }))}</span>` : ''}${opt.enemyWeapon ? `<span style="color:#c92a2a">${esc(T(DLG.shop.enemyLine, { eşya: opt.enemyWeapon.t, ceza: Math.round(opt.enemyWeapon.malus * 100) }))}</span>` : ''}</div>` : ''}<div class="tbar"><i class="zone" id="fZone" style="left:0;width:0%;background:#2f9e44"></i><i class="mark" id="fMark" style="left:0;display:none"></i></div><div class="ftime"><b id="fTime"></b></div></div>`;
    setBubble(
      opt.who || (N > 1 ? enemyName + 'lar' : enemyName),
      (opt.note ? opt.note + ' ' : '') +
        (N > 1 ? `${N} kişi birden saldırıyor! ` : 'Saldırıyor! ') +
        'VUR’a ne kadar hızlı basarsan şansın o kadar artar. Sonunda çark karar verecek.',
    );
    ui.answers.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'ans go punch';
    btn.textContent = 'VUR!';
    ui.answers.appendChild(btn);
    const D = 7,
      base = opt.base !== undefined ? opt.base : [0.6, 0.3, 0.12][N - 1];
    const W = weapon(),
      EW = opt.enemyWeapon,
      chance = (r) =>
        clamp(
          base * (0.5 + 0.1 * Math.min(r, 10)) * DF().fight + (opt.bonus || 0) + (W.bonus || 0) - (EW ? EW.malus : 0),
          0.05,
          0.95,
        );
    let hits = 0,
      target = 0,
      over = false,
      el = 0;
    const t0 = performance.now();
    let last = t0;
    const nextAtk = Array.from({ length: N }, (_, i) => 0.8 + i * 0.5 + Math.random() * 0.5);
    const pow = (id, txt) => {
      const f = $(id);
      if (!f) return;
      const s = document.createElement('span');
      s.className = 'pow';
      s.textContent = txt;
      f.appendChild(s);
      f.classList.remove('hit');
      void f.offsetWidth;
      f.classList.add('hit');
      setTimeout(() => {
        s.remove && s.remove();
      }, 520);
    };
    const rateNow = () => hits / Math.max(1.5, el);
    const show = () => {
      const r = rateNow(),
        c = chance(r);
      $('fHit').textContent = hits;
      $('fRate').textContent = r.toFixed(1).replace('.', ',');
      $('fCh').textContent = '%' + Math.round(c * 100);
      $('fZone').style.width = Math.round(c * 100) + '%';
    };
    const punch = () => {
      if (over) return;
      hits++;
      if (hits % 2 === 0) {
        pow('fE' + target, rnd(['PAT!', 'ŞAK!', 'ÇAT!']));
        target = (target + 1) % N;
      }
      show();
    };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      punch();
    });
    btn.addEventListener('click', (e) => {
      if (!e.detail) punch();
    });
    show();
    const spin = (ch) => {
      const roll = Math.random(),
        m = $('fMark'),
        T = 1600,
        s0 = performance.now();
      m.style.display = 'block';
      setBubble('Çark', 'Şansın %' + Math.round(ch * 100) + '. Yeşilde durursa kazanırsın...');
      const tick = () => {
        const k = Math.min(1, (performance.now() - s0) / T),
          ease = 1 - Math.pow(1 - k, 3),
          pos = (ease * 3 + roll) % 1;
        const p = Math.floor(ease * 3) % 2 === 0 ? pos : 1 - pos;
        m.style.left = (k >= 1 ? roll : p) * 100 + '%';
        if (k < 1) {
          requestAnimationFrame(tick);
          return;
        }
        res({ win: roll < ch, hits, rate: rateNow(), ch });
      };
      requestAnimationFrame(tick);
    };
    const step = () => {
      if (over) return;
      const now = performance.now(),
        dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      el = (now - t0) / 1000;
      $('fTime').style.width = Math.max(0, 100 * (1 - el / D)) + '%';
      for (let i = 0; i < N; i++) {
        nextAtk[i] -= dt;
        if (nextAtk[i] <= 0) {
          nextAtk[i] = 1.3 + Math.random() * 0.9;
          pow('fYou', rnd(['KÜT!', 'PAF!', 'BAM!']));
        }
      }
      if (el >= D) {
        over = true;
        ui.answers.innerHTML = '';
        show();
        spin(chance(rateNow()));
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
