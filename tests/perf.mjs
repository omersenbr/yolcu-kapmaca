// Performans ölçümü: oyunu sanal saatle oynatır, her karenin gerçek süresini ölçer (güncelleme + çizim),
// isteğe bağlı CPU yavaşlatmasıyla (telefon benzetimi) ve CDP profiliyle en pahalı fonksiyonları listeler.
//
// Kullanım (dev sunucusu açıkken):
//   node tests/perf.mjs [--url http://localhost:5173/] [--proto] [--role taxi] [--frames 900] [--cpu 4] [--profile]
//   --proto: aynı ölçümü prototip üzerinde yapar (karşılaştırma için)
import path from 'path';
import { pw, fakeClock } from './lib.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes('--' + k);
const FRAMES = +arg('frames', 900), CPU = +arg('cpu', 4), ROLE = arg('role', 'taxi'), SEED = +arg('seed', 12345);
const url = has('proto') ? 'file://' + path.resolve('prototip/yolcu-kapmaca.html') : arg('url', 'http://localhost:5173/');

const browser = await pw.chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(fakeClock);
await page.addInitScript(() => { localStorage.setItem('yk-name', 'Test Reis'); localStorage.setItem('yk-diff', 'orta'); });
await page.goto(url);
await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
await page.waitForTimeout(2500);
const cdp = await page.context().newCDPSession(page);
await page.evaluate((sd) => window.__fake.start(sd), SEED);
await page.waitForTimeout(150);
await page.evaluate(() => window.__fake.step(1, 1000));
await page.evaluate((sd) => window.__fake.reseed(sd), SEED);
await page.click(`#start .role[data-role="${ROLE}"]`);
// ısınma: harita parçaları ilk kez çizilirken
await page.evaluate(() => window.__fake.step(60, 1000 / 30));
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
if (has('profile')) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }

const res = await page.evaluate(async (N) => {
  const F = window.__fake, keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'];
  const out = [], why = [];
  let canv = 0; const ce = document.createElement.bind(document);
  document.createElement = (t, o) => { if (String(t).toLowerCase() === 'canvas') canv++; return ce(t, o); };
  for (let f = 1; f <= N; f++) {
    const comic = document.getElementById('comic');
    if (!comic.hidden) { if (f % 6 === 0) { const b = document.querySelector('#answers button'); if (b) b.click(); } }
    else if (f % 40 === 0) window.dispatchEvent(new KeyboardEvent('keydown', { key: keys[(f / 40) % keys.length] }));
    if (!document.getElementById('end').hidden) break;
    await F.realFrame(); // tarayıcı bir önceki kareyi gerçekten çizsin
    const cvx = document.getElementById('cv').getContext('2d');
    const c0 = canv, p0 = comic.hidden; const t0 = F.real(); F.step(1, 1000 / 30);
    cvx.getImageData(0, 0, 1, 1); // çizim komutlarını boşalt: raster maliyeti de ölçülsün
    out.push(F.real() - t0);
    why.push({ f, ms: out[out.length - 1], canvas: canv - c0, panel: p0 !== document.getElementById('comic').hidden });
  }
  return { out, why };
}, FRAMES);

const times = res.out;
if (has('spikes')) for (const w of [...res.why].sort((a, b) => b.ms - a.ms).slice(0, 12)) console.log(`  kare ${w.f}: ${w.ms.toFixed(1)} ms, yeni canvas ${w.canvas}${w.panel ? ', panel açıldı/kapandı' : ''}`);
if (has('profile')) {
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = {}; profile.samples.forEach((id, i) => { dt[id] = (dt[id] || 0) + (profile.timeDeltas[i] || 0); });
  for (const [id, us] of Object.entries(dt)) {
    const n = byId.get(+id), cf = n.callFrame;
    const key = `${cf.functionName || '(anonim)'}  ${cf.url.split('/').pop()}:${cf.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + us);
  }
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  console.log('En pahalı fonksiyonlar (kendi süresi):');
  for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(`  %${(100 * us / total).toFixed(1).padStart(4)}  ${k}`);
}
const s = [...times].sort((a, b) => a - b), q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
const avg = times.reduce((a, b) => a + b, 0) / times.length;
console.log(`${has('proto') ? 'PROTOTİP' : 'YENİ'} · ${ROLE} · CPU x${CPU} · ${times.length} kare → ortalama ${avg.toFixed(2)} ms, medyan ${q(0.5).toFixed(2)}, p95 ${q(0.95).toFixed(2)}, en kötü ${s[s.length - 1].toFixed(2)} ms  (60 fps sınırı 16,7 ms)`);
if (errors.length) console.log('HATALAR:', errors);
await browser.close();
