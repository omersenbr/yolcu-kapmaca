// Çok oyunculu test (dev sunucusu açıkken): oyun sunucusunu başlatır, 4 oyuncu açar.
// 3’ü aynı duraktan bağlanır ve birbirini görür; biri sorguya girer, yanındaki arkadaşı “Yardıma git” der,
// sorgudaki oyuncu müttefik kazanır; 4. oyuncu “ekip dolu” uyarısı alır.
// Kullanım: node tests/mp.mjs [oyun adresi] [çıktı klasörü]
import fs from 'fs';
import { spawn } from 'child_process';
import { pw } from './lib.mjs';

const url = process.argv[2] || 'http://localhost:5173/';
const out = process.argv[3] || 'test-results/mp';
const PORT = 8799, DURAK = 'Taksim Meydanı';
fs.mkdirSync(out, { recursive: true });
const srv = spawn('node', ['server/index.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => srv.stdout.once('data', r));
const errors = [];
const check = (c, m) => { if (!c) errors.push('BEKLENTİ: ' + m); console.log((c ? '✓ ' : '✗ ') + m); };
const browser = await pw.chromium.launch();

async function player(ad) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => errors.push(ad + ': ' + e.message));
  await page.addInitScript(([ad, port]) => {
    if (sessionStorage.getItem('t')) return;
    localStorage.clear();
    Object.entries({ 'yk-name': ad, 'yk-mod': 'kariyer', 'yk-mp': '1', 'yk-mp-url': `ws://localhost:${port}` }).forEach(([k, v]) => localStorage.setItem(k, v));
    sessionStorage.setItem('t', '1');
  }, [ad, PORT]);
  await page.goto(url);
  await page.waitForFunction(() => !document.getElementById('loading'), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.click('#start .role[data-role="taxi"]');
  await page.waitForTimeout(300);
  await page.selectOption('#careerBody select[data-sel="durak"]', DURAK);
  await page.waitForTimeout(200);
  await page.click('#careerBody button[data-act="taxi:gunduz"]');
  return page;
}
const A = await player('Ali'), B = await player('Berk'), C = await player('Cem');
await A.waitForTimeout(2500);
const seen = await Promise.all([A, B, C].map((p) => p.evaluate(() => window.__yk.mp.remotes.size)));
check(seen.every((n) => n === 2), `her oyuncu diğer ikisini görüyor (${seen.join(', ')})`);
const ekip = await A.evaluate(() => window.__yk.G.stand.name);
check(ekip === DURAK, `ekip = seçilen durak (${ekip})`);

// B’yi A’nın yanına getir, A sorguya girsin
const pos = await A.evaluate(() => { const P = window.__yk.G.player; P.x = Math.round(P.x); P.y = Math.round(P.y); P.moving = false; window.__yk.G.invuln = 999; return [P.x, P.y]; });
await B.evaluate(([x, y]) => { const P = window.__yk.G.player; P.x = x; P.y = y; P.tx = x; P.ty = y; P.moving = false; window.__yk.G.invuln = 999; }, pos);
await A.evaluate(() => { const y = window.__yk; y.G.busy = true; y.G.paused = true; y.taxiScenes.turfDialog(y.G.stand); });
await B.waitForTimeout(1500);
const durumA = await B.evaluate(() => [...window.__yk.mp.remotes.values()].find((r) => r.ad === 'Ali')?.durum);
check(durumA === 'sorgu', `B, A’yı sorguda görüyor (${durumA})`);
const helpTxt = await B.evaluate(() => { const b = document.getElementById('mpHelp'); return b.hidden ? '' : b.textContent; });
check(/Ali/.test(helpTxt), `B’de “yardıma git” düğmesi (${helpTxt})`);
await B.screenshot({ path: `${out}/01-B-arkadas-sorguda.png` });
await B.click('#mpHelp');
await A.waitForTimeout(800);
const ally = await A.evaluate(() => window.__yk.G.mpAlly);
check(ally === 'Berk', `A’ya müttefik geldi (${ally})`);
await A.screenshot({ path: `${out}/02-A-sorgu.png` });

// 4. oyuncu aynı durağa: ekip dolu
const D = await player('Dora');
await D.waitForTimeout(1500);
const toastD = await D.$eval('#toast', (e) => e.textContent);
const dSees = await D.evaluate(() => window.__yk.mp.remotes.size);
check(/dolu/.test(toastD) && dSees === 0, `4. oyuncu: “${toastD}”`);

console.log(errors.length ? '\nHATALAR:\n' + errors.join('\n') : '\nÇok oyunculu test geçti');
await browser.close();
srv.kill();
process.exit(errors.length ? 1 : 0);
