// Testlerin ortak parçaları
import { createRequire } from 'module';
import { execSync } from 'child_process';

// Playwright projede kurulu değilse genel (global) kurulumdan alınır.
const require = createRequire(import.meta.url);
let _pw;
try { _pw = require('playwright'); } catch { _pw = require(execSync('npm root -g').toString().trim() + '/playwright'); }
export const pw = _pw;

/* sayfaya enjekte edilen sahte saat */
export const fakeClock = () => {
  const R = { raf: window.requestAnimationFrame.bind(window), st: window.setTimeout.bind(window), ct: window.clearTimeout.bind(window),
    si: window.setInterval.bind(window), ci: window.clearInterval.bind(window), pn: performance.now.bind(performance) };
  let on = false, t = 0, id = 1e7, q = [];
  const timers = new Map();
  let s = 1;
  const prng = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  window.requestAnimationFrame = (cb) => { if (!on) return R.raf(cb); const i = ++id; q.push([i, cb]); return i; };
  window.cancelAnimationFrame = (i) => { q = q.filter((x) => x[0] !== i); };
  performance.now = () => (on ? t : R.pn());
  window.setTimeout = (cb, ms, ...a) => { if (!on) return R.st(cb, ms, ...a); const i = ++id; timers.set(i, { at: t + (+ms || 0), cb, a }); return i; };
  window.clearTimeout = (i) => { timers.delete(i); R.ct(i); };
  window.setInterval = (cb, ms, ...a) => { if (!on) return R.si(cb, ms, ...a); const i = ++id; timers.set(i, { at: t + (+ms || 0), cb, a, every: Math.max(1, +ms || 0) }); return i; };
  window.clearInterval = (i) => { timers.delete(i); R.ci(i); };
  window.__fake = {
    start(seed) { s = seed; Math.random = () => { window.__fake.n++; return prng(); }; t = 1e6; on = true; },
    n: 0,
    real: () => R.pn(),
    realFrame: () => new Promise((r) => R.raf(r)),
    reseed(seed) { s = seed; window.__fake.n = 0; },
    step(n, dt) {
      for (let k = 0; k < n; k++) {
        t += dt;
        for (;;) { // vakti gelen zamanlayıcılar, sıra: zaman, sonra oluşturulma
          let best = null;
          for (const [i, x] of timers) if (x.at <= t && (!best || x.at < best[1].at || (x.at === best[1].at && i < best[0]))) best = [i, x];
          if (!best) break;
          const [i, x] = best;
          if (x.every) x.at += x.every; else timers.delete(i);
          try { typeof x.cb === 'function' ? x.cb(...x.a) : 0; } catch (e) { console.error(e); }
        }
        const cbs = q; q = [];
        for (const [, cb] of cbs) { try { cb(t); } catch (e) { console.error(e); } }
      }
    },
  };
};

