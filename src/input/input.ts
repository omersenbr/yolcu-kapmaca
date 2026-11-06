// <auto-imports>
import { ui } from '../dialog/comic';
import { cv, resize } from '../render/view';
import { nitro } from '../world/game';
import { setWant } from '../world/movement';
// </auto-imports>
/* ================= GİRDİ: parmak kaydırma, ok tuşları/WASD, sorularda 1–4, nitro Shift/N ================= */
export let sx = 0,
  sy = 0,
  down = false;
export function initInput() {
  cv.addEventListener('pointerdown', (e) => {
    down = true;
    sx = e.clientX;
    sy = e.clientY;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  cv.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - sx,
      dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    setWant(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
    sx = e.clientX;
    sy = e.clientY;
  });
  const up = () => {
    down = false;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  window.addEventListener('keydown', (e) => {
    if (!ui.comic.hidden) {
      const b = ui.answers.querySelectorAll('button');
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= b.length) {
        e.preventDefault();
        b[n - 1].click();
      } else if ((e.key === 'Enter' || e.key === ' ') && b.length === 1) {
        e.preventDefault();
        b[0].click();
      }
      return;
    }
    if (e.key === 'Shift' || e.key.toLowerCase() === 'n') {
      e.preventDefault();
      nitro();
      return;
    }
    const m = {
      arrowup: [0, -1],
      w: [0, -1],
      arrowdown: [0, 1],
      s: [0, 1],
      arrowleft: [-1, 0],
      a: [-1, 0],
      arrowright: [1, 0],
      d: [1, 0],
    }[e.key.toLowerCase()];
    if (m) {
      e.preventDefault();
      setWant(m);
    }
  });
  window.addEventListener('resize', resize);
}
